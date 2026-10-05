// Run: npx tsx --test src/lib/__tests__/field-format.test.ts
//
// QA bug 016, owner request 2026-10-05: format coherence is forced on every
// field of the dossier information form — no field accepts symbols alone,
// and the dates agree with each other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFieldValue, validateFields, dateCoherenceErrors, type ValidatedKind } from '../field-validation';

const ok = (kind: ValidatedKind, v: unknown, now?: Date) =>
  assert.equal(validateFieldValue(kind, v, now), null, `${kind} should accept ${JSON.stringify(v)}`);
const ko = (kind: ValidatedKind, v: unknown, now?: Date) =>
  assert.notEqual(validateFieldValue(kind, v, now), null, `${kind} should refuse ${JSON.stringify(v)}`);

const TEXT_KINDS: ValidatedKind[] = ['tel', 'email', 'address', 'plate', 'name', 'org', 'cin', 'numeric', 'cv', 'km', 'ref', 'vin', 'label'];

test('no text field accepts symbols alone', () => {
  for (const kind of TEXT_KINDS) {
    for (const junk of ['@@@@@', '-----', '!?#%&*', '.,;:', '« » ( )', '///']) ko(kind, junk);
  }
});

test('an empty value is never a format error (required-ness is another gate)', () => {
  for (const kind of [...TEXT_KINDS, 'pastDate', 'mecDate'] as ValidatedKind[]) {
    for (const blank of ['', '   ', null, undefined]) ok(kind, blank);
  }
});

test('addresses: real ones pass, symbol soup does not', () => {
  ok('address', 'N° 12, Rue 5, Hay Salam, Casablanca');
  ok('address', '13 rue Ibn Battouta - Maârif, Casablanca');
  ok('address', 'Lot. Al Wifaq, Imm 3 Apt 12, Fès');
  ok('address', 'Bd Zerktouni (angle rue Bachir), Casablanca');
  ok('address', 'حي السلام، الدار البيضاء');
  ko('address', 'a!@#$');
  ko('address', 'rue x @ casa');
  ko('address', 'Rue,,, Fès');
  ko('address', 'a-b-c-d');
  ko('address', '12 34 56');
  ko('address', 'Fès');
});

test('names: letters with hyphen, apostrophe or initials only', () => {
  ok('name', 'Karim El-Alaoui');
  ok('name', 'O’Neil');
  ok('name', 'M. Karim');
  ok('name', 'محمد العلوي');
  ko('name', 'A.-B');
  ko('name', 'Karim-');
  ko('name', 'Jean--Pierre');
  ko('name', 'K4rim');
  ko('name', 'A');
});

test('raison sociale / compagnie typed by hand', () => {
  ok('org', 'Cabinet 2M & Associés');
  ok('org', 'AXA Assurance Maroc (ex-Axa Al Amane)');
  ok('org', 'S.A.R.L Atlas');
  ko('org', 'A&&B');
  ko('org', '2M');
});

test('e-mail: a real address, not punctuation around an @', () => {
  ok('email', 'nom@domaine.ma');
  ok('email', 'k.alaoui+sl@gmail.com');
  ok('email', "o'neil@x.co.ma");
  ko('email', '!!@##.$$');
  ko('email', 'a@b');
  ko('email', '.a@x.ma');
  ko('email', 'a..b@x.ma');
  ko('email', 'a@-x.ma');
  ko('email', 'a@x.m');
  ko('email', 'a@b@x.ma');
});

test('references: one separator at a time, letters or digits at both ends', () => {
  ok('ref', 'SL-12');
  ok('ref', 'EXP-2026-003');
  ok('ref', 'POL 123/2026');
  ok('ref', 'AB');
  ko('ref', 'SL--12');
  ko('ref', '-SL12');
  ko('ref', 'SL12-');
  ko('ref', 'A');
  ko('ref', '#123');
});

test('plates: Moroccan Latin, Arabic and WW forms', () => {
  ok('plate', '12345-A-6');
  ok('plate', '12345 | أ | 6');
  ok('plate', 'WW-123456');
  ko('plate', '12345--A--6');
  ko('plate', 'ABC');
});

test('labels (marque, modèle, énergie)', () => {
  ok('label', 'Peugeot');
  ok('label', '208');
  ok('label', 'C4 (II)');
  ok('label', '1.6 HDi');
  ko('label', 'A&&&');
  ko('label', '(2019)');
});

test('puissance fiscale and kilométrage stay in range', () => {
  ok('cv', '7');
  ok('cv', '12');
  ko('cv', '0');
  ko('cv', '100');
  ko('cv', '7.5');
  ok('km', '0');
  ok('km', 0);
  ok('km', '120 000');
  ok('km', '1999999');
  ko('km', '120.000');
  ko('km', '2000001');
  ko('km', '-5');
});

test('dates: a real day, never in the future, never absurdly old', () => {
  const now = new Date(2026, 9, 5, 10, 0);
  ok('pastDate', new Date(2026, 9, 5, 23, 0), now); // later today is still today
  ko('pastDate', new Date(2026, 9, 6), now);
  ok('pastDate', new Date(2026, 0, 1), now);
  ko('pastDate', new Date(1999, 11, 31), now);
  ko('pastDate', new Date(NaN), now);
  ok('pastDate', { toDate: () => new Date(2026, 8, 30) }, now);
  ok('pastDate', { seconds: Date.UTC(2026, 8, 30) / 1000, nanoseconds: 0 }, now);
  ok('pastDate', '2026-09-30T00:00:00.000Z', now);
  ok('mecDate', new Date(1950, 0, 1), now);
  ko('mecDate', new Date(1899, 11, 31), now);
  const year26 = new Date(2000, 0, 1);
  year26.setFullYear(26); // a « 01/01/0026 » typed in the masked field
  ko('mecDate', year26, now);
  ko('mecDate', new Date(2027, 0, 1), now);
});

test('dates agree: requête after the sinistre, mise en circulation before it', () => {
  const sinistre = new Date(2026, 8, 10);
  assert.deepEqual(dateCoherenceErrors({ dateSinistre: sinistre, dateRequete: new Date(2026, 8, 12), vehicule: { mec: new Date(2019, 0, 1) } }), {});
  assert.deepEqual(dateCoherenceErrors({ dateSinistre: sinistre, dateRequete: new Date(2026, 8, 10, 18), vehicule: { mec: new Date(2026, 8, 10) } }), {});
  assert.deepEqual(Object.keys(dateCoherenceErrors({ dateSinistre: sinistre, dateRequete: new Date(2026, 8, 1) })), ['dateRequete']);
  assert.deepEqual(Object.keys(dateCoherenceErrors({ dateSinistre: sinistre, vehicule: { mec: '2026-09-20T00:00:00.000Z' } })), ['vehicule.mec']);
  assert.deepEqual(dateCoherenceErrors({ dateRequete: new Date(2026, 8, 1), vehicule: { mec: '' } }), {});
});

test('validateFields reports only the malformed paths', () => {
  const form = {
    assure: { nom: 'Karim Alaoui', adresse: '@@@@@', telephone: '06 12 34 56 78' },
    vehicule: { km: 'abc', puissance: '7' },
    dateSinistre: new Date(2026, 8, 10),
  };
  const errors = validateFields(form, [
    { path: 'assure.nom', kind: 'name', label: 'Nom' },
    { path: 'assure.adresse', kind: 'address', label: 'Adresse' },
    { path: 'assure.telephone', kind: 'tel', label: 'Téléphone' },
    { path: 'vehicule.km', kind: 'km', label: 'Km' },
    { path: 'vehicule.puissance', kind: 'cv', label: 'CV' },
    { path: 'dateSinistre', kind: 'pastDate', label: 'Sinistre' },
  ], new Date(2026, 9, 5));
  assert.deepEqual(Object.keys(errors).sort(), ['assure.adresse', 'vehicule.km']);
});
