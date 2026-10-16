// Run: npx tsx --test src/lib/__tests__/map-tally.test.ts
//
// QA #061 / #062: the map showed 4 red points for « En retard 21 » and no
// orange point for « Aujourd'hui 1 », with nothing on screen saying why.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { positionKey, ringOffsets, tallyMap } from '../map-tally';
import { neighbourhoodOf } from '../geocode';

test('on the map + not located = the category total', () => {
  const tally = tallyMap([
    { group: 'expired', state: 'exact' },
    { group: 'expired', state: 'approx' },
    { group: 'expired', state: 'missing' },
    { group: 'expired', state: 'not-found' },
    { group: 'today', state: 'exact' },
    { group: 'future', state: 'pending' },
  ]);
  assert.deepEqual(tally.expired, { total: 4, onMap: 2, approx: 1, unlocated: 2, pending: 0 });
  assert.equal(tally.expired.onMap + tally.expired.unlocated, tally.expired.total);
  assert.deepEqual(tally.today, { total: 1, onMap: 1, approx: 0, unlocated: 0, pending: 0 });
  assert.equal(tally.unlocated, 2);
  assert.equal(tally.pending, 1);
});

test('missions at one position are spread so none hides another', () => {
  assert.deepEqual(ringOffsets(1), [[0, 0]]);
  for (const n of [2, 3, 7, 21]) {
    const offsets = ringOffsets(n);
    assert.equal(offsets.length, n);
    for (let i = 0; i < n; i++) {
      const [ax, ay] = offsets[i];
      const [bx, by] = offsets[(i + 1) % n];
      assert.ok(Math.hypot(ax - bx, ay - by) >= 18, `n=${n}: neighbours ${i}/${i + 1} overlap`);
    }
  }
});

test('same address, same position key', () => {
  assert.equal(positionKey(33.589912, -7.632741), positionKey(33.5899121, -7.6327409));
});

test('the neighbourhood is tried only when a quartier is written', () => {
  assert.equal(neighbourhoodOf('12 rue Ibn Battouta, Maarif, Casablanca'), 'Maarif, Casablanca');
  assert.equal(neighbourhoodOf('12 rue Ibn Battouta, Casablanca'), null);
  assert.equal(neighbourhoodOf('Casablanca'), null);
});
