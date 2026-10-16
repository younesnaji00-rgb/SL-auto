// Run: npx tsx --test src/lib/__tests__/stamp-placement.test.ts
//
// Chiffreur #013: a tampon near the page edge was cut in the saved PDF.
// Chiffreur #015: a tampon could cover the amounts and references.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInkMap, coversPrint, inkUnder, keepOnPage, nearestFreeSpot } from '../stamp-placement';

// A 100 × 100 mm page at 1 px/mm, white, with a printed block (a table) over
// x 10–90, y 10–60.
const W = 100, H = 100;
function page(block: { x0: number; y0: number; x1: number; y1: number } | null, transparent = false) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const inked = block && x >= block.x0 && x < block.x1 && y >= block.y0 && y < block.y1;
      const v = inked ? 20 : 255;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = transparent && !inked ? 0 : 255;
    }
  }
  return buildInkMap(data, W, H, 1, 1);
}
const table = { x0: 10, y0: 10, x1: 90, y1: 60 };
const size = { pageWidthMm: W, pageHeightMm: H };

test('a tampon over the table covers print; below it, not', () => {
  const map = page(table);
  assert.equal(coversPrint(map, { xMm: 40, yMm: 30, widthMm: 20, heightMm: 10 }), true);
  assert.equal(coversPrint(map, { xMm: 40, yMm: 70, widthMm: 20, heightMm: 10 }), false);
});

test('a pale or transparent background is not print', () => {
  const map = page(null, true);
  assert.equal(inkUnder(map, { xMm: 0, yMm: 0, widthMm: 100, heightMm: 100 }), 0);
});

test('a tampon hanging over the page border is pulled back whole', () => {
  const kept = keepOnPage({ xMm: 90, yMm: 95, widthMm: 20, heightMm: 10 }, size);
  assert.deepEqual(kept, { xMm: 80, yMm: 90, widthMm: 20, heightMm: 10 });
});

test('dropped on the table, the tampon moves to the nearest free spot', () => {
  const map = page(table);
  const spot = nearestFreeSpot(map, { xMm: 40, yMm: 50, widthMm: 20, heightMm: 10 }, size)!;
  assert.ok(spot, 'a free spot exists');
  assert.equal(coversPrint(map, spot), false);
  // Nearest: just under the table, same column.
  assert.equal(spot.xMm, 40);
  assert.ok(spot.yMm >= 61 && spot.yMm <= 64, `y ${spot.yMm}`);
});

test('a free spot is kept as is', () => {
  const map = page(table);
  const rect = { xMm: 30, yMm: 75, widthMm: 20, heightMm: 10 };
  assert.deepEqual(nearestFreeSpot(map, rect, size), rect);
});

test('no room on a fully printed page', () => {
  const map = page({ x0: 0, y0: 0, x1: 100, y1: 100 });
  assert.equal(nearestFreeSpot(map, { xMm: 10, yMm: 10, widthMm: 20, heightMm: 10 }, size), null);
});
