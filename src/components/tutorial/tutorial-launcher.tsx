'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
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
import {
  readLauncherPosition,
  setTutorialsDisabled,
  subscribeTutorialPrefs,
  tutorialsDisabled,
  tutorialsDisabledServer,
  writeLauncherPosition,
  type LauncherPosition,
} from '@/lib/tutorial/prefs';
import { BRAND } from '@/lib/brand';
import { tutorialsEnabledFor } from '@/lib/tutorial/access';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

// ── Draggable "?" button ────────────────────────────────────────────────
// Size of the button (h-11 w-11) — needed to clamp its centre so the whole
// circle stays on screen, and to convert between the centre fractions we
// persist and the top-left pixels CSS wants.
const BTN = 44;
const EDGE = 12;
/** Past this many pixels a pointer gesture is a DRAG, not a click. */
const DRAG_SLOP = 4;

/**
 * The CSS `zoom` the app puts on <html> (density ruling 2026-09-01: 0.9 on
 * 1080p, 1.1 on 1440p, 1 elsewhere).
 *
 * This matters here because the two coordinate systems disagree. Pointer
 * coordinates and getBoundingClientRect() are reported in VISUAL viewport
 * pixels, but an inline `left`/`top` is interpreted in the ZOOMED document
 * space and renders at `value * zoom`. Writing a pointer coordinate straight
 * into `left` therefore displaced the button by (zoom − 1) × its distance
 * from the origin — on a 1440p screen, grabbing it near the bottom-right
 * corner flung it clean off the edge. Measured with scripts/drag-probe: at
 * zoom 0.9 an inline left of 577.8px rendered at 520.
 */
function appZoom(): number {
  try {
    const z = parseFloat(getComputedStyle(document.documentElement).zoom || '1');
    return Number.isFinite(z) && z > 0 ? z : 1;
  } catch {
    return 1;
  }
}

/**
 * Clamp a VISUAL centre point so the whole button stays on screen, and return
 * both that point (what gets persisted, so it means the same place on a
 * screen with a different zoom) and the inline coordinates that render there.
 */
function place(cx: number, cy: number): { left: number; top: number; cx: number; cy: number } {
  const z = appZoom();
  // The button's on-screen radius is BTN*z, not BTN — the margin has to be
  // measured in the same (visual) space as innerWidth.
  const half = (BTN * z) / 2 + EDGE;
  const vx = Math.min(Math.max(cx, half), Math.max(half, window.innerWidth - half));
  const vy = Math.min(Math.max(cy, half), Math.max(half, window.innerHeight - half));
  return { left: vx / z - BTN / 2, top: vy / z - BTN / 2, cx: vx, cy: vy };
}

/**
 * The launcher's parked position.
 *
 * Persisted as a FRACTION of the viewport (see prefs.ts) and resolved to
 * pixels on mount and on every resize, so the button keeps its corner across
 * screens — the same account is used on a phone, a laptop and a wide monitor.
 * `null` means "never moved": the button stays in its default bottom-right
 * corner, laid out by CSS classes (safe-area aware) rather than inline
 * coordinates.
 */
function useLauncherPosition() {
  const [frac, setFrac] = useState<LauncherPosition | null>(null);
  const [px, setPx] = useState<{ left: number; top: number } | null>(null);

  // Read AFTER mount: localStorage is unavailable during SSR, and rendering
  // the stored position on the server would mismatch on hydration.
  useEffect(() => {
    setFrac(readLauncherPosition());
  }, []);

  // Fraction → pixels, re-resolved whenever the viewport changes (rotation,
  // window resize, the mobile URL bar collapsing).
  useEffect(() => {
    if (!frac) {
      setPx(null);
      return;
    }
    const apply = () => {
      const at = place(frac.x * window.innerWidth, frac.y * window.innerHeight);
      setPx({ left: at.left, top: at.top });
    };
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, [frac]);

  /** Live drag feedback — pixels only; nothing is persisted until the drop. */
  const moveTo = useCallback((cx: number, cy: number) => {
    const at = place(cx, cy);
    setPx({ left: at.left, top: at.top });
  }, []);

  const commit = useCallback((cx: number, cy: number) => {
    const at = place(cx, cy);
    setPx({ left: at.left, top: at.top });
    // Persist the VISUAL fraction, not the inline one: the same account opens
    // the app on screens whose density zoom differs, and "bottom-right corner"
    // has to survive that.
    const next = { x: at.cx / window.innerWidth, y: at.cy / window.innerHeight };
    setFrac(next);
    writeLauncherPosition(next);
  }, []);

  return { px, moveTo, commit };
}

/**
 * The single tutorial entry point (draggable "?" button) plus the discovery
 * UX:
 *  - Every sign-in → a centered "want a tour?" lightbox.
 *  - Dismissing it → a spotlight on the "?" button.
 *  - Declining it for good → the tutorial is off everywhere until the user
 *    re-enables it from the sidebar's Aide menu.
 * The "?" button IS the comprehensive hands-on lab: it resumes an
 * interrupted run on the current page, or starts the lab from the sidebar
 * intro when there is nothing to resume.
 */
export function TutorialLauncher() {
  const pathname = usePathname();
  const t = useT();
  const tut = useMemo(() => tutorialForPath(pathname ?? ''), [pathname]);
  // Role gate: some brands reserve the tutorials for given roles. Outside the
  // (app) layout (login) there is no provider, so the role is unknown there
  // and a role-restricted brand shows nothing.
  const { profile } = useCurrentUser();
  const disabled = useSyncExternalStore(
    subscribeTutorialPrefs,
    tutorialsDisabled,
    tutorialsDisabledServer,
  );
  const allowed = tutorialsEnabledFor(profile?.role) && !disabled;
  const [seen, setSeen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPointer, setShowPointer] = useState(false);
  const { px, moveTo, commit } = useLauncherPosition();
  const btnRef = useRef<HTMLButtonElement | null>(null);
  // Set while a pointer gesture has travelled past the slop: the click that
  // ends a drag must NOT launch the tour.
  const draggedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const flag = useCallback((suffix: string) => `${BRAND.storagePrefix}.tour.${suffix}`, []);
  const storageKey = tut ? flag(tut.key) : null;

  useEffect(() => {
    // Route changed — never leave a stranded overlay/cursor behind.
    destroyActiveTour();
    setShowWelcome(false);
    setShowPointer(false);
    if (!allowed || !tut || !storageKey) return;
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
        // Layout-level anchors (the workspace tab strip, the sidebar nav)
        // exist immediately and prove nothing, so skip them when picking the
        // poll target.
        const lastAnchor = [...tut.steps]
          .reverse()
          .find(
            (s) =>
              s.anchor &&
              !s.dynamic &&
              !s.anchor.startsWith('shell-') &&
              !s.anchor.startsWith('nav-'),
          )?.anchor;
        let tries = 0;
        const iv = window.setInterval(() => {
          tries += 1;
          const ready = !lastAnchor || !!document.querySelector(`[data-tour="${lastAnchor}"]`);
          if (!ready && tries < 50) return;
          window.clearInterval(iv);
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
      if (pending) window.localStorage.removeItem(flag('pending'));
    } catch { /* non-fatal */ }
    setSeen(pageSeen === '1');
    if (pathname === '/login') {
      // Demo entry point: prompt EVERY visit — each prospect landing here
      // should be offered the tutorial, regardless of stored flags.
      const timer = window.setTimeout(() => setShowWelcome(true), 900);
      return () => window.clearTimeout(timer);
    }
    // Fresh sign-in (marker set by the login page): offer the tutorial on
    // EVERY login, not just the first one. Dismissing it spotlights the
    // "?" button with its explanation.
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
  }, [tut, storageKey, flag, pathname, allowed]);

  // Kill the lightbox, the spotlight and the button in one go. The sidebar's
  // Aide menu grows a "reactivate" entry so the decision is reversible
  // without clearing site data.
  const turnOffForGood = useCallback(() => {
    try {
      window.localStorage.setItem(flag('welcomed'), '1');
    } catch { /* non-fatal */ }
    setShowWelcome(false);
    setShowPointer(false);
    destroyActiveTour();
    setTutorialsDisabled(true);
  }, [flag]);

  // The pointer is a driver.js spotlight — the same dim-everything-except-
  // the-target overlay the tutorials use, aimed at the "?" button. It carries
  // the opt-out too: this is the popup users actually meet when they move
  // around the app, so "stop showing me this" has to be reachable from it.
  useEffect(() => {
    if (!showPointer) return;
    pointToLauncher(() => setShowPointer(false), turnOffForGood);
    const hide = window.setTimeout(() => destroyActiveTour(), 9000);
    return () => window.clearTimeout(hide);
  }, [showPointer, turnOffForGood]);

  useEffect(
    () => () => {
      destroyActiveTour();
    },
    [],
  );

  // Turning the tutorial off mid-flight must take the overlay with it.
  useEffect(() => {
    if (disabled) destroyActiveTour();
  }, [disabled]);

  const dismissWelcome = useCallback(() => {
    try {
      window.localStorage.setItem(flag('welcomed'), '1');
    } catch { /* non-fatal */ }
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
  }, [flag, pathname, storageKey]);

  // Escape closes the lightbox exactly like the "Later" button — a modal the
  // keyboard cannot dismiss is a trap, and this one greets every sign-in.
  useEffect(() => {
    if (!showWelcome) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissWelcome();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showWelcome, dismissWelcome]);

  if (!allowed || !tut) return null;

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
  // position, walk the shell and the sidebar (each page explained), then
  // chain into the File Management walkthrough at step 1.
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

  // ── Drag gesture ──────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Left button / touch / pen only — a right-click must not start a drag.
    if (e.button !== 0) return;
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Grab offset: without it the button jumps so its centre snaps under the
    // finger on the first move.
    const grabX = e.clientX - (rect.left + rect.width / 2);
    const grabY = e.clientY - (rect.top + rect.height / 2);
    const startX = e.clientX;
    const startY = e.clientY;
    draggedRef.current = false;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_SLOP) return;
      moved = true;
      draggedRef.current = true;
      setDragging(true);
      moveTo(ev.clientX - grabX, ev.clientY - grabY);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch { /* the capture may already be gone */ }
      setDragging(false);
      if (moved) commit(ev.clientX - grabX, ev.clientY - grabY);
      // The guard is deliberately NOT cleared here: the `click` that ends a
      // drag is dispatched after pointerup, and a timer racing it decided at
      // random whether dropping the button also launched the tour. It is
      // cleared at the start of the next gesture instead (pointerdown, or a
      // keyboard activation), by which time that click has been and gone.
    };

    try {
      el.setPointerCapture(e.pointerId);
    } catch { /* capture is an optimisation, not a requirement */ }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const onClick = () => {
    if (draggedRef.current) return; // this click ended a drag
    start();
  };

  // Arrow keys nudge the button while it has focus — the drag equivalent for
  // anyone who cannot use a pointer. Shift makes it a coarse jump.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Enter/Space activate the button, and no pointerdown precedes them — so
    // clear the drag guard here too, or the tour would refuse to start after
    // the button had once been dragged.
    if (e.key === 'Enter' || e.key === ' ') draggedRef.current = false;
    const step = e.shiftKey ? 48 : 8;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    commit(rect.left + rect.width / 2 + d[0], rect.top + rect.height / 2 + d[1]);
  };

  return (
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/40 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface-1 p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
              <HelpCircle className="h-8 w-8" />
            </div>
            <h2 className="t-title">{t('Envie d’un tutoriel guidé ?')}</h2>
            <p className="mt-2 text-sm text-ink-2">
              {t('Un laboratoire guidé vous fait vivre un dossier de A à Z : création, terrain, chiffrage, rapport — avec des documents fournis à chaque étape.')}
            </p>
            {pathname !== '/login' && (
              <div className="mt-4 space-y-2 text-left">
                <div className="flex items-start gap-2 rounded-lg border border-hairline bg-surface-2 p-2.5">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs text-ink-2">
                    <span className="font-semibold text-ink">{t('Le bouton « ? » :')}</span>{' '}
                    {t('lance la visite guidée — et reprend toujours là où vous vous étiez arrêté. Glissez-le où vous voulez sur l’écran.')}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={start}
                className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
              >
                {t('Commencer la visite guidée')}
              </button>
              <button
                type="button"
                onClick={dismissWelcome}
                className="rounded-lg px-4 py-2 text-sm text-ink-3 transition hover:text-ink"
              >
                {t('Plus tard')}
              </button>
            </div>
            <div className="mt-4 border-t border-hairline pt-3">
              <button
                type="button"
                onClick={turnOffForGood}
                className="text-xs text-ink-3 underline underline-offset-2 transition hover:text-ink"
              >
                {t('Ne plus afficher le tutoriel')}
              </button>
              <p className="t-caption mt-1">
                {t('Réactivable à tout moment depuis le menu « Aide » de la barre latérale.')}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        ref={btnRef}
        type="button"
        data-tour="tutorial-launcher"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        title={t('Visite guidée — glissez le bouton pour le déplacer')}
        aria-label={t('Visite guidée — glissez le bouton pour le déplacer')}
        className={cn(
          'fixed z-[70] h-11 w-11 rounded-full shadow-lg',
          'bg-primary text-primary-foreground transition hover:opacity-90',
          'grid place-items-center touch-none select-none print:hidden',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragging ? 'scale-105 cursor-grabbing shadow-xl' : 'cursor-grab active:scale-95',
          // Only the never-moved default corner is laid out by CSS; a parked
          // button gets explicit coordinates instead. `bottom-20` on small
          // screens keeps it clear of the mobile bottom nav.
          !px && 'bottom-20 right-4 lg:bottom-4',
        )}
        style={px ? { left: px.left, top: px.top } : { marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {(!seen || showPointer) && !dragging && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
        )}
        <HelpCircle className="relative h-6 w-6" />
      </button>
    </>
  );
}
