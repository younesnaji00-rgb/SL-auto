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
   * data-tour value of a DISCLOSURE button (a dossier timeline section
   * heading, a collapsible panel) to open before this step shows — clicked
   * only when it reports `aria-expanded="false"`, so a section the user has
   * already opened is never closed by the tour. A collapsed disclosure
   * unmounts its content, which hides the step's anchor and drops the step
   * silently; steps carrying `expand` therefore survive the presence filter
   * the way `click` ones do.
   */
  expand?: string;
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
   * returns true (e.g. a date actually selected). Interactive steps show a
   * LOCKED Next button (greyed out, hover explains why): the user must
   * perform the action — the popover's own prefill/download buttons and the
   * clickable step counter remain the only assisted paths.
   */
  interact?: 'click' | 'until';
  until?: () => boolean;
  /**
   * Point the animated cursor at the LEFT edge of the highlighted element
   * instead of its center — for wide bars (headers, tab strips) whose text
   * sits on the left.
   */
  cursorAt?: 'left' | 'center';
  /**
   * Aim the animated cursor at a PRECISE control inside (or near) the
   * highlighted area — a CSS selector resolved live (first visible match).
   * The highlight itself stays on `anchor`; only the hand moves. Falls back
   * to the highlighted element when nothing matches.
   */
  cursorSel?: string;
  /**
   * Choose WHICH element to highlight when the anchor matches several
   * (e.g. one table row among many). Receives the visible matches; return
   * undefined to fall back to the first one.
   */
  anchorPick?: (els: HTMLElement[]) => HTMLElement | undefined;
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
   * Body text chosen at DISPLAY time (returns a translation key, like
   * `body`). For steps whose message depends on live page state — e.g. the
   * field-agent "overdue" step, which reads differently when nothing is
   * actually overdue. Falls back to `body` when it returns nothing.
   */
  bodyFn?: () => string;
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
