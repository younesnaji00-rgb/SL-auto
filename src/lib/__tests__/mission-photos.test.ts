// Run: npx tsx --test src/lib/__tests__/mission-photos.test.ts
//
// When a photo counts for a terrain visit, and which visits an upload stamps
// (QA bugs AT 008 / AT 010).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidPhotosSentAt,
  missionPhotoAnchor,
  photoStampTargets,
  photoTimesByPhase,
} from '../mission-photos';

const D = (month: number, day: number, h: number, min = 0) => new Date(2026, month - 1, day, h, min, 0);
const NOW = D(10, 1, 10, 30);

test('a photo counts from the start of the RDV day, else from the creation', () => {
  assert.deepEqual(missionPhotoAnchor(D(10, 7, 15), D(9, 30, 9)), D(10, 7, 0));
  assert.deepEqual(missionPhotoAnchor(null, D(9, 30, 9)), D(9, 30, 9));
  assert.equal(missionPhotoAnchor(null, null), null);
});

test('photo docs → the times of the SENT photos per phase, oldest first', () => {
  const times = photoTimesByPhase([
    { category: 'avant', url: 'u3', uploadedAt: D(9, 23, 15, 22) },
    { category: 'avant', url: 'u1', uploadedAt: D(9, 23, 15, 20) },
    { category: 'en_cours', url: 'u4', dateUpload: D(9, 23, 16, 10) },
    { category: 'apres', url: null, pendingUpload: true, uploadedAt: D(9, 23, 18) },
    { category: 'apres', url: 'u5', pendingUpload: true, uploadedAt: D(9, 23, 18) },
    { category: 'apres', url: 'u6' },
    { url: 'u7', uploadedAt: D(9, 22, 9) },
    { category: 'autre', url: 'u8', uploadedAt: D(9, 22, 9) },
  ]);
  assert.deepEqual(times.Avant, [D(9, 22, 9), D(9, 23, 15, 20), D(9, 23, 15, 22)], 'no category = avant, as in the queue');
  assert.deepEqual(times['En cours'], [D(9, 23, 16, 10)]);
  assert.equal(times['Après'], undefined, 'queued, still pending or undated: not sent');
});

test('a visit stamp counts from its RDV day on, or when flagged early', () => {
  const anchor = D(10, 7, 0);
  assert.equal(isValidPhotosSentAt(D(10, 7, 11), anchor, false), true);
  assert.equal(isValidPhotosSentAt(D(10, 1, 10), anchor, false), false, 'the old stamp-every-visit write');
  assert.equal(isValidPhotosSentAt(D(10, 1, 10), anchor, true), true);
  assert.equal(isValidPhotosSentAt(null, anchor, true), false);
});

test('an upload stamps the due visits of the phase, never a future one', () => {
  const plans = [
    { id: 'missed', dateRDV: D(9, 25, 12), createdAt: D(9, 24, 10) },
    { id: 'today', dateRDV: D(10, 1, 15), createdAt: D(9, 30, 9) },
    { id: 'oct7', dateRDV: D(10, 7, 10), createdAt: D(9, 30, 9) },
    { id: 'off', dateRDV: D(10, 1, 9), active: false },
    { id: 'stamped', dateRDV: D(9, 29, 10), photosSentAt: D(9, 29, 10, 30) },
    { id: 'legacy', dateRDV: D(9, 30, 10), photosSentAt: D(9, 28, 10) },
    { id: 'undated', createdAt: D(9, 30, 9) },
  ];
  assert.deepEqual(photoStampTargets(plans, NOW), { ids: ['missed', 'today', 'legacy', 'undated'], early: false });
});

test('with no visit due yet, only the nearest upcoming one is stamped, flagged early', () => {
  const plans = [
    { id: 'oct9', dateRDV: D(10, 9, 10) },
    { id: 'oct5', dateRDV: D(10, 5, 10) },
  ];
  assert.deepEqual(photoStampTargets(plans, NOW), { ids: ['oct5'], early: true });
  assert.deepEqual(
    photoStampTargets([{ id: 'oct5', dateRDV: D(10, 5, 10), photosSentAt: D(10, 1, 9), photosSentEarly: true }], NOW),
    { ids: [], early: true },
    'already stamped by an earlier batch',
  );
  assert.deepEqual(photoStampTargets([], NOW), { ids: [], early: true });
});
