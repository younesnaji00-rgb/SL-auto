// Run: npx tsx --test src/lib/__tests__/first-accord.test.ts
//
// Owner ruling 2026-09-24: « 2ème accord et + » opens once the chiffreur has
// given the 1er accord OR proposition for BOTH the devis and the facture —
// decided from the documents, never from a flag that may be missing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstAccordState } from '../first-accord';
import { getStepStatuses } from '../dossier-steps';

const doc = (type: string, day = 1) => ({ type, url: 'https://x', dateUpload: new Date(Date.UTC(2026, 8, day)) });
// Création mission complete, so the required-field gate never interferes.
const dossier = {
  createdAt: new Date('2026-09-01'),
  compagnie: 'RMA',
  nature: 'Classique',
  vehicule: { marque: 'PEUGEOT' },
  matricule: '1234-A-6',
  assure: { nom: 'Client' },
  dateSinistre: new Date('2026-08-30'),
  dateRequete: new Date('2026-08-31'),
  dateChiffrage: new Date('2026-09-05'),
  statut: 'Chiffrage en cours',
};
const step = (docs: any[], d: any = dossier) =>
  getStepStatuses(d, { accord: firstAccordState(docs) }).find((s) => s.id === 11)!;

test('both sources, no answer yet → 2ème accord locked, both named', () => {
  const s = step([doc('Devis Garage'), doc('Facture Garage')]);
  assert.equal(s.status, 'blocked');
  assert.match(String(s.blockedReason), /devis et de la facture/);
});

test('devis answered only → still locked, facture named', () => {
  const s = step([doc('Devis Garage'), doc('Facture Garage'), doc('Devis accordé', 3)]);
  assert.equal(s.status, 'blocked');
  assert.match(String(s.blockedReason), /facture/);
});

test('devis accord + facture accord → unlocked (production D689339 / a123643 shape)', () => {
  const s = step([doc('Devis Garage'), doc('Facture Garage'), doc('Devis accordé', 3), doc('Facture accordé', 4)]);
  assert.notEqual(s.status, 'blocked');
});

test('propositions count as first-round answers', () => {
  const s = step([
    doc('Devis Garage'),
    doc('Facture Garage'),
    doc("1ère proposition d'accord (devis)", 3),
    doc("1ère proposition d'accord (facture)", 4),
  ]);
  assert.notEqual(s.status, 'blocked');
});

test('unlocks without the firstAccordReachedAt flag, even when the statut moved on', () => {
  const s = step(
    [doc('Devis Garage'), doc('Facture Garage'), doc('Devis accordé', 3), doc('Facture accordé', 4)],
    { ...dossier, statut: 'Planification programmée après' },
  );
  assert.notEqual(s.status, 'blocked');
});

test('a pending (not uploaded) answer does not count', () => {
  const s = step([doc('Devis Garage'), doc('Facture Garage'), doc('Devis accordé', 3), { type: 'Facture accordé', pendingUpload: true }]);
  assert.equal(s.status, 'blocked');
});

test('a devis-only dossier unlocks on the devis answer', () => {
  const s = step([doc('Devis Garage'), doc('Devis accordé', 3)]);
  assert.notEqual(s.status, 'blocked');
});

test('step 6 « 1er accord » is done exactly when step 11 unlocks', () => {
  const docs = [doc('Devis Garage'), doc('Facture Garage'), doc('Devis accordé', 3)];
  const partial = getStepStatuses(dossier, { accord: firstAccordState(docs) }).find((s) => s.id === 6)!;
  assert.equal(partial.status, 'in_progress');
  const full = getStepStatuses(dossier, { accord: firstAccordState([...docs, doc('Facture accordé', 4)]) }).find((s) => s.id === 6)!;
  assert.equal(full.status, 'done');
});
