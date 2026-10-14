// Run: npx tsx --test src/lib/__tests__/required-on-save.test.ts
//
// Owner ruling 2026-10-14 (replacing QA GE-004 of 2026-10-05): the
// Informations save never leaves a required field blank — on every save, the
// first one included. The required fields are ONE list (lib/required-fields.ts)
// that the asterisks, the step rail and the to-do read too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankRequiredPaths, isBlankFieldValue, requiredOnSavePaths } from '../field-validation';
import { getMissingRequiredFields } from '../required-fields';

// As the edit form holds a filled-in dossier.
const form = () => ({
  compagnie: 'RMA', refExpert: 'SL-12', expertRank: '1er', matricule: '1234-A-6', nature: 'Classique',
  dateSinistre: new Date('2026-08-30') as Date | null,
  dateRequete: new Date('2026-08-31') as Date | null,
  experts: { '1er': { nom: 'Expert Un' }, '2ème': { nom: '' } } as Record<string, { nom: string }>,
  vehicule: { marque: 'PEUGEOT', km: '0', immatriculation: '' },
  assure: { nom: 'Karim Alaoui', telephone: '+212 6 12 34 56 78', cin: 'AB123456', adresse: 'Rue 1, Casablanca' },
});

test('the required list: réf, compagnie, nature, matricule, dates, the role expert, assuré, marque', () => {
  assert.deepEqual(requiredOnSavePaths('1er'), [
    'refExpert', 'compagnie', 'nature', 'matricule', 'dateSinistre', 'dateRequete',
    'experts.1er.nom', 'assure.nom', 'vehicule.marque',
  ]);
  assert.ok(requiredOnSavePaths('2ème').includes('experts.2ème.nom'));
  assert.ok(requiredOnSavePaths(undefined).includes('experts.1er.nom'));
});

test('a filled form saves', () => {
  assert.deepEqual(blankRequiredPaths(form(), '1er'), []);
});

test('every required field blocks a blank save', () => {
  const f = form();
  f.refExpert = ' ';
  f.compagnie = '';
  f.nature = '';
  f.matricule = '';
  f.dateSinistre = null;
  f.dateRequete = null;
  f.experts['1er'].nom = '';
  f.assure.nom = '';
  f.vehicule.marque = '';
  assert.deepEqual(blankRequiredPaths(f, '1er'), requiredOnSavePaths('1er'));
});

test('the véhicule immatriculation stands in for the matricule', () => {
  const f = form();
  f.matricule = '';
  f.vehicule.immatriculation = '1234-A-6';
  assert.deepEqual(blankRequiredPaths(f, '1er'), []);
});

test('fields outside the list can still be emptied (téléphone, CIN, adresse, km)', () => {
  const f = form();
  f.assure.telephone = '   ';
  f.assure.cin = '';
  f.assure.adresse = '';
  f.vehicule.km = '';
  assert.deepEqual(blankRequiredPaths(f, '1er'), []);
});

test('only the expert of the dossier role is required', () => {
  assert.deepEqual(blankRequiredPaths(form(), '1er'), []);
  assert.deepEqual(blankRequiredPaths(form(), '2ème'), ['experts.2ème.nom']);
});

test('the save gate and the step gate read the same list', () => {
  const dossier = { ...form(), assure: { nom: '' }, nature: '' };
  assert.deepEqual(getMissingRequiredFields(dossier), ['Nature du dossier', "Nom de l'assuré"]);
  assert.deepEqual(blankRequiredPaths(dossier, '1er'), ['nature', 'assure.nom']);
});

test('blank = missing, null or blank text only', () => {
  assert.equal(isBlankFieldValue(undefined), true);
  assert.equal(isBlankFieldValue(null), true);
  assert.equal(isBlankFieldValue(' \t'), true);
  assert.equal(isBlankFieldValue(0), false);
  assert.equal(isBlankFieldValue(new Date()), false);
});
