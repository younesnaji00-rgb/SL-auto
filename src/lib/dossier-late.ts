/**
 * « En retard » for a dossier — ONE rule, read by the dossiers list (KPI tile,
 * « En retard » filter, phone pill, row badge, « en retard d'abord » sort) and
 * by the gestionnaire dashboard tile (QA GE-006, 2026-10-05: the two pages
 * printed two different « En retard » numbers for the same dossiers).
 *
 * A dossier is late when it is still to be treated (no note d'honoraire yet,
 * lib/dossier-finished.ts) and it was created at least `LATE_AFTER_DAYS`
 * calendar days ago. The 24 h ouvrées assignment clocks (chiffrage / terrain)
 * are a different signal — « hors délai » — and keep their own name on the
 * queues and rows.
 */

import { differenceInCalendarDays } from 'date-fns';
import { isDossierOpen } from './dossier-finished';

/** Age alarm threshold in calendar days (SLA aging — attention research 2026-09-03). */
export const LATE_AFTER_DAYS = 7;

function toDate(v: any): Date | null {
  if (!v) return null;
  const d: Date =
    typeof v?.toDate === 'function' ? v.toDate()
      : v instanceof Date ? v
        : typeof v?.seconds === 'number' ? new Date(v.seconds * 1000)
          : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole calendar days since `createdAt` (never negative); null when absent or invalid. */
export function dossierAgeDays(createdAt: any, now: Date = new Date()): number | null {
  const d = toDate(createdAt);
  if (!d) return null;
  return Math.max(0, differenceInCalendarDays(now, d));
}

/** Still to treat and created at least `LATE_AFTER_DAYS` days ago. */
export function isDossierLate(
  d: { createdAt?: any; dateNoteHonoraire?: unknown; noteHonoraireAt?: unknown } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!d || !isDossierOpen(d)) return false;
  const age = dossierAgeDays(d.createdAt, now);
  return age !== null && age >= LATE_AFTER_DAYS;
}
