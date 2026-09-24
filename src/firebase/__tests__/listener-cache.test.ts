// Run: npx tsx --test src/firebase/__tests__/listener-cache.test.ts
//
// QA bugs 046 / 047: a save toasted « Nouvelle planification créée » /
// « mise à jour » while the list stayed empty or showed the old values — the
// symptom of a dead listener whose last snapshot kept being served.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, collectionGroup, query, where, orderBy, limit } from 'firebase/firestore';
import { subscribe } from '../firestore/listener-cache';
import { queryKey } from '../firestore/use-collection';

/** A fake onSnapshot: records every listener it starts and lets the test drive it. */
function fakeFirestore() {
  const started: { emit: (d: string) => void; fail: (e: Error) => void; closed: boolean }[] = [];
  const start = (onData: (d: string) => void, onError: (e: Error) => void) => {
    const l = { emit: onData, fail: onError, closed: false };
    started.push(l);
    return () => { l.closed = true; };
  };
  return { started, start };
}

test('components on the same key share one live listener and get its last data', () => {
  const fs = fakeFirestore();
  const got: string[] = [];
  subscribe('k1', fs.start, (d) => got.push(`a:${d}`), () => {});
  fs.started[0].emit('v1');
  const b = subscribe('k1', fs.start, (d) => got.push(`b:${d}`), () => {});
  assert.equal(fs.started.length, 1);
  assert.equal(b.hasCache, true);
  assert.equal(b.cachedData, 'v1');
  fs.started[0].emit('v2');
  assert.deepEqual(got, ['a:v1', 'a:v2', 'b:v2']);
});

test('a listener that fails is dropped: the next subscriber starts a fresh one, not the frozen data', () => {
  const fs = fakeFirestore();
  const errors: string[] = [];
  const a = subscribe('k2', fs.start, () => {}, (e) => errors.push(e.message));
  fs.started[0].emit('before the failure');
  fs.started[0].fail(new Error('permission-denied'));
  assert.deepEqual(errors, ['permission-denied']);

  const b = subscribe('k2', fs.start, () => {}, () => {});
  assert.equal(fs.started.length, 2, 'a new listener was started');
  assert.equal(b.hasCache, false, 'no stale data inherited from the dead listener');

  // The first component re-subscribing later must not tear the new listener down.
  a.unsubscribe();
  assert.equal(fs.started[1].closed, false);
  const c = subscribe('k2', fs.start, () => {}, () => {});
  assert.equal(fs.started.length, 2, 'the live listener is reused');
  b.unsubscribe();
  c.unsubscribe();
  assert.equal(fs.started[1].closed, true, 'closed once its last subscriber left');
});

test('the query key tells apart order, limit and collection group', () => {
  const db = getFirestore(initializeApp({ projectId: 'demo-test', apiKey: 'x' }, 'listener-cache-test'));
  const plans = collection(db, 'dossiers', 'X', 'planifications');
  const keys = [
    queryKey(query(plans)),
    queryKey(query(plans, orderBy('createdAt', 'desc'))),
    queryKey(query(plans, orderBy('dateRDV'), limit(1))),
    queryKey(collectionGroup(db, 'planifications')),
    queryKey(collectionGroup(db, 'documents')),
    queryKey(query(collectionGroup(db, 'planifications'), where('agentTerrain', '==', 'A'))),
    queryKey(query(collectionGroup(db, 'documents'), where('agentTerrain', '==', 'A'))),
  ];
  assert.equal(new Set(keys).size, keys.length, keys.join('\n'));
  // Identical queries still share.
  assert.equal(queryKey(query(plans, orderBy('createdAt', 'desc'))), keys[1]);
});
