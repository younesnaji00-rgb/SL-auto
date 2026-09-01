// Run: npx tsx --test src/lib/__tests__/dossier-todos.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStepStatuses } from '../dossier-steps';
import { computeRequiredDocsStatus } from '../required-docs';
import { actionableStep, getDossierTodos, listSome } from '../dossier-todos';

const complete = {
  createdAt: new Date('2026-01-10'),
  compagnie: 'AXA',
  nature: 'Matériel',
  vehicule: { marque: 'Dacia' },
  matricule: '12345-A-6',
  assure: { nom: 'Alami' },
  dateSinistre: '2026-01-05',
  dateRequete: '2026-01-08',
};

const allDocs = computeRequiredDocsStatus(
  ['PV-Constat / Récépissé de police', 'Carte grise', "Attestation d'assurance", 'Kilométrage', 'Numéro de chassis', 'Devis Garage'].map((type) => ({ type, url: 'x' })),
);

test('listSome caps the list with a +n', () => {
  assert.equal(listSome(['a', 'b']), 'a, b');
  assert.equal(listSome(['a', 'b', 'c', 'd', 'e']), 'a, b, c +2');
});

test('fresh dossier: missing fields, missing pièces, visite avant to plan', () => {
  const d = { createdAt: new Date('2026-01-10') };
  const todos = getDossierTodos(d, getStepStatuses(d), computeRequiredDocsStatus([]));
  assert.deepEqual(todos.map((t) => t.id), ['fields', 'docs', 'visit-4']);
  assert.match(todos[0].label, /^7 champs manquants$/);
  assert.equal(todos[0].action.kind, 'goto');
  assert.equal((todos[0].action as any).tab, 'informations');
  assert.equal(todos[1].label, '6 pièces manquantes');
  assert.equal((todos[1].action as any).tab, 'documents');
  assert.deepEqual(todos[2].action, { kind: 'planifier', stepId: 4, type: 'Avant' });
});

test('pièces still loading → no pièces row (never a wrong count)', () => {
  const d = { createdAt: new Date('2026-01-10') };
  const todos = getDossierTodos(d, getStepStatuses(d), null);
  assert.ok(!todos.some((t) => t.id === 'docs'));
});

test('visit planned, no photos yet → waiting on photos', () => {
  const d = { ...complete, dateDemandeExpertiseAvant: new Date('2026-02-01') };
  const todos = getDossierTodos(d, getStepStatuses(d), allDocs);
  assert.equal(todos.length, 1);
  assert.equal(todos[0].id, 'photos-4');
  assert.equal(todos[0].waiting, true);
  assert.equal(todos[0].detail, 'Visite planifiée le 01/02/2026');
  assert.deepEqual(todos[0].action, { kind: 'goto', stepId: 4, tab: 'photos' });
});

test('photos in → send to chiffrage; pièces missing → the row says so', () => {
  const d = { ...complete, datePhotosAvant: new Date('2026-02-02') };
  const ready = getDossierTodos(d, getStepStatuses(d), allDocs);
  assert.deepEqual(ready.map((t) => t.id), ['chiffrage-1']);
  assert.equal(ready[0].detail, undefined);
  const notReady = getDossierTodos(d, getStepStatuses(d), computeRequiredDocsStatus([]));
  assert.deepEqual(notReady.map((t) => t.id), ['docs', 'chiffrage-1']);
  assert.equal(notReady[1].detail, 'Dès que les pièces requises sont reçues');
});

test('chiffrage sent → waiting on the 1er accord', () => {
  const d = { ...complete, datePhotosAvant: new Date('2026-02-02'), statut: 'Chiffrage en cours', dateChiffrage: new Date('2026-03-01') };
  const todos = getDossierTodos(d, getStepStatuses(d), allDocs);
  assert.deepEqual(todos.map((t) => t.id), ['accord-1']);
  assert.equal(todos[0].waiting, true);
});

test('after the 1er accord the optional 2ème accord is skipped: visite en cours is next', () => {
  const d = {
    ...complete,
    datePhotosAvant: new Date('2026-02-02'),
    statut: 'Accord',
    firstAccordReachedAt: new Date('2026-03-02'),
    lastStatusChange: { status: 'Accord', at: new Date('2026-03-02'), by: 'c' },
  };
  const steps = getStepStatuses(d);
  assert.equal(actionableStep(steps)?.id, 9);
  const afterVisits = getStepStatuses({ ...d, datePhotosEnCours: new Date('2026-03-10'), datePhotosApres: new Date('2026-03-20') });
  assert.equal(actionableStep(afterVisits)?.id, 7);
  const todos = getDossierTodos(d, afterVisits, allDocs);
  assert.deepEqual(todos.map((t) => t.id), ['rapport-gen']);
});

test('everything done → nothing to do', () => {
  const d = {
    ...complete,
    datePhotosAvant: new Date('2026-02-02'),
    datePhotosEnCours: new Date('2026-03-10'),
    datePhotosApres: new Date('2026-03-20'),
    statut: 'Accord',
    firstAccordReachedAt: new Date('2026-03-02'),
    lastStatusChange: { status: 'Accord', at: new Date('2026-03-02'), by: 'c' },
    dateRapportDepose: new Date('2026-04-01'),
    dateNoteHonoraire: new Date('2026-04-05'),
  };
  assert.deepEqual(getDossierTodos(d, getStepStatuses(d), allDocs), []);
});
