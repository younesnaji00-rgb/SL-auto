// Run: npx tsx --test "src/app/(app)/dashboard/__tests__/analytics.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGE_BANDS,
  LADDER_STAGES,
  REAL_USER,
  calDays,
  closingRatio,
  compagnieTable,
  computeDirectionView,
  contradictoireShare,
  countBy,
  creationToPlanif24,
  devisLineStats,
  devisRates,
  dist,
  eadShare,
  factureToDepot48,
  firstPass,
  firstPassBy,
  intakeHeat,
  latestDevisSnapshot,
  leadTimes,
  percentile,
  photosToChiffrageOpen,
  reformeStats,
  revisionCycleHours,
  stageLadder,
  terrainQuality,
  touchesPerDossier,
  unbilled,
  vehicleAgeYears,
  weeklyFlow,
  windowOf,
} from '../analytics';
import { buildDashboardSla } from '../metrics';
import type { FunnelDossier, WorkflowLog } from '../../monitoring/funnel';
import type { DashboardChiffrage, DashboardMission } from '../use-dashboard-data';

// Tuesday 2026-03-10 09:00 — a plain business week, no Moroccan holiday.
// Offsets: −1 Mon 9 · −2 Sun 8 · −3 Sat 7 · −4 Fri 6 · −5 Thu 5 · −8 Mon 2 mars.
const T = (h: number, dayOffset = 0) => new Date(2026, 2, 10 + dayOffset, h, 0, 0);
const NOW = T(15); // Tuesday 15:00
const H: ReadonlySet<string> = new Set();
const DAYS = 30;

const dossier = (id: string, extra: Partial<FunnelDossier> & Record<string, any> = {}): FunnelDossier => ({
  id,
  compagnie: 'RMA',
  createdAt: T(9, -1),
  createdBy: 'uid-g1',
  dateRequete: T(8, -1),
  ...extra,
});

const g1 = { uid: 'uid-g1', nom: 'Gest Un', email: 'g1@x' };

const approx = (actual: number | null, expected: number, msg?: string, eps = 1e-6) =>
  assert.ok(
    actual != null && Math.abs(actual - expected) < eps,
    `expected ≈ ${expected}, got ${actual}${msg ? ` — ${msg}` : ''}`,
  );

test('percentile interpolates linearly; dist sorts and sizes', () => {
  assert.equal(percentile([], 0.5), null);
  assert.equal(percentile([7], 0.9), 7);
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
  approx(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9.1);
  const d = dist([3, 1, 2]);
  assert.deepEqual(d.values, [1, 2, 3]);
  assert.equal(d.p50, 2);
  assert.equal(d.n, 3);
  const empty = dist([]);
  assert.equal(empty.p50, null);
  assert.equal(empty.p90, null);
  assert.equal(empty.n, 0);
});

test('windowOf, calDays and REAL_USER', () => {
  const w = windowOf(NOW, 7);
  assert.equal(w.from.getTime(), T(15, -7).getTime());
  assert.equal(w.to.getTime(), NOW.getTime());
  assert.equal(calDays(T(9, -1), T(21)), 1.5);
  assert.equal(calDays(T(9), T(8)), null, 'end before start');
  assert.equal(calDays(null, T(9)), null);
  assert.equal(calDays(T(9), null), null);
  assert.equal(REAL_USER('System'), false);
  assert.equal(REAL_USER('admin-guest'), false);
  assert.equal(REAL_USER(''), false);
  assert.equal(REAL_USER(undefined), false);
  assert.equal(REAL_USER('karim@x'), true);
});

test('stageLadder: nine stages over the closed cohort, both ends required', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', {
      dateRequete: T(8, -10),
      createdAt: T(9, -10),
      datePhotosAvant: T(10, -9),
      firstAccordReachedAt: T(12, -8),
      dateFactureValide: T(12, -6),
      directorValidated: { at: T(12, -5) },
      dateRapportDepose: T(12, -4),
      dateNoteHonoraire: T(12, -2),
    }),
    dossier('b', {
      dateRequete: T(8, -10),
      createdAt: T(11, -10),
      datePhotosAvant: T(10, -9),
      firstAccordReachedAt: T(12, -8),
      dateFactureValide: T(12, -7),
      // Validated AFTER the dépôt → the « validé → déposé » stage is skipped for b.
      directorValidated: { at: T(12, -3) },
      dateRapportDepose: T(12, -4),
      noteHonoraireAt: T(12, -3),
    }),
    // Closed outside the window and an open one — not in the cohort.
    dossier('c', { dateRapportDepose: T(12, -40), dateNoteHonoraire: T(12, -38) }),
    dossier('d'),
  ];
  const missions: DashboardMission[] = [
    { id: 'm1', dossierId: 'a', typeMission: 'Après', createdAt: T(10, -10) },
    { id: 'm2', dossierId: 'a', typeMission: 'Avant', createdAt: T(11, -10) },
  ];
  const chiffrages: DashboardChiffrage[] = [
    { id: 'c1', dossierId: 'a', createdAt: T(12, -9), files: [1] },
    { id: 'c2', dossierId: 'b', createdAt: T(12, -9), files: [] }, // not a queue chiffrage
  ];
  const rows = stageLadder(dossiers, chiffrages, missions, NOW, DAYS);
  assert.equal(rows.length, 9);
  assert.deepEqual(rows.map((r) => r.key), LADDER_STAGES.map((s) => s.key));
  const by = (k: string) => rows.find((r) => r.key === k)!.dist;
  assert.equal(by('requeteCreation').n, 2);
  approx(by('requeteCreation').p50, 2 / 24);
  assert.equal(by('creationPlanif').n, 1, 'b has no mission');
  approx(by('creationPlanif').p50, 2 / 24, 'Avant mission preferred over the earlier Après one');
  approx(by('planifPhotos').p50, 23 / 24);
  assert.equal(by('photosChiffrage').n, 1, 'b has no queue chiffrage');
  approx(by('photosChiffrage').p50, 2 / 24);
  assert.equal(by('chiffrageAccord').p50, 1);
  assert.equal(by('accordFacture').n, 2);
  assert.equal(by('accordFacture').p50, 1.5);
  // Both dossiers have a facture and a validation, so both measure here; it is
  // only the « validé → déposé » stage that drops b, whose validation landed
  // after the dépôt.
  assert.equal(by('factureValide').n, 2);
  assert.equal(by('valideDepot').n, 1, 'b validated after dépôt is skipped');
  assert.equal(by('valideDepot').p50, 1);
  assert.equal(by('depotNote').n, 2);
  assert.equal(by('depotNote').p50, 1.5);
});

test('leadTimes: closed cohort, dateSinistre as Date or YYYY-MM-DD string', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', { dateRequete: T(8, -10), dateRapportDepose: T(8, -2), dateSinistre: '2026-02-28' }),
    dossier('b', { dateRequete: T(8, -12), dateRapportDepose: T(8, -2), dateSinistre: T(8, -14) }),
    dossier('c', { dateRequete: T(8, -50), dateRapportDepose: T(8, -40) }),
    dossier('d'),
  ];
  const lt = leadTimes(dossiers, NOW, DAYS);
  assert.equal(lt.n, 2);
  assert.deepEqual(lt.requeteRapport.values, [8, 10]);
  assert.equal(lt.requeteRapport.p50, 9);
  assert.equal(lt.sinistreRequete.n, 2);
  const [strDays, dateDays] = lt.sinistreRequete.values;
  assert.ok(strDays >= 0 && strDays < 1, `string date parsed to the same day: ${strDays}`);
  assert.equal(dateDays, 2);
  assert.equal(lt.sinistreRapport.n, 2);
  assert.equal(lt.sinistreRapport.values[1], 12);
});

test('factureToDepot48: business hours, one inside and one outside', () => {
  const dossiers: FunnelDossier[] = [
    // Mon 09:00 → Tue 14:00 = 29 h ouvrées.
    dossier('a', { dateFactureValide: T(9, -1), dateRapportDepose: T(14) }),
    // Thu 09:00 → Tue 10:00 = 15 + 24 + 24 + 10 = 73 h ouvrées.
    dossier('b', { dateFactureValide: T(9, -5), dateRapportDepose: T(10) }),
    // No facture → not in the denominator.
    dossier('c', { dateRapportDepose: T(10) }),
  ];
  assert.deepEqual(factureToDepot48(dossiers, H, NOW, DAYS), { pct: 50, num: 1, den: 2 });
});

test('unbilled: deposited without note, older than 30 j, oldest first', () => {
  const dossiers: FunnelDossier[] = [
    dossier('b', { dateRapportDepose: T(9, -35) }),
    dossier('a', { dateRapportDepose: T(9, -40) }),
    dossier('c', { dateRapportDepose: T(9, -45), dateNoteHonoraire: T(9, -44) }),
    dossier('d', { dateRapportDepose: T(9, -10) }),
    dossier('e'),
  ];
  const items = unbilled(dossiers, NOW);
  assert.deepEqual(items.map((i) => i.dossier.id), ['a', 'b']);
  assert.equal(items[0].daysSinceDepot, 40.25);
  assert.equal(unbilled(dossiers, NOW, 5).length, 3);
});

test('weeklyFlow: 13 Monday weeks ending on the current one; closingRatio excludes it', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', { createdAt: T(9) }),
    dossier('b', { createdAt: T(9, -3) }), // Saturday 7 mars → week of 2 mars
    dossier('c', { createdAt: T(9, -8), dateRapportDepose: T(9, -8) }), // Monday 2 mars
    dossier('d', { createdAt: 'garbage' }),
  ];
  const flow = weeklyFlow(dossiers, NOW);
  assert.equal(flow.length, 13);
  const last = flow[12];
  assert.equal(last.weekStart.getTime(), new Date(2026, 2, 9).getTime());
  assert.equal(last.label, '9 mars');
  assert.equal(last.recus, 1);
  assert.equal(flow[11].recus, 2);
  assert.equal(flow[11].termines, 1);
  assert.equal(flow[0].weekStart.getTime(), new Date(2025, 11, 15).getTime());
  assert.equal(closingRatio(flow), 0.5);
  assert.equal(closingRatio(weeklyFlow([], NOW)), null);
});

test('firstPass and firstPassBy count queue rounds per dossier', () => {
  const chiffrages: DashboardChiffrage[] = [
    { id: 'c1', dossierId: 'a', createdAt: T(9, -5), files: [1] },
    { id: 'c2', dossierId: 'a', createdAt: T(9, -3), completedAt: T(12, -3), files: [1] },
    { id: 'c3', dossierId: 'b', createdAt: T(9, -4), files: [1] },
    { id: 'c4', dossierId: 'c', createdAt: T(9, -6), files: [1] },
    { id: 'c5', dossierId: 'c', createdAt: T(9, -4), completedAt: T(11, -4), files: [1] },
    { id: 'c6', dossierId: 'c', createdAt: T(9, -2), completedAt: T(12, -1), files: [1] },
    // First round outside the window → the dossier is not in the cohort.
    { id: 'c7', dossierId: 'd', createdAt: T(9, -40), files: [1] },
    { id: 'c8', dossierId: 'd', createdAt: T(9, -2), files: [1] },
    // No files → not a queue chiffrage.
    { id: 'c9', dossierId: 'e', createdAt: T(9, -2), files: [] },
  ];
  const fp = firstPass(chiffrages, NOW, DAYS);
  assert.deepEqual(fp.rate, { pct: 33, num: 1, den: 3 });
  assert.deepEqual(fp.thirdRound, { pct: 33, num: 1, den: 3 });
  assert.deepEqual(firstPass(chiffrages, NOW, DAYS, (id) => id === 'b').rate, { pct: 100, num: 1, den: 1 });

  const dossiers: FunnelDossier[] = [
    dossier('a', { compagnie: 'RMA', garageName: 'G1' }),
    dossier('b', { compagnie: 'rma ', garageName: '' }),
    dossier('c', { compagnie: 'Wafa', garageName: 'g1' }),
    dossier('d', { compagnie: 'RMA' }),
  ];
  const byComp = firstPassBy(chiffrages, dossiers, NOW, DAYS, 'compagnie');
  assert.deepEqual(
    byComp.map((g) => [g.key, g.label, g.n, g.rate.pct]),
    [
      ['rma', 'RMA', 2, 50],
      ['wafa', 'Wafa', 1, 0],
    ],
  );
  // Garage « G1 » / « g1 » is the same key: dossier a (2 rounds) and c (3
  // rounds) were BOTH revised, so the first-pass rate there is 0 %.
  const byGarage = firstPassBy(chiffrages, dossiers, NOW, DAYS, 'garageName');
  assert.deepEqual(byGarage.map((g) => [g.key, g.n, g.rate.pct]), [['g1', 2, 0]]);

  // Revision cycle: rounds ≥ 2 completed in the window, on the 24 h ouvrées
  // clock. c5 runs Fri 09:00 → 11:00 = 2 h; c6 runs Sun 09:00 → Mon 12:00 = 12 h
  // (Sunday does not count); c2 opens AND closes on the Saturday, so it burns
  // no business time at all — the weekend pause, asserted on purpose.
  const rev = revisionCycleHours(chiffrages, H, NOW, DAYS);
  assert.deepEqual(rev.values, [0, 2, 12]);
});

const snap = (rows: any[], extra: Record<string, any> = {}) => ({ header: {} as any, rows, versions: [], ...extra });
const row = (id: string, ref: string, type: string, puHT: number, extra: Record<string, any> = {}) => ({
  id,
  ref,
  designation: id,
  type,
  tva: 20,
  qte: 1,
  puHT,
  ...extra,
});

test('latestDevisSnapshot prefers the highest accord, then the garage source; legacy extraColumn honoured', () => {
  const base: DashboardChiffrage = { id: 'c', dossierId: 'a' };
  const s1 = latestDevisSnapshot({
    ...base,
    structuredEditables: {
      'Devis Garage': snap([row('r1', 'Remplacement', 'Originale', 10)]),
      'Devis accordé': snap([row('r1', 'Remplacement', 'Originale', 10)], {
        extraColumns: [{ id: 'x', label: 'Accord', values: { r1: '8' }, kind: 'accord' }],
      }),
      'Devis 2ème accord': snap([row('r1', 'Remplacement', 'Originale', 10)], {
        extraColumns: [{ id: 'y', label: 'Proposition', values: { r1: '7' }, kind: 'proposition-accord' }],
      }),
    },
  });
  assert.equal(s1?.docType, 'Devis 2ème accord');
  assert.equal(s1?.accord?.kind, 'proposition-accord');

  const s2 = latestDevisSnapshot({
    ...base,
    structuredEditables: {
      'Devis Garage 2': snap([row('r1', 'Réparation', '', 10)]),
      'Devis Garage': snap([row('r1', 'Réparation', '', 10)]),
      'Devis accordé': snap([]), // no rows → skipped
    },
  });
  assert.equal(s2?.docType, 'Devis Garage 2');
  assert.equal(s2?.accord, null);

  const s3 = latestDevisSnapshot({
    ...base,
    structuredEditables: {
      'Devis accordé': snap([row('r1', 'Réparation', '', 10)], { extraColumn: { label: 'Accord', values: { r1: '5' } } }),
    },
  });
  assert.equal(s3?.docType, 'Devis accordé');
  assert.deepEqual(s3?.accord?.values, { r1: '5' });

  assert.equal(latestDevisSnapshot({ ...base, structuredEditables: { 'Facture accordé': snap([row('r1', 'Réparation', '', 10)]) } }), null);
  assert.equal(latestDevisSnapshot(base), null);
});

test('devisLineStats + devisRates: one snapshot per dossier, accord parsed from « 1 234,50 »', () => {
  const chiffrages: DashboardChiffrage[] = [
    // Older assignment of a — superseded by c1.
    {
      id: 'c0',
      dossierId: 'a',
      createdAt: T(9, -3),
      completedAt: T(12, -3),
      structuredEditables: { 'Devis Garage': snap([row('z', 'Réparation', '', 9999)]) },
    },
    {
      id: 'c1',
      dossierId: 'a',
      createdAt: T(9, -1),
      completedAt: T(12, -1),
      structuredEditables: {
        'Devis accordé': snap(
          [
            row('r1', 'Remplacement', 'Originale', 1000, { vetuste: 0 }),
            row('r2', 'Remplacement', 'Adaptable', 250, { qte: 2, observation: 'non_accorde' }),
            row('r3', 'Réparation', '', 500, { vetuste: 50 }),
            row('r4', 'Remplacement', 'Occasion', 100, { observation: 'hors_sinistre' }),
          ],
          { extraColumns: [{ id: 'x', label: 'Accord', values: { r1: '1 234,50', r2: '', r3: '200' }, kind: 'accord' }] },
        ),
      },
    },
    {
      id: 'c2',
      dossierId: 'b',
      createdAt: T(9, -2),
      completedAt: T(12, -2),
      structuredEditables: {
        'Devis Garage': snap([row('r1', 'Réparation', '', 100), row('r2', 'Remplacement', 'Originale', 300)]),
      },
    },
    // Outside the window.
    { id: 'c3', dossierId: 'c', completedAt: T(12, -40), structuredEditables: { 'Devis Garage': snap([row('r1', 'Réparation', '', 1)]) } },
    // No snapshot at all.
    { id: 'c4', dossierId: 'd', completedAt: T(12, -1) },
  ];
  const s = devisLineStats(chiffrages, NOW, DAYS);
  assert.equal(s.dossiers, 2);
  assert.equal(s.rows, 6);
  assert.equal(s.ecartees, 2);
  assert.equal(s.reparation, 2);
  assert.equal(s.remplacement, 4);
  assert.deepEqual([s.originale, s.adaptable, s.occasion], [2, 1, 1]);
  assert.equal(s.devisHT, 2250);
  assert.equal(s.devisHTWithAccord, 1850);
  assert.equal(s.accordHT, 1434.5);
  assert.equal(s.withAccord, 1);

  const r = devisRates(s);
  assert.deepEqual(r.ecartees, { pct: 33, num: 2, den: 6 });
  assert.deepEqual(r.reparation, { pct: 33, num: 2, den: 6 });
  assert.deepEqual(r.originale, { pct: 50, num: 2, den: 4 });
  assert.equal(r.adaptable.pct, 25);
  assert.equal(r.occasion.pct, 25);
  assert.equal(r.economieHT, 415.5);
  assert.equal(r.economiePct, 22);

  const onlyB = devisLineStats(chiffrages, NOW, DAYS, (c) => c.dossierId === 'b');
  assert.equal(onlyB.accordHT, null);
  assert.equal(devisRates(onlyB).economieHT, null);
});

test('countBy groups case-insensitively and labels blanks « Non renseigné »', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', { compagnie: 'RMA' }),
    dossier('b', { compagnie: 'rma' }),
    dossier('c', { compagnie: ' RMA ' }),
    dossier('d', { compagnie: '' }),
    dossier('e', { compagnie: undefined }),
    dossier('f', { compagnie: 'Wafa', createdAt: T(9, -40), dateRapportDepose: T(9, -2) }),
  ];
  assert.deepEqual(
    countBy(dossiers, 'compagnie', NOW, DAYS).map((g) => [g.key, g.label, g.count, g.share]),
    [
      ['rma', 'RMA', 3, 60],
      ['non renseigné', 'Non renseigné', 2, 40],
    ],
  );
  assert.deepEqual(
    countBy(dossiers, 'compagnie', NOW, DAYS, 'dateRapportDepose').map((g) => [g.label, g.count, g.share]),
    [['Wafa', 1, 100]],
  );
  assert.deepEqual(countBy(dossiers, 'nature', NOW, DAYS).map((g) => g.label), ['Non renseigné']);
});

test('vehicleAgeYears parses every mec format and rejects absurd values', () => {
  const age = (mec: any) => vehicleAgeYears({ vehicule: { mec } }, NOW);
  assert.equal(age('2020-05-01'), 5);
  assert.equal(age('15/03/2016'), 9);
  assert.equal(age('03/2016'), 10);
  assert.equal(age('2010'), 16);
  assert.equal(age(2010), 16);
  assert.equal(age(new Date(2023, 0, 1)), 3);
  assert.equal(age({ toDate: () => new Date(2018, 5, 1) }), 7);
  assert.equal(age('1950'), null, '> 60 ans');
  assert.equal(age('2030'), null, 'in the future');
  assert.equal(age('abc'), null);
  assert.equal(age(''), null);
  assert.equal(vehicleAgeYears({}, NOW), null);
  assert.equal(vehicleAgeYears(null, NOW), null);
  assert.deepEqual(AGE_BANDS.map((b) => b.label), ['0–3', '4–7', '8–12', '> 12']);
});

test('reformeStats by age band and marque; EAD and contradictoire shares', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', { nature: 'Réforme', vehicule: { marque: 'Dacia', mec: '2010' } }),
    dossier('b', { nature: 'Classique', statut: 'Réforme', vehicule: { marque: 'dacia', mec: '2012' } }),
    dossier('c', { nature: 'Classique', vehicule: { marque: 'Dacia', mec: '2022' } }),
    dossier('d', { nature: 'EAD', vehicule: { marque: 'Renault', mec: '2011' } }),
    dossier('e', { nature: 'Arbitrage', vehicule: { marque: 'Peugeot' } }),
    dossier('f', { nature: 'Réforme', createdAt: T(9, -40) }), // outside the window
  ];
  const r = reformeStats(dossiers, NOW, DAYS);
  assert.deepEqual(r.rate, { pct: 40, num: 2, den: 5 });
  const band = (k: string) => r.byAge.find((b) => b.key === k)!.rate;
  assert.deepEqual(band('12+'), { pct: 67, num: 2, den: 3 });
  assert.deepEqual(band('4-7'), { pct: 0, num: 0, den: 1 });
  assert.equal(band('0-3').pct, null);
  assert.deepEqual(
    r.byMarque.map((m) => [m.label, m.n, m.rate.pct]),
    [
      ['Dacia', 3, 67],
      ['Peugeot', 1, 0],
      ['Renault', 1, 0],
    ],
  );
  assert.deepEqual(eadShare(dossiers, NOW, DAYS), { pct: 20, num: 1, den: 5 });
  assert.deepEqual(contradictoireShare(dossiers, NOW, DAYS), { pct: 20, num: 1, den: 5 });
});

test('compagnieTable: volume, en cours, délais, SLA, first pass, sorted by volume', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', { compagnie: 'RMA', createdAt: T(9, -5), dateRequete: T(8, -5) }),
    dossier('b', { compagnie: 'RMA', createdAt: T(9, -20), dateRequete: T(8, -20), dateRapportDepose: T(8, -10) }),
    dossier('c', { compagnie: 'RMA', createdAt: T(9, -60), dateRequete: T(8, -60), dateRapportDepose: T(9, -50) }),
    dossier('d', { compagnie: 'Wafa', createdAt: T(9, -3), dateRequete: T(8, -3), nature: 'EAD' }),
    dossier('e', { compagnie: '', createdAt: T(9, -2), dateRequete: T(8, -2) }),
  ];
  const chiffrages: DashboardChiffrage[] = [{ id: 'c1', dossierId: 'b', createdAt: T(9, -15), completedAt: T(12, -15), files: [1] }];
  const sla = buildDashboardSla(dossiers, chiffrages, [], H, NOW);
  const rows = compagnieTable(dossiers, chiffrages, sla, NOW, DAYS);
  assert.deepEqual(rows.map((r) => r.label), ['RMA', 'Non renseigné', 'Wafa']);
  const rma = rows[0];
  assert.equal(rma.volume, 2);
  assert.equal(rma.share, 50);
  assert.equal(rma.enCours, 1);
  assert.equal(rma.delaiP50, 10);
  assert.equal(rma.delaiP90, 10);
  assert.equal(rma.sinistreRequeteP50, null);
  assert.deepEqual(rma.firstPass, { pct: 100, num: 1, den: 1 });
  assert.equal(rma.slaOnTime.den, 3, 'creation a, creation b, chiffrage b closed in the window');
  assert.equal(rma.slaOnTime.pct, 100);
  assert.equal(rma.ead.pct, 0);
  const wafa = rows[2];
  assert.deepEqual(wafa.ead, { pct: 100, num: 1, den: 1 });
  assert.equal(wafa.firstPass.pct, null);
});

test('terrainQuality: visite le jour du RDV, pointage, replanifiées, préavis, délai photos', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', { datePhotosAvant: T(11, -1) }),
    dossier('b', { datePhotosEnCours: T(10, -2) }),
    dossier('c'),
  ];
  const missions: DashboardMission[] = [
    // Planned Sunday, RDV Monday 10:00, photos Monday 11:00, check-in present.
    { id: 'm1', dossierId: 'a', agentTerrain: 'Ali', typeMission: 'Avant', createdAt: T(9, -2), dateRDV: T(10, -1), checkinAt: T(10, -1) },
    // Planned Friday, RDV Saturday, photos Sunday → not the RDV day, no check-in.
    { id: 'm2', dossierId: 'b', agentTerrain: 'Ali', typeMission: 'En cours', createdAt: T(9, -4), dateRDV: T(9, -3) },
    // Deactivated and superseded by m4.
    { id: 'm3', dossierId: 'c', agentTerrain: 'Sara', typeMission: 'Avant', createdAt: T(9, -5), dateRDV: T(9, -4), active: false },
    { id: 'm4', dossierId: 'c', agentTerrain: 'Sara', typeMission: 'Avant', createdAt: T(9, -3) },
    // Outside the window.
    { id: 'm5', dossierId: 'b', agentTerrain: 'Ali', typeMission: 'Avant', createdAt: T(9, -40), dateRDV: T(9, -39) },
  ];
  const q = terrainQuality(missions, dossiers, H, NOW, DAYS);
  assert.deepEqual(q.visiteJourRdv, { pct: 50, num: 1, den: 2 });
  assert.deepEqual(q.pointageGps, { pct: 50, num: 1, den: 2 });
  assert.deepEqual(q.replanifiees, { pct: 25, num: 1, den: 4 });
  assert.equal(q.preavis.n, 3);
  assert.equal(q.preavis.p50, 1);
  assert.deepEqual(q.photosDelaiHours.values, [11, 15]);
  assert.equal(q.photosDelaiHours.p50, 13);

  const sara = terrainQuality(missions, dossiers, H, NOW, DAYS, (m) => m.agentTerrain === 'Sara');
  assert.equal(sara.pointageGps.pct, null);
  assert.deepEqual(sara.replanifiees, { pct: 50, num: 1, den: 2 });
});

test('touchesPerDossier counts distinct human users on closed dossiers', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', { dateRapportDepose: T(9, -2) }),
    dossier('b', { dateRapportDepose: T(9, -3) }),
    dossier('c'),
  ];
  const logs: WorkflowLog[] = [
    { _dossierId: 'a', user: 'g1@x' },
    { _dossierId: 'a', user: 'System' },
    { _dossierId: 'a', user: 'karim@x' },
    { _dossierId: 'a', user: 'G1@x' },
    { _dossierId: 'b', user: 'system' },
    { _dossierId: 'c', user: 'x@x' },
    { user: 'y@x' },
  ];
  const d = touchesPerDossier(logs, dossiers, NOW, DAYS);
  assert.equal(d.n, 1, 'b has only system logs, c is open');
  assert.deepEqual(d.values, [2]);
});

test('intakeHeat: Monday-based weekday × hour 8–19', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', { createdAt: T(9) }),
    dossier('b', { createdAt: T(9) }),
    dossier('c', { createdAt: T(7, -1) }), // 07:00 → dropped
    dossier('d', { createdAt: T(14, -3) }), // Saturday
  ];
  const heat = intakeHeat(dossiers, NOW, DAYS);
  assert.equal(heat.cells.length, 7 * 12);
  assert.equal(heat.max, 2);
  assert.equal(heat.cells.find((c) => c.weekday === 1 && c.hour === 9)?.count, 2);
  assert.equal(heat.cells.find((c) => c.weekday === 5 && c.hour === 14)?.count, 1);
  assert.equal(heat.cells.reduce((n, c) => n + c.count, 0), 3);
});

test('photosToChiffrageOpen and creationToPlanif24, with and without a person', () => {
  const dossiers: FunnelDossier[] = [
    dossier('a', { datePhotosAvant: T(9, -1), createdAt: T(9, -1) }),
    dossier('b', { datePhotosAvant: T(9), createdBy: 'uid-other', createdAt: T(9, -4) }),
    dossier('c', { datePhotosAvant: T(9, -1) }),
    dossier('d', { datePhotosAvant: T(9, -3), dateRapportDepose: T(9, -1) }),
    dossier('e'),
  ];
  const chiffrages: DashboardChiffrage[] = [{ id: 'c1', dossierId: 'c', createdAt: T(10, -1), files: [1] }];
  const open = photosToChiffrageOpen(dossiers, chiffrages, H, NOW);
  assert.deepEqual(open.map((i) => [i.dossier.id, i.sinceHours]), [
    ['a', 30],
    ['b', 6],
  ]);
  assert.deepEqual(photosToChiffrageOpen(dossiers, chiffrages, H, NOW, g1).map((i) => i.dossier.id), ['a']);

  const missions: DashboardMission[] = [
    { id: 'm1', dossierId: 'a', typeMission: 'Avant', createdAt: T(10, -1) }, // 1 h
    { id: 'm2', dossierId: 'b', typeMission: 'Avant', createdAt: T(12) }, // Fri 09:00 → Tue 12:00 = 51 h
  ];
  assert.deepEqual(creationToPlanif24(dossiers, missions, H, NOW, DAYS), { pct: 50, num: 1, den: 2 });
  assert.deepEqual(creationToPlanif24(dossiers, missions, H, NOW, DAYS, g1), { pct: 100, num: 1, den: 1 });
});

test('computeDirectionView: empty and garbage input never throw', () => {
  const empty = computeDirectionView(
    { dossiers: [], chiffrages: [], missions: [], workflowLogs: [], sla: [], holidays: H },
    NOW,
    DAYS,
  );
  assert.equal(empty.days, DAYS);
  assert.equal(empty.window.to, NOW);
  assert.equal(empty.lead.n, 0);
  assert.equal(empty.ladder.length, 9);
  assert.equal(empty.flow.length, 13);
  assert.equal(empty.closing, null);
  assert.equal(empty.firstPass.rate.pct, null);
  assert.deepEqual(empty.firstPassByCompagnie, []);
  assert.equal(empty.revisionHours.n, 0);
  assert.equal(empty.devis.accordHT, null);
  assert.equal(empty.devisRates.economieHT, null);
  assert.deepEqual(empty.compagnies, []);
  assert.deepEqual(empty.natures, []);
  assert.equal(empty.ead.pct, null);
  assert.equal(empty.reforme.rate.pct, null);
  assert.equal(empty.terrain.pointageGps.pct, null);
  assert.equal(empty.touches.n, 0);
  assert.equal(empty.facture48.pct, null);
  assert.deepEqual(empty.unbilled, []);
  assert.equal(empty.heat.max, 0);
  assert.equal(empty.slaOnTime.pct, null);
  assert.deepEqual([empty.enCours, empty.recus, empty.termines, empty.recusPrev, empty.terminesPrev], [0, 0, 0, 0, 0]);

  const garbage = computeDirectionView(
    {
      dossiers: [
        dossier('a', { createdAt: 'garbage', vehicule: { mec: {} }, dateSinistre: 42, dateRapportDepose: T(9, -1) }),
        dossier('b', { createdAt: T(9, -45), dateRapportDepose: T(9, -35) }),
        null as any,
      ],
      chiffrages: [
        { id: 'c1', dossierId: 'a', createdAt: T(9, -1), completedAt: T(12, -1), files: [1], structuredEditables: { 'Devis accordé': { rows: 'nope' } as any } },
        { id: 'c2', dossierId: '', createdAt: {} as any },
      ],
      missions: [{ id: 'm1', dossierId: 'a', typeMission: 'bizarre', createdAt: 'x', dateRDV: 7 as any }],
      workflowLogs: [{ _dossierId: 'a', user: undefined }],
      sla: buildDashboardSla([dossier('a')], [], [], H, NOW),
      holidays: H,
    },
    NOW,
    DAYS,
  );
  assert.equal(garbage.termines, 1);
  assert.equal(garbage.terminesPrev, 1);
  assert.equal(garbage.recus, 0);
  assert.equal(garbage.devis.dossiers, 0);
});
