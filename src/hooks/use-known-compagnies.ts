'use client';

import { useMemo } from 'react';
import { useOptions } from '@/hooks/use-options';

/**
 * The names of the `compagnies` collection — what `compagnieInScope`
 * (lib/compagnie-name.ts) needs to keep a dossier of an unknown compagnie
 * visible to every account. `null` while the list loads.
 */
export function useKnownCompagnies(): string[] | null {
  const { options, loading } = useOptions('compagnies');
  return useMemo(
    () => (loading ? null : options.map((o) => o.label).filter((l): l is string => !!l)),
    [options, loading],
  );
}
