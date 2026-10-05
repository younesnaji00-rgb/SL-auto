// Run: npx tsx --test src/lib/__tests__/prefill-sources.test.ts
//
// QA 055: « Pré-remplir les informations » stayed grey after a document was
// dropped and analysed, because it only counted files the AI had filed as a
// mission letter, constat, carte grise or attestation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefillSources, UNCLASSIFIED_LABEL } from '../doc-classes';

const row = (id: string, type: string) => ({ id, type });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

test('the files of a pre-fill class are read, the others are left out', () => {
  const rows = [row('photo', 'Photo du véhicule'), row('mission', 'Lettre de mission'), row('cg', 'Carte grise')];
  assert.deepEqual(ids(prefillSources(rows)), ['mission', 'cg']);
});

test('a document the AI filed under another class still pre-fills', () => {
  assert.deepEqual(ids(prefillSources([row('autre', 'Autre')])), ['autre']);
  assert.deepEqual(ids(prefillSources([row('devis', 'Devis Garage'), row('photo', 'Photo du véhicule')])), ['devis', 'photo']);
});

test('a document the AI could not classify still pre-fills', () => {
  assert.deepEqual(ids(prefillSources([row('x', UNCLASSIFIED_LABEL)])), ['x']);
});

test('nothing dropped, nothing to read', () => {
  assert.deepEqual(prefillSources([]), []);
});
