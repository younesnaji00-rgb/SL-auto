// Run: npx tsx --test "src/app/(app)/monitoring/__tests__/metrics.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agingItems,
  buildSlaItems,
  computeCycleTimes,
  computeHeadline,
  computePerCompagnieMeasures,
  computePerUserMeasures,
  computeStepMeasures,
  computeWeeklyTrend,
  dossiersForStepMeasure,
  formatBusinessHours,
  normalizeMissionType,
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

test('normalizeMissionType tolerates the stored spellings', () => {
  assert.equal(normalizeMissionType('Avant'), 'Avant');
  assert.equal(normalizeMissionType('en cours'), 'En cours');
  assert.equal(normalizeMissionType('Après'), 'Après');
  assert.equal(normalizeMissionType('apres'), 'Après');
  assert.equal(normalizeMissionType(''), null);
});

test('buildSlaItems: creation clock, first chiffrage = 1er accord, next = 2ème+, mission done by its photos', () => {
  const d = base('d', { datePhotosAvant: T(15, 1) });
  const sla = buildSlaItems(
    [d],
    [
      { id: 'c2', dossierId: 'd', createdAt: T(9, 5), completedAt: T(12, 5), assignedChiffreurNom: 'Sara' },
      { id: 'c1', dossierId: 'd', createdAt: T(10), completedAt: T(9, 3), assignedChiffreurNom: 'Sara' },
      { id: 'cx', dossierId: 'other', createdAt: T(10) },
    ],
    [
      { id: 'm1', dossierId: 'd', typeMission: 'Avant', createdAt: T(11), agentTerrain: 'Younes' },
      { id: 'm0', dossierId: 'd', typeMission: 'Avant', createdAt: T(9, 2), agentTerrain: 'Younes' }, // planned AFTER the photos → open
      { id: 'm2', dossierId: 'd', typeMission: 'En cours', createdAt: T(9, 2), agentTerrain: 'Younes', active: false },
    ],
    undefined,
    T(12, 5),
  );
  const kinds = sla.map((s) => `${s.kind}:${s.step}`).sort();
  assert.deepEqual(kinds, ['chiffrage:accord', 'chiffrage:accord1er', 'creation:creation', 'terrain:photosAvant', 'terrain:photosAvant']);
  const first = sla.find((s) => s.id === 'chiffrage:c1')!;
  assert.equal(first.step, 'accord1er');
  assert.equal(first.late, true); // Tue 10:00 → Fri 09:00 = 71 h > 24
  const second = sla.find((s) => s.id === 'chiffrage:c2')!;
  assert.equal(second.step, 'accord');
  assert.equal(second.late, false); // 3 h
  const m1 = sla.find((s) => s.id === 'terrain:d:m1')!;
  assert.equal(m1.doneAt?.getTime(), T(15, 1).getTime());
  assert.equal(m1.late, true); // Tue 11:00 → Wed 15:00 = 28 h
  const m0 = sla.find((s) => s.id === 'terrain:d:m0')!;
  assert.equal(m0.doneAt, null);
  assert.equal(m0.owner, 'Younes');
  assert.equal(m0.late, true); // open since Thu 09:00, now Mon 12:00 → breached, and it stays breached
  assert.equal(m0.pending, false);
});

test('aging: an open assignment past 24 business hours is late NOW; done or fresh ones are not', () => {
  const d = base('d');
  const sla = buildSlaItems(
    [d],
    [
      { id: 'old', dossierId: 'd', createdAt: T(9), assignedChiffreurNom: 'Sara' },
      { id: 'fresh', dossierId: 'd', createdAt: T(9, 1), assignedChiffreurNom: 'Sara' },
    ],
    [{ id: 'm', dossierId: 'd', typeMission: 'Avant', createdAt: T(9), agentTerrain: 'Younes' }],
    undefined,
    T(12, 1),
  );
  assert.equal(sla.find((s) => s.id === 'chiffrage:fresh')!.pending, true);
  const items = agingItems(sla, T(12, 1)); // 27 h since T(9)
  assert.deepEqual(items.map((i) => `${i.kind}:${i.owner}`).sort(), ['chiffrage:Sara', 'terrain:Younes']);
  assert.ok(items.every((i) => i.ageHours > 24));
});

test('tiles: SLA steps measured on assignments, uncovered completions still count, no fake lateness', () => {
  const withAssignment = base('a', { datePhotosAvant: T(15, 1), firstAccordReachedAt: T(9, 3) });
  const legacy = base('b', { datePhotosAvant: T(15, 1), firstAccordReachedAt: T(9, 3) });
  const sla = buildSlaItems(
    [withAssignment, legacy],
    [{ id: 'c', dossierId: 'a', createdAt: T(10), completedAt: T(9, 3), assignedChiffreurNom: 'Sara' }],
    [{ id: 'm', dossierId: 'a', typeMission: 'Avant', createdAt: T(11), agentTerrain: 'Younes' }],
    undefined,
    T(12, 5),
  );
  const m = computeStepMeasures([withAssignment, legacy], range, sla);
  assert.equal(m.horsDelai.photosAvant, 1); // a: 28 h
  assert.equal(m.enDelai.photosAvant, 1); // b: no mission record → counted, not late
  assert.equal(m.horsDelai.accord1er, 1);
  assert.equal(m.enDelai.accord1er, 1);
  assert.equal(m.enDelai.creation, 2);
  const lateRows = dossiersForStepMeasure([withAssignment, legacy], [], sla, range, 'photosAvant', 'horsDelai');
  assert.deepEqual(lateRows.map((r) => [r.dossier.id, r.author]), [['a', 'Younes']]);
  const okRows = dossiersForStepMeasure([withAssignment, legacy], [], sla, range, 'photosAvant', 'enDelai');
  assert.deepEqual(okRows.map((r) => r.dossier.id), ['b']);
});

test('headline: respect % over clocks started in range (a breached open one is late), backlog and late-now', () => {
  const ok = base('ok', { dateRapportDepose: T(9, 3) });
  const stuck = base('st');
  const sla = buildSlaItems(
    [ok, stuck],
    [
      { id: 'c1', dossierId: 'ok', createdAt: T(10), completedAt: T(12), assignedChiffreurNom: 'Sara' },
      { id: 'c2', dossierId: 'st', createdAt: T(10), assignedChiffreurNom: 'Sara' },
    ],
    [],
    undefined,
    T(12, 5),
  );
  const h = computeHeadline([ok, stuck], range, T(12, 5), sla);
  assert.equal(h.crees, 2);
  assert.equal(h.traites, 1);
  assert.equal(h.enAttente, 1);
  assert.equal(h.enRetard, 1);
  // clocks active in the period: creation ×2 (1 h) + c1 (2 h) on time; c2 open since Tue 10:00 → breached → late (closed or not)
  assert.equal(h.respectN, 4);
  assert.equal(h.respectPct, 75);
  assert.equal(h.respectOnTime, 3);
  assert.equal(h.respectLate, 1);
  assert.equal(h.respectPending, 0);
});

test('a period counts the assignments ACTIVE in it — made earlier and still open, or closed inside it — like the queues', () => {
  const d = base('d', { createdAt: new Date(2026, 1, 2, 9), dateRequete: new Date(2026, 1, 2, 8) });
  const today = { from: new Date(2026, 2, 10, 0, 0), to: new Date(2026, 2, 10, 23, 59) };
  const sla = buildSlaItems(
    [d],
    [
      { id: 'openLate', dossierId: 'd', createdAt: new Date(2026, 2, 3, 9), assignedChiffreurNom: 'Sara' }, // last week, still open → late, active today
      { id: 'openFresh', dossierId: 'd', createdAt: new Date(2026, 2, 10, 9), assignedChiffreurNom: 'Sara' }, // this morning → pending
      { id: 'closedToday', dossierId: 'd', createdAt: new Date(2026, 2, 9, 9), completedAt: new Date(2026, 2, 10, 8), assignedChiffreurNom: 'Sara' }, // 23 h → on time, closed today
      { id: 'closedBefore', dossierId: 'd', createdAt: new Date(2026, 1, 20, 9), completedAt: new Date(2026, 1, 20, 12), assignedChiffreurNom: 'Sara' }, // not active today
    ],
    [],
    undefined,
    new Date(2026, 2, 10, 12),
  );
  const h = computeHeadline([d], today, new Date(2026, 2, 10, 12), sla);
  assert.equal(h.respectOnTime, 1);
  assert.equal(h.respectLate, 1);
  assert.equal(h.respectPending, 1);
  assert.equal(h.respectPct, 50);
  const m = computeStepMeasures([d], today, sla);
  assert.equal(m.horsDelai.accord, 1); // openLate is the 2nd+ assignment of the dossier
  const lateRows = dossiersForStepMeasure([d], [], sla, today, 'accord', 'horsDelai');
  assert.equal(lateRows.length, 1);
  assert.equal(lateRows[0].doneAt, null);
});

test('cycle time: median business hours per SLA stage from the clocks, and end-to-end', () => {
  const a = base('a', { dateRapportDepose: T(9, 2) });
  const b = base('b', { dateRapportDepose: T(9, 4) });
  const sla = buildSlaItems(
    [a, b],
    [
      { id: 'ca', dossierId: 'a', createdAt: T(9), completedAt: T(11) },
      { id: 'cb', dossierId: 'b', createdAt: T(9), completedAt: T(15) },
    ],
    [],
    undefined,
    T(12, 5),
  );
  const rows = computeCycleTimes([a, b], range, sla);
  const accord = rows.find((r) => r.key === 'accord1er')!;
  assert.equal(accord.n, 2);
  assert.equal(accord.medianHours, 4); // (2 + 6) / 2
  const total = rows.find((r) => r.key === 'total')!;
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
  const w2 = pts.find((p) => p.weekStart.getDate() === 9)!;
  assert.equal(w2.crees, 1);
  assert.equal(w2.deposes, 1);
});

test('per-compagnie measures respect the range; per-user credits the clock owner', () => {
  const axa = base('i', { compagnie: 'AXA', datePhotosAvant: T(12) });
  const old = base('o', { compagnie: 'AXA', createdAt: new Date(2026, 0, 5), dateRequete: new Date(2026, 0, 5), dateRapportDepose: new Date(2026, 0, 20) });
  const sla = buildSlaItems(
    [axa, old],
    [{ id: 'c', dossierId: 'i', createdAt: T(10), completedAt: T(12), assignedChiffreurNom: 'Sara' }],
    [{ id: 'm', dossierId: 'i', typeMission: 'Avant', createdAt: T(9), agentTerrain: 'Younes' }],
    undefined,
    T(12, 5),
  );
  const rows = computePerCompagnieMeasures([axa, old], range, sla, ['AXA', 'Sanlam']);
  const row = rows.find((r) => r.group === 'AXA')!;
  assert.equal(row.enDelai.photosAvant, 1);
  assert.equal(row.enDelai.accord1er, 1);
  assert.equal(row.enAttente, 1);
  assert.equal(row.respectPct, 100);
  assert.ok(rows.some((r) => r.group === 'Sanlam' && r.totalEnDelai === 0));

  const users = computePerUserMeasures([axa, old], [], range, sla);
  const sara = users.find((u) => u.group === 'Sara')!;
  assert.equal(sara.enDelai.accord1er, 1);
  assert.equal(sara.ouverts, 1);
  const younes = users.find((u) => u.group === 'Younes')!;
  assert.equal(younes.enDelai.photosAvant, 1);
  const gest = users.find((u) => u.group === 'gest@x')!;
  assert.equal(gest.enDelai.creation, 1); // `old` was created out of range
});
