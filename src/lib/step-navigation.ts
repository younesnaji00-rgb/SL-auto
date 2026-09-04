/**
 * In-page navigation to a dossier step (and optionally one of its tabs).
 *
 * `gotoStep(dossierId, stepId, tab?)` is the ONE way to send the reader to a
 * step from outside the timeline (record bar, context column, « Voir » links):
 *   • the tab choice is written to the StepTabs sessionStorage key first, so a
 *     step that is folded (and therefore not mounted) opens on that tab;
 *   • a window event then tells the mounted Timeline to unfold the step,
 *     scroll to it and move focus to its heading, and the mounted StepTabs to
 *     switch tab.
 * Nothing here touches React state directly, so any component can call it.
 */

export const GOTO_STEP_EVENT = 'sl:goto-step';

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
  window.dispatchEvent(new CustomEvent<GotoStepDetail>(GOTO_STEP_EVENT, { detail: { dossierId, stepId, tab, key } }));
}
