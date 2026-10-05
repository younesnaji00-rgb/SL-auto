// Run: npx tsx --test src/lib/__tests__/statut-fallback.test.ts
//
// Owner ruling 2026-10-05: once a dossier's garage devis and facture are all
// deleted, its statut falls back to the last one before the chiffrage phase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isChiffragePhaseStatus, statutBeforeChiffrage, statutOfHistoryEntry } from '../status-machine';
import { isEditableDocType } from '../devis-schema';

test('the chiffrage phase: chiffrage, accords, propositions, envoi, réforme', () => {
  for (const s of ['Chiffrage en cours', 'Accord', "Proposition d'accord", '2ème accord', "3ème proposition d'accord", '4ème accord', 'Accord envoyé', 'Réforme']) {
    assert.ok(isChiffragePhaseStatus(s), s);
  }
  for (const s of ['Création dossier', 'Planification programmée avant', 'Planification expertise après']) {
    assert.ok(!isChiffragePhaseStatus(s), s);
  }
});

test('the statut a history entry recorded', () => {
  assert.equal(statutOfHistoryEntry('Accord'), 'Accord');
  assert.equal(statutOfHistoryEntry('Statut changé en Réforme'), 'Réforme');
  assert.equal(statutOfHistoryEntry('  Planification expertise avant '), 'Planification expertise avant');
});

test('falls back to the newest statut before the chiffrage phase', () => {
  // Newest first, as the dossier's historique is read.
  assert.equal(
    statutBeforeChiffrage(['Accord', 'Chiffrage en cours', 'Planification expertise avant', 'Planification programmée avant', 'Création dossier']),
    'Planification expertise avant',
  );
  assert.equal(
    statutBeforeChiffrage(['Statut changé en Réforme', '2ème accord', 'Chiffrage en cours', 'Planification programmée après', 'Accord', 'Chiffrage en cours', 'Planification expertise avant']),
    'Planification programmée après',
  );
  assert.equal(statutBeforeChiffrage(['Chiffrage en cours', 'Création dossier']), 'Création dossier');
});

test('no statut before the chiffrage: nothing to read (the caller uses « Création dossier »)', () => {
  assert.equal(statutBeforeChiffrage(['Accord', 'Chiffrage en cours']), null);
  assert.equal(statutBeforeChiffrage([]), null);
});

test('only the garage devis and facture count, not their accords', () => {
  for (const t of ['Devis Garage', 'Facture Garage', 'Devis Garage 2', 'Facture Garage 3']) assert.ok(isEditableDocType(t), t);
  for (const t of ['Devis accordé', 'Facture accordé', 'Devis 2ème accord', 'Devis Garage 2 accordé', 'PV de constat', '']) {
    assert.ok(!isEditableDocType(t), t);
  }
});
