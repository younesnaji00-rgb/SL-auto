/**
 * Dossier workflow steps — status per step computed from dossier data.
 *
 * Pure module (no Firebase, no React). The same dossier-level fields the
 * monitoring funnel uses (`app/(app)/monitoring/funnel.ts`) drive the stepper
 * on the dossier page, so "done" means the same thing on both screens.
 *
 * Status semantics follow the GOV.UK task-list pattern:
 *   done        — the step was completed (has a date; author when known)
 *   in_progress — started (planning requested, chiffrage sent, rapport validated…)
 *   todo        — nothing yet, can be started
 *   blocked     — prerequisite missing; not clickable, `blockedReason` says why
 */

export type StepStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface StepDef {
  /** Stable id used by the timeline sections, localStorage keys and anchors. */
  id: number;
  /** Short label (1–2 words) for the stepper bar. */
  label: string;
  /** Long label for section headings. */
  longLabel: string;
}

export interface StepState extends StepDef {
  status: StepStatus;
  doneAt: Date | null;
  doneBy: string | null;
  /** Human name of the doer when the source denormalized it (byNom). */
  doneByNom: string | null;
  startedAt: Date | null;
  blockedReason?: string;
  /** French one-word status label for chips. */
  statusLabel: string;
}

/** Order = business order. Ids are historical and must not change. */
export const DOSSIER_STEP_DEFS: StepDef[] = [
  { id: 1, label: 'Mission', longLabel: 'Création de mission' },
  { id: 4, label: 'Visite avant', longLabel: 'Planification avant' },
  { id: 6, label: 'Accord', longLabel: '1er accord' },
  { id: 9, label: 'Visite en cours', longLabel: 'Planification en cours' },
  { id: 11, label: '2ᵉ accord', longLabel: '2ème accord et +' },
  { id: 10, label: 'Visite après', longLabel: 'Planification après' },
  { id: 7, label: 'Rapport', longLabel: 'Rapport' },
  { id: 8, label: 'Honoraires', longLabel: "Note d'honoraire" },
];

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
  blocked: 'Bloqué',
};

/** Statuses that mean "an accord round (1st or later) has been saved". */
const ACCORD_LIKE = /(accord|proposition)/i;
const FIRST_ROUND = new Set(['Accord', "Proposition d'accord", '1er accord', '1ère proposition', "1ère proposition d'accord"]);

export function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function statutIs(dossier: any, ...needles: string[]): boolean {
  const s = String(dossier?.statut || '').toLowerCase();
  return needles.some((n) => s.includes(n.toLowerCase()));
}

function visitStep(
  def: StepDef,
  dossier: any,
  photosKey: string,
  demandeKey: string,
  statutNeedle: string,
): StepState {
  const doneAt = toDate(dossier?.[photosKey]);
  if (doneAt) return make(def, 'done', doneAt, dossier?.[`author${cap(photosKey)}`] ?? null, toDate(dossier?.[demandeKey]));
  const startedAt = toDate(dossier?.[demandeKey]);
  if (startedAt || statutIs(dossier, `programmée ${statutNeedle}`, `expertise ${statutNeedle}`)) {
    return make(def, 'in_progress', null, null, startedAt);
  }
  return make(def, 'todo', null, null, null);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function make(
  def: StepDef,
  status: StepStatus,
  doneAt: Date | null,
  doneBy: string | null,
  startedAt: Date | null,
  blockedReason?: string,
  doneByNom?: string | null,
): StepState {
  return { ...def, status, doneAt, doneBy: doneBy || null, doneByNom: doneByNom || null, startedAt, blockedReason, statusLabel: STEP_STATUS_LABEL[status] };
}

/**
 * Status of every workflow step for a dossier document (the top-level
 * `dossiers/{id}` doc — subcollections are not needed).
 */
export function getStepStatuses(dossier: any): StepState[] {
  const d = dossier || {};
  const firstAccordAt = toDate(d.firstAccordReachedAt);
  const chiffrageAt = toDate(d.dateChiffrage);
  const lastChange = d.lastStatusChange || {};
  const lastStatus: string = lastChange.status || d.statut || '';
  const lastAt = toDate(lastChange.at);
  const lastBy: string | null = lastChange.by || null;
  const lastByNom: string | null = lastChange.byNom || null;
  const chiffrageEnCours = statutIs(d, 'chiffrage en cours');

  return DOSSIER_STEP_DEFS.map((def) => {
    switch (def.id) {
      case 1: {
        const createdAt = toDate(d.createdAt);
        return createdAt
          ? make(def, 'done', createdAt, d.createdBy ?? null, null)
          : make(def, 'in_progress', null, null, null);
      }
      case 4:
        return visitStep(def, d, 'datePhotosAvant', 'dateDemandeExpertiseAvant', 'avant');
      case 9:
        return visitStep(def, d, 'datePhotosEnCours', 'dateDemandeExpertiseEnCours', 'en cours');
      case 10:
        return visitStep(def, d, 'datePhotosApres', 'dateDemandeExpertiseApres', 'après');
      case 6: {
        if (firstAccordAt) {
          const isFirst = FIRST_ROUND.has(lastStatus);
          return make(def, 'done', firstAccordAt, isFirst ? lastBy : null, chiffrageAt, undefined, isFirst ? lastByNom : null);
        }
        if (chiffrageAt || chiffrageEnCours) return make(def, 'in_progress', null, null, chiffrageAt);
        return make(def, 'todo', null, null, null);
      }
      case 11: {
        if (!firstAccordAt) return make(def, 'blocked', null, null, null, "Nécessite le 1er accord");
        const isLaterRound = ACCORD_LIKE.test(lastStatus) && !FIRST_ROUND.has(lastStatus);
        if (isLaterRound && lastAt) return make(def, 'done', lastAt, lastBy, chiffrageAt, undefined, lastByNom);
        if (chiffrageEnCours && chiffrageAt && firstAccordAt && chiffrageAt > firstAccordAt) {
          return make(def, 'in_progress', null, null, chiffrageAt);
        }
        return make(def, 'todo', null, null, null);
      }
      case 7: {
        const deposeAt = toDate(d.dateRapportDepose);
        if (deposeAt) return make(def, 'done', deposeAt, d.authorRapportDepose ?? null, toDate(d.directorValidated?.at));
        const validatedAt = toDate(d.directorValidated?.at);
        const factureAt = toDate(d.dateFactureValide);
        if (validatedAt || factureAt) return make(def, 'in_progress', null, null, validatedAt ?? factureAt);
        return make(def, 'todo', null, null, null);
      }
      case 8: {
        const at = toDate(d.dateNoteHonoraire ?? d.noteHonoraireAt);
        if (at) return make(def, 'done', at, d.authorNoteHonoraire ?? null, null);
        if (statutIs(d, 'réforme')) return make(def, 'todo', null, null, null);
        return make(def, 'todo', null, null, null);
      }
      default:
        return make(def, 'todo', null, null, null);
    }
  });
}

/** Convenience: the first step that is not done (what to work on next). */
export function nextStep(states: StepState[]): StepState | null {
  return states.find((s) => s.status === 'in_progress') ?? states.find((s) => s.status === 'todo') ?? null;
}

/** Suggested primary action label for the record bar, per current step. */
export function primaryActionForStep(stepId: number): { label: string; kind: 'planifier' | 'chiffrage' | 'rapport' | 'honoraires' | null } {
  switch (stepId) {
    case 4:
      return { label: 'Planifier la visite avant', kind: 'planifier' };
    case 9:
      return { label: 'Planifier la visite en cours', kind: 'planifier' };
    case 10:
      return { label: 'Planifier la visite après', kind: 'planifier' };
    case 6:
    case 11:
      return { label: 'Envoyer au chiffrage', kind: 'chiffrage' };
    case 7:
      return { label: 'Générer le rapport', kind: 'rapport' };
    case 8:
      return { label: "Déposer la note d'honoraire", kind: 'honoraires' };
    default:
      return { label: '', kind: null };
  }
}
