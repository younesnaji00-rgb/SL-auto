// Run: npx tsx --test "src/app/(app)/monitoring/__tests__/metrics.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agingDossiers,
  computeCycleTimes,
  computeHeadline,
  computeHorsDelaiInRange,
  computePerCompagnieMeasures,
  computePerUserMeasures,
  computeWeeklyTrend,
  formatBusinessHours,
  stageTriggerAt,
} from '../metrics';
import type { FunnelDossier } from '../funnel';

// Tuesday 2026-03-10 (a plain business week, no Moroccan holiday).
const T = (h: number, dayOffset = 0) => new Date(2026, 2, 10 + dayOffset, h, 0, 0);
const range = { from: new Date(2026, 2, 1), to: new Date(2026, 2, 31, 23, 59) };

const base = (id: string, extra: Partial<FunnelDossier> = {}): FunnelDossier => ({
  id,
  compagnie: 'RMA',
  createdAt: T(9),
  createdBy: 'gest@x',
  dateRequete: T(8),
  ...extra,
});

test('stageTriggerAt: demande dates start the photo clocks; chiffrage starts the accord clock', () => {
  const d = base('a', { dateDemandeExpertiseAvant: T(10), dateChiffrage: T(11), statut: 'Chiffrage en cours' });
  assert.equal(stageTriggerAt(d, 'photosAvant')?.getTime(), T(10).getTime());
  assert.equal(stageTriggerAt(d, 'accord')?.getTime(), T(11).getTime());
  assert.equal(stageTriggerAt(d, 'facture'), null);
});

test('aging: a demande without photos past 24 business hours is late NOW; a fresh one is not', () => {
  const late = base('late', { dateDemandeExpertiseAvant: T(9) });
  const fresh = base('fresh', { dateDemandeExpertiseAvant: T(9, 1) });
  const done = base('done', { dateDemandeExpertiseAvant: T(9), datePhotosAvant: T(12) });
  const now = T(12, 1); // next day noon → 27 h since T(9)
  const items = agingDossiers([late, fresh, done], now);
  assert.deepEqual(items.map((i) => i.dossier.id), ['late']);
  assert.equal(items[0].step, 'photosAvant');
  assert.ok(items[0].ageHours > 24);
});

test('hors délai in range respects the period, unlike the all-time funnel count', () => {
  const lateInRange = base('l1', { dateDemandeExpertiseAvant: T(9), datePhotosAvant: T(12, 2) });
  const lateOutOfRange = base('l2', { dateDemandeExpertiseAvant: new Date(2026, 0, 5, 9), datePhotosAvant: new Date(2026, 0, 8, 9) });
  const c = computeHorsDelaiInRange([lateInRange, lateOutOfRange], range);
  assert.equal(c.photosAvant, 1);
});

test('headline: created/treated in range, on-time %, backlog and late-now', () => {
  const ok = base('ok', { dateDemandeExpertiseAvant: T(9), datePhotosAvant: T(12), dateRapportDepose: T(9, 3) });
  const lateDone = base('ld', { dateDemandeExpertiseAvant: T(9), datePhotosAvant: T(12, 2) });
  const stuck = base('st', { dateDemandeExpertiseAvant: T(9) });
  const h = computeHeadline([ok, lateDone, stuck], range, T(12, 5));
  assert.equal(h.crees, 3);
  assert.equal(h.traites, 1);
  assert.equal(h.enAttente, 2);
  assert.equal(h.enRetard, 1);
  // SLA completions in range: creation ×3 (requête→création 1 h, on time), photosAvant ok + late → 4 on time, 1 late
  assert.equal(h.respectN, 5);
  assert.equal(h.respectPct, 80);
});

test('cycle time: median business hours per stage and end-to-end', () => {
  const a = base('a', { dateDemandeExpertiseAvant: T(9), datePhotosAvant: T(11), dateRapportDepose: T(9, 2) });
  const b = base('b', { dateDemandeExpertiseAvant: T(9), datePhotosAvant: T(15), dateRapportDepose: T(9, 4) });
  const rows = computeCycleTimes([a, b], range);
  const photos = rows.find((r) => r.key === 'photosAvant')!;
  assert.equal(photos.n, 2);
  assert.equal(photos.medianHours, 4); // (2 + 6) / 2
  const total = rows.find((r) => r.key === 'total')!;
  assert.equal(total.n, 2);
  // a: Tue 09:00 → Thu 09:00 = 48 h; b: Tue 09:00 → Sat 09:00 = 15 + 24 + 24 + 24 = 87 h (Saturday excluded) → median 67.5
  assert.equal(total.medianHours, 67.5);
});

test('formatBusinessHours: hours under a day, business days above', () => {
  assert.equal(formatBusinessHours(null), '—');
  assert.equal(formatBusinessHours(18.4), '18 h');
  assert.equal(formatBusinessHours(60), '2,5 j');
});

test('weekly trend: one point per week, created vs deposited', () => {
  const d1 = base('d1', { createdAt: new Date(2026, 2, 3), dateRapportDepose: new Date(2026, 2, 12) });
  const d2 = base('d2', { createdAt: new Date(2026, 2, 11) });
  const pts = computeWeeklyTrend([d1, d2], range, new Date(2026, 2, 31));
  assert.ok(pts.length >= 5);
  const w1 = pts.find((p) => p.crees === 1 && p.deposes === 0 && p.weekStart.getDate() === 2)!;
  assert.ok(w1, 'week of 2 March has one creation');
  const w2 = pts.find((p) => p.weekStart.getDate() === 9)!;
  assert.equal(w2.crees, 1);
  assert.equal(w2.deposes, 1);
});

test('per-compagnie measures respect the range and expose respect % and backlog', () => {
  const inR = base('i', { compagnie: 'AXA', dateDemandeExpertiseAvant: T(9), datePhotosAvant: T(12) });
  const outR = base('o', { compagnie: 'AXA', createdAt: new Date(2026, 0, 5), dateRequete: new Date(2026, 0, 5), dateDemandeExpertiseAvant: new Date(2026, 0, 6), datePhotosAvant: new Date(2026, 0, 9), dateRapportDepose: new Date(2026, 0, 20) });
  const rows = computePerCompagnieMeasures([inR, outR], range, ['AXA', 'Sanlam']);
  const axa = rows.find((r) => r.group === 'AXA')!;
  assert.equal(axa.enDelai.photosAvant, 1);
  assert.equal(axa.horsDelai.photosAvant, 0);
  assert.equal(axa.enAttente, 1);
  assert.equal(axa.respectPct, 100);
  assert.ok(rows.some((r) => r.group === 'Sanlam' && r.totalEnDelai === 0));
});

test('per-user measures: on-time/late per author and open dossiers touched', () => {
  const a = base('a', { createdBy: 'younes', dateFactureValide: T(10, 1), authorFactureValide: 'younes' });
  const b = base('b', { createdBy: 'younes', dateRapportDepose: T(9, 2), authorRapportDepose: 'sara' });
  const rows = computePerUserMeasures([a, b], [], range);
  const younes = rows.find((r) => r.group === 'younes')!;
  assert.equal(younes.enDelai.creation, 2);
  assert.equal(younes.enDelai.facture, 1);
  assert.equal(younes.ouverts, 1); // a is open, b is deposited
  const sara = rows.find((r) => r.group === 'sara')!;
  assert.equal(sara.enDelai.rapport, 1);
  assert.equal(sara.ouverts, 0);
});
