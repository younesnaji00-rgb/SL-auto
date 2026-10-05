// Run: npx tsx --test "src/app/(app)/dashboard/__tests__/gestionnaire-view.test.ts"
//
// QA round 4, gestionnaire section (2026-10-05):
//   GE-006 — « En retard » on the dashboard is the dossiers list's own rule
//            (still to treat, created ≥ 7 j ago), not the 24 h assignment clock;
//   GE-007 — every open dossier lands in an « Âge des ouverts » bucket (a
//            requête dated in the future fell in none), and a saved edit
//            (`updatedAt`) ends « sans mouvement ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardSla, computeGestionnaireView, computeTeamView, lastMovementAt } from '../metrics';
import type { FunnelDossier } from '../../monitoring/funnel';
import type { DashboardUser } from '../use-dashboard-data';

// Tuesday 2026-03-10 15:00 — a plain business week, no Moroccan holiday.
const T = (h: number, dayOffset = 0) => new Date(2026, 2, 10 + dayOffset, h, 0, 0);
const NOW = T(15);
const H: ReadonlySet<string> = new Set();
const g1 = { uid: 'uid-g1', nom: 'Un', prenom: 'Gest', email: 'g1@x' };

const dossier = (id: string, extra: Partial<FunnelDossier> & Record<string, any> = {}): FunnelDossier => ({
  id,
  compagnie: 'RMA',
  statut: 'Création dossier',
  createdAt: T(9, -1),
  createdBy: 'uid-g1',
  dateRequete: T(8, -1),
  ...extra,
});

const view = (dossiers: FunnelDossier[]) =>
  computeGestionnaireView(dossiers, buildDashboardSla(dossiers, [], [], H, NOW), [], H, NOW, g1);

test('« En retard » counts the dossiers the list calls late (≥ 7 j, still to treat)', () => {
  const v = view([
    dossier('late', { createdAt: T(9, -8) }),
    dossier('edge', { createdAt: T(9, -7) }),
    dossier('young', { createdAt: T(9, -6) }),
    // Accord envoyé is the list's terminal statut: not « à traiter », not late.
    dossier('sent', { createdAt: T(9, -20), statut: 'Accord envoyé' }),
    // Someone else's dossier stays off this dashboard.
    dossier('other', { createdAt: T(9, -30), createdBy: 'uid-other' }),
  ]);
  assert.equal(v.tiles.enRetard, 2);
  assert.deepEqual(v.lateDossiers.map((d) => d.id), ['late', 'edge'], 'oldest first');
});

test('« Par étape » marks the same late dossiers in red', () => {
  const v = view([dossier('late', { createdAt: T(9, -10) }), dossier('young', { createdAt: T(9, -1) })]);
  const lateInSteps = v.parEtape.reduce((n, s) => n + s.late, 0);
  assert.equal(lateInSteps, v.tiles.enRetard);
});

test('every open dossier lands in exactly one age bucket, a future requête included', () => {
  const v = view([
    // The tester's dossier: created today, requête typed 3 days ahead.
    dossier('future', { createdAt: T(9), dateRequete: T(9, 3) }),
    dossier('normal', { createdAt: T(9, -20), dateRequete: T(9, -20) }),
    dossier('noRequete', { createdAt: T(9, -40), dateRequete: null }),
  ]);
  const total = v.ageBuckets.reduce((n, b) => n + b.count, 0);
  assert.equal(total, v.openCount);
  assert.equal(v.ageBuckets.find((b) => b.key === '0-7')?.count, 1, 'the future requête counts from its creation');
  assert.equal(v.ageBuckets.find((b) => b.key === '16-30')?.count, 1);
  assert.equal(v.ageBuckets.find((b) => b.key === '31-60')?.count, 1);
});

test('a saved edit is a movement: « sans mouvement » ends with it', () => {
  const stuck = dossier('stuck', { createdAt: T(9, -7), dateRequete: T(8, -7) });
  assert.ok(view([stuck]).sansMouvement.some((w) => w.dossier.id === 'stuck'));
  const edited = { ...stuck, updatedAt: T(11) };
  assert.equal(lastMovementAt(edited)?.getTime(), T(11).getTime());
  assert.equal(view([edited]).sansMouvement.some((w) => w.dossier.id === 'stuck'), false);
});

test('the team « En retard » uses the same rule as the people', () => {
  const users: DashboardUser[] = [{ id: 'uid-g1', nom: 'Un', prenom: 'Gest', email: 'g1@x', role: 'Gestionnaire' }];
  const dossiers = [dossier('late', { createdAt: T(9, -9) }), dossier('young')];
  const sla = buildDashboardSla(dossiers, [], [], H, NOW);
  const team = computeTeamView('Gestionnaire', users, { dossiers, chiffrages: [], missions: [], sla, holidays: H }, NOW);
  assert.equal(team.tiles.enRetard, 1);
  assert.equal(team.perPerson[0]?.enRetard, 1);
});
