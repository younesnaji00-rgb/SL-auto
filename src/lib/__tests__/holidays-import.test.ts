// Run: npx tsx --test src/lib/__tests__/holidays-import.test.ts
//
// QA #067: « Importer des dates » saved a date typed twice twice, and the list
// showed it twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holidayLines, isIsoHoliday, planHolidayImport } from '../holidays-import';

test('a date repeated in one import is added once', () => {
  const plan = planHolidayImport(['2026-10-21', '2026-10-21', '2026-10-22'], []);
  assert.deepEqual(plan.fresh, ['2026-10-21', '2026-10-22']);
  assert.equal(plan.repeated, 1);
});

test('a date already in the list is not added again', () => {
  const plan = planHolidayImport(['2026-10-21', '2026-11-06'], ['2026-10-21']);
  assert.deepEqual(plan.fresh, ['2026-11-06']);
  assert.equal(plan.alreadyListed, 1);
});

test('spaces around a date do not make it a new date', () => {
  const plan = planHolidayImport([' 2026-10-21', '2026-10-21 '], [' 2026-11-06 ']);
  assert.deepEqual(plan.fresh, ['2026-10-21']);
  assert.equal(plan.repeated, 1);
});

test('lines that are not real dates are counted, not saved', () => {
  const plan = planHolidayImport(['2026-02-30', '21/10/2026', 'noël', '2028-02-29'], []);
  assert.deepEqual(plan.fresh, ['2028-02-29']);
  assert.equal(plan.invalid, 3);
});

test('real calendar dates only', () => {
  assert.equal(isIsoHoliday('2026-10-21'), true);
  assert.equal(isIsoHoliday('2026-13-01'), false);
  assert.equal(isIsoHoliday('2027-02-29'), false);
});

test('the text splits on new lines, commas and semicolons', () => {
  assert.deepEqual(holidayLines('2026-10-21\n2026-10-21; 2026-10-22,\n\n'), ['2026-10-21', '2026-10-21', '2026-10-22']);
});
