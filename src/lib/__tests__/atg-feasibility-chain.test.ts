// Run: npx tsx --test src/lib/__tests__/atg-feasibility-chain.test.ts
//
// Owner question 2026-10-05: « Vérification d'itinéraire indisponible » on a
// rendez-vous two days ahead, with no other visit that day. The only leg
// checked ran from where the agent stood right then — a leg that can never
// make a conflict for another day, and whose lookup alone raised the warning.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChain, type ChainStop } from '../atg-feasibility';

const NOW = new Date(2026, 9, 5, 13, 30).getTime();
const stop = (id: string, at: Date): ChainStop => ({ id, address: `adresse ${id}`, rdvMs: at.getTime(), label: id });
const fresh = { lat: 33.5883, lng: -7.6114, updatedAtMs: NOW - 30_000 };
const ids = (chain: ChainStop[]) => chain.map((s) => s.id);

test('a rendez-vous on another day does not start from where the agent is now', () => {
  const pending = stop('new', new Date(2026, 9, 7, 9, 0));
  assert.deepEqual(ids(buildChain([], pending, fresh, NOW)), ['new']);
});

test("another day's visits are still chained to each other", () => {
  const pending = stop('new', new Date(2026, 9, 7, 9, 0));
  const other = stop('other', new Date(2026, 9, 7, 11, 0));
  assert.deepEqual(ids(buildChain([other], pending, fresh, NOW)), ['new', 'other']);
});

test('a rendez-vous today starts from the live position', () => {
  const pending = stop('new', new Date(2026, 9, 5, 15, 0));
  const chain = buildChain([], pending, fresh, NOW);
  assert.deepEqual(ids(chain), ['__live_origin__', 'new']);
  assert.equal(chain[0].address, '33.5883,-7.6114');
  assert.equal(chain[0].isOrigin, true);
});

test('a live position older than 10 minutes is left out', () => {
  const pending = stop('new', new Date(2026, 9, 5, 15, 0));
  const stale = { ...fresh, updatedAtMs: NOW - 11 * 60_000 };
  assert.deepEqual(ids(buildChain([], pending, stale, NOW)), ['new']);
});
