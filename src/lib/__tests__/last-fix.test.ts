// Run: npx tsx --test src/lib/__tests__/last-fix.test.ts
//
// Tester, 2026-10-13: a photo asked the phone for a new position at the
// shutter; without a recent satellite fix the ask timed out and the photo had
// no position. It now uses the fix the app's own trackers keep warm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshFix, recordFix, resetLastFix } from '../last-fix';

test('a recent fix is used, an old one is not', () => {
  resetLastFix();
  const t0 = 1_760_000_000_000;
  assert.equal(freshFix(30_000, t0), null);
  recordFix(33.5899, -7.6327, 12, t0);
  assert.deepEqual(freshFix(30_000, t0 + 10_000), { lat: 33.5899, lng: -7.6327, accuracy: 12, at: t0 });
  assert.equal(freshFix(30_000, t0 + 31_000), null);
});

test('an older fix arriving late never replaces a newer one', () => {
  resetLastFix();
  const t0 = 1_760_000_000_000;
  recordFix(33.6, -7.6, 10, t0 + 5_000);
  recordFix(34.0, -5.0, 10, t0);
  assert.equal(freshFix(30_000, t0 + 6_000)?.lat, 33.6);
});

test('nonsense coordinates are ignored; a missing accuracy is left out', () => {
  resetLastFix();
  const t0 = 1_760_000_000_000;
  recordFix(Number.NaN, -7.6, 10, t0);
  assert.equal(freshFix(30_000, t0), null);
  recordFix(33.6, -7.6, null, t0);
  assert.deepEqual(freshFix(30_000, t0), { lat: 33.6, lng: -7.6, at: t0 });
});
