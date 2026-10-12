// Run: npx tsx --test src/lib/__tests__/upload-status.test.ts
//
// Owner choice 2026-10-05: an upload the queue gave up on shows as not sent,
// with « Réessayer » / « Supprimer », instead of « en cours d'envoi » forever.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_UPLOAD_ATTEMPTS,
  describeUploadFailure,
  dossierIdOfPath,
  hasGivenUp,
  retryDelayMs,
} from '../offline/upload-status';

test('the queue gives up after the last automatic attempt, not before', () => {
  assert.equal(hasGivenUp({ retryCount: 0 }), false);
  assert.equal(hasGivenUp({ retryCount: MAX_UPLOAD_ATTEMPTS - 1 }), false);
  assert.equal(hasGivenUp({ retryCount: MAX_UPLOAD_ATTEMPTS }), true);
  // Items from before this change kept counting past the limit.
  assert.equal(hasGivenUp({ retryCount: MAX_UPLOAD_ATTEMPTS + 3 }), true);
});

test('automatic retries back off from 30 s and never wait more than 5 min', () => {
  assert.equal(retryDelayMs(1), 30_000);
  assert.equal(retryDelayMs(2), 60_000);
  assert.equal(retryDelayMs(4), 240_000);
  assert.equal(retryDelayMs(9), 300_000);
  assert.equal(retryDelayMs(0), 30_000);
});

test('the dossier an upload belongs to comes from its Firestore path', () => {
  assert.equal(dossierIdOfPath('dossiers/QKXasJBo5RUzAcnEAQrP/documents'), 'QKXasJBo5RUzAcnEAQrP');
  assert.equal(dossierIdOfPath('dossiers/abc/photos'), 'abc');
  assert.equal(dossierIdOfPath('dossiers/abc/_pending_attachments'), 'abc');
  assert.equal(dossierIdOfPath('chiffrages'), null);
  assert.equal(dossierIdOfPath(undefined), null);
});

test('the reason shown names what the user can act on', () => {
  assert.equal(describeUploadFailure({ lastErrorCode: 'storage/unauthorized' }).reason, 'Le serveur a refusé ce fichier.');
  assert.equal(describeUploadFailure({ lastErrorCode: 'storage/quota-exceeded' }).reason, 'L’espace de stockage du serveur est plein.');
  assert.equal(describeUploadFailure({ lastErrorCode: 'storage/retry-limit-exceeded' }).reason, 'La connexion a coupé pendant l’envoi.');
  assert.equal(describeUploadFailure({ lastError: 'TypeError: Failed to fetch' }).reason, 'La connexion a coupé pendant l’envoi.');
  assert.equal(describeUploadFailure({}).reason, 'L’envoi a échoué plusieurs fois.');
  assert.deepEqual(describeUploadFailure({ lastErrorCode: 'internal', lastError: 'Boom' }), {
    reason: 'L’envoi a échoué.',
    detail: 'Boom',
  });
});
