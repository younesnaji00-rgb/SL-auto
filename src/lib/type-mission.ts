/**
 * Mission phase (« type de RDV ») of a planification.
 *
 * The value is chosen from the editable `options_types_rdv` list, so a
 * planification can carry « avant », « Visite avant », « Apres » or a label
 * with a trailing space. Every reader that compares phases must go through
 * `normalizeTypeMission` — a raw `=== 'Avant'` silently hid freshly created
 * visits from « Visites planifiées » (QA bug 046).
 */
export type TypeMission = 'Avant' | 'En cours' | 'Après';

export const TYPE_MISSIONS: readonly TypeMission[] = ['Avant', 'En cours', 'Après'];

/** Narrows a free-form typeMission string to the canonical tri-state, or null. */
export function normalizeTypeMission(typeMission: unknown): TypeMission | null {
  const t = String(typeMission ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (t === 'avant' || t === 'visite avant' || t === 'mission avant') return 'Avant';
  if (t === 'en cours' || t === 'visite en cours' || t === 'mission en cours') return 'En cours';
  if (t === 'apres' || t === 'visite apres' || t === 'mission apres') return 'Après';
  return null;
}

/** True when two free-form phase labels name the same mission phase. */
export function sameTypeMission(a: unknown, b: unknown): boolean {
  const na = normalizeTypeMission(a);
  const nb = normalizeTypeMission(b);
  if (na && nb) return na === nb;
  return String(a ?? '').trim() === String(b ?? '').trim();
}
