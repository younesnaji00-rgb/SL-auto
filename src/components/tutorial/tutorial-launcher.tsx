'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { tutorialForPath } from '@/lib/tutorial/registry';
import { sidebarIntroTutorial } from '@/lib/tutorial/pages/sidebar-intro';
import {
  startTutorial,
  destroyActiveTour,
  pointToLauncher,
  resetTourProgress,
  activeTourKey,
  JOURNEY_KEYS,
} from '@/lib/tutorial/tour';
import { BRAND } from '@/lib/brand';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * The single tutorial entry point (bottom-right "?" button) plus the
 * discovery UX:
 *  - Every sign-in → a centered "want a tour?" lightbox.
 *  - Dismissing it → a spotlight on the "?" button.
 * The "?" button IS the comprehensive hands-on lab: it resumes an
 * interrupted run on the current page, or starts the lab from the sidebar
 * intro when there is nothing to resume.
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
      // eslint-disable-next-line no-console
      console.debug('[tour] launcher', pathname, 'tut', tut.key, 'pending', pending);
      if (pending && tut.key === pending) {
        window.localStorage.removeItem(flag('pending'));
        window.localStorage.setItem(storageKey, '1');
        setSeen(true);
        // Wait for the page's data-driven anchors before starting — detail
        // pages render their sections only once the document has loaded, and
        // the presence filter would silently drop every not-yet-rendered step.
        // Layout-level anchors (tab bar, sidebar nav) exist immediately and
        // prove nothing, so skip them when picking the poll target.
        const lastAnchor = [...tut.steps]
          .reverse()
          .find(
            (s) =>
              s.anchor &&
              !s.dynamic &&
              s.anchor !== 'dos-tabs' &&
              !s.anchor.startsWith('nav-'),
          )?.anchor;
        let tries = 0;
        const iv = window.setInterval(() => {
          tries += 1;
          const ready = !lastAnchor || !!document.querySelector(`[data-tour="${lastAnchor}"]`);
          if (!ready && tries < 50) return;
          window.clearInterval(iv);
          // eslint-disable-next-line no-console
          console.debug('[tour] chained start', tut.key, 'ready', ready, 'tries', tries);
          startTutorial(tut, {
            // End of the WHOLE chain. `onComplete` only fires on a genuine
            // completion (last step reached); mid-journey hand-offs leave a
            // pending flag, which identifies them better than "does this
            // tour contain chains".
            onComplete: () => {
              try {
                if (window.localStorage.getItem(flag('pending'))) return;
                // The lab is over: forget every saved position so the next
                // "?" click replays it from the very first step.
                resetTourProgress(JOURNEY_KEYS);
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
      if (pending) {
        // eslint-disable-next-line no-console
        console.debug('[tour] stale pending cleared', pending, 'on', pathname);
        window.localStorage.removeItem(flag('pending'));
      }
    } catch { /* non-fatal */ }
    setSeen(pageSeen === '1');
    if (pathname === '/login') {
      // Demo entry point: prompt EVERY visit — each prospect landing here
      // should be offered the tutorial, regardless of stored flags.
      const timer = window.setTimeout(() => setShowWelcome(true), 900);
      return () => window.clearTimeout(timer);
    }
    // Fresh sign-in (marker set by the login page): offer the tutorial on
    // EVERY login, not just the first one. Dismissing it spotlights both
    // "?" buttons with their explanations.
    let justLogged = '';
    try {
      justLogged = window.sessionStorage.getItem(flag('justLoggedIn')) ?? '';
      if (justLogged) window.sessionStorage.removeItem(flag('justLoggedIn'));
    } catch { /* non-fatal */ }
    if (!welcomed || justLogged) {
      // App page right after signing in: the lightbox.
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

  // True when THIS page's tour has a saved position for THIS path — the
  // "?" button must resume it instead of restarting the whole lab.
  const hasSavedProgress = () => {
    try {
      const posRaw = window.localStorage.getItem(`${BRAND.storagePrefix}.tour.${tut.key}.pos`);
      const titleRaw = window.localStorage.getItem(`${BRAND.storagePrefix}.tour.${tut.key}.posTitle`);
      const matches = (raw: string | null, sep: string) => {
        if (!raw) return false;
        const at = raw.lastIndexOf(sep);
        if (at < 0) return true;
        const path = raw.slice(at + sep.length);
        return path === '*' || path === pathname;
      };
      return matches(posRaw, '@') || matches(titleRaw, '@@');
    } catch {
      return false;
    }
  };

  // The comprehensive lab, from the very beginning: forget every saved
  // position, walk the sidebar (each page explained), then chain into the
  // File Management walkthrough at step 1.
  const startLab = () => {
    resetTourProgress(JOURNEY_KEYS);
    try {
      window.localStorage.setItem(flag('pending'), 'dossiers');
    } catch { /* non-fatal */ }
    startTutorial(sidebarIntroTutorial, {
      fresh: true,
      // Already on File Management: the hand-off click doesn't navigate,
      // so the pending-flag chain never fires — start the walkthrough here.
      onComplete: () => {
        try {
          if (
            window.location.pathname === '/dossiers' &&
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

  // "?" button and the lightbox's primary button: resume an interrupted
  // run on this page, otherwise (re)start the lab from the sidebar intro.
  // /login has its own small page tour (no sidebar exists there yet).
  const start = () => {
    markWelcomed();
    setShowWelcome(false);
    setShowPointer(false);
    try {
      if (storageKey) window.localStorage.setItem(storageKey, '1');
    } catch { /* non-fatal */ }
    setSeen(true);
    // A tour already running on THIS page counts as progress: layout swaps
    // (ATG phone view) can strand it visually, and "?" must restart it at
    // its current step — never throw the user back to the sidebar intro.
    if (pathname === '/login' || activeTourKey() === tut.key || hasSavedProgress()) {
      startTutorial(tut);
      return;
    }
    startLab();
  };

  const dismissWelcome = () => {
    markWelcomed();
    setShowWelcome(false);
    // Hand off to the spotlight so they know where to find it later.
    setShowPointer(true);
    try {
      if (storageKey) window.localStorage.setItem(`${storageKey}.pointed`, '1');
      // On app pages the spotlight introduces the "?" button — that IS the
      // help intro. On /login the button belongs to the login tour; the
      // real one is introduced after the first sign-in instead.
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
              {t('Un laboratoire guidé vous fait vivre un dossier de A à Z : création, terrain, chiffrage, rapport — avec des documents fournis à chaque étape.')}
            </p>
            {pathname !== '/login' && (
              <div className="mt-4 space-y-2 text-left">
                <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-2.5">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{t('« ? » en bas à droite :')}</span>{' '}
                    {t('lance la visite guidée — et reprend toujours là où vous vous étiez arrêté.')}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={start}
                className="rounded-lg bg-teal-700 px-4 py-2.5 text-white font-medium hover:bg-teal-600 transition"
              >
                {t('Commencer la visite guidée')}
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
        onClick={start}
        title={t('Visite guidée')}
        aria-label={t('Visite guidée')}
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
