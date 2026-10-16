/**
 * Tampons — one entry per image (QA #066 / Chiffreur #015: the same file could
 * be imported again and again, each time a new « tampons » in the list and in
 * the chiffreur's picker).
 *
 * An image is refused when its bytes match a tampon already saved or already
 * queued, or when its name (taken from the file name) is the name of one —
 * the picker shows names only, so two « tampons » cannot be told apart.
 */

export interface StampIdentity {
  name: string;
  /** SHA-256 hex of the image; unknown for tampons saved before the check. */
  hash?: string | null;
}

/** Name compared without case, accents or extra spaces. */
export function stampNameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export type StampDuplicate = { reason: 'same-image' | 'same-name'; of: string };

/** Why `candidate` duplicates one of `known`, or null. Same image wins over same name. */
export function findStampDuplicate(candidate: StampIdentity, known: ReadonlyArray<StampIdentity>): StampDuplicate | null {
  if (candidate.hash) {
    const twin = known.find((k) => k.hash && k.hash === candidate.hash);
    if (twin) return { reason: 'same-image', of: twin.name };
  }
  const key = stampNameKey(candidate.name);
  const namesake = key ? known.find((k) => stampNameKey(k.name) === key) : undefined;
  return namesake ? { reason: 'same-name', of: namesake.name } : null;
}

/** SHA-256 of some bytes, hex (Web Crypto; null where it is unavailable). */
export async function sha256Hex(data: ArrayBuffer): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const digest = await subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}
