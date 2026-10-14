'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, CloudUpload, CloudOff, Loader2, RefreshCw, Users, X } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { onSnapshot } from '@/lib/firestore-logged';
import { OPEN_FAILED_UPLOADS_EVENT, useOfflineSync } from '@/hooks/use-offline-sync';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage } from '@/firebase';
import { useT } from '@/i18n';
import { Button } from '@/components/ui/button';
import { FailedUploadsDialog } from '@/components/failed-uploads-dialog';
import { TeamUploadFailuresDialog, type TeamUploadFailure } from '@/components/team-upload-failures-dialog';
import { getAllPending } from '@/lib/offline/upload-queue';
import { uploadProcessor } from '@/lib/offline/upload-processor';
import { hasGivenUp } from '@/lib/offline/upload-status';
import { UPLOAD_FAILURES } from '@/lib/offline/upload-failure-report';

/**
 * « × » on a bar (owner request 2026-10-14): the bar goes until a file fails
 * that was not on the list when it was closed. The closed list lives in this
 * browser only; a blocked storage just means the bar comes back.
 */
function useDismissible(key: string, ids: string[]) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      setDismissed(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDismissed([]);
    }
  }, [key]);
  const visible = ids.some((id) => !dismissed.includes(id));
  const dismiss = () => {
    setDismissed(ids);
    try {
      window.localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      /* the bar simply comes back next time */
    }
  };
  return { visible, dismiss };
}

export function OfflineIndicator() {
  const { isOnline, pendingCount, failedCount, failedIds } = useOfflineSync();
  const { profile, isAdmin } = useCurrentUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [failedListOpen, setFailedListOpen] = useState(false);
  const [teamListOpen, setTeamListOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const t = useT();
  // The account menu's « Fichiers non envoyés » opens the list once the bar
  // was closed with « × ».
  useEffect(() => {
    const open = () => setFailedListOpen(true);
    window.addEventListener(OPEN_FAILED_UPLOADS_EVENT, open);
    return () => window.removeEventListener(OPEN_FAILED_UPLOADS_EVENT, open);
  }, []);

  // Admins see every account's unsent files (upload_failures), not only this
  // device's: the file stays on the device that took it, but whoever runs the
  // team knows which pièce is missing from which dossier, and why.
  const [teamFailures, setTeamFailures] = useState<TeamUploadFailure[]>([]);
  useEffect(() => {
    if (!db || !isAdmin) {
      setTeamFailures([]);
      return;
    }
    return onSnapshot(
      collection(db, UPLOAD_FAILURES),
      (snap) => setTeamFailures(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => setTeamFailures([]),
    );
  }, [db, isAdmin]);
  // Files of THIS device already have the red bar above.
  const otherFailures = teamFailures.filter((f) => !failedIds.includes(f.id));

  const device = useDismissible(`failed-uploads-dismissed:${profile?.uid ?? ''}`, failedIds);
  const team = useDismissible(`team-upload-failures-dismissed:${profile?.uid ?? ''}`, otherFailures.map((f) => f.id));

  const retryAll = async () => {
    if (!db || !storage) return;
    setRetrying(true);
    try {
      const items = (await getAllPending()).filter(hasGivenUp);
      await uploadProcessor.retry(storage, db, items);
      toast({
        title: t('Nouvel essai lancé'),
        description: `${items.length} ${items.length > 1 ? t('fichiers repartent à l’envoi.') : t('fichier repart à l’envoi.')}`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: err?.message || String(err) });
    } finally {
      setRetrying(false);
    }
  };

  const showDevice = failedCount > 0 && device.visible;
  const showTeam = otherFailures.length > 0 && team.visible;

  if (isOnline && pendingCount === 0 && !showDevice && !showTeam && !failedListOpen && !teamListOpen) return null;

  return (
    <>
      {!isOnline ? (
        <div role="status" className="flex items-center gap-2 border-b border-status-warning-fg/30 bg-status-warning-bg px-4 py-2 text-[13px] text-status-warning-fg">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            {t('Mode hors ligne — Vos modifications seront synchronisées automatiquement une fois reconnecté.')}
          </span>
          {pendingCount > 0 && (
            <span className="ml-auto shrink-0 font-medium">
              {pendingCount} {pendingCount > 1 ? t('fichiers en attente') : t('fichier en attente')}
            </span>
          )}
        </div>
      ) : pendingCount > 0 ? (
        // Online with files still being sent — the ones the queue gave up on
        // are not counted here any more (they have their own bar below).
        <div role="status" className="flex items-center gap-2 border-b border-status-info-fg/30 bg-status-info-bg px-4 py-2 text-[13px] text-status-info-fg">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
          <CloudUpload className="h-4 w-4 shrink-0" />
          <span>
            {t('Synchronisation en cours —')} {pendingCount}{' '}
            {pendingCount > 1 ? t("fichiers en cours d'envoi...") : t("fichier en cours d'envoi...")}
          </span>
        </div>
      ) : null}

      {showDevice && (
        // Uploads the queue gave up on (owner choice 2026-10-05): said as
        // such, with the list to retry or drop them, instead of « en cours
        // d'envoi » forever. « Tout réessayer » and « × » on the bar itself
        // (owner request 2026-10-14).
        <div role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-status-danger-fg/30 bg-status-danger-bg px-4 py-1.5 text-[13px] text-status-danger-fg">
          <CloudOff className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {failedCount}{' '}
            {failedCount > 1
              ? t('fichiers n’ont pas pu être envoyés depuis cet appareil.')
              : t('fichier n’a pas pu être envoyé depuis cet appareil.')}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-7 px-2.5" onClick={retryAll} loading={retrying} disabled={!isOnline || retrying}>
              {!retrying && <RefreshCw />}
              {t('Tout réessayer')}
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 px-2.5" onClick={() => setFailedListOpen(true)}>
              {t('Voir la liste')}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-status-danger-fg hover:bg-status-danger-fg/10 hover:text-status-danger-fg max-md:h-9 max-md:w-9"
              onClick={device.dismiss}
              aria-label={t('Masquer cette alerte')}
              title={t('Masquer cette alerte — elle revient si un autre fichier échoue.')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showTeam && (
        <div role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-status-warning-fg/30 bg-status-warning-bg px-4 py-1.5 text-[13px] text-status-warning-fg">
          <Users className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {otherFailures.length}{' '}
            {otherFailures.length > 1
              ? t('fichiers n’ont pas pu être envoyés depuis les appareils de l’équipe.')
              : t('fichier n’a pas pu être envoyé depuis un appareil de l’équipe.')}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-7 px-2.5" onClick={() => setTeamListOpen(true)}>
              {t('Voir la liste')}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-status-warning-fg hover:bg-status-warning-fg/10 hover:text-status-warning-fg max-md:h-9 max-md:w-9"
              onClick={team.dismiss}
              aria-label={t('Masquer cette alerte')}
              title={t('Masquer cette alerte — elle revient si un autre fichier échoue.')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <FailedUploadsDialog open={failedListOpen} onOpenChange={setFailedListOpen} />
      {isAdmin && <TeamUploadFailuresDialog open={teamListOpen} onOpenChange={setTeamListOpen} failures={otherFailures} />}
    </>
  );
}
