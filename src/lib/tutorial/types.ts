/**
 * Per-page guided tutorial (driver.js coachmark tours).
 *
 * Every page defines ONE PageTutorial in src/lib/tutorial/pages/<page>.ts,
 * registered in registry.ts. Steps anchor to `data-tour="…"` attributes on
 * the real UI. Texts are FRENCH source strings (i18n keys) — English lives
 * in src/i18n/en/tutorial-*.ts and resolves through t().
 */

export interface TourStep {
  /**
   * data-tour anchor of the element to highlight. Omit for a centered
   * "modal" step (used for page intros).
   */
  anchor?: string;
  /** French title (i18n key). Keep short. */
  title: string;
  /** French body (i18n key). '\n' renders as a line break. */
  body: string;
  /** Preferred popover side (driver.js auto-flips when it doesn't fit). */
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  /**
   * data-tour value of an element to CLICK before this step shows —
   * used to open the tab/menu/panel that contains the step's anchor.
   */
  click?: string;
  /** Settle delay after `click`, ms (default 350). */
  delay?: number;
  /**
   * Include the step even when its anchor is absent at tour start
   * (because `click` reveals it). Steps without `dynamic` are filtered
   * by DOM presence, which lets one step list serve desktop AND mobile
   * layouts.
   */
  dynamic?: boolean;
}

export interface PageTutorial {
  /** Stable key for the localStorage seen-flag, e.g. 'dossiers'. */
  key: string;
  /** Route matcher. */
  match: (pathname: string) => boolean;
  steps: TourStep[];
  /**
   * Curated hands-on lab ("Démarrer la démo") — cursor-guided click-along.
   * Omit to auto-derive observe-only lab steps from the anchored tour steps.
   */
  lab?: import('./lab').LabStep[];
}
