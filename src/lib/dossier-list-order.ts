/**
 * Shares the dossiers list's CURRENT filtered/sorted order with the detail
 * page so the record bar can offer « précédent / suivant » without going back
 * to the list (anti pogo-sticking; research 2026-09-03,
 * docs/research/dossiers-structure-navigation.md — Airtable ships the same
 * control in its record bar, Map UI Patterns: "reduce the need to toggle back
 * and forth").
 *
 * sessionStorage on purpose: the order is a per-tab navigation context, not
 * state to persist across sessions.
 */

const KEY = 'dossiers-list-order';

export function writeDossierListOrder(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* quota / privacy mode — the record bar simply hides the control */
  }
}

export function readDossierListOrder(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
