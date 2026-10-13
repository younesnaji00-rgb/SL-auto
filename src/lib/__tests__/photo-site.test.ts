// Run: npx tsx --test src/lib/__tests__/photo-site.test.ts
//
// Tester, 2026-10-13: an agent de terrain's photo showed the address of the
// planification wherever it was taken. Each photo now records where the phone
// was and says whether that was at the visit — not blocking while testing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE_MAX_ACCURACY_M,
  classifySite,
  formatDistance,
  haversineM,
  readSiteCheck,
  siteDetail,
  siteLabel,
  siteWatermarkLine,
  visitAddressesForPhotos,
} from '../photo-site';

const VISIT = '12 rue Ibn Battouta, Maarif, Casablanca';
const fix = (accuracy = 20) => ({ lat: 33.5731, lng: -7.5898, accuracy });
const direct = (meters: number | null) => [{ adresse: VISIT, meters, method: 'direct' as const }];
const road = (meters: number | null) => [{ adresse: VISIT, meters, method: 'road' as const }];

test('at the address: « Sur place », with the position kept', () => {
  const c = classifySite(fix(), direct(60), true);
  assert.equal(c.status, 'sur_place');
  assert.equal(c.distanceM, 60);
  assert.equal(c.lat, 33.5731);
  assert.equal(c.accuracyM, 20);
  assert.equal(siteLabel(c), 'Sur place');
});

test('kilometres away: « Hors site » with the distance, on the badge and on the photo', () => {
  const c = classifySite(fix(), direct(3240), true);
  assert.equal(c.status, 'hors_site');
  assert.equal(siteLabel(c), 'Hors site · 3,2 km');
  assert.equal(siteWatermarkLine(c), 'HORS SITE : à 3,2 km de la visite');
  assert.match(siteDetail(c), /^Photo prise hors site : à 3,2 km de l'adresse de la visite \(12 rue Ibn Battouta/);
});

test('the road distance has the arrival’s wider reach', () => {
  assert.equal(classifySite(fix(), road(220), true).status, 'sur_place');
  assert.equal(classifySite(fix(), direct(220), true).status, 'hors_site');
});

test('a vague position cannot prove the agent was there, but can prove they were not', () => {
  // 100 m away with a 400 m radius of uncertainty: could be anywhere.
  const vague = classifySite(fix(400), direct(100), true);
  assert.equal(vague.status, 'non_verifie');
  assert.equal(vague.reason, 'imprecise');
  // 20 km away with the same uncertainty: away whatever the error.
  assert.equal(classifySite(fix(400), direct(20000), true).status, 'hors_site');
  // Just inside the reach but not precise enough.
  assert.equal(classifySite(fix(SITE_MAX_ACCURACY_M + 1), direct(100), true).status, 'non_verifie');
});

test('no position, no visit address, an address no map can place: « Lieu non vérifié » with the reason', () => {
  const none = classifySite(null, direct(10), true);
  assert.deepEqual(none, { status: 'non_verifie', reason: 'no_position' });
  assert.equal(siteLabel(none), 'Lieu non vérifié');
  assert.match(siteDetail(none), /position du téléphone n'était pas disponible/);
  assert.equal(classifySite(fix(), [], false).reason, 'no_visit');
  const unknown = classifySite(fix(), direct(null), true);
  assert.equal(unknown.reason, 'address_unknown');
  // The phone's position is still recorded.
  assert.equal(unknown.lng, -7.5898);
});

test('with two visits of the phase, the nearest one decides', () => {
  const c = classifySite(fix(), [
    { adresse: 'Fès', meters: 190000, method: 'road' },
    { adresse: VISIT, meters: 40, method: 'direct' },
  ], true);
  assert.equal(c.status, 'sur_place');
  assert.equal(c.adresse, VISIT);
});

test('nothing stored is ever undefined (Firestore refuses undefined fields)', () => {
  for (const c of [classifySite(null, [], true), classifySite(fix(), direct(null), true), classifySite({ lat: 1, lng: 2 }, direct(5), true)]) {
    for (const [k, v] of Object.entries(c)) assert.notEqual(v, undefined, k);
  }
});

test('the visits a photo is compared with: those whose day has come, else every live one', () => {
  const now = new Date(2026, 9, 13, 10);
  const plans = [
    { adresse: VISIT, dateRDV: new Date(2026, 9, 13, 15) },
    { adresse: 'Hay Salam, Fès', dateRDV: new Date(2026, 9, 20, 9) },
    { adresse: 'Ancienne adresse', dateRDV: new Date(2026, 9, 1), active: false },
    { adresse: '  ', dateRDV: new Date(2026, 9, 2) },
  ];
  assert.deepEqual(visitAddressesForPhotos(plans, now), [VISIT]);
  assert.deepEqual(visitAddressesForPhotos(plans.slice(1), now), ['Hay Salam, Fès']);
  assert.deepEqual(visitAddressesForPhotos([], now), []);
});

test('distances read the French way', () => {
  assert.equal(formatDistance(0), 'moins de 10 m');
  assert.equal(formatDistance(15), '15 m');
  assert.equal(formatDistance(846), '850 m');
  assert.equal(formatDistance(3240), '3,2 km');
  assert.equal(formatDistance(24400), '24 km');
  // Casablanca → Fès, as the crow flies: about 240 km.
  assert.ok(Math.abs(haversineM(33.5731, -7.5898, 34.0331, -5.0003) / 1000 - 244) < 5);
});

test('a stored siteCheck is read back; anything else reads as none', () => {
  assert.equal(readSiteCheck({ status: 'hors_site', distanceM: 900 })?.status, 'hors_site');
  assert.equal(readSiteCheck(undefined), null);
  assert.equal(readSiteCheck({ status: 'ailleurs' }), null);
  assert.equal(readSiteCheck('sur_place'), null);
});
