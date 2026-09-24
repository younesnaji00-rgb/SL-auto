'use client';

/**
 * Self-heal for stale Firebase Storage download URLs.
 *
 * A download URL embeds a token from the object's metadata. When a file is
 * re-uploaded to the same path (earlier upload-retry bugs did this), Storage
 * rotates that token and the OLD url starts returning 403 — the image renders
 * broken and a preview shows nothing, even though the file is perfectly intact
 * under a fresh token. This regenerates a currently-valid url from the object
 * path via `getDownloadURL` and retries once.
 */
import * as React from 'react';
import { getApps } from 'firebase/app';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { storagePathFromUrl } from '@/components/documents/typed-doc';

/** A fresh, currently-valid download url for the object `staleUrl` points at, or null. */
export async function freshDownloadUrl(staleUrl: string): Promise<string | null> {
  try {
    const path = storagePathFromUrl(staleUrl);
    const app = getApps()[0];
    if (!path || !app) return null;
    const fresh = await getDownloadURL(ref(getStorage(app), path));
    return fresh || null;
  } catch {
    return null;
  }
}

/**
 * `{ src, onError }` for an `<img>`/media element whose `url` may carry an
 * expired token. On the first load error it swaps in a freshly-minted url; a
 * second failure (genuinely missing file, no read access) is left to render as
 * broken. Resets whenever `url` changes.
 */
export function useResilientImageSrc(url: string): { src: string; onError: () => void } {
  const [src, setSrc] = React.useState(url);
  const triedRef = React.useRef(false);
  React.useEffect(() => {
    setSrc(url);
    triedRef.current = false;
  }, [url]);
  const onError = React.useCallback(() => {
    if (triedRef.current || !url) return;
    triedRef.current = true;
    freshDownloadUrl(url).then((fresh) => {
      if (fresh && fresh !== url) setSrc(fresh);
    });
  }, [url]);
  return { src, onError };
}
