/**
 * Pure status-machine helpers. Derives canonical status labels from domain
 * events (create, planification, photo, sendToChiffrage, chiffreurSave,
 * sendByMail) and exposes predicates for UI filtering / gating.
 *
 * This module is intentionally pure — no Firebase imports, no side effects —
 * so it can be unit-tested and invoked from client/server equally. Callers
 * live elsewhere (tasks #9, #10, #11 wire this in).
 */

/** Event union consumed by deriveStatus. Discriminated on `kind`. */
export type StatusEvent =
  | { kind: 'create' }
  | { kind: 'planification'; typeMission: 'Avant' | 'En cours' | 'Après' }
  | { kind: 'photo'; category: 'avant' | 'en_cours' | 'apres' }
  | { kind: 'sendToChiffrage' }
  | { kind: 'chiffreurSave'; accordKind: 'accord' | 'proposition'; ordinal: number }
  | { kind: 'sendByMail' };

/**
 * Derives the canonical status label for a given domain event.
 * Throws at compile time (exhaustiveness check) if a new event `kind` is
 * added without a matching branch.
 */
export function deriveStatus(event: StatusEvent): string {
  switch (event.kind) {
    case 'create':
      return 'Création dossier';
    case 'planification': {
      switch (event.typeMission) {
        case 'Avant':
          return 'Planification programmée avant';
        case 'En cours':
          return 'Planification programmée en cours';
        case 'Après':
          return 'Planification programmée après';
        default: {
          const _exhaustive: never = event.typeMission;
          return _exhaustive;
        }
      }
    }
    case 'photo': {
      switch (event.category) {
        case 'avant':
          return 'Planification expertise avant';
        case 'en_cours':
          return 'Planification expertise en cours';
        case 'apres':
          return 'Planification expertise après';
        default: {
          const _exhaustive: never = event.category;
          return _exhaustive;
        }
      }
    }
    case 'sendToChiffrage':
      return 'Chiffrage en cours';
    case 'chiffreurSave':
      return ordinalAccordLabel(event.accordKind, event.ordinal);
    case 'sendByMail':
      return 'Accord envoyé';
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

/**
 * Maps (accordKind, ordinal) → label. Uncapped — emits `Nème` for any N≥2
 * (parallels round-3 #18's uncap of `mapToAccorde`). Returns `string` because
 * the literal CanonicalStatut union only covers up through 3ème; 4ème+ values
 * are dynamic strings written to `dossier.statut` (typed `string`).
 */
export function ordinalAccordLabel(
  accordKind: 'accord' | 'proposition',
  ordinal: number,
): string {
  const n = Math.max(1, Math.floor(ordinal));
  if (accordKind === 'accord') {
    return n === 1 ? 'Accord' : `${n}ème accord`;
  }
  return n === 1 ? "Proposition d'accord" : `${n}ème proposition d'accord`;
}

/** True when the label is one of the 6 Planification * states. */
export function isPlanificationStatus(s: string): boolean {
  return typeof s === 'string' && s.startsWith('Planification ');
}

/** Set of all accord-family labels (including Accord envoyé). */
const ACCORD_STATUSES: ReadonlySet<string> = new Set<string>([
  'Accord',
  'Proposition d\'accord',
  '2ème accord',
  '2ème proposition d\'accord',
  '3ème accord',
  '3ème proposition d\'accord',
  'Accord envoyé',
]);

/** True when the label is an accord, a proposition d'accord, or Accord envoyé.
 *  Also matches dynamic `Nème accord` / `Nème proposition d'accord` for N≥2 so
 *  uncapped ordinals are recognized as accord states. */
export function isAccordStatus(s: string): boolean {
  if (typeof s !== 'string') return false;
  if (ACCORD_STATUSES.has(s)) return true;
  return /^\d+ème (?:accord|proposition d'accord)$/.test(s);
}

/** True when the label is the terminal closed state. */
export function isClosedStatus(s: string): boolean {
  return s === 'Accord envoyé';
}

/**
 * True when the ATG (agent de terrain) workflow is considered complete for
 * this dossier. The ATG's in-flight work ends when the dossier has left the
 * planification/chiffrage phase — i.e. the dossier has reached the terminal
 * closed state. Used by workload counts and deadline bars to flag dossiers
 * the ATG no longer needs to act on.
 */
export function isAtgCompletedStatus(s: string): boolean {
  return isClosedStatus(s);
}
