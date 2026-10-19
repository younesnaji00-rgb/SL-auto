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
const STREET = /^(?:rue|bd|boulevard|av|avenue|route|rte|place|pl|impasse|lot|lotissement|residence|res|km|autoroute|rocade|chemin|allee)\b/;

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
 * Where a rendez-vous is accepted. The admins keep the list on the « Sites »
 * page (`options_sites`, owner ruling 2026-10-16: some visits happen on the
 * outskirts of Casablanca — « I can go to Sites and add Mohammedia, then any
 * planification there is accepted »). These two cities are its seed and the
 * fallback when the list cannot be read (owner ruling 2026-10-05).
 */
export const DEFAULT_AREAS: readonly string[] = ['Casablanca', 'Fès'];

/**
 * Morocco's twelve regions: where Google stops when it cannot place an
 * address any closer (« Casablanca-Settat, Maroc ») — any town of the region,
 * so it cannot be told.
 */
const REGIONS = new Set([
  'tanger tetouan al hoceima', 'oriental', 'l oriental', 'fes meknes', 'rabat sale kenitra',
  'beni mellal khenifra', 'casablanca settat', 'marrakech safi', 'draa tafilalet',
  'souss massa', 'guelmim oued noun', 'laayoune sakia el hamra', 'dakhla oued ed dahab',
]);

export type AddressPlace =
  /** In one of the accepted areas (`city` = the area as the list writes it). */
  | { status: 'inside'; city: string; locality: string }
  /** Another place in Morocco, or another country (`abroad`, `locality` = the whole address). */
  | { status: 'outside'; locality: string; abroad: boolean }
  /** Nothing closer than the country or the region: Google did not find the place. */
  | { status: 'not-found' };

function areaOf(place: string, areas: readonly string[]): string | null {
  return areas.find((a) => samePlace(a, place)) ?? null;
}

function isRegion(place: string): boolean {
  return REGIONS.has(canonicalPlace(place).replace(/^region (?:de |d |du )?/, ''));
}

/** A town of Morocco by its name (« Bouskoura », « Préfecture de Mohammedia »). */
function isTown(place: string): boolean {
  return MOROCCAN_CITIES.some((c) => samePlace(c, place));
}

/**
 * A place Google names that is not a town — a quartier, an arrondissement, a
 * prefecture (« Anfa, Maroc », « Préfecture d'arrondissements de
 * Casablanca-Anfa ») — is in the accepted area the address names when it lies
 * within this drive of that area's centre. Casablanca's and Fès's own
 * quartiers are closer; their neighbouring towns are refused by name.
 */
export const QUARTIER_DRIVE_M = 15_000;

/** What the route knows besides Google's formatted address. */
export interface PlaceHints {
  /** The accepted area the typed address names (areaNamedIn); none for coordinates. */
  named?: string | null;
  /** The drive from each accepted area to the address, as Distance Matrix gave it. */
  legs?: readonly { city: string; meters: number | null }[];
}

function driveFrom(area: string, legs: PlaceHints['legs']): number | null {
  const leg = legs?.find((l) => samePlace(l.city, area));
  return typeof leg?.meters === 'number' ? leg.meters : null;
}

/** The accepted area to measure from: the one the address names, else the nearest. */
function referenceArea(hints: PlaceHints, areas: readonly string[]): string | null {
  if (hints.named) return areaOf(hints.named, areas);
  let best: { area: string; meters: number } | null = null;
  for (const area of areas) {
    const meters = driveFrom(area, hints.legs);
    if (meters !== null && (!best || meters < best.meters)) best = { area, meters };
  }
  return best?.area ?? null;
}

/**
 * Where a Google-formatted address lies against the accepted areas.
 *
 * Google does not always end its answer with the city: for « anfa,
 * casablanca » it may answer with the district or the prefecture, while
 * « casablanca, anfa » comes back as « …, Casablanca, Maroc ». So only a TOWN
 * is judged by its name; any other place is judged by where it lies, and the
 * order of the words typed no longer decides (owner 2026-10-19).
 */
export function placeOfAddress(
  formatted: string,
  areas: readonly string[] = DEFAULT_AREAS,
  hints: PlaceHints = {},
): AddressPlace {
  const parts = (formatted || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { status: 'not-found' };
  const last = parts[parts.length - 1];
  if (!COUNTRY.has(normalizePlace(last))) {
    // No country written after an accepted area (« Casablanca »): still that area.
    const area = areaOf(last.replace(/\d+/g, ''), areas);
    if (area) return { status: 'inside', city: area, locality: area };
    // Another country: « 10050 Borgone Susa, Ville métropolitaine de Turin, Italie ».
    return { status: 'outside', locality: parts.join(', '), abroad: true };
  }

  const reference = referenceArea(hints, areas);
  const drive = reference ? driveFrom(reference, hints.legs) : null;
  const near = reference !== null && drive !== null && drive <= QUARTIER_DRIVE_M;

  const locality = localityOf(formatted);
  if (!locality) {
    // A street with no city (« Bd Zerktouni, Maroc »), a short drive from the
    // area; the country alone means Google found nothing.
    const street = parts.some((p) => !COUNTRY.has(normalizePlace(p)));
    return near && street ? { status: 'inside', city: reference!, locality: reference! } : { status: 'not-found' };
  }
  if (isRegion(locality)) return { status: 'not-found' };
  const area = areaOf(locality, areas);
  if (area) return { status: 'inside', city: area, locality };
  // Another town, however close: an outskirt is accepted once the admins add it to « Sites ».
  if (isTown(locality)) return { status: 'outside', locality, abroad: false };
  // A quartier, an arrondissement or a prefecture written in place of the city.
  if (near) return { status: 'inside', city: reference!, locality };
  // Drive unknown: an accepted area written in Google's own answer
  // (« Préfecture d'arrondissements de Casablanca-Anfa »), streets and regions aside.
  if (drive === null) {
    for (const part of parts) {
      const n = normalizePlace(part);
      if (COUNTRY.has(n) || STREET.test(n) || isRegion(part)) continue;
      const written = areaNamedIn(part, areas);
      if (written) return { status: 'inside', city: written, locality };
    }
  }
  return { status: 'outside', locality, abroad: false };
}

/**
 * Where a typed address names a place, as whole words whatever the accents,
 * case or alias (« Casa », « Fez »): the position of its LAST mention, -1
 * when absent.
 */
function placeMention(address: string, place: string): number {
  const text = ` ${normalizePlace(address)} `;
  const key = canonicalPlace(place);
  const variants = [normalizePlace(place), key, ...Object.keys(ALIASES).filter((alias) => ALIASES[alias] === key)];
  const latin = Math.max(-1, ...variants.filter(Boolean).map((v) => text.lastIndexOf(` ${v} `)));
  // Written in Arabic: « الدار البيضاء » is Casablanca.
  const arabic = Math.max(-1, ...Object.entries(ARABIC_NAMES).filter(([, l]) => samePlace(l, place)).map(([ar]) => address.lastIndexOf(ar)));
  return Math.max(latin, arabic);
}

/** Arabic names of the main cities (normalizePlace keeps Latin letters only). */
const ARABIC_NAMES: Record<string, string> = {
  'الدار البيضاء': 'Casablanca', 'فاس': 'Fès', 'الرباط': 'Rabat', 'سلا': 'Salé', 'تمارة': 'Témara',
  'المحمدية': 'Mohammedia', 'مكناس': 'Meknès', 'مراكش': 'Marrakech', 'طنجة': 'Tanger', 'تطوان': 'Tétouan',
  'أكادير': 'Agadir', 'وجدة': 'Oujda', 'القنيطرة': 'Kénitra', 'الجديدة': 'El Jadida', 'آسفي': 'Safi',
  'سطات': 'Settat', 'برشيد': 'Berrechid', 'بوسكورة': 'Bouskoura', 'دار بوعزة': 'Dar Bouazza',
  'النواصر': 'Nouaceur', 'مديونة': 'Médiouna', 'تيط مليل': 'Tit Mellil', 'عين حرودة': 'Aïn Harrouda',
  'صفرو': 'Sefrou', 'إفران': 'Ifrane', 'الناظور': 'Nador', 'بني ملال': 'Béni Mellal', 'خريبكة': 'Khouribga',
};

/**
 * The accepted area a typed address names — « 12 rue X, Maarif, Casablanca »,
 * « Bd Hassan II, Mohammedia » — else null. Writing the city is mandatory
 * (owner 2026-10-16): the planning refuses an address that names none.
 */
export function areaNamedIn(address: string, areas: readonly string[]): string | null {
  // An address ends with its city: the name mentioned last wins (« Rte de
  // Sefrou, Bhalil » is in Bhalil), then the longer one (« Dar Bouazza »).
  let best: { area: string; at: number } | null = null;
  for (const area of areas) {
    const at = placeMention(address, area);
    if (at < 0) continue;
    if (!best || at > best.at || (at === best.at && area.length > best.area.length)) best = { area, at };
  }
  return best?.area ?? null;
}

/**
 * Cities and towns of Morocco an address may end with — for the Informations
 * addresses (the assuré, the partie adverse, an intermédiaire), which can be
 * anywhere in the country but must name their city. The accepted areas are
 * added to it where it is checked.
 */
export const MOROCCAN_CITIES: readonly string[] = [
  'Casablanca', 'Rabat', 'Salé', 'Témara', 'Skhirat', 'Kénitra', 'Mohammedia', 'Fès', 'Meknès',
  'Marrakech', 'Agadir', 'Inezgane', 'Aït Melloul', 'Tanger', 'Tétouan', 'Fnideq', 'Martil',
  'Larache', 'Ksar El Kébir', 'Chefchaouen', 'Ouazzane', 'Oujda', 'Nador', 'Berkane', 'Taourirt',
  'Jerada', 'Guercif', 'Al Hoceïma', 'Taza', 'El Jadida', 'Azemmour', 'Sidi Bennour', 'Safi',
  'Youssoufia', 'Essaouira', 'Settat', 'Berrechid', 'Ben Guerir', 'Kelaa des Sraghna', 'Khouribga',
  'Oued Zem', 'Béni Mellal', 'Fquih Ben Salah', 'Khénifra', 'Azilal', 'Errachidia', 'Midelt',
  'Ouarzazate', 'Zagora', 'Tinghir', 'Taroudant', 'Tiznit', 'Guelmim', 'Tan-Tan', 'Sidi Ifni',
  'Laâyoune', 'Boujdour', 'Dakhla', 'Sefrou', 'Bhalil', 'Ifrane', 'Azrou', 'El Hajeb',
  'Moulay Yacoub', 'Imouzzer Kandar', 'Aïn Taoujdate', 'Missour', 'Boulemane', 'Sidi Kacem',
  'Sidi Slimane', 'Souk El Arbaa', 'Khémisset', 'Tiflet', 'Benslimane', 'Bouznika', 'Bouskoura',
  'Dar Bouazza', 'Nouaceur', 'Médiouna', 'Tit Mellil', 'Aïn Harrouda', 'Had Soualem',
  'Lahraouyine', 'Deroua', 'Sidi Rahal', 'Chichaoua', 'Figuig',
  // Communes around Casablanca and Fès: close enough to pass for a quartier,
  // so they are told apart by name (placeOfAddress).
  'Ouled Saleh', 'Oulad Saleh', 'Oulad Azzouz', 'Sidi Hajjaj Oued Hassar', 'Mejjatia Ouled Taleb',
  'Lamkansa', 'Ech-Challalate', 'Bni Yakhlef', 'El Mansouria', 'Sidi Moussa Ben Ali',
  'Sidi Harazem', 'Sidi Hrazem', 'Aïn Chkef', 'Ouled Tayeb', 'Oulad Tayeb', 'Ras El Ma', 'Aïn Bida',
  'Sebaa Rouadi', 'Aïn Cheggag',
];

/** The city a typed address names: an accepted area or a city of Morocco, else null. */
export function cityNamedIn(address: string, areas: readonly string[] = []): string | null {
  return areaNamedIn(address, [...areas, ...MOROCCAN_CITIES]);
}
