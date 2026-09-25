// Run: npx tsx --test src/lib/__tests__/moroccan-address.test.ts
//
// « Destination hors de Casablanca / hors de Fès » (owner request
// 2026-09-25): the city is the locality of the address Google resolved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorToMorocco, checkSites, localityOf } from '../moroccan-address';

test('the locality is the component before the country, without postal or plus code', () => {
  assert.equal(localityOf('219 Bd Mohamed Zerktouni, Casablanca 20250, Maroc'), 'Casablanca');
  assert.equal(localityOf('Casablanca, Maroc'), 'Casablanca');
  assert.equal(localityOf('Av. Hassan II, Fès 30050, Maroc'), 'Fès');
  assert.equal(localityOf('8V6V+2Q Casablanca, Maroc'), 'Casablanca');
  assert.equal(localityOf('Aïn Chock, Casablanca, Maroc'), 'Casablanca');
  assert.equal(localityOf('Bouskoura, Maroc'), 'Bouskoura');
});

test('a street named after a city does not put the address in that city', () => {
  assert.equal(localityOf('Rte de Casablanca, Rabat, Maroc'), 'Rabat');
  const r = checkSites('Avenue de Fès, Casablanca 20250, Maroc', ['Fès']);
  assert.deepEqual(r, { locality: 'Casablanca', insideSites: [] });
});

test('nothing to say when Google resolved only the country or a bare street', () => {
  assert.equal(localityOf('Maroc'), null);
  assert.equal(localityOf(''), null);
  assert.equal(localityOf('Bd Zerktouni, Maroc'), null);
  assert.equal(checkSites('Maroc', ['Casablanca']), null);
});

test('inside the site: accents, case, aliases and admin prefixes do not matter', () => {
  assert.deepEqual(checkSites('Rue X, Fes 30000, Maroc', ['Fès'])?.insideSites, ['Fès']);
  assert.deepEqual(checkSites('Fès, Maroc', ['fes'])?.insideSites, ['fes']);
  assert.deepEqual(checkSites('Casablanca, Maroc', ['Casa'])?.insideSites, ['Casa']);
  assert.deepEqual(checkSites('Préfecture de Casablanca, Maroc', ['Casablanca'])?.insideSites, ['Casablanca']);
});

test('outside every site: the place Google found is named', () => {
  assert.deepEqual(checkSites('Bouskoura, Maroc', ['Casablanca']), { locality: 'Bouskoura', insideSites: [] });
  assert.deepEqual(checkSites('Mohammédia, Maroc', ['Casablanca', 'Fès']), { locality: 'Mohammédia', insideSites: [] });
  // The region is not the city: an address Google only placed in the region
  // is outside the city itself.
  assert.deepEqual(checkSites('Casablanca-Settat, Maroc', ['Casablanca'])?.insideSites, []);
});

test('an account on two sites is inside when the address is in either', () => {
  assert.deepEqual(checkSites('Bd Allal Ben Abdellah, Fès, Maroc', ['Casablanca', 'Fès'])?.insideSites, ['Fès']);
});

test('addresses are tied to Morocco before they reach Google', () => {
  assert.equal(anchorToMorocco('Maarif, rue X'), 'Maarif, rue X, Maroc');
  assert.equal(anchorToMorocco('Casablanca, Maroc'), 'Casablanca, Maroc');
  assert.equal(anchorToMorocco('33.5731,-7.5898'), '33.5731,-7.5898');
});
