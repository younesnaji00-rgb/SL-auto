// Run: npx tsx --test "src/app/(app)/dashboard/__tests__/metrics.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentRounds,
  buildDashboardSla,
  chiffrageOwnedBy,
  computeChiffreurView,
  computeGestionnaireView,
  computeTeamView,
  computeTerrainView,
  dossierOwnedBy,
  lastMovementAt,
  missionOwnedBy,
  quartiles,
} from '../metrics';
import type { FunnelDossier } from '../../monitoring/funnel';
import type { DashboardChiffrage, DashboardMission, DashboardUser } from '../use-dashboard-data';

// Tuesday 2026-03-10 09:00 — a plain business week, no Moroccan holiday.
const T = (h: number, dayOffset = 0) => new Date(2026, 2, 10 + dayOffset, h, 0, 0);
const NOW = T(15); // Tuesday 15:00
const H: ReadonlySet<string> = new Set();

const dossier = (id: string, extra: Partial<FunnelDossier> & Record<string, any> = {}): FunnelDossier => ({
  id,
  compagnie: 'RMA',
  createdAt: T(9, -1),
  createdBy: 'uid-g1',
  dateRequete: T(8, -1),
  ...extra,
});

const g1 = { uid: 'uid-g1', nom: 'Gest Un', email: 'g1@x' };

test('ownership: uid first, then legacy name/email', () => {
  assert.ok(dossierOwnedBy(dossier('a') as any, g1));
  assert.ok(dossierOwnedBy({ id: 'b', createdBy: 'other', createdByName: 'GEST UN ' } as any, g1));
  assert.ok(dossierOwnedBy({ id: 'c', createdBy: 'other', createdByName: 'g1@x' } as any, g1));
  assert.equal(dossierOwnedBy({ id: 'd', createdBy: 'other' } as any, g1), false);
  assert.ok(chiffrageOwnedBy({ id: 'c1', dossierId: 'a', assignedChiffreurNom: 'karim' }, { uid: 'u', nom: 'Karim' }));
  assert.ok(missionOwnedBy({ id: 'm1', dossierId: 'a', agentTerrainUid: 'u' }, { uid: 'u' }));
  assert.equal(missionOwnedBy({ id: 'm1', dossierId: 'a', agentTerrain: 'Ali' }, { uid: 'u', nom: 'Sara' }), false);
});

test('lastMovementAt is the latest dated field on the document', () => {
  const d = dossier('a', { datePhotosAvant: T(11), lastStatusChange: { at: T(12), status: 'Accord' }, lastObservation: { at: T(10) } });
  assert.equal(lastMovementAt(d)?.getTime(), T(12).getTime());
});

test('gestionnaire: à traiter vs en attente, tiles and stale', () => {
  const dossiers: FunnelDossier[] = [
    // Fresh dossier, visit not planned → « Visite avant à planifier » (my action).
    dossier('a', { createdAt: T(9), dateRequete: T(8) }),
    // Visit planned yesterday, photos awaited → waiting on the agent.
    dossier('b', { dateDemandeExpertiseAvant: T(10, -1) }),
    // Closed last week (rapport déposé 3 days ago) and one 10 days ago.
    dossier('c', { datePhotosAvant: T(9, -6), dateRapportDepose: T(9, -3) }),
    dossier('d', { datePhotosAvant: T(9, -12), dateRapportDepose: T(9, -10) }),
    // Someone else's dossier — invisible to g1.
    dossier('e', { createdBy: 'uid-other' }),
    // Stale: created 5 business days ago, no movement since.
    dossier('f', { createdAt: T(9, -7), dateRequete: T(8, -7) }),
  ];
  const sla = buildDashboardSla(dossiers, [], [], H, NOW);
  const v = computeGestionnaireView(dossiers, sla, [{ id: 'r1', recipientUid: 'uid-g1', senderUid: 's', dossierId: 'a', read: false, createdAt: T(9) } as any], H, NOW, g1);
  assert.equal(v.tiles.enCours, 3, 'a, b, f open · e excluded · c/d closed');
  assert.ok(v.aTraiter.some((w) => w.dossier.id === 'a' && w.todo.id === 'visit-4'));
  const agent = v.enAttente.find((g) => g.party === 'agent')!;
  assert.equal(agent.count, 1);
  assert.equal(agent.oldest?.dossier.id, 'b');
  assert.equal(v.tiles.termines7, 1);
  assert.equal(v.tiles.termines7Prev, 1);
  assert.equal(v.tiles.rappelsNonLus, 1);
  assert.ok(v.sansMouvement.some((w) => w.dossier.id === 'f'));
  assert.equal(v.sansMouvement.some((w) => w.dossier.id === 'a'), false);
  assert.equal(v.ageBuckets.reduce((n, b) => n + b.count, 0), 3);
});

test('chiffreur: bands mirror the queue, revisions by round, tiles', () => {
  const dossiers = [dossier('a'), dossier('b')];
  const chiffrages: DashboardChiffrage[] = [
    // First assignment of dossier a, sent Friday 09:00 and still open → En retard.
    { id: 'c1', dossierId: 'a', assignedChiffreurNom: 'Karim', createdAt: T(9, -4), files: [1] },
    // Sent today 10:00 → 5 h elapsed, 19 h left, deadline falls tomorrow → À venir.
    { id: 'c2', dossierId: 'b', assignedChiffreurNom: 'Karim', createdAt: T(10), files: [1] },
    // Second assignment of dossier a (a revision), completed on time 2 days ago.
    { id: 'c3', dossierId: 'a', assignedChiffreurNom: 'Karim', createdAt: T(9, -3), completedAt: T(12, -3), files: [1] },
    // No files → not in the queue.
    { id: 'c4', dossierId: 'b', assignedChiffreurNom: 'Karim', createdAt: T(9), files: [] },
    // Someone else's.
    { id: 'c5', dossierId: 'a', assignedChiffreurNom: 'Sara', createdAt: T(9), files: [1] },
  ];
  const rounds = assignmentRounds(chiffrages);
  assert.equal(rounds.get('c1'), 1);
  assert.equal(rounds.get('c3'), 2);
  const v = computeChiffreurView(chiffrages, dossiers, H, NOW, { uid: 'u-k', nom: 'karim' });
  assert.equal(v.queue.length, 2);
  assert.equal(v.queue[0].chiffrage.id, 'c1', 'breached first');
  assert.equal(v.queue[0].band, 'En retard');
  assert.equal(v.queue[1].band, 'À venir');
  assert.equal(v.tiles.horsDelai, 1);
  assert.equal(v.tiles.enAttente, 2);
  assert.equal(v.tiles.termines7, 1);
  assert.equal(v.tiles.dansDelais30.pct, 100);
  assert.equal(v.revisions30.revisions, 1);
  assert.equal(v.revisions30.total, 3);
});

test('terrain: next, today, late, tomorrow, photos à envoyer', () => {
  const dossiers = [dossier('a'), dossier('b', { datePhotosAvant: T(11) }), dossier('c'), dossier('d')];
  const missions: DashboardMission[] = [
    // Today 16:00, not done → next.
    { id: 'm1', dossierId: 'a', agentTerrain: 'Ali', typeMission: 'Avant', dateRDV: T(16), createdAt: T(9) },
    // Today 10:00, photos taken at 11:00 → done.
    { id: 'm2', dossierId: 'b', agentTerrain: 'Ali', typeMission: 'Avant', dateRDV: T(10), createdAt: T(9) },
    // Yesterday 14:00, no photos → late (RDV passed).
    { id: 'm3', dossierId: 'c', agentTerrain: 'Ali', typeMission: 'En cours', dateRDV: T(14, -1), createdAt: T(9, -1), checkinAt: T(14, -1) },
    // Tomorrow 09:00.
    { id: 'm4', dossierId: 'd', agentTerrain: 'Ali', typeMission: 'Après', dateRDV: T(9, 1), createdAt: T(9) },
    // Someone else's.
    { id: 'm5', dossierId: 'd', agentTerrain: 'Sara', typeMission: 'Avant', dateRDV: T(9), createdAt: T(9) },
  ];
  const v = computeTerrainView(missions, dossiers, H, NOW, { uid: 'u-ali', nom: 'ALI' });
  assert.equal(v.next?.mission.id, 'm1');
  assert.deepEqual(v.today.map((x) => x.mission.id), ['m1']);
  assert.deepEqual(v.late.map((x) => x.mission.id), ['m3']);
  assert.equal(v.late[0].lateReason, 'rdv');
  assert.deepEqual(v.tomorrow.map((x) => x.mission.id), ['m4']);
  assert.deepEqual(v.photosAEnvoyer.map((x) => x.mission.id), ['m3']);
  assert.equal(v.tiles.semaineFaites, 1);
  assert.equal(v.tiles.semainePlanifiees, 4);
});

test('team view: per-person rows, exceptions and quartiles', () => {
  const users: DashboardUser[] = [
    { id: 'u-k', nom: 'Karim', role: 'Chiffreur' },
    { id: 'u-s', nom: 'Sara', role: 'Chiffreur' },
    { id: 'u-x', nom: 'Old', role: 'Chiffreur', statut: 'Inactif' },
    { id: 'u-g', nom: 'Gest', role: 'Gestionnaire' },
  ];
  const dossiers = [dossier('a'), dossier('b')];
  const chiffrages: DashboardChiffrage[] = [
    { id: 'c1', dossierId: 'a', assignedChiffreurNom: 'Karim', createdAt: T(9, -1), files: [1] },
    { id: 'c2', dossierId: 'b', assignedChiffreurNom: 'Sara', createdAt: T(10), files: [1] },
    { id: 'c3', dossierId: 'b', createdAt: T(10), files: [1] },
  ];
  const sla = buildDashboardSla(dossiers, chiffrages, [], H, NOW);
  const v = computeTeamView('Chiffreur', users, { dossiers, chiffrages, missions: [], sla, holidays: H }, NOW);
  assert.equal(v.perPerson.length, 2, 'inactive users excluded');
  assert.equal(v.perPerson[0].user.nom, 'Karim', 'most late first');
  assert.equal(v.tiles.enRetard, 1);
  assert.equal(v.tiles.third, 1, 'c3 unassigned');
  assert.equal(v.exceptions.length, 1);
  assert.equal(v.exceptions[0].href, '/assignations-chiffrage/c1');
  assert.deepEqual(quartiles([1, 2, 3, 4, 5, 6, 7, 8]), { q1: 2.5, med: 4.5, q3: 6.5 });
  assert.deepEqual(quartiles([3]), { q1: 3, med: 3, q3: 3 });
});
