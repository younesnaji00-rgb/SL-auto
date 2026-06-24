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

/** Build the top-view car SVG with the active choc zones baked in as red fills. */
export function buildCarTopSvg(zones: Record<string, boolean>): string {
  const z = zones || {};
  const fill = (k: string) => (z[k] ? '#dc2626' : 'none');
  const op = (k: string) => (z[k] ? '0.4' : '0');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 620" fill="none">
<rect width="300" height="620" fill="#ffffff"/>
<path d="M 95 52 Q 95 28, 115 20 L 185 20 Q 205 28, 205 52 L 210 75 Q 218 95, 224 120 L 228 155 Q 232 185, 232 220 L 232 310 Q 232 400, 228 440 L 224 475 Q 218 500, 210 520 L 205 548 Q 205 572, 185 580 L 115 580 Q 95 572, 95 548 L 90 520 Q 82 500, 76 475 L 72 440 Q 68 400, 68 310 L 68 220 Q 68 185, 72 155 L 76 120 Q 82 95, 90 75 Z" stroke="${S}" stroke-width="2.5" fill="none"/>
<path d="M 100 22 Q 150 14, 200 22" stroke="${S}" stroke-width="1"/>
<path d="M 120 26 L 180 26" stroke="${S}" stroke-width="0.8"/>
<path d="M 82 55 Q 78 42, 95 38 L 105 35 Q 108 48, 95 55 Z" stroke="${S}" stroke-width="1.5" fill="none"/>
<path d="M 218 55 Q 222 42, 205 38 L 195 35 Q 192 48, 205 55 Z" stroke="${S}" stroke-width="1.5" fill="none"/>
<path d="M 85 95 Q 150 88, 215 95" stroke="${S}" stroke-width="1"/>
<path d="M 90 100 Q 92 92, 110 88 L 190 88 Q 208 92, 210 100 L 210 145 Q 208 150, 200 152 L 100 152 Q 92 150, 90 145 Z" stroke="${S}" stroke-width="1.8" fill="none"/>
<path d="M 82 100 L 90 100 L 90 152 L 78 155" stroke="${S}" stroke-width="1.2" fill="none"/>
<path d="M 218 100 L 210 100 L 210 152 L 222 155" stroke="${S}" stroke-width="1.2" fill="none"/>
<path d="M 88 155 L 88 430 L 212 430 L 212 155 Z" stroke="${S}" stroke-width="0.8" stroke-dasharray="5 3" fill="none"/>
<line x1="78" y1="248" x2="92" y2="248" stroke="${S}" stroke-width="1.5"/>
<line x1="208" y1="248" x2="222" y2="248" stroke="${S}" stroke-width="1.5"/>
<path d="M 78 158 L 88 155 L 88 245 L 75 245" stroke="${S}" stroke-width="1.2" fill="none"/>
<path d="M 75 252 L 88 252 L 88 425 L 80 422" stroke="${S}" stroke-width="1.2" fill="none"/>
<path d="M 222 158 L 212 155 L 212 245 L 225 245" stroke="${S}" stroke-width="1.2" fill="none"/>
<path d="M 225 252 L 212 252 L 212 425 L 220 422" stroke="${S}" stroke-width="1.2" fill="none"/>
<path d="M 92 435 Q 92 430, 100 428 L 200 428 Q 208 430, 208 435 L 208 478 Q 208 488, 195 492 L 105 492 Q 92 488, 92 478 Z" stroke="${S}" stroke-width="1.8" fill="none"/>
<path d="M 80 425 L 88 430 L 92 435 L 78 440" stroke="${S}" stroke-width="1.2" fill="none"/>
<path d="M 220 425 L 212 430 L 208 435 L 222 440" stroke="${S}" stroke-width="1.2" fill="none"/>
<path d="M 85 498 Q 150 492, 215 498" stroke="${S}" stroke-width="1"/>
<path d="M 78 540 Q 75 555, 95 560 L 105 562 Q 108 548, 95 542 Z" stroke="${S}" stroke-width="1.5" fill="none"/>
<path d="M 222 540 Q 225 555, 205 560 L 195 562 Q 192 548, 205 542 Z" stroke="${S}" stroke-width="1.5" fill="none"/>
<path d="M 100 575 Q 150 582, 200 575" stroke="${S}" stroke-width="1"/>
<path d="M 68 130 Q 56 128, 54 138 L 54 150 Q 56 158, 64 156 L 68 152" stroke="${S}" stroke-width="1.8" fill="none"/>
<path d="M 232 130 Q 244 128, 246 138 L 246 150 Q 244 158, 236 156 L 232 152" stroke="${S}" stroke-width="1.8" fill="none"/>
<path d="M 72 120 Q 70 155, 70 190 L 70 245" stroke="${S}" stroke-width="1"/>
<path d="M 228 120 Q 230 155, 230 190 L 230 245" stroke="${S}" stroke-width="1"/>
<path d="M 70 252 L 70 380 Q 70 420, 76 445" stroke="${S}" stroke-width="1"/>
<path d="M 230 252 L 230 380 Q 230 420, 224 445" stroke="${S}" stroke-width="1"/>
<path d="M 68 80 Q 55 80, 52 100 L 52 125 Q 55 140, 68 140" stroke="${S}" stroke-width="1.5" fill="none"/>
<path d="M 232 80 Q 245 80, 248 100 L 248 125 Q 245 140, 232 140" stroke="${S}" stroke-width="1.5" fill="none"/>
<path d="M 68 450 Q 55 450, 52 470 L 52 495 Q 55 510, 68 510" stroke="${S}" stroke-width="1.5" fill="none"/>
<path d="M 232 450 Q 245 450, 248 470 L 248 495 Q 245 510, 232 510" stroke="${S}" stroke-width="1.5" fill="none"/>
<rect x="80" y="16" width="140" height="75" rx="10" fill="${fill('AV')}" fill-opacity="${op('AV')}"/>
<rect x="80" y="520" width="140" height="60" rx="10" fill="${fill('AR')}" fill-opacity="${op('AR')}"/>
<rect x="50" y="55" width="35" height="95" rx="6" fill="${fill('AVG')}" fill-opacity="${op('AVG')}"/>
<rect x="215" y="55" width="35" height="95" rx="6" fill="${fill('AVD')}" fill-opacity="${op('AVD')}"/>
<rect x="50" y="440" width="35" height="90" rx="6" fill="${fill('ARG')}" fill-opacity="${op('ARG')}"/>
<rect x="215" y="440" width="35" height="90" rx="6" fill="${fill('ARD')}" fill-opacity="${op('ARD')}"/>
<rect x="50" y="150" width="30" height="290" rx="5" fill="${fill('LATG')}" fill-opacity="${op('LATG')}"/>
<rect x="220" y="150" width="30" height="290" rx="5" fill="${fill('LATD')}" fill-opacity="${op('LATD')}"/>
<rect x="88" y="155" width="124" height="275" rx="6" fill="${fill('Toit')}" fill-opacity="${op('Toit')}"/>
<text x="150" y="62" text-anchor="middle" font-size="13" font-weight="800" fill="${S}" font-family="Arial">AV</text>
<text x="150" y="558" text-anchor="middle" font-size="13" font-weight="800" fill="${S}" font-family="Arial">AR</text>
<text x="63" y="105" text-anchor="middle" font-size="11" font-weight="800" fill="${S}" font-family="Arial">AVG</text>
<text x="237" y="105" text-anchor="middle" font-size="11" font-weight="800" fill="${S}" font-family="Arial">AVD</text>
<text x="63" y="490" text-anchor="middle" font-size="11" font-weight="800" fill="${S}" font-family="Arial">ARG</text>
<text x="237" y="490" text-anchor="middle" font-size="11" font-weight="800" fill="${S}" font-family="Arial">ARD</text>
<text x="58" y="300" text-anchor="middle" font-size="10" font-weight="800" fill="${S}" font-family="Arial" transform="rotate(-90 58 300)">LATG</text>
<text x="242" y="300" text-anchor="middle" font-size="10" font-weight="800" fill="${S}" font-family="Arial" transform="rotate(90 242 300)">LATD</text>
<text x="150" y="298" text-anchor="middle" font-size="13" font-weight="800" fill="${S}" font-family="Arial">TOIT</text>
</svg>`;
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
