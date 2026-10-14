'use client';

/**
 * « Fichiers non envoyés » — the uploads the offline queue gave up on, on THIS
 * device (owner choice 2026-10-05, option 2). The banner used to count them
 * as « en cours d'envoi » forever although nothing would ever retry them.
 * Each one can be retried (one attempt, now) or dropped with the placeholder
 * that stood for it in its dossier.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore, useStorage } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/i18n';
import { formatFileSize } from '@/components/documents/typed-doc';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { restoreStatutAfterDocumentRemoval, restoreStatutAfterPhotoRemoval } from '@/lib/restore-statut';
import { getAllPending, type PendingUpload } from '@/lib/offline/upload-queue';
import { onSyncChange, uploadProcessor } from '@/lib/offline/upload-processor';
import { describeUploadFailure, dossierIdOfPath, hasGivenUp } from '@/lib/offline/upload-status';
import { uploadKindOf, uploadSlotOf, uploadWhatLabel } from '@/lib/offline/upload-failure-report';
import type { Firestore } from 'firebase/firestore';

/**
 * dossierId → « réf · assuré » (null once the dossier is known to be gone,
 * '' when it could not be read) — which dossier each file was meant for; the
 * file name alone rarely says. Shared with the team list.
 */
export function useDossierLabels(db: Firestore | null | undefined, ids: ReadonlyArray<string | null>): Record<string, string | null> {
  const [labels, setLabels] = useState<Record<string, string | null>>({});
  const key = [...new Set(ids.filter((id): id is string => !!id))].sort().join(',');
  useEffect(() => {
    if (!db || !key) return;
    const missing = key.split(',').filter((id) => !(id in labels));
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (id): Promise<[string, string | null]> => {
        try {
          const snap = await getDoc(doc(db, 'dossiers', id));
          if (!snap.exists()) return [id, null];
          const d = snap.data() as { refExpert?: string; assure?: { nom?: string } | string };
          const assure = typeof d.assure === 'string' ? d.assure : d.assure?.nom;
          return [id, [d.refExpert, assure].filter(Boolean).join(' · ')];
        } catch {
          return [id, ''];
        }
      }),
    ).then((pairs) => {
      if (!cancelled) setLabels((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      cancelled = true;
    };
    // labels is read to skip known ids, not to refetch on its change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key]);
  return labels;
}

type Busy = { key: string; action: 'retry' | 'discard' } | null;

export function FailedUploadsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const db = useFirestore();
  const storage = useStorage();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const [items, setItems] = useState<PendingUpload[] | null>(null);
  const dossierLabels = useDossierLabels(db, (items ?? []).map((it) => dossierIdOfPath(it.firestoreDocPath)));
  const [busy, setBusy] = useState<Busy>(null);

  const load = useCallback(async () => {
    try {
      const all = await getAllPending();
      setItems(all.filter(hasGivenUp).sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    return onSyncChange(() => void load());
  }, [open, load]);

  // Nothing left to decide on: the list closes itself.
  useEffect(() => {
    if (open && items?.length === 0 && busy === null) onOpenChange(false);
  }, [open, items, busy, onOpenChange]);

  const retry = async (list: PendingUpload[], key: string) => {
    if (!db || !storage) return;
    setBusy({ key, action: 'retry' });
    try {
      await uploadProcessor.retry(storage, db, list);
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: err?.message || String(err) });
    } finally {
      setBusy(null);
    }
  };

  const discard = async (item: PendingUpload) => {
    if (!db || !storage) return;
    if (
      !window.confirm(
        `${t('Supprimer définitivement')} « ${item.fileName} » ? ${t('Ce fichier n’a jamais atteint le serveur : il sera perdu.')}`,
      )
    )
      return;
    setBusy({ key: item.id, action: 'discard' });
    try {
      const removed = await uploadProcessor.discard(storage, db, item);
      const dossierId = dossierIdOfPath(item.firestoreDocPath);
      if (removed && dossierId) {
        const userEmail = profile?.email || 'Utilisateur';
        const isPhoto = item.firestoreDocPath.endsWith('/photos');
        void logHistorique(
          db,
          dossierId,
          isPhoto ? 'Suppression photo' : 'Suppression document',
          userEmail,
          `Envoi abandonné : « ${item.fileName} » n’a jamais atteint le serveur.`,
          isPhoto ? 'photo' : 'document',
          profile?.nom,
        );
        // A file that never arrived counts as removed for the statut
        // fallbacks: garage devis / facture (owner ruling 2026-10-05), accord,
        // the phase's last photo (2026-10-13).
        if (item.firestoreDocPath.endsWith('/documents')) {
          void restoreStatutAfterDocumentRemoval(db, dossierId, removed.type || removed.typeDocument, { email: userEmail, nom: profile?.nom });
        } else if (isPhoto) {
          void restoreStatutAfterPhotoRemoval(db, dossierId, removed.category, { email: userEmail, nom: profile?.nom });
        }
      }
      toast({ title: t('Fichier supprimé de cet appareil'), description: item.fileName });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t('Erreur lors de la suppression'),
        description: err?.message || t('Impossible de supprimer le document.'),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Fichiers non envoyés')}</DialogTitle>
          <DialogDescription>
            {t('Ces fichiers sont restés sur cet appareil : leur envoi a échoué plusieurs fois. Réessayez, ou supprimez ceux qui ne servent plus. Les administrateurs voient aussi cette liste.')}
          </DialogDescription>
        </DialogHeader>

        {/* min-w-0: a grid item never shrinks below its content, and a long
            file name on one line pushed the list (and the whole column) past
            the panel's edge. */}
        <ul aria-label={t('Fichiers non envoyés')} className="min-w-0 divide-y divide-hairline rounded-md border border-hairline">
          {(items ?? []).map((item) => {
            const failure = describeUploadFailure(item);
            const dossierId = dossierIdOfPath(item.firestoreDocPath);
            const dossierLabel = dossierId ? dossierLabels[dossierId] : undefined;
            const Icon = item.contentType?.startsWith('image/') ? ImageIcon : FileText;
            const rowBusy = busy?.key === item.id || busy?.key === 'all';
            const what = t(uploadWhatLabel(uploadKindOf(item), uploadSlotOf(item)));
            const meta = [
              formatFileSize(item.fileSize),
              `${t('déposé le')} ${format(item.createdAt, "dd/MM 'à' HH:mm", { locale: fr })}`,
              item.lastAttemptAt
                ? `${item.retryCount} ${item.retryCount > 1 ? t('essais') : t('essai')}, ${t('le dernier le')} ${format(item.lastAttemptAt, "dd/MM 'à' HH:mm", { locale: fr })}`
                : null,
            ].filter(Boolean);
            return (
              <li key={item.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="t-body-sm truncate font-medium" title={item.fileName}>
                      {item.fileName}
                    </p>
                    {/* Which dossier, and which slot or photo phase in it — wrapped, never cut. */}
                    <p className="t-caption break-words">
                      {dossierId && dossierLabel !== null ? (
                        <Link
                          href={`/dossiers/${dossierId}`}
                          onClick={() => onOpenChange(false)}
                          className="font-medium text-ink-2 underline underline-offset-2 hover:text-ink"
                        >
                          {dossierLabel || t('Ouvrir le dossier')}
                        </Link>
                      ) : dossierId ? (
                        t('Dossier supprimé')
                      ) : null}
                      {dossierId ? ' · ' : ''}
                      {what}
                    </p>
                    <p className="t-caption truncate tabular-nums">{meta.join(' · ')}</p>
                    <p className="t-caption break-words text-status-danger-fg" title={failure.detail}>
                      {t(failure.reason)}
                      {failure.detail ? ` ${failure.detail}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 pl-7 sm:pl-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => retry([item], item.id)}
                    disabled={busy !== null}
                    loading={rowBusy && busy?.action === 'retry'}
                  >
                    {!(rowBusy && busy?.action === 'retry') && <RefreshCw />}
                    {t('Réessayer')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="hover:text-destructive"
                    onClick={() => discard(item)}
                    disabled={busy !== null}
                    loading={rowBusy && busy?.action === 'discard'}
                  >
                    {!(rowBusy && busy?.action === 'discard') && <Trash2 />}
                    {t('Supprimer')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        {items && items.length > 0 && (
          <DialogFooter>
            <Button
              type="button"
              variant="tonal"
              onClick={() => retry(items, 'all')}
              disabled={busy !== null}
              loading={busy?.key === 'all'}
            >
              {busy?.key !== 'all' && <RefreshCw />}
              {t('Tout réessayer')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FailedUploadsDialog;
