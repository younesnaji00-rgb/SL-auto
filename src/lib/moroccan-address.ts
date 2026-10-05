/**
 * Moroccan addresses as Google resolves them — shared by the routes that send
 * a rendez-vous address to the Distance Matrix API (atg-feasibility,
 * check-address, arrival-distance).
 *
 * The city of an address is read from the address Google RESOLVED for the
 * route (Distance Matrix `destination_addresses`, formatted in French:
 * « 219 Bd Mohamed Zerktouni, Casablanca 20250, Maroc »), so a message names
 * the very place the drive is computed to. The locality is the LAST component
 * before the country: « Rte de Casablanca, Rabat, Maroc » is in Rabat,
 * whatever its street is called.
 */

/** `lat,lng` pairs are sent as-is; anything else is a typed address. */
export const COORDS_RE = /^\s*-?\d{1,2}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?\s*$/;

/**
 * Tie a typed address to Morocco. `region=ma` is only a bias: a short or
 * country-less string (« Maarif, rue X », or the « ville, quartier, rue »
 * that reverse-geocoding produces) resolved to France or Spain, and a
 * 2 000 km leg became a 25-hour « conflit de planning » (QA bug 045).
 */
export function anchorToMorocco(address: string): string {
  if (COORDS_RE.test(address)) return address;
  if (/\b(maroc|morocco|marruecos)\b|المغرب/i.test(address)) return address;
  return `${address}, Maroc`;
}

/** Lowercase, accents and punctuation dropped: « Fès » → « fes ». */
export function normalizePlace(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Other spellings of a city, both sides normalized. */
const ALIASES: Record<string, string> = {
  casa: 'casablanca',
  'dar el beida': 'casablanca',
  'dar al baida': 'casablanca',
  fez: 'fes',
};

/** « Préfecture de Casablanca », « Grand Casablanca » → « casablanca ». */
const ADMIN_PREFIX = /^(?:prefecture|province|commune|grand)(?: d arrondissements)?(?: de| d| du)? /;

function canonicalPlace(s: string): string {
  const n = normalizePlace(s).replace(ADMIN_PREFIX, '');
  return ALIASES[n] ?? n;
}

const COUNTRY = new Set(['maroc', 'morocco', 'marruecos']);
/** Open Location Code (« 8V6V+2Q »), which Google may put before a locality. */
const PLUS_CODE = /\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/gi;
/** A street, not a city: Google resolved a road without its locality. */
const STREET = /^(?:rue|bd|boulevard|av|avenue|route|rte|place|pl|impasse|lot|lotissement|residence|res|km)\b/;

/**
 * Locality of a Google-formatted Moroccan address: the component before the
 * country, without postal code or plus code. Null when Google resolved no
 * more than the country, or a street with no city.
 */
export function localityOf(formatted: string): string | null {
  const parts = (formatted || '').split(',').map((p) => p.trim()).filter(Boolean);
  while (parts.length > 0 && COUNTRY.has(normalizePlace(parts[parts.length - 1]))) parts.pop();
  if (parts.length === 0) return null;
  const locality = parts[parts.length - 1]
    .replace(PLUS_CODE, '')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!locality || STREET.test(normalizePlace(locality))) return null;
  return locality;
}

/** Same place whatever the accents, case, alias or admin prefix (« Fez », « Préfecture de Casablanca »). */
export function samePlace(a: string, b: string): boolean {
  const ca = canonicalPlace(a);
  return ca !== '' && ca === canonicalPlace(b);
}

/**
 * The firm works in two cities (owner ruling 2026-10-05): a rendez-vous
 * address anywhere else — another Moroccan city, another country, or a place
 * Google cannot pin down — is invalid, and no planification is saved with it.
 */
export const FIRM_CITIES = ['Casablanca', 'Fès'] as const;
export type FirmCity = (typeof FIRM_CITIES)[number];

/**
 * Where Google stops when it cannot place an address any closer than the
 * region of one of the firm's cities (« Casablanca-Settat, Maroc »): the city
 * itself, or any other town of the region — so it cannot be told.
 */
const FIRM_REGIONS = new Set(['casablanca settat', 'fes meknes']);

export type AddressPlace =
  /** In one of the firm's cities. */
  | { status: 'inside'; city: FirmCity; locality: string }
  /** Another city of Morocco, or another country (`abroad`, `locality` = the whole address). */
  | { status: 'outside'; locality: string; abroad: boolean }
  /** Nothing closer than the country or the region: Google did not find the place. */
  | { status: 'not-found' };

function firmCityOf(place: string): FirmCity | null {
  return FIRM_CITIES.find((c) => samePlace(c, place)) ?? null;
}

/** Where a Google-formatted address lies against the firm's cities. */
export function placeOfAddress(formatted: string): AddressPlace {
  const parts = (formatted || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { status: 'not-found' };
  const last = parts[parts.length - 1];
  if (!COUNTRY.has(normalizePlace(last))) {
    // No country written after a firm city (« Casablanca »): still that city.
    const city = firmCityOf(last.replace(/\d+/g, ''));
    if (city) return { status: 'inside', city, locality: city };
    // Another country: « 10050 Borgone Susa, Ville métropolitaine de Turin, Italie ».
    return { status: 'outside', locality: parts.join(', '), abroad: true };
  }
  const locality = localityOf(formatted);
  if (!locality) return { status: 'not-found' };
  if (FIRM_REGIONS.has(canonicalPlace(locality).replace(/^region (?:de |d |du )?/, ''))) {
    return { status: 'not-found' };
  }
  const city = firmCityOf(locality);
  return city ? { status: 'inside', city, locality } : { status: 'outside', locality, abroad: false };
}
