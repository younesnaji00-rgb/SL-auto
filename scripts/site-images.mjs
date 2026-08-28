// Marketing-site image pipeline. Run: node scripts/site-images.mjs
//
//  1. Converts every PNG under public/site/ (hero, car-side, shots/*) to WebP
//     next to the source (same basename). Pages reference the .webp; the PNGs
//     stay as the editable originals.
//  2. Renders public/site/og.png — a 1200x630 Open Graph card (wordmark,
//     one-line promise, dashboard screenshot). PNG on purpose: LinkedIn and
//     WhatsApp still refuse WebP previews.

import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'public/site');

async function* pngs(dir) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) yield* pngs(p);
    else if (extname(name) === '.png' && name !== 'og.png') yield p;
  }
}

for await (const src of pngs(SITE)) {
  const out = src.replace(/\.png$/, '.webp');
  const { size } = await sharp(src).webp({ quality: 82, effort: 6 }).toFile(out);
  const before = (await stat(src)).size;
  console.log(`${basename(out).padEnd(24)} ${(before / 1024).toFixed(0).padStart(4)}K -> ${(size / 1024).toFixed(0).padStart(4)}K`);
}

// ── Open Graph card ────────────────────────────────────────────────────────
const W = 1200;
const H = 630;
const shot = await sharp(join(SITE, 'shots/dashboard.png'))
  .resize({ width: 760 })
  .png()
  .toBuffer();
const shotMeta = await sharp(shot).metadata();

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4f1ea"/>
      <stop offset="1" stop-color="#e6efed"/>
    </linearGradient>
    <clipPath id="shot"><rect x="520" y="110" width="760" height="600" rx="18"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="260" fill="#cfe3df" opacity=".55"/>
  <g font-family="Segoe UI, Helvetica, Arial, sans-serif">
    <rect x="72" y="72" width="52" height="52" rx="12" fill="#1f6f68"/>
    <text x="98" y="109" font-size="30" font-weight="700" fill="#fff" text-anchor="middle">L</text>
    <text x="138" y="98" font-size="26" font-weight="700" fill="#1c2b2e">Lionheart</text>
    <text x="138" y="118" font-size="12" font-weight="600" fill="#5b6b6e" letter-spacing="3">APPRAISAL</text>
    <text x="72" y="270" font-size="58" font-weight="700" fill="#1c2b2e" letter-spacing="-1.5">Every claim closed</text>
    <text x="72" y="336" font-size="58" font-weight="700" fill="#d2692b" letter-spacing="-1.5">on time,</text>
    <text x="72" y="402" font-size="58" font-weight="700" fill="#1c2b2e" letter-spacing="-1.5">without the chasing.</text>
    <text x="72" y="470" font-size="22" fill="#5b6b6e">Claims management for auto appraisal firms.</text>
    <text x="72" y="502" font-size="22" fill="#5b6b6e">Live demo, no account needed.</text>
    <text x="72" y="580" font-size="18" font-weight="600" fill="#1f6f68">lionheart-appraisal.com</text>
  </g>
  <rect x="520" y="110" width="760" height="600" rx="18" fill="#fff" stroke="#d9d4c8"/>
</svg>`;

await sharp(Buffer.from(svg))
  .composite([{ input: shot, left: 520, top: 110 }])
  .png()
  .toFile(join(SITE, 'og.png'));
console.log(`og.png ${W}x${H} (screenshot ${shotMeta.width}x${shotMeta.height})`);
