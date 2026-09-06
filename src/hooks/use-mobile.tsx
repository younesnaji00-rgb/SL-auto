'use client';

/**
 * @deprecated — mobile pass 2026-09-06. "Mobile" used to mean < 1024 px, which
 * gave tablets the phone chrome. The app now has three shells (see
 * hooks/use-viewport-class.ts); this alias returns the PHONE class (< 768) so
 * the remaining call sites keep their meaning of "the phone layout". New code
 * imports `useViewportClass` / `useIsPhone` / `useIsCoarsePointer` directly.
 */

import { useIsPhone } from './use-viewport-class';

export function useIsMobile(): boolean {
  return useIsPhone();
}
