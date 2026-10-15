'use client';

/**
 * The areas where a rendez-vous is accepted — the admins' « Sites » list
 * (`options_sites`, owner ruling 2026-10-16), active entries in their order.
 * Empty while it loads; Casablanca and Fès when the list is empty, like the
 * server (accepted-areas-server.ts).
 */

import { useMemo } from 'react';
import { useOptions } from '@/hooks/use-options';
import { DEFAULT_AREAS } from '@/lib/moroccan-address';

export function useAcceptedAreas(): { areas: string[]; loading: boolean } {
  const { options, loading } = useOptions('options_sites');
  const areas = useMemo(() => {
    if (loading) return [];
    const list = options.filter((o) => o.active !== false).map((o) => o.label.trim()).filter(Boolean);
    return list.length > 0 ? list : [...DEFAULT_AREAS];
  }, [options, loading]);
  return { areas, loading };
}
