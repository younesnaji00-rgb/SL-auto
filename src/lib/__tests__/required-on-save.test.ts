// Run: npx tsx --test src/lib/__tests__/required-on-save.test.ts
//
// QA GE-004 (2026-10-05): a field's required-or-not status is the same at
// creation and on every later save. Only what the creation dialog demands —
// the reference, the compagnie and the role's expert name — blocks a blank
// save; every other field can be filled and emptied again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankRequiredPaths, isBlankFieldValue, requiredOnSavePaths } from '../field-validation';

// As the edit form holds a dossier that was filled in after creation.
const form = () => ({
  compagnie: 'RMA', refExpert: 'SL-12', expertRank: '1er', matricule: '1234-A-6', nature: 'Classique',
  dateSinistre: new Date('2026-08-30') as Date | null,
  experts: { '1er': { nom: 'Expert Un' }, '2ème': { nom: '' } } as Record<string, { nom: string }>,
  vehicule: { marque: 'PEUGEOT', km: '0' },
  assure: { nom: 'Karim Alaoui', telephone: '+212 6 12 34 56 78', cin: 'AB123456', adresse: 'Rue 1, Casablanca' },
});

test('the required list is what creation demands', () => {
  assert.deepEqual(requiredOnSavePaths('1er'), ['refExpert', 'compagnie', 'experts.1er.nom']);
  assert.deepEqual(requiredOnSavePaths('2ème'), ['refExpert', 'compagnie', 'experts.2ème.nom']);
  assert.deepEqual(requiredOnSavePaths(undefined), ['refExpert', 'compagnie', 'experts.1er.nom']);
});

test('a filled form saves', () => {
  assert.deepEqual(blankRequiredPaths(form(), '1er'), []);
});

test('fields optional at creation can be emptied again (assuré, véhicule, dates, matricule)', () => {
  const f = form();
  f.assure.nom = '';
  f.assure.telephone = '   ';
  f.assure.cin = '';
  f.assure.adresse = '';
  f.vehicule.marque = '';
  f.vehicule.km = '';
  f.matricule = '';
  f.nature = '';
  f.dateSinistre = null;
  assert.deepEqual(blankRequiredPaths(f, '1er'), []);
});

test('the reference, the compagnie and the role expert name stay required', () => {
  const f = form();
  f.refExpert = ' ';
  f.compagnie = '';
  f.experts['1er'].nom = '';
  assert.deepEqual(blankRequiredPaths(f, '1er'), ['refExpert', 'compagnie', 'experts.1er.nom']);
});

test('only the expert of the dossier role is required', () => {
  // The 2ème expert is blank, the dossier is « 1er expert »: nothing missing.
  assert.deepEqual(blankRequiredPaths(form(), '1er'), []);
  // Switched to « 2ème expert », its blank name is now the one missing.
  assert.deepEqual(blankRequiredPaths(form(), '2ème'), ['experts.2ème.nom']);
});

test('blank = missing, null or blank text only', () => {
  assert.equal(isBlankFieldValue(undefined), true);
  assert.equal(isBlankFieldValue(null), true);
  assert.equal(isBlankFieldValue(' \t'), true);
  assert.equal(isBlankFieldValue(0), false);
  assert.equal(isBlankFieldValue(new Date()), false);
});
