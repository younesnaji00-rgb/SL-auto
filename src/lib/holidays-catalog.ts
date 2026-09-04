import { MOROCCAN_HOLIDAYS_DEFAULT } from '@/lib/business-days';

/**
 * Statutory-holiday catalog for the "import default holidays" feature on the
 * Jours fériés admin page. One entry per supported country, covering 2026
 * and 2027.
 *
 * `label` is the FRENCH country name — it is a t() translation key and gets
 * localized at the display site.
 *
 * NOTE: the Moroccan set is the same one that drives the firm's SLA math in
 * `business-days.ts` (imported, not copied, so they can never drift). Lunar
 * dates in it are approximations that admins are expected to adjust.
 */
export interface HolidayCountry {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** French country name (t() key — translate at the display site). */
  label: string;
  /** Statutory holidays for 2026 and 2027, as 'YYYY-MM-DD'. */
  dates: string[];
}

export const HOLIDAYS_CATALOG: readonly HolidayCountry[] = [
  {
    code: 'MA',
    label: 'Maroc',
    dates: Array.from(MOROCCAN_HOLIDAYS_DEFAULT),
  },
  {
    code: 'CA',
    label: 'Canada',
    dates: [
      '2026-01-01', '2027-01-01', // Jour de l'an
      '2026-04-03', '2027-03-26', // Vendredi saint
      '2026-05-18', '2027-05-24', // Fête de Victoria
      '2026-06-24', '2027-06-24', // Saint-Jean-Baptiste
      '2026-07-01', '2027-07-01', // Fête du Canada
      '2026-08-03', '2027-08-02', // Congé civique
      '2026-09-07', '2027-09-06', // Fête du Travail
      '2026-09-30', '2027-09-30', // Journée de la vérité et de la réconciliation
      '2026-10-12', '2027-10-11', // Action de grâce
      '2026-11-11', '2027-11-11', // Jour du Souvenir
      '2026-12-25', '2027-12-25', // Noël
      '2026-12-26', '2027-12-26', // Lendemain de Noël
    ],
  },
  {
    code: 'FR',
    label: 'France',
    dates: [
      '2026-01-01', '2027-01-01', // Jour de l'an
      '2026-04-06', '2027-03-29', // Lundi de Pâques
      '2026-05-01', '2027-05-01', // Fête du Travail
      '2026-05-08', '2027-05-08', // Victoire 1945
      '2026-05-14', '2027-05-06', // Ascension
      '2026-05-25', '2027-05-17', // Lundi de Pentecôte
      '2026-07-14', '2027-07-14', // Fête nationale
      '2026-08-15', '2027-08-15', // Assomption
      '2026-11-01', '2027-11-01', // Toussaint
      '2026-11-11', '2027-11-11', // Armistice 1918
      '2026-12-25', '2027-12-25', // Noël
    ],
  },
  {
    code: 'US',
    label: 'États-Unis',
    dates: [
      '2026-01-01', '2027-01-01', // New Year's Day
      '2026-01-19', '2027-01-18', // Martin Luther King Jr. Day
      '2026-02-16', '2027-02-15', // Presidents' Day
      '2026-05-25', '2027-05-31', // Memorial Day
      '2026-06-19', '2027-06-19', // Juneteenth
      '2026-07-04', '2027-07-04', // Independence Day
      '2026-09-07', '2027-09-06', // Labor Day
      '2026-10-12', '2027-10-11', // Columbus Day
      '2026-11-11', '2027-11-11', // Veterans Day
      '2026-11-26', '2027-11-25', // Thanksgiving
      '2026-12-25', '2027-12-25', // Christmas
    ],
  },
];

/** Catalog entry for a country code, if supported. */
export function getHolidayCountry(code: string): HolidayCountry | undefined {
  return HOLIDAYS_CATALOG.find((c) => c.code === code);
}
