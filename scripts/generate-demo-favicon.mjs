// One-shot generator for per-brand favicon.ico files from the existing
// 192px PWA icons. Run: node scripts/generate-demo-favicon.mjs
//
// Writes public/favicon.ico (slaoui) and public/icons/demo/favicon.ico (demo).
// Uses the ICO container with PNG payloads (supported by every current
// browser) so no extra dependency beyond sharp (already installed).

import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [16, 32, 48];

async function buildIco(sourcePng) {
  const pngs = await Promise.all(SIZES.map(s => sharp(sourcePng).resize(s, s).png().toBuffer()));
  const headerSize = 6 + 16 * pngs.length;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = headerSize;
  pngs.forEach((buf, i) => {
    const e = 6 + i * 16;
    const s = SIZES[i];
    header.writeUInt8(s === 256 ? 0 : s, e); // width
    header.writeUInt8(s === 256 ? 0 : s, e + 1); // height
    header.writeUInt8(0, e + 2); // palette
    header.writeUInt8(0, e + 3); // reserved
    header.writeUInt16LE(1, e + 4); // planes
    header.writeUInt16LE(32, e + 6); // bpp
    header.writeUInt32LE(buf.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...pngs]);
}

for (const [src, out] of [
  ['public/icons/icon-192.png', 'public/favicon.ico'],
  ['public/icons/demo/icon-192.png', 'public/icons/demo/favicon.ico'],
]) {
  const ico = await buildIco(join(ROOT, src));
  await writeFile(join(ROOT, out), ico);
  console.log(`wrote ${out} (${ico.length} bytes)`);
}
