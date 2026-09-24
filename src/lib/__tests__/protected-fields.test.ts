// Run: npx tsx --test src/lib/__tests__/protected-fields.test.ts
//
// QA bugs 015 / 040, owner rulings 2026-09-24: an obligatory / important
// field that was saved with a value can be replaced, never emptied.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearedProtectedPaths, isBlankFieldValue } from '../field-validation';

// The information tab's protected list: every « Informations Dossier » and
// « Véhicule » field, plus the assuré's name, phone, CIN and address.
const PATHS = [
  'compagnie', 'typeDossier', 'nature', 'statut', 'refExpert', 'referenceCompagnie', 'matricule',
  'policeNumber', 'dateSinistre', 'dateRequete', 'expertRank',
  'vehicule.marque', 'vehicule.modele', 'vehicule.immatriculation', 'vehicule.serie', 'vehicule.energie',
  'vehicule.puissance', 'vehicule.mec', 'vehicule.km', 'vehicule.immatriculationAnterieur',
  'assure.nom', 'assure.telephone', 'assure.cin', 'assure.adresse',
];
const ts = (iso: string) => ({ toDate: () => new Date(iso), toMillis: () => Date.parse(iso) });

// As stored in Firestore.
const saved = {
  compagnie: 'RMA', nature: 'Classique', matricule: '1234-A-6', refExpert: 'SL-12',
  dateSinistre: ts('2026-08-30'), dateRequete: ts('2026-08-31'),
  vehicule: { marque: 'PEUGEOT', puissance: 7, mec: '2019-01-01T00:00:00.000Z', km: 0 },
  assure: { nom: 'Karim Alaoui', telephone: '+212 6 12 34 56 78', email: 'k@x.ma' },
};
// As the edit form holds it before any change.
const form = () => ({
  compagnie: 'RMA', typeDossier: '', nature: 'Classique', matricule: '1234-A-6', refExpert: 'SL-12',
  dateSinistre: new Date('2026-08-30'), dateRequete: new Date('2026-08-31'),
  vehicule: { marque: 'PEUGEOT', modele: '', puissance: '7', mec: new Date('2019-01-01'), km: '0' },
  assure: { nom: 'Karim Alaoui', telephone: '+212 6 12 34 56 78', cin: '', adresse: '', email: 'k@x.ma' },
});

test('an untouched form saves', () => {
  assert.deepEqual(clearedProtectedPaths(saved, form(), PATHS), []);
});

test('emptying a saved field is refused, whitespace included', () => {
  const f = form();
  f.assure.nom = '   ';
  f.matricule = '';
  assert.deepEqual(clearedProtectedPaths(saved, f, PATHS), ['matricule', 'assure.nom']);
});

test('replacing a saved value with another one saves', () => {
  const f = form();
  f.assure.nom = 'Karim El Alaoui';
  f.vehicule.marque = 'RENAULT';
  assert.deepEqual(clearedProtectedPaths(saved, f, PATHS), []);
});

test('a cleared date is refused (Timestamp saved, null in the form)', () => {
  const f: any = form();
  f.dateSinistre = null;
  assert.deepEqual(clearedProtectedPaths(saved, f, PATHS), ['dateSinistre']);
});

test('a saved number, even 0, cannot be blanked', () => {
  const f = form();
  f.vehicule.puissance = '';
  f.vehicule.km = '';
  assert.deepEqual(clearedProtectedPaths(saved, f, PATHS), ['vehicule.puissance', 'vehicule.km']);
});

test('fields never filled stay optional', () => {
  // typeDossier, modele, cin, adresse were blank when saved: leaving them blank is fine.
  assert.deepEqual(clearedProtectedPaths(saved, form(), ['typeDossier', 'vehicule.modele', 'assure.cin', 'assure.adresse']), []);
});

test('a field outside the protected list may be emptied', () => {
  const f = form();
  f.assure.email = '';
  assert.deepEqual(clearedProtectedPaths(saved, f, PATHS), []);
});

test('blank = missing, null or blank text only', () => {
  assert.equal(isBlankFieldValue(undefined), true);
  assert.equal(isBlankFieldValue(null), true);
  assert.equal(isBlankFieldValue(' \t'), true);
  assert.equal(isBlankFieldValue(0), false);
  assert.equal(isBlankFieldValue(new Date()), false);
});
