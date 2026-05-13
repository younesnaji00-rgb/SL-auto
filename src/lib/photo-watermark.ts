/**
 * Photo watermarking helper for the Agent de Terrain (ATG) photo flow.
 *
 * Draws a bottom-left watermark block on a captured image with 4 lines:
 *   1. "SL auto"                  (title, bold, +4px)
 *   2. Timestamp (YYYY-MM-DD HH:MM:SS, local)
 *   3. GPS (Lat, Lng — 6 decimals) or "Position non disponible"
 *   4. Account display name
 *
 * Scope: ONLY used on the ATG photo upload path. Other photo flows
 * (gestionnaire scans, AI scan upload, etc.) are intentionally untouched.
 */

export interface GeoCoords {
  lat: number;
  lng: number;
}

/**
 * Tries to obtain the current device position. Resolves with the coordinates
 * or `null` on denial / unavailability / timeout. Never rejects — the caller
 * should be able to continue the upload regardless.
 */
export async function getCurrentGeo(): Promise<GeoCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: GeoCoords | null) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    // Hard backstop in case getCurrentPosition never invokes either callback.
    const fallback = setTimeout(() => finish(null), 5500);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(fallback);
          finish({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          clearTimeout(fallback);
          finish(null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
      );
    } catch {
      clearTimeout(fallback);
      finish(null);
    }
  });
}

/** Format a Date as `YYYY-MM-DD HH:MM:SS` in the local timezone. */
export function formatStamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** Format coords as `Lat: 33.123456, Lng: -7.654321`, ~10 cm precision. */
export function formatGeo(geo: GeoCoords | null): string {
  if (!geo) return 'Position non disponible';
  return `Lat: ${geo.lat.toFixed(6)}, Lng: ${geo.lng.toFixed(6)}`;
}

/**
 * Draws a bottom-left watermark on the image and returns a new Blob.
 * The first line is treated as the title (bold, +4px). Other lines are
 * rendered at the base font size in regular weight.
 *
 * If the image can't be decoded (corrupt / unsupported by the browser
 * canvas), the original file is returned unmodified so the upload still
 * goes through.
 */
export async function watermarkImage(file: File, lines: string[]): Promise<Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
    if (!img) return file;

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return file;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    const baseFontSize = Math.max(14, Math.round(width / 60));
    const titleFontSize = baseFontSize + 4;
    const lineHeight = Math.round(baseFontSize * 1.35);
    const padding = Math.round(baseFontSize * 0.6);

    // Measure widest line using the font each line will actually be drawn with.
    let maxLineWidth = 0;
    lines.forEach((line, i) => {
      ctx.font = i === 0
        ? `bold ${titleFontSize}px Arial, sans-serif`
        : `${baseFontSize}px Arial, sans-serif`;
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    const blockWidth = Math.ceil(maxLineWidth + padding * 2);
    const blockHeight = Math.ceil(lineHeight * lines.length + padding * 2);
    const x = padding;
    const y = height - blockHeight - padding;

    // Semi-transparent dark backdrop for legibility on any image.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x, y, blockWidth, blockHeight);

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.font = i === 0
        ? `bold ${titleFontSize}px Arial, sans-serif`
        : `${baseFontSize}px Arial, sans-serif`;
      ctx.fillText(line, x + padding, y + padding + i * lineHeight);
    });

    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mime, 0.92);
    });
    return blob || file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Convenience wrapper used by the ATG upload flow. Resolves geolocation,
 * stamps the image, and returns a fresh File preserving the original name.
 *
 * Defensive: any error inside the helper falls back to the original file,
 * so the upload pipeline (including offline queue) is never blocked.
 */
export async function watermarkAtgPhoto(
  file: File,
  displayName: string,
): Promise<File> {
  try {
    const geo = await getCurrentGeo();
    const lines = [
      'SL auto',
      formatStamp(),
      formatGeo(geo),
      displayName || 'Agent de Terrain',
    ];
    const blob = await watermarkImage(file, lines);
    if (blob === file) return file;
    return new File([blob], file.name, {
      type: blob.type || file.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
