// Run: npx tsx --test src/lib/__tests__/dossier-steps.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStepStatuses, nextStep } from '../dossier-steps';

const byId = (states: ReturnType<typeof getStepStatuses>, id: number) => states.find((s) => s.id === id)!;

test('fresh dossier: mission done, everything else todo, 2ème accord blocked', () => {
  const s = getStepStatuses({ createdAt: new Date('2026-01-10'), createdBy: 'yn' });
  assert.equal(byId(s, 1).status, 'done');
  assert.equal(byId(s, 1).doneBy, 'yn');
  assert.equal(byId(s, 4).status, 'todo');
  assert.equal(byId(s, 6).status, 'todo');
  assert.equal(byId(s, 11).status, 'blocked');
  assert.equal(nextStep(s)?.id, 4);
});

test('visit planned but no photos → in progress; photos → done', () => {
  const planned = getStepStatuses({ createdAt: new Date(), dateDemandeExpertiseAvant: new Date('2026-02-01') });
  assert.equal(byId(planned, 4).status, 'in_progress');
  const done = getStepStatuses({ createdAt: new Date(), datePhotosAvant: { seconds: 1770000000 } });
  assert.equal(byId(done, 4).status, 'done');
  assert.ok(byId(done, 4).doneAt instanceof Date);
});

test('statut "Planification programmée en cours" marks visite en cours as in progress', () => {
  const s = getStepStatuses({ createdAt: new Date(), statut: 'Planification programmée en cours' });
  assert.equal(byId(s, 9).status, 'in_progress');
});

test('chiffrage sent → accord in progress; first accord reached → done and 2ème unblocked', () => {
  const sent = getStepStatuses({ createdAt: new Date(), statut: 'Chiffrage en cours', dateChiffrage: new Date('2026-03-01') });
  assert.equal(byId(sent, 6).status, 'in_progress');
  assert.equal(byId(sent, 11).status, 'blocked');
  const first = getStepStatuses({
    createdAt: new Date(),
    statut: 'Accord',
    firstAccordReachedAt: new Date('2026-03-02'),
    lastStatusChange: { status: 'Accord', at: new Date('2026-03-02'), by: 'chiffreur@x' },
  });
  assert.equal(byId(first, 6).status, 'done');
  assert.equal(byId(first, 6).doneBy, 'chiffreur@x');
  assert.equal(byId(first, 11).status, 'todo');
});

test('later accord round → 2ème accord done with author', () => {
  const s = getStepStatuses({
    createdAt: new Date(),
    statut: '2ème accord',
    firstAccordReachedAt: new Date('2026-03-02'),
    lastStatusChange: { status: '2ème accord', at: new Date('2026-03-10'), by: 'c2' },
  });
  assert.equal(byId(s, 11).status, 'done');
  assert.equal(byId(s, 11).doneBy, 'c2');
});

test('rapport: director validation = in progress, dépôt = done', () => {
  const v = getStepStatuses({ createdAt: new Date(), directorValidated: { at: new Date('2026-04-01'), by: 'dir' } });
  assert.equal(byId(v, 7).status, 'in_progress');
  const d = getStepStatuses({ createdAt: new Date(), dateRapportDepose: new Date('2026-04-03'), authorRapportDepose: 'g' });
  assert.equal(byId(d, 7).status, 'done');
  assert.equal(byId(d, 7).doneBy, 'g');
});

test('all 8 steps are always returned in business order', () => {
  const s = getStepStatuses({});
  assert.deepEqual(s.map((x) => x.id), [1, 4, 6, 9, 11, 10, 7, 8]);
});
