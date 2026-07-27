'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { tutorialForPath } from '@/lib/tutorial/registry';
import { startTutorial, destroyActiveTour } from '@/lib/tutorial/tour';
import { BRAND } from '@/lib/brand';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Route-aware floating "?" button (bottom-right). Shows only on pages that
 * have a tutorial; pulses until the page's tour has been opened once
 * (per-page localStorage flag). Mounted once in the (app) layout and on
 * the login page.
 */
export function TutorialLauncher() {
  const pathname = usePathname();
  const t = useT();
  const tut = useMemo(() => tutorialForPath(pathname ?? ''), [pathname]);
  const [seen, setSeen] = useState(true);

  const storageKey = tut ? `${BRAND.storagePrefix}.tour.${tut.key}` : null;

  useEffect(() => {
    // Route changed — never leave a stranded overlay behind.
    destroyActiveTour();
    if (!storageKey) return;
    try {
      setSeen(window.localStorage.getItem(storageKey) === '1');
    } catch {
      setSeen(true);
    }
  }, [storageKey]);

  useEffect(() => () => destroyActiveTour(), []);

  if (!tut) return null;

  const start = () => {
    try {
      if (storageKey) window.localStorage.setItem(storageKey, '1');
    } catch {
      // Storage unavailable — still run the tour.
    }
    setSeen(true);
    startTutorial(tut);
  };

  return (
    <button
      type="button"
      onClick={start}
      title={t('Tutoriel de la page')}
      aria-label={t('Tutoriel de la page')}
      className={cn(
        'fixed z-[70] bottom-4 right-4 h-11 w-11 rounded-full shadow-lg',
        'bg-teal-700 text-white hover:bg-teal-600 active:scale-95 transition',
        'grid place-items-center print:hidden',
      )}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {!seen && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-60 animate-ping" />
      )}
      <HelpCircle className="h-6 w-6 relative" />
    </button>
  );
}
