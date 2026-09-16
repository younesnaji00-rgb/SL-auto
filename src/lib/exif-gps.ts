/**
 * Minimal EXIF GPS reader (QA bug 021).
 *
 * Photos imported from a computer never carried a position, so the
 * « Par localisation » grouping only ever showed « Sans localisation ». Phones
 * write the position into the JPEG's EXIF GPS IFD; this reads exactly that
 * and nothing else — no dependency, JPEG only (HEIC/PNG have no EXIF here),
 * first 256 KiB of the file, every read bounds-checked. Returns null on
 * anything unexpected: a missing position must never block an upload.
 */
export interface GpsCoords {
  lat: number;
  lng: number;
}

const HEAD_BYTES = 256 * 1024;

export async function readExifGps(file: Blob): Promise<GpsCoords | null> {
  try {
    if (!file || file.size < 12) return null;
    const buf = await file.slice(0, Math.min(file.size, HEAD_BYTES)).arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xffd8) return null; // not a JPEG
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      if ((marker & 0xff00) !== 0xff00) return null;
      if (marker === 0xffda || marker === 0xffd9) return null; // image data / end
      const segLen = view.getUint16(offset + 2);
      if (segLen < 2) return null;
      if (marker === 0xffe1 && offset + 10 <= view.byteLength) {
        const start = offset + 4;
        // "Exif\0\0"
        if (view.getUint32(start) === 0x45786966 && view.getUint16(start + 4) === 0) {
          return parseTiff(view, start + 6, Math.min(view.byteLength, offset + 2 + segLen));
        }
      }
      offset += 2 + segLen;
    }
    return null;
  } catch {
    return null;
  }
}

function parseTiff(view: DataView, tiff: number, end: number): GpsCoords | null {
  if (tiff + 8 > end) return null;
  const order = view.getUint16(tiff);
  const little = order === 0x4949;
  if (!little && order !== 0x4d4d) return null;
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);
  if (u16(tiff + 2) !== 0x2a) return null;
  const ifd0 = tiff + u32(tiff + 4);

  const entry = (ifd: number, wanted: number): { type: number; count: number; valueAt: number } | null => {
    if (ifd + 2 > end) return null;
    const n = u16(ifd);
    for (let i = 0; i < n; i += 1) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > end) return null;
      if (u16(e) !== wanted) continue;
      const type = u16(e + 2);
      const count = u32(e + 4);
      const size = TYPE_SIZE[type] ?? 0;
      const valueAt = size * count <= 4 ? e + 8 : tiff + u32(e + 8);
      return { type, count, valueAt };
    }
    return null;
  };

  const gpsPtr = entry(ifd0, 0x8825);
  if (!gpsPtr || gpsPtr.type !== 4) return null;
  const gpsIfd = tiff + u32(gpsPtr.valueAt);

  const ascii = (tag: number): string => {
    const e = entry(gpsIfd, tag);
    if (!e || e.type !== 2 || e.count < 1 || e.valueAt >= end) return '';
    return String.fromCharCode(view.getUint8(e.valueAt));
  };
  const dms = (tag: number): number | null => {
    const e = entry(gpsIfd, tag);
    if (!e || e.type !== 5 || e.count < 3 || e.valueAt + 24 > end) return null;
    const parts: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const num = u32(e.valueAt + i * 8);
      const den = u32(e.valueAt + i * 8 + 4);
      parts.push(den === 0 ? 0 : num / den);
    }
    return parts[0] + parts[1] / 60 + parts[2] / 3600;
  };

  const latRef = ascii(0x0001);
  const lat = dms(0x0002);
  const lngRef = ascii(0x0003);
  const lng = dms(0x0004);
  if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null;
  const signedLat = latRef === 'S' ? -lat : lat;
  const signedLng = lngRef === 'W' ? -lng : lng;
  if (Math.abs(signedLat) > 90 || Math.abs(signedLng) > 180) return null;
  if (signedLat === 0 && signedLng === 0) return null;
  return { lat: signedLat, lng: signedLng };
}

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
