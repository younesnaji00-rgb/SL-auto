// Run: npx tsx --test src/lib/__tests__/compagnie-name.test.ts
//
// Tester report 2026-10-14: the « risko car » dossier was in Consultation but
// not in Gestion des dossiers. The AI pre-fill had replaced its « RMA » with the
// document's « ALLIANZ », a spelling no account scope used.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalCompagnie, compagnieInScope, compagnieKey } from '../compagnie-name';

const LIST = ['Allianz', 'RMA', 'Sanlam', 'Wafa', 'ATLANTA', 'Fès RMA', 'Wafa Assurance', 'Zurich Assurance'];

test('the key ignores case, accents, punctuation and spacing', () => {
  assert.equal(compagnieKey('ALLIANZ'), compagnieKey(' allianz '));
  assert.equal(compagnieKey('Fès  RMA'), 'fes rma');
  assert.equal(compagnieKey('AXA-Assurance'), 'axa assurance');
  assert.equal(compagnieKey(null), '');
});

test('a scanned spelling snaps onto the list', () => {
  assert.equal(canonicalCompagnie('ALLIANZ', LIST), 'Allianz');
  assert.equal(canonicalCompagnie('ALLIANZ ASSURANCES MAROC', LIST), 'Allianz');
  assert.equal(canonicalCompagnie('fes rma', LIST), 'Fès RMA');
  assert.equal(canonicalCompagnie('RMA WATANYA', LIST), 'RMA');
  // An exact entry wins over a shorter one it contains.
  assert.equal(canonicalCompagnie('WAFA ASSURANCE', LIST), 'Wafa Assurance');
  assert.equal(canonicalCompagnie('Zurich', LIST), 'Zurich Assurance');
});

test('a name the list does not hold, or holds twice, gives no answer', () => {
  assert.equal(canonicalCompagnie('AXA', LIST), null);
  assert.equal(canonicalCompagnie('', LIST), null);
  assert.equal(canonicalCompagnie('ATLANTA SANAD', ['ATLANTA', 'Atlanta Assurance']), null);
});

test('scope: case-insensitive, blank and unknown compagnies stay visible', () => {
  const mine = ['RMA', 'Sanlam'];
  assert.equal(compagnieInScope('RMA', mine, LIST), true);
  assert.equal(compagnieInScope('rma ', mine, LIST), true);
  assert.equal(compagnieInScope('Allianz', mine, LIST), false);
  assert.equal(compagnieInScope('ALLIANZ', mine, LIST), false);
  // Blank: belongs to no scope in particular.
  assert.equal(compagnieInScope('', mine, LIST), true);
  // Not in the compagnies list at all: nobody could be given it, so everyone sees it.
  assert.equal(compagnieInScope('CAT', mine, LIST), true);
  // Without the list (still loading), an unknown name is out of scope.
  assert.equal(compagnieInScope('CAT', mine, null), false);
  // No limit on the account.
  assert.equal(compagnieInScope('Allianz', [], LIST), true);
  assert.equal(compagnieInScope('Allianz', undefined, LIST), true);
});
