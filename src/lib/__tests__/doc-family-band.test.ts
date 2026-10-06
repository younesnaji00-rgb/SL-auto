// Run: npx tsx --test src/lib/__tests__/doc-family-band.test.ts
//
// QA 035: the dossier page showed « Devis Garage · Devis accordé · 1ère
// proposition d'accord (devis) — En attente de chiffrage · Devis 2ème accord »
// while the chiffreur saw Source → 1er accord (Remplacé) → 2ème accord
// (Actuel). Owner ruling 2026-10-06: the bands read like the chiffreur's
// pipeline — the source, the accords in round order, then the propositions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandSlots, buildDocFamilies, versionStates } from '../doc-family';

type Doc = { type: string; url?: string | null; pendingUpload?: boolean };
const doc = (type: string): Doc => ({ type, url: `https://files/${encodeURIComponent(type)}` });
/** A gestionnaire-created slot awaiting the chiffreur: no file yet. */
const placeholder = (type: string): Doc => ({ type, url: null, pendingUpload: true });
const devisFamily = (docs: Doc[]) => buildDocFamilies(docs).find((f) => f.parent === 'Devis Garage')!;
const docsOf = (docs: Doc[]) => (slot: string) => docs.filter((d) => d.type === slot);
const band = (docs: Doc[]) => bandSlots(devisFamily(docs), docsOf(docs));
const chips = (docs: Doc[]) => Object.fromEntries(versionStates(devisFamily(docs), docsOf(docs)));

test('the screenshot dossier: Source → 1er accord → 2ème accord, nothing in between', () => {
  const docs = [doc('Devis Garage'), doc('Devis accordé'), doc('Devis 2ème accord')];
  assert.deepEqual(band(docs), ['Devis Garage', 'Devis accordé', 'Devis 2ème accord']);
  assert.deepEqual(chips(docs), { 'Devis accordé': 'remplace', 'Devis 2ème accord': 'actuel' });
});

test('while the first round is open, both of its possible answers show', () => {
  const docs = [doc('Devis Garage')];
  assert.deepEqual(band(docs), ['Devis Garage', 'Devis accordé', "1ère proposition d'accord (devis)"]);
  assert.deepEqual(chips(docs), {});
});

test('a first round answered by a proposition keeps the accord slot', () => {
  const docs = [doc('Devis Garage'), doc("1ère proposition d'accord (devis)")];
  assert.deepEqual(band(docs), ['Devis Garage', 'Devis accordé', "1ère proposition d'accord (devis)"]);
  assert.deepEqual(chips(docs), { "1ère proposition d'accord (devis)": 'actuel' });
});

test('a proposition the gestionnaire asked for still shows next to a filled accord', () => {
  const docs = [doc('Devis Garage'), doc('Devis accordé'), placeholder("1ère proposition d'accord (devis)")];
  assert.deepEqual(band(docs), ['Devis Garage', 'Devis accordé', "1ère proposition d'accord (devis)"]);
  assert.deepEqual(chips(docs), { 'Devis accordé': 'actuel' });
});

test('an accord still awaiting its file does not hide the proposition', () => {
  const docs = [doc('Devis Garage'), placeholder('Devis accordé')];
  assert.deepEqual(band(docs), ['Devis Garage', 'Devis accordé', "1ère proposition d'accord (devis)"]);
  assert.deepEqual(chips(docs), {});
});

test('the latest version is « Actuel », propositions after the accords like the pipeline', () => {
  const docs = [doc('Devis Garage'), doc('Devis accordé'), doc('Devis 2ème accord'), doc("1ère proposition d'accord (devis)")];
  assert.deepEqual(chips(docs), {
    'Devis accordé': 'remplace',
    'Devis 2ème accord': 'remplace',
    "1ère proposition d'accord (devis)": 'actuel',
  });
});

test('accords follow each other in round order, the propositions come after them', () => {
  const family = devisFamily([doc('Devis Garage'), doc('Devis accordé'), doc('Devis 2ème accord')]);
  assert.deepEqual(family.slots, ['Devis Garage', 'Devis accordé', 'Devis 2ème accord', "1ère proposition d'accord (devis)"]);
});

test('later propositions follow the first one, after every accord', () => {
  const family = devisFamily([
    doc("2ème proposition d'accord (devis)"),
    doc('Devis 3ème accord'),
    doc('Devis 2ème accord'),
    doc('Devis accordé'),
    doc('Devis Garage'),
  ]);
  assert.deepEqual(family.slots, [
    'Devis Garage',
    'Devis accordé',
    'Devis 2ème accord',
    'Devis 3ème accord',
    "1ère proposition d'accord (devis)",
    "2ème proposition d'accord (devis)",
  ]);
});
