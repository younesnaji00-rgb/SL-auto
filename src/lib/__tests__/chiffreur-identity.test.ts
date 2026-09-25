// Run: npx tsx --test src/lib/__tests__/chiffreur-identity.test.ts
//
// Owner request 2026-09-25 (« make sure everything shows »): a chiffrage no
// active chiffreur account owns is shown to every chiffreur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isChiffrageUnowned, type ChiffreurAccountRef } from '../chiffreur-identity';

// The one chiffreur account in production on 2026-09-25, as useAssignableChiffreurs maps it.
const ACCOUNTS: ChiffreurAccountRef[] = [
  { id: 'SJr8VyBIuF2v3cxkd49V', uid: '6IbJExAl7BTLjkvzqU3R1wiaAXi2', nom: 'chiffreur', email: 'chiffreur@example.test' },
];

test('a chiffrage sent to a directory entry with no account (« test2 ») is unowned', () => {
  assert.equal(isChiffrageUnowned({ assignedChiffreurId: 'iDjofKVbaOBOaiAhPtx7', assignedChiffreurNom: 'test2' }, ACCOUNTS), true);
});

test('the account owns what it was assigned, by directory id, uid, e-mail or name', () => {
  assert.equal(isChiffrageUnowned({ assignedChiffreurId: 'SJr8VyBIuF2v3cxkd49V', assignedChiffreurNom: 'chiffreur' }, ACCOUNTS), false);
  assert.equal(isChiffrageUnowned({ assignedChiffreurUid: '6IbJExAl7BTLjkvzqU3R1wiaAXi2' }, ACCOUNTS), false);
  assert.equal(isChiffrageUnowned({ assignedChiffreurEmail: 'Chiffreur@Example.test ' }, ACCOUNTS), false);
  // Legacy rows carried only the name.
  assert.equal(isChiffrageUnowned({ assignedChiffreurNom: 'Chiffreur' }, ACCOUNTS), false);
});

test('a chiffrage naming no one, or with no chiffreur account at all, is unowned', () => {
  assert.equal(isChiffrageUnowned({}, ACCOUNTS), true);
  assert.equal(isChiffrageUnowned({ assignedChiffreurId: 'SJr8VyBIuF2v3cxkd49V' }, []), true);
});
