// Run: npx tsx --test src/lib/__tests__/status-fallbacks.test.ts
//
// Owner, 2026-10-13: a deleted accord sends the dossier back to « Chiffrage
// en cours »; deleting a phase's photos sends it back to « Planification
// programmée <phase> ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accordStatutRound, statutAfterAccordRemoval, statutAfterPhotoRemoval } from '../status-machine';

const accord = (round: number) => ({ kind: 'accord' as const, round });
const proposition = (round: number) => ({ kind: 'proposition' as const, round });

test('the round a chiffreur statut stands for', () => {
  assert.deepEqual(accordStatutRound('Accord'), { kind: 'accord', round: 1 });
  assert.deepEqual(accordStatutRound("Proposition d'accord"), { kind: 'proposition', round: 1 });
  assert.deepEqual(accordStatutRound('3ème accord'), { kind: 'accord', round: 3 });
  assert.deepEqual(accordStatutRound("12ème proposition d'accord"), { kind: 'proposition', round: 12 });
  assert.equal(accordStatutRound('Accord envoyé'), null);
  assert.equal(accordStatutRound('Chiffrage en cours'), null);
});

test('deleting the accord the statut stands for: back to « Chiffrage en cours »', () => {
  assert.equal(statutAfterAccordRemoval('Accord', accord(1), 0), 'Chiffrage en cours');
  // The facture's accord still there: the devis one is owed again all the same.
  assert.equal(statutAfterAccordRemoval('Accord', accord(1), 1), 'Chiffrage en cours');
  assert.equal(statutAfterAccordRemoval('2ème accord', accord(2), 1), 'Chiffrage en cours');
  assert.equal(statutAfterAccordRemoval("Proposition d'accord", proposition(1), 0), 'Chiffrage en cours');
});

test('deleting an older round, or the other kind, leaves the statut alone', () => {
  // The 2ème accord still answers: deleting the 1er changes nothing.
  assert.equal(statutAfterAccordRemoval('2ème accord', accord(1), 2), null);
  // A proposition next to the accord the statut stands for.
  assert.equal(statutAfterAccordRemoval('Accord', proposition(1), 1), null);
  // Not a chiffreur statut at all.
  assert.equal(statutAfterAccordRemoval('Planification expertise avant', accord(1), 0), null);
  assert.equal(statutAfterAccordRemoval('Réforme', accord(1), 0), null);
  assert.equal(statutAfterAccordRemoval('Chiffrage en cours', accord(1), 0), null);
});

test('« Accord envoyé »: only the latest round sends it back', () => {
  assert.equal(statutAfterAccordRemoval('Accord envoyé', accord(2), 1), 'Chiffrage en cours');
  assert.equal(statutAfterAccordRemoval('Accord envoyé', accord(1), 0), 'Chiffrage en cours');
  assert.equal(statutAfterAccordRemoval('Accord envoyé', accord(1), 2), null);
});

test("the phase's last photo gone: « expertise » back to « programmée », that phase only", () => {
  assert.equal(statutAfterPhotoRemoval('Planification expertise avant', 'avant'), 'Planification programmée avant');
  assert.equal(statutAfterPhotoRemoval('Planification expertise en cours', 'en_cours'), 'Planification programmée en cours');
  assert.equal(statutAfterPhotoRemoval('Planification expertise après', 'apres'), 'Planification programmée après');
  // Another phase's photos, or a dossier that has moved on.
  assert.equal(statutAfterPhotoRemoval('Planification expertise en cours', 'avant'), null);
  assert.equal(statutAfterPhotoRemoval('Planification programmée avant', 'avant'), null);
  assert.equal(statutAfterPhotoRemoval('Chiffrage en cours', 'avant'), null);
  assert.equal(statutAfterPhotoRemoval('Accord', 'apres'), null);
});
