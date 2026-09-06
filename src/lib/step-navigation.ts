/**
 * In-page navigation to a dossier step (and optionally one of its tabs).
 *
 * `gotoStep(dossierId, stepId, tab?)` is the ONE way to send the reader to a
 * step from outside the timeline (record bar, context column, « Voir » links).
 *
 * DESKTOP (the long timeline, unchanged):
 *   • the tab choice is written to the StepTabs sessionStorage key first, so a
 *     step that is folded (and therefore not mounted) opens on that tab;
 *   • a window event then tells the mounted Timeline to unfold the step,
 *     scroll to it and move focus to its heading, and the mounted StepTabs to
 *     switch tab.
 *
 * PHONE (mobile pass 2026-09-06 — docs/research/mobile-record-pages.md E2/E12):
 *   the record page is a hub + one screen per step on the SAME route, addressed
 *   by query params. The page registers a navigator with
 *   `registerStepNavigator()`; while one is registered `gotoStep()` resolves to
 *   `router.push('/dossiers/{id}?etape=N&onglet=x', { scroll: false })` — one
 *   history entry per screen, so browser back / Android back / iOS swipe-back
 *   unwind one level at a time. `gotoStep` stays the single entry point: no
 *   caller needs to know which shell it is talking to.
 *
 * URL grammar (E12):
 *   /dossiers/{id}                       hub
 *   /dossiers/{id}?etape=4               step screen
 *   /dossiers/{id}?etape=4&onglet=photos step screen, facet selected
 *   /dossiers/{id}?vue=historique        full-screen history
 *   legacy `#step-N` maps to `?etape=N`
 */

export const GOTO_STEP_EVENT = 'sl:goto-step';

/** Query keys of the phone record grammar (French, like every other param). */
export const STEP_PARAM = 'etape';
export const TAB_PARAM = 'onglet';
export const VIEW_PARAM = 'vue';
/** The only value `?vue=` takes today. */
export const HISTORIQUE_VIEW = 'historique';

export interface GotoStepDetail {
  dossierId: string;
  stepId: number;
  tab?: string;
  /** The StepTabs `storageKey` of the target step. */
  key: string;
}

/** sessionStorage key StepTabs uses for a step's selected tab. */
export function stepTabsKey(dossierId: string, stepId: number): string {
  return `dossier:${dossierId}:step${stepId}`;
}

// ── URL builders (phone grammar; harmless on desktop) ───────────────────────

export function hubUrl(dossierId: string): string {
  return `/dossiers/${dossierId}`;
}

export function stepUrl(dossierId: string, stepId: number, tab?: string): string {
  const q = new URLSearchParams({ [STEP_PARAM]: String(stepId) });
  if (tab) q.set(TAB_PARAM, tab);
  return `${hubUrl(dossierId)}?${q.toString()}`;
}

export function historiqueUrl(dossierId: string): string {
  return `${hubUrl(dossierId)}?${VIEW_PARAM}=${HISTORIQUE_VIEW}`;
}

/** Parse `?etape=` into a step id, or null when absent / not a number. */
export function parseStepParam(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Legacy deep links (`/dossiers/{id}#step-4` — Suivi d'équipe drawer, rappel
 * e-mails) still exist in the wild. Returns the step id carried by a hash, or
 * null. The caller rewrites it to `?etape=N`.
 */
export function parseLegacyStepHash(hash: string): number | null {
  const m = /^#step-(\d+)$/.exec(hash || '');
  return m ? Number(m[1]) : null;
}

// ── Navigator registration (the phone shell claims gotoStep) ────────────────

export type StepNavigator = (dossierId: string, stepId: number, tab?: string) => void;

let navigator_: StepNavigator | null = null;

/**
 * Claim `gotoStep()` for the current shell. Returns the unregister function
 * (call it in the effect cleanup). Only one navigator at a time — the phone
 * record page registers on mount and releases on unmount / on switching to
 * the desktop layout, after which `gotoStep` falls back to the event.
 */
export function registerStepNavigator(nav: StepNavigator): () => void {
  navigator_ = nav;
  return () => {
    if (navigator_ === nav) navigator_ = null;
  };
}

export function gotoStep(dossierId: string, stepId: number, tab?: string): void {
  if (typeof window === 'undefined') return;
  const key = stepTabsKey(dossierId, stepId);
  if (tab) {
    try {
      window.sessionStorage.setItem(key, tab);
    } catch {
      /* storage unavailable */
    }
  }
  // Phone: one screen per step, one history entry per screen.
  if (navigator_) {
    navigator_(dossierId, stepId, tab);
    return;
  }
  window.dispatchEvent(new CustomEvent<GotoStepDetail>(GOTO_STEP_EVENT, { detail: { dossierId, stepId, tab, key } }));
}
