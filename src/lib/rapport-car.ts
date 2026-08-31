/**
 * Car top-view renderer for rapport PDFs.
 *
 * Rasterises the same technical car illustration the app shows in the
 * points-de-choc editor (`car-svg-top.tsx`) into a PNG, with the dossier's
 * selected impact zones highlighted in red, so the "Point de choc" area of the
 * report matches both the app and the supplied templates instead of a crude box.
 *
 * Runs in the browser only (uses Image + canvas). Returns null server-side or on
 * any failure so callers can fall back gracefully via `addImageSafe`.
 */
import type { LoadedImage } from './generate-rapport-shared';

const S = '#1e293b';
const PANEL = '#eeece8'; // ≈ hsl(40 15% 92%) — the app's --muted in light mode
const HILITE = '#dc2626';

// ── Geometry: identical to components/car-svg-top.tsx and lib/rapport-car-pdf.tsx ──

const BODY =
  'M 150 30 L 200 31 C 228 32, 246 38, 250 56 C 254 72, 256 88, 257 102 C 259 115, 262 128, 262 142 ' +
  'C 262 156, 259 172, 258 188 C 259 260, 259 360, 258 438 C 259 452, 262 468, 262 486 C 262 502, 259 518, 256 532 ' +
  'C 254 550, 251 566, 246 580 C 242 594, 226 599, 200 600 L 100 600 C 74 599, 58 594, 54 580 C 49 566, 46 550, 44 532 ' +
  'C 41 518, 38 502, 38 486 C 38 468, 41 452, 42 438 C 41 360, 41 260, 42 188 C 41 172, 38 156, 38 142 ' +
  'C 38 128, 41 115, 43 102 C 44 88, 46 72, 50 56 C 54 38, 72 32, 100 31 Z';

const GLASS: string[] = [
  'M 66 156 C 110 152, 190 152, 234 156 L 218 218 C 190 215, 110 215, 82 218 Z',
  'M 82 402 C 110 405, 190 405, 218 402 L 234 462 C 190 466, 110 466, 66 462 Z',
  'M 58 164 L 76 222 L 76 318 L 57 318 Z',
  'M 57 318 L 76 318 L 76 400 L 58 458 Z',
  'M 242 164 L 224 222 L 224 318 L 243 318 Z',
  'M 243 318 L 224 318 L 224 400 L 242 458 Z',
];

const MIRRORS: string[] = [
  'M 42 172 C 32 170, 25 174, 25 182 L 25 190 C 25 197, 32 199, 42 195 Z',
  'M 258 172 C 268 170, 275 174, 275 182 L 275 190 C 275 197, 268 199, 258 195 Z',
];

const LINES_1: string[] = [
  'M 102 42 C 80 40, 62 42, 54 52 C 48 62, 46 74, 48 84 L 60 82 C 64 70, 74 60, 94 54 Z',
  'M 198 42 C 220 40, 238 42, 246 52 C 252 62, 254 74, 252 84 L 240 82 C 236 70, 226 60, 206 54 Z',
  'M 102 552 C 78 550, 60 552, 54 560 C 51 566, 52 574, 56 580 L 68 578 C 70 568, 80 560, 100 560 Z',
  'M 198 552 C 222 550, 240 552, 246 560 C 249 566, 248 574, 244 580 L 232 578 C 230 568, 220 560, 200 560 Z',
  'M 104 58 C 120 55, 180 55, 196 58',
  'M 64 152 C 100 148, 200 148, 236 152',
  'M 60 84 C 64 110, 66 130, 64 152',
  'M 240 84 C 236 110, 234 130, 236 152',
  'M 82 218 C 110 215, 190 215, 218 218 L 224 222 L 224 400 L 218 402 C 190 405, 110 405, 82 402 L 76 400 L 76 222 Z',
  'M 58 164 L 76 222', 'M 66 156 L 82 218',
  'M 242 164 L 224 222', 'M 234 156 L 218 218',
  'M 76 400 L 58 458', 'M 82 402 L 66 462',
  'M 224 400 L 242 458', 'M 218 402 L 234 462',
  'M 58 164 C 57 260, 57 360, 58 458',
  'M 242 164 C 243 260, 243 360, 242 458',
  'M 58 318 L 76 318', 'M 242 318 L 224 318',
  'M 42 190 L 58 190', 'M 41 318 L 58 318', 'M 42 442 L 60 442',
  'M 258 190 L 242 190', 'M 259 318 L 242 318', 'M 258 442 L 240 442',
  'M 44 104 C 50 118, 52 162, 46 186', 'M 256 104 C 250 118, 248 162, 254 186',
  'M 44 448 C 50 462, 52 508, 46 530', 'M 256 448 C 250 462, 248 508, 254 530',
  'M 62 466 C 58 500, 56 530, 60 548', 'M 238 466 C 242 500, 244 530, 240 548',
  'M 60 548 C 100 552, 200 552, 240 548',
  'M 58 584 C 100 588, 200 588, 242 584',
];

const LINES_075: string[] = [
  'M 150 66 L 150 146',
  'M 118 66 C 116 100, 116 130, 120 148', 'M 182 66 C 184 100, 184 130, 180 148',
  'M 58 74 C 62 64, 70 58, 84 54', 'M 242 74 C 238 64, 230 58, 216 54',
  'M 58 570 C 62 564, 70 560, 84 558', 'M 242 570 C 238 564, 230 560, 216 558',
  'M 114 41 L 186 41', 'M 114 45 L 186 45',
  'M 100 161 L 142 158', 'M 200 161 L 158 158',
  'M 30 178 L 30 192', 'M 270 178 L 270 192',
  'M 46 300 L 54 300', 'M 46 425 L 54 425', 'M 254 300 L 246 300', 'M 254 425 L 246 425',
];

const ZONES: { id: string; d: string; label: string; x: number; y: number; rotate?: number }[] = [
  { id: 'AV', d: 'M 100 31 L 200 31 L 200 50 C 224 56, 236 68, 240 84 L 240 100 C 200 94, 100 94, 60 100 L 60 84 C 64 68, 76 56, 100 50 Z', label: 'AV', x: 150, y: 80 },
  { id: 'AVG', d: 'M 100 31 C 72 32, 54 38, 50 56 C 46 72, 44 88, 43 102 C 41 115, 38 128, 38 142 C 38 156, 41 172, 42 190 L 62 190 L 64 152 C 66 130, 64 110, 60 84 C 64 68, 76 56, 100 50 Z', label: 'AVG', x: 51, y: 130, rotate: -90 },
  { id: 'AVD', d: 'M 200 31 C 228 32, 246 38, 250 56 C 254 72, 256 88, 257 102 C 259 115, 262 128, 262 142 C 262 156, 259 172, 258 190 L 238 190 L 236 152 C 234 130, 236 110, 240 84 C 236 68, 224 56, 200 50 Z', label: 'AVD', x: 249, y: 130, rotate: 90 },
  { id: 'LATG', d: 'M 42 190 L 60 190 L 76 222 L 76 400 L 63 442 L 42 442 C 41 360, 41 260, 42 190 Z', label: 'LATG', x: 50, y: 254, rotate: -90 },
  { id: 'LATD', d: 'M 258 190 L 240 190 L 224 222 L 224 400 L 237 442 L 258 442 C 259 360, 259 260, 258 190 Z', label: 'LATD', x: 250, y: 254, rotate: 90 },
  { id: 'Toit', d: 'M 82 218 C 110 215, 190 215, 218 218 L 224 222 L 224 400 L 218 402 C 190 405, 110 405, 82 402 L 76 400 L 76 222 Z', label: 'TOIT', x: 150, y: 314 },
  { id: 'ARG', d: 'M 42 442 L 63 442 L 58 458 L 62 466 C 58 500, 56 530, 60 548 L 68 580 L 100 600 C 74 599, 58 594, 54 580 C 49 566, 46 550, 44 532 C 41 518, 38 502, 38 486 C 38 468, 41 452, 42 442 Z', label: 'ARG', x: 51, y: 500, rotate: -90 },
  { id: 'ARD', d: 'M 258 442 L 237 442 L 242 458 L 238 466 C 242 500, 244 530, 240 548 L 232 580 L 200 600 C 226 599, 242 594, 246 580 C 251 566, 254 550, 256 532 C 259 518, 262 502, 262 486 C 262 468, 259 452, 258 442 Z', label: 'ARD', x: 249, y: 500, rotate: 90 },
  { id: 'AR', d: 'M 66 462 C 110 466, 190 466, 234 462 L 238 466 C 242 500, 244 530, 240 548 L 232 580 L 200 600 L 100 600 L 68 580 L 60 548 C 56 530, 58 500, 62 466 Z', label: 'AR', x: 150, y: 512 },
];

/** Build the top-view car SVG with the active choc zones baked in as red fills. */
export function buildCarTopSvg(zones: Record<string, boolean>): string {
  const z = zones || {};
  const L = `stroke="${S}" stroke-linecap="round" stroke-linejoin="round"`;
  const p = (d: string, w: number) => `<path d="${d}" ${L} stroke-width="${w}" fill="none"/>`;

  const parts: string[] = [
    `<rect width="300" height="620" fill="#ffffff"/>`,
    `<path d="${BODY}" ${L} stroke-width="2" fill="${PANEL}" fill-opacity="0.6"/>`,
    ...MIRRORS.map((d) => `<path d="${d}" ${L} stroke-width="1.5" fill="${PANEL}" fill-opacity="0.6"/>`),
    ...GLASS.map((d) => `<path d="${d}" fill="${S}" fill-opacity="0.06"/>`),
    `<rect x="110" y="36" width="80" height="14" rx="4" ${L} stroke-width="1" fill="none"/>`,
    `<rect x="128" y="587" width="44" height="9" rx="1.5" ${L} stroke-width="0.75" fill="none"/>`,
    `<ellipse cx="150" cy="390" rx="3" ry="7" ${L} stroke-width="0.75" fill="${S}" fill-opacity="0.08"/>`,
    ...LINES_1.map((d) => p(d, 1)),
    ...LINES_075.map((d) => p(d, 0.75)),
    ...ZONES.filter(({ id }) => z[id]).map(
      ({ d }) => `<path d="${d}" fill="${HILITE}" fill-opacity="0.4" stroke="${HILITE}" stroke-width="1.5" stroke-linejoin="round"/>`,
    ),
    ...ZONES.map(({ label, x, y, rotate }) => {
      const tr = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '';
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="700" letter-spacing="0.5" fill="${S}" fill-opacity="0.7" font-family="Arial, Helvetica, sans-serif"${tr}>${label}</text>`;
    }),
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 620" fill="none">\n${parts.join('\n')}\n</svg>`;
}

/** Rasterise the car SVG to a PNG LoadedImage (browser only; null on failure). */
export async function renderCarTopView(
  zones: Record<string, boolean>,
): Promise<LoadedImage | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  const svg = buildCarTopSvg(zones);
  return new Promise<LoadedImage | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scale = 2.5;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(300 * scale);
        canvas.height = Math.round(620 * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ data: canvas.toDataURL('image/png'), format: 'PNG' });
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/** PNG aspect ratio (width / height) of the rendered car, for sizing in the PDF. */
export const CAR_TOP_ASPECT = 300 / 620;

/**
 * Downscale a loaded image so its largest side is at most `maxPx`, re-encoding
 * as JPEG to keep the PDF small. Compagnie logos fetched from Storage are often
 * multi-megapixel; embedded raw they bloat the PDF to several MB even though
 * they're printed at ~28mm. Returns the original when already small enough, or
 * on any failure / server-side (so callers degrade gracefully).
 */
export async function scaleImageDown(
  src: LoadedImage | null,
  maxPx = 600,
): Promise<LoadedImage | null> {
  if (!src) return null;
  if (typeof document === 'undefined' || typeof Image === 'undefined') return src;
  return new Promise<LoadedImage | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const w = image.naturalWidth || image.width;
        const h = image.naturalHeight || image.height;
        if (!w || !h) return resolve(src);
        const scale = Math.min(1, maxPx / Math.max(w, h));
        if (scale >= 1) return resolve(src); // already small enough — keep as-is
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(image, 0, 0, cw, ch);
        resolve({ data: canvas.toDataURL('image/jpeg', 0.85), format: 'JPEG' });
      } catch {
        resolve(src);
      }
    };
    image.onerror = () => resolve(src);
    image.src = src.data;
  });
}
