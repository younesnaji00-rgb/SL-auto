/**
 * Pure status-machine helpers. Derives canonical status labels from domain
 * events (create, planification, photo, sendToChiffrage, chiffreurSave,
 * sendByMail) and exposes predicates for UI filtering / gating.
 *
 * This module is intentionally pure — no Firebase imports, no side effects —
 * so it can be unit-tested and invoked from client/server equally. Callers
 * live elsewhere (tasks #9, #10, #11 wire this in).
 */

import type { CanonicalStatut } from './dossiers-data';

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
export function deriveStatus(event: StatusEvent): CanonicalStatut {
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
 * Maps (accordKind, ordinal) → canonical label. Clamps ordinals > 3 to the
 * 3ème variant since 3ème is the hard cap for this product.
 */
export function ordinalAccordLabel(
  accordKind: 'accord' | 'proposition',
  ordinal: number,
): CanonicalStatut {
  const clamped = Math.max(1, Math.min(3, Math.floor(ordinal)));
  if (accordKind === 'accord') {
    if (clamped === 1) return 'Accord';
    if (clamped === 2) return '2ème accord';
    return '3ème accord';
  }
  // proposition
  if (clamped === 1) return 'Proposition d\'accord';
  if (clamped === 2) return '2ème proposition d\'accord';
  return '3ème proposition d\'accord';
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

/** True when the label is an accord, a proposition d'accord, or Accord envoyé. */
export function isAccordStatus(s: string): boolean {
  return typeof s === 'string' && ACCORD_STATUSES.has(s);
}

/** True when the label is the terminal closed state. */
export function isClosedStatus(s: string): boolean {
  return s === 'Accord envoyé';
}
