/**
 * Missions map — what the map shows against what the lists count (QA #061 /
 * #062: « En retard 21 » above the map, 4 red points on it, nothing saying
 * why; « Aujourd'hui 1 » and no orange point).
 *
 * Every mission of a category ends up either on the map (at its address, or
 * approximately at its neighbourhood) or in the « non localisées » count —
 * no address, or an address the map does not know — so the two always add up
 * to the category's total. Missions at the same position are spread around
 * it (`ringOffsets`) instead of hiding one another.
 */

export type MapGroup = 'expired' | 'today' | 'future';

export type MapLocateState =
  /** Still being looked up. */
  | 'pending'
  /** On the map at its address. */
  | 'exact'
  /** On the map at its neighbourhood (the street is not on the map). */
  | 'approx'
  /** No address on the planification. */
  | 'missing'
  /** The address was not found on the map. */
  | 'not-found';

export interface GroupTally {
  total: number;
  onMap: number;
  approx: number;
  unlocated: number;
  pending: number;
}

export type MapTally = Record<MapGroup, GroupTally> & { unlocated: number; pending: number; approx: number };

export function tallyMap(missions: ReadonlyArray<{ group: MapGroup; state: MapLocateState }>): MapTally {
  const empty = (): GroupTally => ({ total: 0, onMap: 0, approx: 0, unlocated: 0, pending: 0 });
  const tally: MapTally = { expired: empty(), today: empty(), future: empty(), unlocated: 0, pending: 0, approx: 0 };
  for (const m of missions) {
    const g = tally[m.group];
    g.total += 1;
    if (m.state === 'exact' || m.state === 'approx') g.onMap += 1;
    if (m.state === 'approx') {
      g.approx += 1;
      tally.approx += 1;
    }
    if (m.state === 'missing' || m.state === 'not-found') {
      g.unlocated += 1;
      tally.unlocated += 1;
    }
    if (m.state === 'pending') {
      g.pending += 1;
      tally.pending += 1;
    }
  }
  return tally;
}

/**
 * Pixel offsets for `n` markers sharing one position: none for a single
 * marker, else evenly around a circle wide enough for 18 px markers not to
 * overlap. Pixels, so the spread stays readable at every zoom.
 */
export function ringOffsets(n: number, markerPx = 18): Array<[number, number]> {
  if (n <= 1) return [[0, 0]];
  // Chord between neighbours ≥ marker size + 4 px.
  const radius = Math.max(markerPx, (markerPx + 4) / (2 * Math.sin(Math.PI / n)));
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [Math.round(radius * Math.cos(angle)), Math.round(radius * Math.sin(angle))] as [number, number];
  });
}

/** Key of a position, ~1 m precision: missions at the same address share it. */
export function positionKey(lat: number, lon: number): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}
