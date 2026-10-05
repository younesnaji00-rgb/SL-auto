// Run: npx tsx --test src/lib/__tests__/devis-totals.test.ts
//
// QA Chiffreur 006: the « Total TTC Expert » read in the editor before saving
// must be the one printed on the downloaded devis. The PDF footer used to
// print the garage's own TTC (no accord price, no vétusté) under that label.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accordColumnTotals, emptyHeader, findAccordColumn, sumTTC, type DevisRow, type DevisSnapshot } from '../devis-schema';
import { renderDevisPdf } from '../devis-pdf';

const row = (p: Partial<DevisRow> & { id: string }): DevisRow => ({
  ref: 'CHANGE', designation: p.id, type: '', tva: null, qte: 1, puHT: 0, ...p,
});

// Originale part with 10 % vétusté and 20 % T.V.A, plus a main d'œuvre line
// without T.V.A — the example from the bug analysis.
const rows: DevisRow[] = [
  row({ id: 'a', type: 'Originale', qte: 1, puHT: 1000, tva: 20, vetuste: 10 }),
  row({ id: 'b', type: "Main d'oeuvre", qte: 1, puHT: 500, tva: null }),
];
const accord = { id: 'acc', label: 'PUHT accordé', kind: 'accord' as const, values: { a: '800,00', b: '400' } };

test('expert totals apply the accord price, the vétusté and each row T.V.A', () => {
  const { ht, ttc } = accordColumnTotals(rows, accord.values);
  assert.equal(ht, 800 * 0.9 + 400);
  assert.equal(ttc, 800 * 0.9 * 1.2 + 400);
  // …and are not the garage figure the PDF used to print.
  assert.equal(sumTTC(rows), 1700);
});

test('blank or unparsable accord prices count as zero', () => {
  assert.deepEqual(accordColumnTotals(rows, { a: '', b: 'abc' }), { ht: 0, ttc: 0 });
  assert.deepEqual(accordColumnTotals(rows, undefined), { ht: 0, ttc: 0 });
});

test('findAccordColumn picks the first accord or proposition column', () => {
  const counter = { id: 'c', label: 'Contre-devis', kind: 'counter' as const, values: {} };
  const prop = { id: 'p', label: 'PUHT proposé', kind: 'proposition-accord' as const, values: {} };
  assert.equal(findAccordColumn([counter, prop, accord])?.id, 'p');
  assert.equal(findAccordColumn([counter]), null);
  assert.equal(findAccordColumn(undefined), null);
});

async function pdfText(snapshot: DevisSnapshot, opts: Parameters<typeof renderDevisPdf>[1]): Promise<string> {
  const blob = renderDevisPdf(snapshot, opts);
  return Buffer.from(await blob.arrayBuffer()).toString('latin1');
}

const header = emptyHeader();

test('the saved PDF prints the same Total TTC Expert as the editor', async () => {
  const text = await pdfText(
    { header, rows, extraColumns: [accord] },
    { docType: 'Devis Garage', titleOverride: 'Accord', collapseAccordToTotal: true, sansTva: false },
  );
  assert.match(text, /\(1 264,00\) Tj/);
  assert.doesNotMatch(text, /\(1 700,00\) Tj/);
});

test('without an accord column the PDF prints the garage TTC as a plain Total TTC', async () => {
  const text = await pdfText({ header, rows }, { docType: 'Devis Garage' });
  assert.match(text, /\(Total TTC\) Tj/);
  assert.doesNotMatch(text, /Total TTC Expert/);
  assert.match(text, /\(1 700,00\) Tj/);
});
