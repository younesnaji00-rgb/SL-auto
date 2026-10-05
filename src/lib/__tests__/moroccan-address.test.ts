// Run: npx tsx --test src/lib/__tests__/moroccan-address.test.ts
//
// A rendez-vous address is in Casablanca or Fès, or it is refused (owner
// ruling 2026-10-05); the city is the locality of the address Google resolved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorToMorocco, localityOf, placeOfAddress, samePlace } from '../moroccan-address';

test('the locality is the component before the country, without postal or plus code', () => {
  assert.equal(localityOf('219 Bd Mohamed Zerktouni, Casablanca 20250, Maroc'), 'Casablanca');
  assert.equal(localityOf('Casablanca, Maroc'), 'Casablanca');
  assert.equal(localityOf('Av. Hassan II, Fès 30050, Maroc'), 'Fès');
  assert.equal(localityOf('8V6V+2Q Casablanca, Maroc'), 'Casablanca');
  assert.equal(localityOf('Aïn Chock, Casablanca, Maroc'), 'Casablanca');
  assert.equal(localityOf('Bouskoura, Maroc'), 'Bouskoura');
  assert.equal(localityOf('Maroc'), null);
  assert.equal(localityOf(''), null);
  assert.equal(localityOf('Bd Zerktouni, Maroc'), null);
});

test('Casablanca and Fès are accepted, whatever the accents, case, alias or admin prefix', () => {
  assert.deepEqual(placeOfAddress('219 Bd Mohamed Zerktouni, Casablanca 20250, Maroc'), {
    status: 'inside',
    city: 'Casablanca',
    locality: 'Casablanca',
  });
  assert.equal(placeOfAddress('Bourgogne, Casablanca, Maroc').status, 'inside');
  assert.deepEqual(placeOfAddress('Rue X, Fes 30000, Maroc'), { status: 'inside', city: 'Fès', locality: 'Fes' });
  assert.equal(placeOfAddress('Bd Allal Ben Abdellah, Fez, Maroc').status, 'inside');
  assert.deepEqual(placeOfAddress('Préfecture de Casablanca, Maroc'), {
    status: 'inside',
    city: 'Casablanca',
    locality: 'Préfecture de Casablanca',
  });
  assert.equal(placeOfAddress('8V6V+2Q Casablanca, Maroc').status, 'inside');
});

test('another Moroccan city is refused, and named', () => {
  assert.deepEqual(placeOfAddress('Bouskoura, Maroc'), { status: 'outside', locality: 'Bouskoura', abroad: false });
  assert.deepEqual(placeOfAddress('Mohammédia, Maroc'), { status: 'outside', locality: 'Mohammédia', abroad: false });
  // A street named after a city does not put the address in that city.
  assert.deepEqual(placeOfAddress('Rte de Casablanca, Rabat, Maroc'), { status: 'outside', locality: 'Rabat', abroad: false });
  assert.equal(placeOfAddress('Avenue de Fès, Marrakech 40000, Maroc').status, 'outside');
});

test('another country is refused, with the address Google found', () => {
  // QA bug 045: « borgone » (for the quartier Bourgogne) became a village near Turin.
  assert.deepEqual(placeOfAddress('10050 Borgone Susa, Ville métropolitaine de Turin, Italie'), {
    status: 'outside',
    locality: '10050 Borgone Susa, Ville métropolitaine de Turin, Italie',
    abroad: true,
  });
  assert.equal(placeOfAddress('Bourgogne-Franche-Comté, France').status, 'outside');
});

test('a place Google could not pin down is refused as not found', () => {
  assert.deepEqual(placeOfAddress('Maroc'), { status: 'not-found' });
  assert.deepEqual(placeOfAddress(''), { status: 'not-found' });
  assert.deepEqual(placeOfAddress('Bd Zerktouni, Maroc'), { status: 'not-found' });
  // The region of a firm city: the city or any other town of it.
  assert.deepEqual(placeOfAddress('Casablanca-Settat, Maroc'), { status: 'not-found' });
  assert.deepEqual(placeOfAddress('Fès-Meknès, Maroc'), { status: 'not-found' });
});

test('a firm city written without its country is still that city', () => {
  assert.deepEqual(placeOfAddress('Casablanca'), { status: 'inside', city: 'Casablanca', locality: 'Casablanca' });
});

test('same place whatever the spelling', () => {
  assert.ok(samePlace('Fès', 'fes'));
  assert.ok(samePlace('Casa', 'Casablanca'));
  assert.ok(!samePlace('Casablanca', 'Fès'));
  assert.ok(!samePlace('', ''));
});

test('addresses are tied to Morocco before they reach Google', () => {
  assert.equal(anchorToMorocco('Maarif, rue X'), 'Maarif, rue X, Maroc');
  assert.equal(anchorToMorocco('Casablanca, Maroc'), 'Casablanca, Maroc');
  assert.equal(anchorToMorocco('33.5731,-7.5898'), '33.5731,-7.5898');
});
