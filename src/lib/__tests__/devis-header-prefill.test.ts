// Run: npx tsx --test src/lib/__tests__/devis-header-prefill.test.ts
//
// QA Chiffreur 010 (2026-10-05, dossier D689339): the chiffreur's editor
// showed Client « Autre », Assurances « RMA » and the garage's phone, read off
// the garage devis, while the dossier says RISKO CAR / ALLIANZ / 0661154584.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefillHeaderFromDossier } from '../devis-header-prefill';
import { emptyHeader } from '../devis-schema';

const scanned = {
  ...emptyHeader(),
  marque: 'HYUNDAI ACCENT', matricule: '52297 -B- 7', modele: 'ACCENT',
  client: 'Autre', adresse: 'casablanca', ice: '60299053100015',
  telephone: '0600351034', assurances: 'RMA', dateDevis: '22/02/2026',
};
const dossier = {
  compagnie: 'ALLIANZ',
  matricule: '52297-B-7',
  assure: { nom: 'RISKO CAR', prenom: '', telephone: '0661154584', adresse: 'CASABLANCA' },
  vehicule: { marque: 'Hyundai', modele: 'ACCENT', serie: '', km: '' },
  expertRank: '1er',
  experts: { '1er': { nom: 'S. El Mouahid' } },
};

test('every field the dossier knows comes from the dossier', () => {
  const h = prefillHeaderFromDossier(scanned, dossier);
  assert.equal(h.client, 'RISKO CAR');
  assert.equal(h.assurances, 'ALLIANZ');
  assert.equal(h.telephone, '0661154584');
  assert.equal(h.adresse, 'CASABLANCA');
  assert.equal(h.marque, 'Hyundai');
  assert.equal(h.matricule, '52297-B-7');
  assert.equal(h.expert, 'S. El Mouahid');
});

test('the scan only fills what the dossier leaves blank', () => {
  const h = prefillHeaderFromDossier(scanned, dossier);
  assert.equal(h.ice, '60299053100015');
  assert.equal(h.dateDevis, '22/02/2026');
  assert.equal(h.kilometrage, '');
  const withKm = prefillHeaderFromDossier({ ...scanned, kilometrage: '85 000' }, dossier);
  assert.equal(withKm.kilometrage, '85 000');
});

test('a stale saved header is refreshed from the corrected dossier', () => {
  const saved = { ...emptyHeader(), assurances: 'RMA', client: 'RISKO' };
  const h = prefillHeaderFromDossier(saved, dossier);
  assert.equal(h.assurances, 'ALLIANZ');
  assert.equal(h.client, 'RISKO CAR');
});

test('legacy string assuré and the arbitre expert are read', () => {
  const h = prefillHeaderFromDossier(emptyHeader(), {
    assure: 'M. ALAMI', expertRank: 'arbitre', experts: { '1er': { nom: 'A' }, arbitre: { nom: 'B' } },
  });
  assert.equal(h.client, 'M. ALAMI');
  assert.equal(h.expert, 'B');
});
