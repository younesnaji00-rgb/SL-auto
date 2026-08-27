// One-shot generator for the DEMO brand (Lionheart) PWA icons.
// Run: npx --yes -p jimp node scripts/generate-demo-icons.mjs
//
// Outputs (public/icons/demo/): icon-192.png, icon-512.png,
// icon-maskable-512.png, apple-touch-icon.png — teal tile with a white "L"
// monogram (falls back to a plain two-tone tile if the bundled font fails).

import { Jimp, JimpMime, loadFont, HorizontalAlign, VerticalAlign } from 'jimp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public/icons/demo');

const TEAL = 0x0f766eff;
const TEAL_DARK = 0x115e59ff;

let font = null;
try {
  const fonts = await import('jimp/fonts');
  font = await loadFont(fonts.SANS_128_WHITE);
} catch (err) {
  console.warn('font unavailable, using plain tile:', err.message);
}

async function makeIcon(size) {
  const canvas = new Jimp({ width: size, height: size, color: TEAL });
  // Subtle diagonal shade for depth.
  canvas.scan(0, 0, size, size, (x, y, idx) => {
    if (x + y > size * 1.15) {
      canvas.bitmap.data.writeUInt32BE(TEAL_DARK, idx);
    }
  });
  if (font) {
    const letter = new Jimp({ width: 160, height: 140, color: 0x00000000 });
    letter.print({
      font,
      x: 0,
      y: 0,
      text: { text: 'L', alignmentX: HorizontalAlign.CENTER, alignmentY: VerticalAlign.MIDDLE },
      maxWidth: 160,
      maxHeight: 140,
    });
    const target = Math.round(size * 0.52);
    const ratio = target / 140;
    letter.resize({ w: Math.round(160 * ratio), h: target });
    canvas.composite(letter, Math.round((size - letter.width) / 2), Math.round((size - letter.height) / 2));
  }
  return canvas;
}

await mkdir(OUT_DIR, { recursive: true });
for (const t of [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]) {
  const img = await makeIcon(t.size);
  await writeFile(join(OUT_DIR, t.name), await img.getBuffer(JimpMime.png));
  console.log('wrote', t.name);
}
