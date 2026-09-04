/**
 * « À faire » for a dossier — what still stands between the dossier and its
 * next step, computed from data the dossier page already holds (GOV.UK task
 * list summary: "what is left to complete", one line per item, each a link
 * to where it gets done; Jira "blocked by").
 *
 * Pure module (no React, no Firebase). Three kinds of rows, in this order:
 *   1. required Informations fields still empty   → step 1 · Informations
 *   2. required pièces still missing              → step 1 · Pièces
 *   3. the next workflow step to act on           → that step (or its action)
 * A step the reader is merely WAITING on (chiffrage sent, visit planned but
 * photos not in yet) is flagged `waiting` so the UI can tone it down.
 */

import { getMissingRequiredFields } from './required-fields';
import type { StepState } from './dossier-steps';
import type { RequiredDocsStatus } from './required-docs';

export type VisitType = 'Avant' | 'En cours' | 'Après';

export type TodoAction =
  | { kind: 'goto'; stepId: number; tab?: string }
  | { kind: 'planifier'; stepId: number; type: VisitType }
  | { kind: 'chiffrage'; stepId: number };

export interface DossierTodo {
  id: string;
  /** What is missing / to do — one short line. */
  label: string;
  /** Which items, or why — the second, quieter line. */
  detail?: string;
  /** Where the row leads (« Informations », « Pièces », « Planifier »…). */
  target: string;
  action: TodoAction;
  /** Waiting on someone else (chiffreur, agent de terrain), not on the reader. */
  waiting?: boolean;
}

const VISIT_STEPS: Record<number, { type: VisitType; word: string }> = {
  4: { type: 'Avant', word: 'avant' },
  9: { type: 'En cours', word: 'en cours' },
  10: { type: 'Après', word: 'après' },
};

/** "A, B, C +2" — the first `max` items, then a count of the rest. */
export function listSome(items: readonly string[], max = 3): string {
  if (items.length <= max) return items.join(', ');
  return `${items.slice(0, max).join(', ')} +${items.length - max}`;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return n > 1 ? pluralForm : singular;
}

function fmtDate(d: Date | null): string | null {
  if (!d) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * The step to act on next: the first step in progress, else the first todo —
 * skipping « 2ème accord et + » when it is merely todo (a further accord
 * round is optional, never something the dossier waits for).
 */
export function actionableStep(steps: StepState[]): StepState | null {
  return steps.find((s) => s.status === 'in_progress') ?? steps.find((s) => s.status === 'todo' && s.id !== 11) ?? null;
}

function stepTodo(step: StepState, docs: RequiredDocsStatus | null): DossierTodo | null {
  const visit = VISIT_STEPS[step.id];
  if (visit) {
    if (step.status === 'todo') {
      return {
        id: `visit-${step.id}`,
        label: `Visite ${visit.word} à planifier`,
        target: 'Planifier',
        action: { kind: 'planifier', stepId: step.id, type: visit.type },
      };
    }
    const when = fmtDate(step.startedAt);
    return {
      id: `photos-${step.id}`,
      label: `Photos ${visit.word} attendues`,
      detail: when ? `Visite planifiée le ${when}` : 'Visite planifiée',
      target: 'Photos',
      action: { kind: 'goto', stepId: step.id, tab: 'photos' },
      waiting: true,
    };
  }
  switch (step.id) {
    case 6:
      if (step.status === 'in_progress') {
        return { id: 'accord-1', label: '1er accord attendu', detail: 'Chiffrage en cours', target: 'Accord', action: { kind: 'goto', stepId: 6, tab: 'documents' }, waiting: true };
      }
      return {
        id: 'chiffrage-1',
        label: 'À envoyer au chiffrage',
        detail: docs && !docs.allRequiredFilled ? 'Dès que les pièces requises sont reçues' : undefined,
        target: 'Chiffrage',
        action: { kind: 'chiffrage', stepId: 6 },
      };
    case 11:
      if (step.status === 'in_progress') {
        return { id: 'accord-2', label: '2ème accord attendu', detail: 'Chiffrage en cours', target: 'Accord', action: { kind: 'goto', stepId: 11, tab: 'documents' }, waiting: true };
      }
      return null;
    case 7:
      return step.status === 'in_progress'
        ? { id: 'rapport-depot', label: 'Rapport à déposer', detail: 'Rapport validé', target: 'Rapport', action: { kind: 'goto', stepId: 7 } }
        : { id: 'rapport-gen', label: 'Rapport à générer', target: 'Rapport', action: { kind: 'goto', stepId: 7 } };
    case 8:
      return { id: 'honoraires', label: "Note d'honoraire à déposer", target: 'Honoraires', action: { kind: 'goto', stepId: 8 } };
    default:
      return null;
  }
}

/**
 * @param dossier  top-level `dossiers/{id}` document (or the rappel overlay)
 * @param steps    `getStepStatuses(dossier)`
 * @param docs     live required-pieces status, or `null` while it loads (then
 *                 no pièces row is emitted rather than a wrong one)
 */
export function getDossierTodos(dossier: any, steps: StepState[], docs: RequiredDocsStatus | null): DossierTodo[] {
  const out: DossierTodo[] = [];

  const fields = getMissingRequiredFields(dossier);
  if (fields.length > 0) {
    out.push({
      id: 'fields',
      label: `${fields.length} ${plural(fields.length, 'champ manquant', 'champs manquants')}`,
      detail: listSome(fields),
      target: 'Informations',
      action: { kind: 'goto', stepId: 1, tab: 'informations' },
    });
  }

  if (docs && docs.missingLabels.length > 0) {
    const n = docs.missingLabels.length;
    out.push({
      id: 'docs',
      label: `${n} ${plural(n, 'pièce manquante', 'pièces manquantes')}`,
      detail: listSome(docs.missingLabels),
      target: 'Pièces',
      action: { kind: 'goto', stepId: 1, tab: 'documents' },
    });
  }

  const next = actionableStep(steps);
  if (next) {
    const row = stepTodo(next, docs);
    if (row) out.push(row);
  }

  return out;
}
