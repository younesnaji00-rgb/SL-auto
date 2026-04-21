'use client';

import React from 'react';
import { WifiOff, CloudUpload, Loader2 } from 'lucide-react';
import { useOfflineSync } from '@/hooks/use-offline-sync';

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-100/60 dark:bg-amber-950/50 border-b border-amber-200/70 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-sm">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          Mode hors ligne &mdash; Vos modifications seront synchronis&eacute;es automatiquement une fois reconnect&eacute;.
        </span>
        {pendingCount > 0 && (
          <span className="ml-auto shrink-0 font-medium">
            {pendingCount} fichier{pendingCount > 1 ? 's' : ''} en attente
          </span>
        )}
      </div>
    );
  }

  // Online but with pending uploads
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] border-b border-[hsl(var(--primary)/0.2)] text-sm">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      <CloudUpload className="h-4 w-4 shrink-0" />
      <span>
        Synchronisation en cours &mdash; {pendingCount} fichier{pendingCount > 1 ? 's' : ''} en cours d&apos;envoi...
      </span>
    </div>
  );
}
