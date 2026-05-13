import { startOfDay, format } from 'date-fns';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Built-in Moroccan public holidays for 2026–2027.
 *
 * Fixed-date holidays are exact; Islamic lunar dates are approximations
 * — admins should override these via the Firestore `options_holidays`
 * collection (see `useHolidays`).
 */
export const MOROCCAN_HOLIDAYS_DEFAULT: ReadonlySet<string> = new Set<string>([
  // Fixed-date Moroccan public holidays (Gregorian)
  '2026-01-01', '2027-01-01', // Nouvel an
  '2026-01-11', '2027-01-11', // Manifeste de l'indépendance
  '2026-01-14', '2027-01-14', // Yennayer / Amazigh new year
  '2026-05-01', '2027-05-01', // Fête du travail
  '2026-07-30', '2027-07-30', // Fête du Trône
  '2026-08-14', '2027-08-14', // Oued Ed-Dahab
  '2026-08-20', '2027-08-20', // Révolution du Roi et du Peuple
  '2026-08-21', '2027-08-21', // Fête de la Jeunesse
  '2026-11-06', '2027-11-06', // Marche Verte
  '2026-11-18', '2027-11-18', // Fête de l'Indépendance
  // Islamic lunar holidays — APPROXIMATE; admins override via settings.
  '2026-03-21', '2026-03-22', '2027-03-10', '2027-03-11', // Aïd al-Fitr
  '2026-05-27', '2026-05-28', '2027-05-17', '2027-05-18', // Aïd al-Adha
  '2026-06-16', '2027-06-06',                             // Awal Muharram
  '2026-08-26', '2026-08-27', '2027-08-15', '2027-08-16', // Aïd al-Mawlid
]);

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function isBusinessDay(
  date: Date,
  holidays: ReadonlySet<string> = MOROCCAN_HOLIDAYS_DEFAULT
): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !holidays.has(ymd(date));
}

/**
 * Business hours between two dates.
 *
 * Treats Saturdays, Sundays and dates in `holidays` as fully paused —
 * a 24-business-hour SLA started Friday 18:00 expires Monday 18:00
 * (assuming no Monday holiday).
 *
 * Returns 0 when `end <= start`.
 */
export function businessHoursBetween(
  start: Date,
  end: Date,
  holidays: ReadonlySet<string> = MOROCCAN_HOLIDAYS_DEFAULT
): number {
  if (end.getTime() <= start.getTime()) return 0;

  let totalMs = 0;
  const finalDayStart = startOfDay(end).getTime();
  let cursor = startOfDay(start);

  while (cursor.getTime() <= finalDayStart) {
    if (isBusinessDay(cursor, holidays)) {
      const dayStart = cursor.getTime();
      const dayEnd = dayStart + DAY_MS;
      const overlapStart = Math.max(start.getTime(), dayStart);
      const overlapEnd = Math.min(end.getTime(), dayEnd);
      if (overlapEnd > overlapStart) totalMs += overlapEnd - overlapStart;
    }
    const next = new Date(cursor);
    next.setDate(next.getDate() + 1);
    cursor = next;
  }
  return totalMs / HOUR_MS;
}

/**
 * Format business-hour lateness for display in deadline counters.
 *
 * Returns `dd j/hh h` form, e.g. `02j/14h` for 62 business hours past deadline.
 * One "day" of lateness equals 24 business hours (matches the 24-business-hour SLA).
 * Returns empty string when input < 24 (no full day late yet).
 */
export function formatBusinessLateness(elapsedBusinessHours: number): string {
  if (!Number.isFinite(elapsedBusinessHours) || elapsedBusinessHours < 24) return '';
  const days = Math.floor(elapsedBusinessHours / 24);
  const hours = Math.floor(elapsedBusinessHours - days * 24);
  return `${String(days).padStart(2, '0')}j/${String(hours).padStart(2, '0')}h`;
}

/**
 * `start` plus `hours` business-hours.
 *
 * Inverse of `businessHoursBetween`. Skips over Sat/Sun and holiday dates.
 */
export function addBusinessHours(
  start: Date,
  hours: number,
  holidays: ReadonlySet<string> = MOROCCAN_HOLIDAYS_DEFAULT
): Date {
  if (hours <= 0) return new Date(start.getTime());
  let remainingMs = hours * HOUR_MS;
  let cursor = new Date(start.getTime());

  for (let iter = 0; iter < 366 && remainingMs > 0; iter++) {
    if (isBusinessDay(cursor, holidays)) {
      const dayEnd = startOfDay(cursor).getTime() + DAY_MS;
      const availableMs = dayEnd - cursor.getTime();
      if (remainingMs <= availableMs) {
        return new Date(cursor.getTime() + remainingMs);
      }
      remainingMs -= availableMs;
      cursor = new Date(dayEnd);
    } else {
      cursor = new Date(startOfDay(cursor).getTime() + DAY_MS);
    }
  }
  return cursor;
}
