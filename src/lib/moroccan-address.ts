/**
 * Moroccan addresses as Google resolves them — shared by the two routes that
 * send a rendez-vous address to the Distance Matrix API (atg-feasibility,
 * destination-city).
 *
 * « Destination hors de Casablanca / hors de Fès » (owner request
 * 2026-09-25): the city of an address is read from the address Google
 * RESOLVED for the route (Distance Matrix `destination_addresses`, formatted
 * in French: « 219 Bd Mohamed Zerktouni, Casablanca 20250, Maroc »), so the
 * warning names the very place the drive is computed to. The locality is the
 * LAST component before the country: « Rte de Casablanca, Rabat, Maroc » is
 * in Rabat, whatever its street is called.
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

export interface SiteCheck {
  /** Where Google placed the address, as it wrote it (« Bouskoura »). */
  locality: string;
  /** The sites the address lies in; empty when it is outside all of them. */
  insideSites: string[];
}

/** Which of `sites` the formatted address falls in; null when it cannot be told. */
export function checkSites(formatted: string, sites: string[]): SiteCheck | null {
  const locality = localityOf(formatted);
  if (!locality) return null;
  const here = canonicalPlace(locality);
  return { locality, insideSites: sites.filter((s) => canonicalPlace(s) === here) };
}
