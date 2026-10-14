// Run: npx tsx --test src/lib/__tests__/upload-failure-report.test.ts
//
// Owner request 2026-10-14: which files, in which dossiers, did not go — seen
// by the user and by the owner from another device (`upload_failures`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceLabel, uploadKindOf, uploadSlotOf, uploadWhatLabel } from '../offline/upload-failure-report';

test('what the file was meant to become', () => {
  assert.equal(uploadKindOf({ firestoreDocPath: 'dossiers/a/photos' }), 'photo');
  assert.equal(uploadKindOf({ firestoreDocPath: 'dossiers/a/documents' }), 'document');
  assert.equal(uploadKindOf({ firestoreDocPath: 'dossiers/a/_pending_attachments' }), 'pièce jointe');
  assert.equal(uploadKindOf({ firestoreDocPath: 'chiffrages' }), 'devis');
});

test('the slot or photo phase, as the lists print it', () => {
  assert.equal(uploadSlotOf({ firestoreMetadata: { type: 'Devis Garage' } }), 'Devis Garage');
  assert.equal(uploadSlotOf({ firestoreMetadata: { category: 'en_cours' } }), 'en_cours');
  assert.equal(uploadSlotOf({ firestoreMetadata: {} }), null);
  assert.equal(uploadWhatLabel('photo', 'en_cours'), 'Photo · en cours');
  assert.equal(uploadWhatLabel('photo', 'apres'), 'Photo · après');
  assert.equal(uploadWhatLabel('document', 'Carte grise'), 'Carte grise');
  assert.equal(uploadWhatLabel('document', null), 'Document');
  assert.equal(uploadWhatLabel('pièce jointe', null), 'Pièce jointe d’un commentaire');
});

test('two devices of one account can be told apart', () => {
  assert.equal(deviceLabel('Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'), 'Android · Chrome');
  assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0'), 'Windows · Edge');
  assert.equal(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'), 'iPhone / iPad · Safari');
  assert.equal(deviceLabel(''), 'Appareil inconnu');
});
