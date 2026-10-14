import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMissingRequiredFields } from '../required-fields';

// A new dossier stores its assuré as a block of empty strings
// (create-empty-dossier.ts). Live check 2026-10-10: the step-1 banner listed
// 5 missing fields and never « Nom de l'assuré », so the later steps unlocked
// without an assuré name.
const base = {
  refExpert: 'SL-1',
  experts: { '1er': { nom: 'Expert Un' } },
  compagnie: 'ATLANTA',
  nature: 'Classique',
  vehicule: { marque: 'Dacia' },
  matricule: '12345-A-6',
  dateSinistre: '2026-10-01',
  dateRequete: '2026-10-02',
};

test('an empty assuré block is a missing « Nom de l\'assuré »', () => {
  const missing = getMissingRequiredFields({ ...base, assure: { nom: '', telephone: '', adresse: '' } });
  assert.deepEqual(missing, ["Nom de l'assuré"]);
});

test('a blank-only assuré name is still missing', () => {
  assert.deepEqual(getMissingRequiredFields({ ...base, assure: { nom: '   ' } }), ["Nom de l'assuré"]);
});

test('an assuré name in the block counts', () => {
  assert.deepEqual(getMissingRequiredFields({ ...base, assure: { nom: 'Ali Test' } }), []);
});

test('a legacy assuré string counts when not empty', () => {
  assert.deepEqual(getMissingRequiredFields({ ...base, assure: 'Ali Test' }), []);
  assert.deepEqual(getMissingRequiredFields({ ...base, assure: '' }), ["Nom de l'assuré"]);
});
