import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filled } from '../rapport-data';

// The rapport printed an empty « Immatriculation » although the dossier's
// Matricule was set: the Véhicule block's own field was '' and `??` stopped
// there (local copy, 2026-10-10).
test('a blank first source does not hide a filled one', () => {
  assert.equal(filled('', undefined, '12345-A-6'), '12345-A-6');
  assert.equal(filled('   ', null, 'Dacia'), 'Dacia');
});

test('the first filled source wins', () => {
  assert.equal(filled('AA-1', '12345-A-6'), 'AA-1');
});

test('nothing filled gives undefined; 0 and dates count as filled', () => {
  assert.equal(filled('', null, undefined), undefined);
  assert.equal(filled(0, 5), 0);
  const d = new Date('2026-10-01');
  assert.equal(filled('', d), d);
});
