'use client';

import React, { useState } from 'react';
import { WifiOff, CloudUpload, CloudOff, Loader2 } from 'lucide-react';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { useT } from '@/i18n';
import { Button } from '@/components/ui/button';
import { FailedUploadsDialog } from '@/components/failed-uploads-dialog';

export function OfflineIndicator() {
  const { isOnline, pendingCount, failedCount } = useOfflineSync();
  const [failedListOpen, setFailedListOpen] = useState(false);
  const t = useT();

  if (isOnline && pendingCount === 0 && failedCount === 0 && !failedListOpen) return null;

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

      {failedCount > 0 && (
        // Uploads the queue gave up on (owner choice 2026-10-05): said as
        // such, with the list to retry or drop them, instead of « en cours
        // d'envoi » forever.
        <div role="status" className="flex items-center gap-2 border-b border-status-danger-fg/30 bg-status-danger-bg px-4 py-1.5 text-[13px] text-status-danger-fg">
          <CloudOff className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {failedCount}{' '}
            {failedCount > 1
              ? t('fichiers n’ont pas pu être envoyés depuis cet appareil.')
              : t('fichier n’a pas pu être envoyé depuis cet appareil.')}
          </span>
          <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 px-2.5" onClick={() => setFailedListOpen(true)}>
            {t('Voir')}
          </Button>
        </div>
      )}

      <FailedUploadsDialog open={failedListOpen} onOpenChange={setFailedListOpen} />
    </>
  );
}
