/**
 * Encoding shared by server pages (encode) and the client components in
 * contact-links.tsx (decode). Reversed + base64: trivial on purpose — the goal
 * is to defeat bulk regex harvesting of page source and RSC payloads, not
 * determined humans. Works in Node and the browser (no Buffer).
 */
export function obfuscate(value: string): string {
  return btoa(unescape(encodeURIComponent(Array.from(value).reverse().join(''))));
}

export function reveal(enc: string): string {
  return Array.from(decodeURIComponent(escape(atob(enc)))).reverse().join('');
}
