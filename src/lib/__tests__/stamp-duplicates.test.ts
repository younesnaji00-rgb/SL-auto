// Run: npx tsx --test src/lib/__tests__/stamp-duplicates.test.ts
//
// QA #066 / Chiffreur #015: the same tampon could be imported several times.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findStampDuplicate, sha256Hex, stampNameKey } from '../stamp-duplicates';

const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

test('the same image is refused, whatever its file name', async () => {
  const hash = await sha256Hex(enc('PNG…tampon'));
  assert.ok(hash);
  const dup = findStampDuplicate({ name: 'cachet-v2', hash }, [{ name: 'tampons', hash }]);
  assert.deepEqual(dup, { reason: 'same-image', of: 'tampons' });
});

test('a name already used is refused, without case or accents', () => {
  const dup = findStampDuplicate({ name: 'Tampon Expért ', hash: 'b' }, [{ name: 'tampon expert', hash: 'a' }]);
  assert.deepEqual(dup, { reason: 'same-name', of: 'tampon expert' });
});

test('an old tampon without a hash still blocks its name', () => {
  assert.deepEqual(findStampDuplicate({ name: 'tampons', hash: 'x' }, [{ name: 'tampons' }]), { reason: 'same-name', of: 'tampons' });
});

test('a new image with a new name passes', () => {
  assert.equal(findStampDuplicate({ name: 'cachet', hash: 'b' }, [{ name: 'tampons', hash: 'a' }, { name: 'signature' }]), null);
});

test('the hash is the SHA-256 hex', async () => {
  assert.equal(await sha256Hex(enc('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(stampNameKey('  Tampon   Fès '), 'tampon fes');
});
