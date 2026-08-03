'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { tutorialForPath } from '@/lib/tutorial/registry';
import { sidebarIntroTutorial } from '@/lib/tutorial/pages/sidebar-intro';
import { startTutorial, destroyActiveTour, pointToLauncher } from '@/lib/tutorial/tour';
import { BRAND } from '@/lib/brand';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Route-aware tutorial entry point (bottom-right "?" button) plus the
 * discovery UX:
 *  - First page after the very first login → a centered "want a tour?"
 *    lightbox (once per browser).
 *  - Every page whose tour hasn't been taken yet → an animated pointer
 *    to the "?" button (once per page).
 */
export function TutorialLauncher() {
  const pathname = usePathname();
  const t = useT();
  const tut = useMemo(() => tutorialForPath(pathname ?? ''), [pathname]);
  const [seen, setSeen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPointer, setShowPointer] = useState(false);

  const flag = useCallback((suffix: string) => `${BRAND.storagePrefix}.tour.${suffix}`, []);
  const storageKey = tut ? flag(tut.key) : null;

  useEffect(() => {
    // Route changed — never leave a stranded overlay/cursor behind.
    destroyActiveTour();
    setShowWelcome(false);
    setShowPointer(false);
    if (!tut || !storageKey) return;
    let welcomed = '1';
    let pageSeen = '1';
    let pointerShown = '1';
    try {
      welcomed = window.localStorage.getItem(flag('welcomed')) ?? '';
      pageSeen = window.localStorage.getItem(storageKey) ?? '';
      pointerShown = window.localStorage.getItem(`${storageKey}.pointed`) ?? '';
    } catch {
      return;
    }
    // Chained hand-off (sidebar intro -> page walkthrough): auto-start.
    try {
      const pending = window.localStorage.getItem(flag('pending'));
      if (pending && tut.key === pending) {
        window.localStorage.removeItem(flag('pending'));
        window.localStorage.setItem(storageKey, '1');
        setSeen(true);
        // Wait for the page's data-driven anchors before starting — detail
        // pages render their sections only once the document has loaded, and
        // the presence filter would silently drop every not-yet-rendered step.
        const lastAnchor = [...tut.steps].reverse().find((s) => s.anchor && !s.dynamic)?.anchor;
        const chainsFurther = tut.steps.some((s) => s.chain);
        let tries = 0;
        const iv = window.setInterval(() => {
          tries += 1;
          const ready = !lastAnchor || !!document.querySelector(`[data-tour="${lastAnchor}"]`);
          if (!ready && tries < 25) return;
          window.clearInterval(iv);
          startTutorial(tut, {
            // End of the WHOLE chain (tours that chain further defer this):
            // introduce BOTH help entry points (sidebar "?" + bottom-right
            // "?") — once per browser.
            onComplete: chainsFurther
              ? undefined
              : () => {
                  try {
                    if (window.localStorage.getItem(flag('helpBtns'))) return;
                    window.localStorage.setItem(flag('helpBtns'), '1');
                  } catch {
                    return;
                  }
                  setShowPointer(true);
                },
          });
        }, 400);
        return () => window.clearInterval(iv);
      }
      // Stale hand-off (e.g. the guided click landed elsewhere): a pending
      // flag survives at most one navigation.
      if (pending) window.localStorage.removeItem(flag('pending'));
    } catch { /* non-fatal */ }
    setSeen(pageSeen === '1');
    if (pathname === '/login') {
      // Demo entry point: prompt EVERY visit — each prospect landing here
      // should be offered the tutorial, regardless of stored flags.
      const timer = window.setTimeout(() => setShowWelcome(true), 900);
      return () => window.clearTimeout(timer);
    }
    if (!welcomed) {
      // First app page right after the first login: the lightbox (once).
      const timer = window.setTimeout(() => setShowWelcome(true), 900);
      return () => window.clearTimeout(timer);
    }
    if (!pageSeen && !pointerShown) {
      // New page with an untaken tour: point at the button.
      const timer = window.setTimeout(() => {
        setShowPointer(true);
        try {
          window.localStorage.setItem(`${storageKey}.pointed`, '1');
        } catch { /* non-fatal */ }
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [tut, storageKey, flag, pathname]);

  // The pointer is a driver.js spotlight — the same dim-everything-except-
  // the-target overlay the tutorials use, aimed at the "?" button.
  useEffect(() => {
    if (!showPointer) return;
    pointToLauncher(() => setShowPointer(false));
    const hide = window.setTimeout(() => destroyActiveTour(), 9000);
    return () => window.clearTimeout(hide);
  }, [showPointer]);

  useEffect(
    () => () => {
      destroyActiveTour();
    },
    [],
  );

  if (!BRAND.showTutorials || !tut) return null;

  const markWelcomed = () => {
    try {
      window.localStorage.setItem(flag('welcomed'), '1');
    } catch { /* non-fatal */ }
  };

  // Bottom-right "?" — always THIS page's walkthrough.
  const startPageTour = () => {
    markWelcomed();
    setShowWelcome(false);
    setShowPointer(false);
    try {
      if (storageKey) window.localStorage.setItem(storageKey, '1');
    } catch { /* non-fatal */ }
    setSeen(true);
    startTutorial(tut);
  };

  // Welcome lightbox — on app pages, first explain the sidebar (in
  // file-lifecycle order) then chain into the File Management walkthrough.
  const start = () => {
    if (pathname === '/login') {
      startPageTour();
      return;
    }
    markWelcomed();
    setShowWelcome(false);
    setShowPointer(false);
    try {
      window.localStorage.setItem(flag('pending'), 'dossiers');
    } catch { /* non-fatal */ }
    startTutorial(sidebarIntroTutorial, {
      // Already on File Management: the hand-off click doesn't navigate,
      // so the pending-flag chain never fires — start the walkthrough here.
      onComplete: () => {
        try {
          if (
            pathname === '/dossiers' &&
            window.localStorage.getItem(flag('pending')) === 'dossiers'
          ) {
            window.localStorage.removeItem(flag('pending'));
            if (storageKey) window.localStorage.setItem(storageKey, '1');
            setSeen(true);
            window.setTimeout(() => startTutorial(tut), 500);
          }
        } catch { /* non-fatal */ }
      },
    });
  };

  const dismissWelcome = () => {
    markWelcomed();
    setShowWelcome(false);
    // Hand off to the spotlight so they know where to find it later.
    setShowPointer(true);
    try {
      if (storageKey) window.localStorage.setItem(`${storageKey}.pointed`, '1');
      // On app pages the spotlight covers both "?" buttons — that IS the
      // help intro. On /login the sidebar doesn't exist yet, so leave the
      // flag unset and introduce both after the first login instead.
      if (pathname !== '/login') window.localStorage.setItem(flag('helpBtns'), '1');
    } catch { /* non-fatal */ }
  };

  return (
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-card border shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-teal-700 text-white">
              <HelpCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">{t('Envie d’un tutoriel guidé ?')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Chaque page de l’application propose un tutoriel pas à pas, suivi d’une démo interactive. Idéal pour une première visite.')}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={start}
                className="rounded-lg bg-teal-700 px-4 py-2.5 text-white font-medium hover:bg-teal-600 transition"
              >
                {t('Commencer le tutoriel de cette page')}
              </button>
              <button
                type="button"
                onClick={dismissWelcome}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                {t('Plus tard')}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        data-tour="tutorial-launcher"
        onClick={startPageTour}
        title={t('Tutoriel de la page')}
        aria-label={t('Tutoriel de la page')}
        className={cn(
          'fixed z-[70] bottom-4 right-4 h-11 w-11 rounded-full shadow-lg',
          'bg-teal-700 text-white hover:bg-teal-600 active:scale-95 transition',
          'grid place-items-center print:hidden',
        )}
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {(!seen || showPointer) && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-60 animate-ping" />
        )}
        <HelpCircle className="h-6 w-6 relative" />
      </button>
    </>
  );
}
