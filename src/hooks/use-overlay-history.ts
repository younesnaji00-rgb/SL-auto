'use client';

/**
 * Overlay ↔ history binding (mobile-synthesis §2 « Back / up »; Baymard "4
 * design patterns that violate Back-button expectations"; NN/g "Accidental
 * dismissal of overlays"): every overlay that reads as a view — bottom sheet,
 * full-screen dialog, action sheet, photo viewer — pushes ONE history entry
 * when it opens and closes on `popstate`, so the browser gesture, the PWA back
 * and the Android hardware button all close the overlay instead of leaving the
 * page. A programmatic close (× button, scrim, action chosen) pops its own
 * entry so the stack never accumulates dead states.
 *
 * Usage: `useOverlayHistory(open, () => onOpenChange(false))`.
 *
 * Runs on every viewport (a desktop user pressing Alt+← with a dialog open
 * gets the same "close first" behaviour). Overlays never nest (depth budget),
 * so one flag per entry is enough; the id only guards against a foreign
 * popstate (a Next.js route change while the overlay is open).
 */

import * as React from 'react';

const KEY = '__overlay';
let seq = 0;

export function useOverlayHistory(open: boolean, onClose: () => void): void {
  const idRef = React.useRef<number | null>(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (open && idRef.current === null) {
      const id = ++seq;
      idRef.current = id;
      try {
        window.history.pushState({ ...(window.history.state ?? {}), [KEY]: id }, '');
      } catch {
        idRef.current = null;
        return;
      }
      const onPop = () => {
        const st = window.history.state;
        // Our entry is gone → the user went back: close the overlay.
        if (!st || st[KEY] !== id) {
          idRef.current = null;
          window.removeEventListener('popstate', onPop);
          closeRef.current();
        }
      };
      window.addEventListener('popstate', onPop);
      return () => {
        window.removeEventListener('popstate', onPop);
        // Programmatic close while our entry is still the current one: pop it.
        if (idRef.current === id) {
          idRef.current = null;
          const st = window.history.state;
          if (st && st[KEY] === id) {
            try {
              window.history.back();
            } catch {
              /* ignore */
            }
          }
        }
      };
    }
    return undefined;
  }, [open]);
}
