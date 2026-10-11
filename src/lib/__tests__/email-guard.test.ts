import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSendEmail, isStorageDownloadUrl, parseRecipients, safeAttachmentName, MAX_RECIPIENTS } from '../email-guard';

const BUCKET = 'demo-bucket.firebasestorage.app';
const FILE = `/v0/b/${BUCKET}/o/dossiers%2Fa%2Fdevis.pdf?alt=media&token=t`;

test('attachments: only download URLs of the app bucket', () => {
  assert.ok(isStorageDownloadUrl(`https://firebasestorage.googleapis.com${FILE}`, BUCKET));
  assert.ok(isStorageDownloadUrl(`http://127.0.0.1:9199${FILE}`, BUCKET, '127.0.0.1:9199'));
  assert.equal(isStorageDownloadUrl(`http://127.0.0.1:9199${FILE}`, BUCKET), false, 'emulator URL without the emulator');
  assert.equal(isStorageDownloadUrl(`http://firebasestorage.googleapis.com${FILE}`, BUCKET), false, 'plain http');
  assert.equal(isStorageDownloadUrl(`https://firebasestorage.googleapis.com/v0/b/other-bucket/o/x.pdf`, BUCKET), false, 'another bucket');
  assert.equal(isStorageDownloadUrl('https://example.com/devis.pdf', BUCKET), false, 'another site');
  assert.equal(isStorageDownloadUrl(`https://user:pw@firebasestorage.googleapis.com${FILE}`, BUCKET), false, 'credentials in the URL');
  assert.equal(isStorageDownloadUrl('not a url', BUCKET), false);
  assert.equal(isStorageDownloadUrl(undefined, BUCKET), false);
});

test('recipients: valid addresses, at most the limit', () => {
  assert.deepEqual(parseRecipients('a@rma.ma'), ['a@rma.ma']);
  assert.deepEqual(parseRecipients(' a@rma.ma ; b@wafa.ma, '), ['a@rma.ma', 'b@wafa.ma']);
  assert.equal(parseRecipients(''), null);
  assert.equal(parseRecipients('pas une adresse'), null);
  assert.equal(parseRecipients('a@rma.ma, b@'), null);
  assert.equal(parseRecipients('"x" <a@rma.ma>'), null);
  assert.equal(parseRecipients(Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => `u${i}@rma.ma`).join(',')), null);
  assert.equal(parseRecipients(42), null);
});

test('senders: every role but the agent de terrain side', () => {
  for (const r of ['Admin', 'Gestionnaire', 'Chiffreur', 'Directeur', 'Responsable des gestionnaires', 'Responsable des chiffreurs']) {
    assert.ok(canSendEmail(r), r);
  }
  for (const r of ['Agent de Terrain', 'agent de terrain', 'Responsable des agents de terrain', '', 'Inconnu', undefined]) {
    assert.equal(canSendEmail(r), false, String(r));
  }
});

test('attachment names: no path, no control characters', () => {
  assert.equal(safeAttachmentName('Devis accordé.pdf'), 'Devis accordé.pdf');
  assert.equal(safeAttachmentName('../../a/b.pdf'), 'b.pdf');
  assert.equal(safeAttachmentName('a\r\nBcc: x@y.z.pdf'), 'aBcc: x@y.z.pdf');
  assert.equal(safeAttachmentName(''), 'document.pdf');
});
