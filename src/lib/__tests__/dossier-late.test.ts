// Run: npx tsx --test src/lib/__tests__/dossier-late.test.ts
//
// QA GE-006 (2026-10-05): ONE « En retard » rule for the dossiers list and the
// gestionnaire dashboard. Owner ruling 2026-10-29: a dossier is finished — no
// longer « à traiter », never late — once its note d'honoraire is in, and only
// then (lib/dossier-finished.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dossierAgeDays, isDossierLate, LATE_AFTER_DAYS } from '../dossier-late';
import { isDossierFinished, isDossierOpen, noteHonoraireAt } from '../dossier-finished';

const NOW = new Date(2026, 9, 5, 15, 0, 0); // Monday 5 October 2026, 15:00
const daysAgo = (n: number, h = 9) => new Date(2026, 9, 5 - n, h, 0, 0);
const ts = (d: Date) => ({ toDate: () => d });

test('the threshold is 7 calendar days', () => {
  assert.equal(LATE_AFTER_DAYS, 7);
});

test('late from the 7th calendar day, whatever the hour', () => {
  assert.equal(isDossierLate({ createdAt: daysAgo(6, 8) }, NOW), false);
  assert.equal(isDossierLate({ createdAt: daysAgo(7, 23) }, NOW), true);
  assert.equal(isDossierLate({ createdAt: ts(daysAgo(30)) }, NOW), true);
});

test('only the note d’honoraire finishes a dossier', () => {
  // « Accord envoyé » and a rapport generated no longer finish it.
  const accordEnvoye = { statut: 'Accord envoyé', dateRapportDepose: ts(daysAgo(2)), createdAt: daysAgo(30), dateNoteHonoraire: null as unknown };
  assert.equal(isDossierOpen(accordEnvoye), true);
  assert.equal(isDossierLate(accordEnvoye, NOW), true);

  const withNote = { ...accordEnvoye, dateNoteHonoraire: ts(daysAgo(1)) };
  assert.equal(isDossierFinished(withNote), true);
  assert.equal(isDossierOpen(withNote), false);
  assert.equal(isDossierLate(withNote, NOW), false);
  assert.equal(noteHonoraireAt(withNote)?.getTime(), daysAgo(1).getTime());

  // The legacy field counts too; garbage and a pending server stamp (null) do not.
  assert.equal(isDossierFinished({ noteHonoraireAt: { seconds: Math.floor(daysAgo(3).getTime() / 1000) } }), true);
  assert.equal(isDossierFinished({ dateNoteHonoraire: null }), false);
  assert.equal(isDossierFinished({ dateNoteHonoraire: 'not a date' }), false);
  assert.equal(isDossierFinished(null), false);
});

test('no creation date, no lateness; ages are never negative', () => {
  assert.equal(isDossierLate({}, NOW), false);
  assert.equal(isDossierLate(null, NOW), false);
  assert.equal(dossierAgeDays(new Date(2026, 9, 9), NOW), 0);
  assert.equal(dossierAgeDays({ seconds: Math.floor(daysAgo(3).getTime() / 1000) }, NOW), 3);
  assert.equal(dossierAgeDays('not a date', NOW), null);
});
