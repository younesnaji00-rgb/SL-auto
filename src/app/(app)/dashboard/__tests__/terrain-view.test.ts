// Run: npx tsx --test "src/app/(app)/dashboard/__tests__/terrain-view.test.ts"
//
// QA round 4, agent de terrain: AT 008 (visits whose photos were sent stayed
// under « Photos à envoyer ») and AT 010 (planned missions missing from
// « Prochaines missions »). The fixtures replay the tester's retest of
// 2026-10-01 17:08 on Z5678, 123345 and D689339.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTerrainView, type MissionPhotoIndex } from '../metrics';
import { photoTimesByPhase } from '@/lib/mission-photos';
import type { FunnelDossier } from '../../monitoring/funnel';
import type { DashboardMission } from '../use-dashboard-data';

const D = (month: number, day: number, h: number, min = 0) => new Date(2026, month - 1, day, h, min, 0);
const NOW = D(10, 1, 17, 8); // Thursday 1 October 2026, 17:08
const H: ReadonlySet<string> = new Set();
const AGENT = { uid: 'u-at', nom: 'agent de terrain' };

const dossier = (id: string, extra: Record<string, unknown> = {}): FunnelDossier =>
  ({ id, compagnie: 'ATLANTA', createdAt: D(9, 1, 9), ...extra }) as FunnelDossier;
const mission = (id: string, dossierId: string, typeMission: string, rdv: Date, extra: Record<string, unknown> = {}): DashboardMission =>
  ({ id, dossierId, agentTerrain: 'agent de terrain', agentTerrainUid: 'u-at', typeMission, dateRDV: rdv, createdAt: D(9, 1, 9), ...extra }) as DashboardMission;
const ids = (list: Array<{ mission: DashboardMission }>) => list.map((v) => v.mission.id);

test('AT 008: photos sent at the visit close it, stamped or not', () => {
  // Z5678: the agent's photos of 23/09 predate the stamping (no datePhotos*, no photosSentAt).
  const missions = [
    mission('zAvant23', 'z', 'Avant', D(9, 23, 15, 4), { createdAt: D(9, 23, 14), checkinAt: D(9, 23, 15, 10) }),
    mission('zEnCours23', 'z', 'En cours', D(9, 23, 16), { createdAt: D(9, 23, 12), checkinAt: D(9, 23, 12, 41) }),
  ];
  const photos: MissionPhotoIndex = new Map([
    ['z', { Avant: [D(9, 23, 15, 20), D(9, 23, 15, 21), D(9, 23, 15, 22)], 'En cours': [D(9, 23, 16, 10), D(9, 23, 16, 11)] }],
  ]);
  const v = computeTerrainView(missions, [dossier('z')], H, NOW, AGENT, photos);
  assert.deepEqual(ids(v.photosAEnvoyer), []);
  assert.deepEqual(ids(v.late), []);
  // Without the photos (stamps only), the same visits are the tester's two rows.
  const blind = computeTerrainView(missions, [dossier('z')], H, NOW, AGENT);
  assert.deepEqual(ids(blind.late).sort(), ['zAvant23', 'zEnCours23']);
});

test('AT 008: a later visit is not closed by photos taken before its RDV day', () => {
  // Z5678's second « Avant » visit (ven. 25), arrived at 10:19, no photo since 23/09.
  const missions = [
    mission('zAvant23', 'z', 'Avant', D(9, 23, 15, 4), { createdAt: D(9, 23, 14), checkinAt: D(9, 23, 15, 10) }),
    mission('zAvant25', 'z', 'Avant', D(9, 25, 12), { createdAt: D(9, 24, 10), checkinAt: D(9, 25, 10, 19) }),
  ];
  const photos: MissionPhotoIndex = new Map([['z', { Avant: [D(9, 23, 15, 20)] }]]);
  const v = computeTerrainView(missions, [dossier('z')], H, NOW, AGENT, photos);
  assert.deepEqual(ids(v.late), ['zAvant25'], 'RDV passé sans photos');
  assert.equal(v.late[0].lateReason, 'rdv');
  // Listed once, under « En retard » — not again under « Photos à envoyer ».
  assert.deepEqual(ids(v.photosAEnvoyer), []);
});

test('AT 008: today\'s arrived visit stays under « Photos à envoyer » until a photo is SENT', () => {
  const missions = [mission('p', 'p', 'Avant', D(10, 1, 11), { createdAt: D(10, 1, 8), checkinAt: D(10, 1, 11, 5) })];
  // Taken at 11:10 but still in the offline queue: not sent.
  const queued = new Map([['p', photoTimesByPhase([{ category: 'avant', url: null, pendingUpload: true, uploadedAt: D(10, 1, 11, 10) }])]]);
  assert.deepEqual(ids(computeTerrainView(missions, [dossier('p')], H, NOW, AGENT, queued).photosAEnvoyer), ['p']);
  const sent = new Map([['p', photoTimesByPhase([{ category: 'avant', url: 'https://x/p.jpg', uploadedAt: D(10, 1, 11, 10) }])]]);
  const v = computeTerrainView(missions, [dossier('p')], H, NOW, AGENT, sent);
  assert.deepEqual(ids(v.photosAEnvoyer), []);
  assert.equal(v.tiles.semaineFaites, 1);
});

test('AT 008: a stamp does not outlive the photos it stood for', () => {
  const missions = [mission('x', 'x', 'Avant', D(10, 1, 9), { createdAt: D(10, 1, 8), checkinAt: D(10, 1, 9), photosSentAt: D(10, 1, 9, 30) })];
  assert.deepEqual(ids(computeTerrainView(missions, [dossier('x')], H, NOW, AGENT, new Map([['x', {}]])).photosAEnvoyer), ['x'], 'photos deleted since');
  assert.deepEqual(ids(computeTerrainView(missions, [dossier('x')], H, NOW, AGENT).photosAEnvoyer), [], 'photos not loaded: the stamp stands');
});

test('a later upload closes an earlier, missed visit of the phase', () => {
  const missions = [
    mission('missed', 'r', 'Avant', D(9, 20, 10), { createdAt: D(9, 18, 10) }),
    mission('replanned', 'r', 'Avant', D(9, 30, 10), { createdAt: D(9, 25, 10) }),
  ];
  const v = computeTerrainView(missions, [dossier('r')], H, NOW, AGENT, new Map([['r', { Avant: [D(9, 30, 10, 30)] }]]));
  assert.deepEqual(ids(v.late), []);
});

test('AT 010: « Prochaines missions » holds every mission still to do, today\'s included', () => {
  const missions = [
    mission('123345', 'a', 'Avant', D(10, 1, 17), { createdAt: D(10, 1, 9) }),
    mission('D689339', 'd', 'Avant', D(10, 1, 19), { createdAt: D(10, 1, 17) }),
    mission('nextWeek', 'n', 'Après', D(10, 7, 10), { createdAt: D(9, 30, 9) }),
    mission('doneToday', 'b', 'Avant', D(10, 1, 10), { createdAt: D(10, 1, 8) }),
  ];
  const photos: MissionPhotoIndex = new Map([['a', {}], ['d', {}], ['n', {}], ['b', { Avant: [D(10, 1, 10, 20)] }]]);
  const v = computeTerrainView(missions, ['a', 'd', 'n', 'b'].map((id) => dossier(id)), H, NOW, AGENT, photos);
  assert.deepEqual(ids(v.upcoming), ['123345', 'D689339', 'nextWeek']);
  assert.equal(v.next?.mission.id, '123345', 'the hero is the first row');
  assert.deepEqual(ids(v.today), ['123345', 'D689339']);
});

test('AT 010: another visit\'s upload never closes a future visit of the same phase', () => {
  // The old upload stamped EVERY planification of the phase, the 07/10 one included.
  const missions = [
    mission('today', 'f', 'Avant', D(10, 1, 10), { createdAt: D(9, 30, 9), checkinAt: D(10, 1, 10), photosSentAt: D(10, 1, 10, 31) }),
    mission('oct7', 'f', 'Avant', D(10, 7, 10), { createdAt: D(9, 30, 9), photosSentAt: D(10, 1, 10, 31) }),
  ];
  const withPhotos = computeTerrainView(missions, [dossier('f')], H, NOW, AGENT, new Map([['f', { Avant: [D(10, 1, 10, 30)] }]]));
  assert.deepEqual(ids(withPhotos.upcoming), ['oct7']);
  // Stamps only (and the dossier's « dernières photos » of today): same answer.
  const stampsOnly = computeTerrainView(missions, [dossier('f', { datePhotosAvant: D(10, 1, 10, 30) })], H, NOW, AGENT);
  assert.deepEqual(ids(stampsOnly.upcoming), ['oct7']);
  assert.equal(stampsOnly.tiles.semaineFaites, 1);
});

test('an early visit flagged by the upload counts as done', () => {
  const missions = [mission('early', 'e', 'Avant', D(10, 5, 10), { createdAt: D(9, 29, 9), photosSentAt: D(10, 1, 9), photosSentEarly: true })];
  const v = computeTerrainView(missions, [dossier('e')], H, NOW, AGENT, new Map([['e', { Avant: [D(10, 1, 9)] }]]));
  assert.deepEqual(ids(v.upcoming), []);
  assert.equal(v.tiles.semaineFaites, 1);
});

test('without the photos, the dossier stamp counts from the RDV day on', () => {
  const missions = [
    mission('before', 'g', 'Avant', D(9, 29, 10), { createdAt: D(9, 26, 9) }),
    mission('after', 'g', 'En cours', D(9, 29, 14), { createdAt: D(9, 26, 9) }),
  ];
  const v = computeTerrainView(missions, [dossier('g', { datePhotosAvant: D(9, 28, 16), datePhotosEnCours: D(9, 29, 15) })], H, NOW, AGENT);
  assert.deepEqual(ids(v.late), ['before']);
});
