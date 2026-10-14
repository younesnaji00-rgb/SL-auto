'use client';

/**
 * « Fichiers non envoyés — équipe » (owner request 2026-10-14): every file the
 * offline queue gave up on, on ANY account's device, read from
 * `upload_failures` (lib/offline/upload-failure-report.ts). Admins only.
 *
 * Read-only: the file exists on the device that took it and nowhere else, so
 * only that device can send it again (its own red bar, « Tout réessayer »).
 * This list says whose device, which dossier and slot, and why.
 */

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Image as ImageIcon, Smartphone } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { useT } from '@/i18n';
import { formatFileSize } from '@/components/documents/typed-doc';
import { useDossierLabels } from '@/components/failed-uploads-dialog';
import { uploadWhatLabel, type UploadFailureReport } from '@/lib/offline/upload-failure-report';

export type TeamUploadFailure = Partial<UploadFailureReport> & { id: string };

/** Firestore Timestamp (or a pending serverTimestamp) → Date. */
const toDate = (v: unknown): Date | null => {
  const ts = v as { toDate?: () => Date } | null;
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
};

const when = (v: unknown): string | null => {
  const d = toDate(v);
  return d ? format(d, "dd/MM 'à' HH:mm", { locale: fr }) : null;
};

export function TeamUploadFailuresDialog({
  open,
  onOpenChange,
  failures,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  failures: TeamUploadFailure[];
}) {
  const t = useT();
  const db = useFirestore();
  const labels = useDossierLabels(open ? db : null, failures.map((f) => f.dossierId ?? null));

  // One group per account and device, the most recent failure first.
  const groups = new Map<string, TeamUploadFailure[]>();
  for (const f of [...failures].sort((a, b) => (toDate(b.lastAttemptAt ?? b.queuedAt)?.getTime() ?? 0) - (toDate(a.lastAttemptAt ?? a.queuedAt)?.getTime() ?? 0))) {
    const key = `${f.userName ?? f.uid ?? '?'} — ${f.device ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Fichiers non envoyés — équipe')}</DialogTitle>
          <DialogDescription>
            {t('Ces fichiers sont restés sur l’appareil qui les a pris : seul cet appareil peut les renvoyer (« Tout réessayer » dans sa barre rouge). Ils disparaissent d’ici dès qu’ils sont envoyés ou supprimés.')}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {Array.from(groups.entries()).map(([key, rows]) => (
            <section key={key} className="min-w-0">
              <h3 className="t-label mb-1.5 flex items-center gap-1.5 text-ink-2">
                <Smartphone className="h-3.5 w-3.5" aria-hidden />
                <span className="truncate">
                  {rows[0].userName ?? rows[0].uid}
                  {rows[0].userRole ? ` (${t(rows[0].userRole)})` : ''}
                  {rows[0].device ? ` · ${rows[0].device}` : ''}
                </span>
              </h3>
              <ul className="min-w-0 divide-y divide-hairline rounded-md border border-hairline">
                {rows.map((f) => {
                  const Icon = f.contentType?.startsWith('image/') ? ImageIcon : FileText;
                  const label = f.dossierId ? labels[f.dossierId] : undefined;
                  const meta = [
                    f.fileSize ? formatFileSize(f.fileSize) : null,
                    when(f.queuedAt) ? `${t('déposé le')} ${when(f.queuedAt)}` : null,
                    f.attempts ? `${f.attempts} ${f.attempts > 1 ? t('essais') : t('essai')}${when(f.lastAttemptAt) ? `, ${t('le dernier le')} ${when(f.lastAttemptAt)}` : ''}` : null,
                  ].filter(Boolean);
                  return (
                    <li key={f.id} className="flex min-w-0 items-start gap-3 p-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="t-body-sm truncate font-medium" title={f.fileName}>{f.fileName}</p>
                        <p className="t-caption break-words">
                          {f.dossierId && label !== null ? (
                            <Link
                              href={`/dossiers/${f.dossierId}`}
                              onClick={() => onOpenChange(false)}
                              className="font-medium text-ink-2 underline underline-offset-2 hover:text-ink"
                            >
                              {label || t('Ouvrir le dossier')}
                            </Link>
                          ) : f.dossierId ? (
                            t('Dossier supprimé')
                          ) : null}
                          {f.dossierId ? ' · ' : ''}
                          {t(uploadWhatLabel(f.kind ?? 'document', f.slot ?? null))}
                        </p>
                        {meta.length > 0 && <p className="t-caption truncate tabular-nums">{meta.join(' · ')}</p>}
                        <p className="t-caption break-words text-status-danger-fg" title={f.lastError ?? undefined}>
                          {f.reason ? t(f.reason) : t('L’envoi a échoué.')}
                          {f.lastErrorCode ? ` (${f.lastErrorCode})` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TeamUploadFailuresDialog;
