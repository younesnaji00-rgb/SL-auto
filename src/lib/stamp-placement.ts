/**
 * Where a tampon may sit on a devis / facture page (QA Chiffreur #013 / #015).
 *
 * - #013: a tampon clicked near the edge of a page hung over it; the PDF cut it
 *   at the page border, so only its top showed in the saved document. A
 *   placement is now kept whole inside the page.
 * - #015: a tampon could cover the amounts, references or any written part
 *   of the document. The rendered page is read as an « ink map » (where
 *   something is printed); a tampon may only rest where nothing is printed.
 *   When the chosen spot covers something, the nearest free spot is used.
 *
 * Pure geometry: the preview dialog builds the map from its page canvas.
 */

export interface PageSizeMm {
  pageWidthMm: number;
  pageHeightMm: number;
}

export interface StampRectMm {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

/** Printed / not printed, per cell of `cellPx` canvas pixels, as a summed-area table. */
export interface InkMap {
  cols: number;
  rows: number;
  /** Canvas pixels per millimetre of the page. */
  pxPerMm: number;
  cellPx: number;
  /** (cols + 1) × (rows + 1) summed-area table of inked cells. */
  sum: Uint32Array;
}

/**
 * A pixel is ink when it is drawn (opaque) and darker than light grey: text,
 * table rules and figures count; the white page and the pale table-header
 * fill (240) do not.
 */
const INK_LUMA = 200;

export function buildInkMap(
  data: Uint8ClampedArray,
  widthPx: number,
  heightPx: number,
  pxPerMm: number,
  cellPx = 2,
): InkMap {
  const cols = Math.ceil(widthPx / cellPx);
  const rows = Math.ceil(heightPx / cellPx);
  const ink = new Uint8Array(cols * rows);
  for (let y = 0; y < heightPx; y++) {
    const row = Math.floor(y / cellPx) * cols;
    for (let x = 0; x < widthPx; x++) {
      const i = (y * widthPx + x) * 4;
      if (data[i + 3] < 128) continue;
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (luma < INK_LUMA) ink[row + Math.floor(x / cellPx)] = 1;
    }
  }
  const W = cols + 1;
  const sum = new Uint32Array(W * (rows + 1));
  for (let r = 1; r <= rows; r++) {
    let line = 0;
    for (let c = 1; c <= cols; c++) {
      line += ink[(r - 1) * cols + (c - 1)];
      sum[r * W + c] = sum[(r - 1) * W + c] + line;
    }
  }
  return { cols, rows, pxPerMm, cellPx, sum };
}

/** Number of inked cells under a rectangle given in millimetres (clipped to the page). */
export function inkUnder(map: InkMap, rect: StampRectMm, paddingMm = 0): number {
  const toCell = (mm: number) => (mm * map.pxPerMm) / map.cellPx;
  const c0 = Math.max(0, Math.floor(toCell(rect.xMm - paddingMm)));
  const r0 = Math.max(0, Math.floor(toCell(rect.yMm - paddingMm)));
  const c1 = Math.min(map.cols, Math.ceil(toCell(rect.xMm + rect.widthMm + paddingMm)));
  const r1 = Math.min(map.rows, Math.ceil(toCell(rect.yMm + rect.heightMm + paddingMm)));
  if (c1 <= c0 || r1 <= r0) return 0;
  const W = map.cols + 1;
  const s = map.sum;
  return s[r1 * W + c1] - s[r0 * W + c1] - s[r1 * W + c0] + s[r0 * W + c0];
}

/** The rectangle moved (not resized) so it lies whole inside the page. */
export function keepOnPage<T extends StampRectMm>(rect: T, page: PageSizeMm): T {
  const maxX = Math.max(0, page.pageWidthMm - rect.widthMm);
  const maxY = Math.max(0, page.pageHeightMm - rect.heightMm);
  return {
    ...rect,
    xMm: Math.min(Math.max(rect.xMm, 0), maxX),
    yMm: Math.min(Math.max(rect.yMm, 0), maxY),
  };
}

/** Clearance kept between a tampon and anything printed. */
export const STAMP_CLEARANCE_MM = 1;

export function coversPrint(map: InkMap | null | undefined, rect: StampRectMm): boolean {
  return !!map && inkUnder(map, rect, STAMP_CLEARANCE_MM) > 0;
}

/**
 * The free spot (nothing printed under it, whole on the page) nearest to
 * `rect`, searched in growing rings of `stepMm`; `rect` itself when it is
 * already free; null when the page has no room of that size.
 */
export function nearestFreeSpot<T extends StampRectMm>(
  map: InkMap,
  rect: T,
  page: PageSizeMm,
  stepMm = 2,
): T | null {
  const start = keepOnPage(rect, page);
  if (!coversPrint(map, start)) return start;
  const maxRing = Math.ceil(Math.max(page.pageWidthMm, page.pageHeightMm) / stepMm);
  for (let ring = 1; ring <= maxRing; ring++) {
    let best: T | null = null;
    let bestDist = Infinity;
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const candidate = keepOnPage({ ...start, xMm: start.xMm + dx * stepMm, yMm: start.yMm + dy * stepMm }, page);
        if (coversPrint(map, candidate)) continue;
        const dist = (candidate.xMm - start.xMm) ** 2 + (candidate.yMm - start.yMm) ** 2;
        if (dist < bestDist) {
          best = candidate;
          bestDist = dist;
        }
      }
    }
    if (best) return best;
  }
  return null;
}
