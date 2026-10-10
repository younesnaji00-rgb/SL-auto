// Run: npx tsx --test src/lib/__tests__/dossier-steps.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStepStatuses, nextStep } from '../dossier-steps';

const byId = (states: ReturnType<typeof getStepStatuses>, id: number) => states.find((s) => s.id === id)!;

// Step 1 fields filled: since the step gating (QA 008) a dossier without them
// keeps every later step blocked, so the fixtures below that test later steps
// start from a complete Création mission.
const ready = {
  compagnie: 'ATLANTA',
  nature: 'Classique',
  vehicule: { marque: 'Dacia' },
  matricule: '12345-A-6',
  assure: { nom: 'Ali Test' },
  dateSinistre: '2026-01-01',
  dateRequete: '2026-01-02',
};

test('fresh dossier: mission done, everything else todo, 2ème accord blocked', () => {
  const s = getStepStatuses({ ...ready, createdAt: new Date('2026-01-10'), createdBy: 'yn' });
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
  const sent = getStepStatuses({ ...ready, createdAt: new Date(), statut: 'Chiffrage en cours', dateChiffrage: new Date('2026-03-01') });
  assert.equal(byId(sent, 6).status, 'in_progress');
  assert.equal(byId(sent, 11).status, 'blocked');
  const first = getStepStatuses({
    ...ready,
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

// QA #053: « 1er accord » stayed « Terminé » after the accord document was
// deleted — the step read the date stored when the round was first complete.
// With the documents at hand (the dossier page) the step follows them.
test('#053: the 1er accord step follows the documents; a deleted accord reopens it', () => {
  const dossier = {
    ...ready,
    createdAt: new Date(),
    statut: 'Accord',
    dateChiffrage: new Date('2026-03-01'),
    firstAccordReachedAt: new Date('2026-03-02'),
  };
  const gone = getStepStatuses(dossier, { accord: { complete: false, at: null, missing: ['Devis Garage'], required: ['Devis Garage'] } });
  assert.notEqual(byId(gone, 6).status, 'done');
  assert.equal(byId(gone, 11).status, 'blocked');
  const back = getStepStatuses(dossier, { accord: { complete: true, at: new Date('2026-03-02'), missing: [], required: ['Devis Garage'] } });
  assert.equal(byId(back, 6).status, 'done');
  assert.equal(byId(back, 11).status, 'todo');
  // Without the documents (lists, dashboards) the stored date still counts.
  assert.equal(byId(getStepStatuses(dossier), 6).status, 'done');
});

// « Mission » step stamp: the creator's name when one was stored, never an
// e-mail (the page resolves those through the accounts).
test('the Mission step carries the stored creator name, not an e-mail', () => {
  const named = getStepStatuses({ ...ready, createdAt: new Date(), createdBy: 'uid1', createdByName: 'gest un' });
  assert.equal(byId(named, 1).doneByNom, 'gest un');
  const mail = getStepStatuses({ ...ready, createdAt: new Date(), createdBy: 'uid1', createdByName: 'gest.un@sl-auto.app' });
  assert.equal(byId(mail, 1).doneByNom, null);
  assert.equal(byId(mail, 1).doneBy, 'uid1');
});
