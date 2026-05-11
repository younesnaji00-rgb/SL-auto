'use client';

import { useMemo } from 'react';
import { useOptions } from './use-options';
import { MOROCCAN_HOLIDAYS_DEFAULT } from '@/lib/business-days';

/**
 * Live set of holiday dates (YYYY-MM-DD) for business-day deadline math.
 *
 * Reads from Firestore collection `options_holidays`. Each option's `label`
 * is interpreted as a YYYY-MM-DD date string. If the collection is empty
 * or still loading, falls back to `MOROCCAN_HOLIDAYS_DEFAULT`.
 */
export function useHolidays(): ReadonlySet<string> {
  const { options, loading } = useOptions('options_holidays');
  return useMemo(() => {
    if (loading || !options || options.length === 0) {
      return MOROCCAN_HOLIDAYS_DEFAULT;
    }
    const set = new Set<string>();
    for (const opt of options) {
      if (opt.active === false) continue;
      const label = (opt.label || '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(label)) set.add(label);
    }
    return set.size > 0 ? set : MOROCCAN_HOLIDAYS_DEFAULT;
  }, [options, loading]);
}
