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
  /**
   * Hands-on interaction (merged lab): 'click' advances when the user
   * really clicks the highlighted element; 'until' advances when `until()`
   * returns true (e.g. a date actually selected). Interactive steps keep
   * their Next button — nobody is forced to complete the action.
   */
  interact?: 'click' | 'until';
  until?: () => boolean;
  /**
   * "Do it for me" for until-steps: performed when the user clicks Next
   * WITHOUT doing the hands-on action themselves (open the sheet, run the
   * prefill…). The step does NOT advance on Next — the until-predicate
   * fires once the performed action lands, exactly like a manual one.
   * Without this, skipping would show follow-up steps whose UI never
   * appeared. (interact:'click' steps already auto-click their anchor.)
   */
  doIt?: () => void;
  /**
   * Reset-watch: while this step is active, `resetIf()` is polled — when it
   * turns true (the user tore down the state this part of the flow depends
   * on, e.g. left selection mode), the tour jumps back to the step titled
   * `resetTo` instead of walking steps whose UI no longer exists.
   */
  resetIf?: () => boolean;
  resetTo?: string;
  /**
   * Keep the step only when this predicate is true at tour start — for
   * hidden sub-flows that must not appear on normal runs (e.g. the rappel
   * treatment steps, gated on an active rappel session). Evaluated once,
   * before the presence filter.
   */
  onlyIf?: () => boolean;
  /**
   * Cleanup run when the user advances with the Next button INSTEAD of
   * completing the hands-on action — e.g. close the sheet/dialog this
   * step opened so the next step's anchor isn't buried underneath it.
   */
  onNext?: () => void;
  /**
   * Key of another PageTutorial to chain into when this interact step's
   * click navigates away (written to the `pending` flag at click time;
   * the launcher auto-starts the matching tour on arrival).
   */
  chain?: string;
  /**
   * With `chain`: write the pending flags when the step SHOWS (not only on
   * the anchored click), so any route to the target page — dossier tab,
   * row click — resumes the chained tour. Stale-pending cleanup absorbs
   * the case where the user goes elsewhere instead.
   */
  chainEager?: boolean;
  /**
   * With `chain`: also save THIS tour's resume position at the next step,
   * so chaining back into this tour later continues where the journey
   * left off (used for round-trip hops to other pages).
   */
  chainResume?: boolean;
  /**
   * With `chain`: start the TARGET tour at the step with this title
   * (used to enter a tour at a hidden re-entry step instead of step 1).
   */
  chainAt?: string;
  /**
   * Download/action links rendered under the body (e.g. demo-kit files).
   * `{lang}` in href is replaced with the active locale ('fr'|'en') so
   * each language serves its own kit. `label` is a French i18n key.
   */
  links?: Array<{ href: string; label: string; download?: boolean }>;
  /**
   * One-click "do the uploads for me" — for prospects uncomfortable with
   * downloading files. Renders a button under the links; clicking it
   * fetches each href (`{lang}` resolved like links) and injects it into
   * the file input matched by `input` (DataTransfer + change event), so
   * the REAL upload pipeline runs. Consecutive entries with the same
   * `input` are batched into one change event.
   */
  prefill?: Array<{ href: string; name: string; input: string }>;
}

export interface PageTutorial {
  /** Stable key for the localStorage seen-flag, e.g. 'dossiers'. */
  key: string;
  /** Route matcher. */
  match: (pathname: string) => boolean;
  steps: TourStep[];
  /**
   * Skip the shared closing step — for tours that chain into another tour
   * (the sidebar intro) instead of ending on this page.
   */
  noClosing?: boolean;
  /**
   * Curated hands-on lab ("Démarrer la démo") — cursor-guided click-along.
   * Omit to auto-derive observe-only lab steps from the anchored tour steps.
   */
  lab?: import('./lab').LabStep[];
}
