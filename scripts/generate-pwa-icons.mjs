// One-shot generator for PWA / Android icons.
// Run: npx --yes -p jimp node scripts/generate-pwa-icons.mjs
//
// Source: public/images/logo.png
// Outputs (public/icons/):
//   icon-192.png         — 192×192, cream background, logo centered
//   icon-512.png         — 512×512, same
//   icon-maskable-512.png — 512×512 with 20% safe-zone padding for Android adaptive icons
//   apple-touch-icon.png — 180×180 for iOS home-screen

import { Jimp, JimpMime } from 'jimp';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'public/images/logo.png');
const OUT_DIR = join(ROOT, 'public/icons');

// Brand background — cream from manifest background_color.
const BG = 0xfbf9f4ff; // RGBA

async function makeIcon(size, paddingPct) {
  const logo = await Jimp.read(SRC);
  const canvas = new Jimp({ width: size, height: size, color: BG });

  const safe = Math.round(size * (1 - paddingPct * 2));
  // Fit logo inside safe area preserving aspect ratio.
  const ratio = Math.min(safe / logo.width, safe / logo.height);
  const w = Math.round(logo.width * ratio);
  const h = Math.round(logo.height * ratio);
  logo.resize({ w, h });

  const x = Math.round((size - w) / 2);
  const y = Math.round((size - h) / 2);
  canvas.composite(logo, x, y);
  return canvas;
}

await mkdir(OUT_DIR, { recursive: true });

const targets = [
  { name: 'icon-192.png', size: 192, pad: 0.10 },
  { name: 'icon-512.png', size: 512, pad: 0.10 },
  // Maskable: Android crops to a circle/squircle, keep content within inner 80%.
  { name: 'icon-maskable-512.png', size: 512, pad: 0.20 },
  { name: 'apple-touch-icon.png', size: 180, pad: 0.10 },
];

for (const t of targets) {
  const img = await makeIcon(t.size, t.pad);
  const buf = await img.getBuffer(JimpMime.png);
  const path = join(OUT_DIR, t.name);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path, buf);
  console.log('wrote', t.name, t.size + '×' + t.size);
}
