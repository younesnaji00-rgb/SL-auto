'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { trialStatus } from '@/lib/trial';
import { BRAND } from '@/lib/brand';
import { useT } from '@/i18n';

// Dismissal is per browser session (sessionStorage) — the bar comes back on
// the next visit so a trial user is reminded without being nagged all day.
const DISMISSED_KEY = `${BRAND.storagePrefix}.trial-banner-dismissed`;

/**
 * Slim bar under the header showing the days left in the account's free
 * trial. Renders null when no trial applies (brand without a trial, exempt
 * account, trial not started) or when more than 7 days remain. An EXPIRED
 * trial never reaches this bar — the user is evicted by use-current-user.
 */
export function TrialBanner() {
  const { profile } = useCurrentUser();
  const t = useT();
  const [dismissed, setDismissed] = useState(false);

  // Read the dismissal flag after mount (not in the initializer) so the SSR
  // and first client render always match.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DISMISSED_KEY) === '1') setDismissed(true);
    } catch {
      // Storage unavailable — show the bar.
    }
  }, []);

  if (!profile || dismissed) return null;
  const status = trialStatus(profile);
  // daysLeft is non-null only once the trial has actually started.
  if (status.expired || status.daysLeft == null || status.daysLeft > 7) return null;
  const n = status.daysLeft;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Non-fatal — the bar just reappears on reload.
    }
  };

  return (
    <div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <span className="font-medium">
        {t('Période d’essai :')} {n} {n > 1 ? t('jours') : t('jour')}
      </span>
      <span className="hidden sm:inline text-amber-800/70 dark:text-amber-200/60">
        {t('Intéressé ? Chaque étape peut être adaptée à vos processus.')}
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('Fermer')}
        className="ml-auto rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
