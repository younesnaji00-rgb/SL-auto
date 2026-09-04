'use client';

import React from 'react';
import { WifiOff, CloudUpload, Loader2 } from 'lucide-react';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { useT } from '@/i18n';

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOfflineSync();
  const t = useT();

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
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
    );
  }

  // Online but with pending uploads
  return (
    <div role="status" className="flex items-center gap-2 border-b border-status-info-fg/30 bg-status-info-bg px-4 py-2 text-[13px] text-status-info-fg">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
      <CloudUpload className="h-4 w-4 shrink-0" />
      <span>
        {t('Synchronisation en cours —')} {pendingCount}{' '}
        {pendingCount > 1 ? t("fichiers en cours d'envoi...") : t("fichier en cours d'envoi...")}
      </span>
    </div>
  );
}
