// Run: npx tsx --test src/lib/__tests__/devis-scan-merge.test.ts
//
// QA Chiffreur 008 (2026-10-05): the table pre-filled by the AI read
// 66 100,00 for a facture printing 33 050,00 — every line twice. The dossier-
// side extraction APPENDED each scan to the table, so the same file scanned
// twice (deleted and imported again, or re-classified in the drop list)
// doubled it, and a deleted document's lines never left.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collapseRepeatedScan, mergeScannedFile, pruneDeadScanSources, seedForChiffrage } from '../devis-extract';
import { emptyHeader, printedTotalHT, sumHT, type DevisRow, type DevisScanSource, type StructuredDevis } from '../devis-schema';

let seq = 0;
const row = (designation: string, puHT: number, qte = 1): DevisRow => ({
  id: `r${++seq}`, ref: 'CHANGE', designation, type: '', tva: 20, qte, puHT,
});
const lines = () => [row('PARCHOC AV', 2500), row('RENFORT', 1300), row('OPTIQUE D ET G', 3500, 2), row('CAPOT', 3200)];
const source = (storagePath: string, rows: DevisRow[], printed: number | null = null): DevisScanSource => ({
  storagePath, rowIds: rows.map((r) => r.id), printedTotalHT: printed, printedTotalTTC: null,
});
const scan = (storagePath: string, printed: number | null = null) => {
  const rows = lines();
  return { source: source(storagePath, rows, printed), rows, header: { client: 'Autre' } };
};

test('the same file scanned twice replaces its rows instead of doubling them', () => {
  const first = mergeScannedFile(null, scan('f/a.jpg', 14000), new Set(['f/a.jpg']));
  const second = mergeScannedFile(first, scan('f/a.jpg', 14000), new Set(['f/a.jpg']));
  assert.equal(second.rows.length, 4);
  assert.equal(sumHT(second.rows), 14000);
  assert.equal(second.scanSources?.length, 1);
});

test('a deleted file leaves the table when another is scanned (delete + import again)', () => {
  const first = mergeScannedFile(null, scan('f/old.jpg'), new Set(['f/old.jpg']));
  const reimported = mergeScannedFile(first, scan('f/new.jpg'), new Set(['f/new.jpg']));
  assert.equal(reimported.rows.length, 4);
  assert.deepEqual(reimported.scanSources?.map((s) => s.storagePath), ['f/new.jpg']);
});

test('two different live files of the same slot are merged (page 1 + page 2)', () => {
  const p1 = mergeScannedFile(null, scan('f/p1.jpg'), new Set(['f/p1.jpg', 'f/p2.jpg']));
  const both = mergeScannedFile(p1, scan('f/p2.jpg'), new Set(['f/p1.jpg', 'f/p2.jpg']));
  assert.equal(both.rows.length, 8);
  assert.equal(both.scanSources?.length, 2);
});

test('a legacy table (no scanSources) starts over when its file is the only one left', () => {
  const legacy: StructuredDevis = { header: emptyHeader(), rows: [...lines(), ...lines()], versions: [] };
  const merged = mergeScannedFile(legacy, scan('f/a.jpg'), new Set(['f/a.jpg']));
  assert.equal(merged.rows.length, 4);
});

test('a legacy table someone saved, or with another live file, keeps its rows', () => {
  const saved: StructuredDevis = { header: emptyHeader(), rows: lines(), versions: [{} as any] };
  assert.equal(mergeScannedFile(saved, scan('f/a.jpg'), new Set(['f/a.jpg'])).rows.length, 8);
  const legacy: StructuredDevis = { header: emptyHeader(), rows: lines(), versions: [] };
  assert.equal(mergeScannedFile(legacy, scan('f/b.jpg'), new Set(['f/a.jpg', 'f/b.jpg'])).rows.length, 8);
});

test('rows typed by hand (in no scan source) survive a re-scan', () => {
  const first = mergeScannedFile(null, scan('f/a.jpg'), new Set(['f/a.jpg']));
  const withManual = { ...first, rows: [...first.rows, row('MAIN D\'OEUVRE', 900)] };
  const again = mergeScannedFile(withManual, scan('f/a.jpg'), new Set(['f/a.jpg']));
  assert.equal(again.rows.length, 5);
  assert.ok(again.rows.some((r) => r.designation === 'MAIN D\'OEUVRE'));
});

test('pruneDeadScanSources keeps only the files sent', () => {
  const p1 = mergeScannedFile(null, scan('f/p1.jpg'), new Set(['f/p1.jpg', 'f/p2.jpg']));
  const both = mergeScannedFile(p1, scan('f/p2.jpg'), new Set(['f/p1.jpg', 'f/p2.jpg']));
  const pruned = pruneDeadScanSources(both, new Set(['f/p2.jpg']));
  assert.equal(pruned.rows.length, 4);
  assert.deepEqual(pruned.scanSources?.map((s) => s.storagePath), ['f/p2.jpg']);
});

test('collapseRepeatedScan repairs a block read twice, and only that', () => {
  const block = lines();
  const twice = [...block, ...block.map((r) => ({ ...r, id: `${r.id}-dup` }))];
  assert.equal(collapseRepeatedScan(twice).length, 4);
  // Two identical labour lines side by side are a real devis.
  const labour = [row('MAIN D\'OEUVRE', 500), row('MAIN D\'OEUVRE', 500)];
  assert.equal(collapseRepeatedScan(labour).length, 2);
  // Same designations, different prices: not a repeat.
  const other = [...block, ...block.map((r) => ({ ...r, puHT: r.puHT + 1 }))];
  assert.equal(collapseRepeatedScan(other).length, 8);
});

test('seedForChiffrage trims scanned tables to the files sent and repairs legacy doubles', () => {
  const tracked = mergeScannedFile(null, scan('f/devis.jpg'), new Set(['f/devis.jpg']));
  const block = lines();
  const legacyDouble: StructuredDevis = { header: emptyHeader(), rows: [...block, ...block.map((r) => ({ ...r, id: `${r.id}-d` }))], versions: [] };
  const seed = seedForChiffrage(
    { 'Devis Garage': tracked, 'Facture Garage': legacyDouble, 'Devis accordé': { rows: [] } },
    [{ storagePath: 'f/devis.jpg', docType: 'Devis Garage' }],
  )!;
  assert.equal((seed['Devis Garage'] as StructuredDevis).rows.length, 4);
  assert.equal((seed['Facture Garage'] as StructuredDevis).rows.length, 4);
  assert.ok('Devis accordé' in seed);
  // A scanned table whose file was not sent is left out entirely.
  const none = seedForChiffrage({ 'Devis Garage': tracked }, []);
  assert.equal(none, undefined);
});

test('printedTotalHT sums the printed totals, null when one file printed none', () => {
  assert.equal(printedTotalHT([source('a', [], 33050), source('b', [], 950)]), 34000);
  assert.equal(printedTotalHT([source('a', [], 33050), source('b', [], null)]), null);
  assert.equal(printedTotalHT(undefined), null);
});
