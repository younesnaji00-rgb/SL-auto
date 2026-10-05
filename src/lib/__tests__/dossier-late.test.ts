// Run: npx tsx --test src/lib/__tests__/dossier-late.test.ts
//
// QA GE-006 (2026-10-05): ONE « En retard » rule for the dossiers list and the
// gestionnaire dashboard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dossierAgeDays, isActionNeeded, isDossierLate, LATE_AFTER_DAYS } from '../dossier-late';

const NOW = new Date(2026, 9, 5, 15, 0, 0); // Monday 5 October 2026, 15:00
const daysAgo = (n: number, h = 9) => new Date(2026, 9, 5 - n, h, 0, 0);
const ts = (d: Date) => ({ toDate: () => d });

test('the threshold is 7 calendar days', () => {
  assert.equal(LATE_AFTER_DAYS, 7);
});

test('late from the 7th calendar day, whatever the hour', () => {
  assert.equal(isDossierLate({ statut: 'Création dossier', createdAt: daysAgo(6, 8) }, NOW), false);
  assert.equal(isDossierLate({ statut: 'Création dossier', createdAt: daysAgo(7, 23) }, NOW), true);
  assert.equal(isDossierLate({ statut: 'Chiffrage en cours', createdAt: ts(daysAgo(30)) }, NOW), true);
});

test('only « Accord envoyé » is terminal', () => {
  assert.equal(isActionNeeded('Accord envoyé'), false);
  assert.equal(isActionNeeded(' Accord envoyé '), false);
  assert.equal(isActionNeeded('Réforme'), true);
  assert.equal(isActionNeeded(undefined), true);
  assert.equal(isDossierLate({ statut: 'Accord envoyé', createdAt: daysAgo(30) }, NOW), false);
});

test('no creation date, no lateness; ages are never negative', () => {
  assert.equal(isDossierLate({ statut: 'Création dossier' }, NOW), false);
  assert.equal(isDossierLate(null, NOW), false);
  assert.equal(dossierAgeDays(new Date(2026, 9, 9), NOW), 0);
  assert.equal(dossierAgeDays({ seconds: Math.floor(daysAgo(3).getTime() / 1000) }, NOW), 3);
  assert.equal(dossierAgeDays('not a date', NOW), null);
});
