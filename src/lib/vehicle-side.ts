import { getLocale } from '@/i18n';

/**
 * Car-diagram side labels ("Avant" / "Arrière" around the top-view vehicle
 * sketch on a report).
 *
 * Deliberately OUTSIDE the flat FR-key dictionary: "Avant" is also the label
 * of the BEFORE-repairs mission phase (photo tabs, planification types), and
 * a flat dictionary cannot map one key to both "Front" and "Before". Adding
 * it there made every phase tab read "Front".
 */
const SIDE_EN: Record<string, string> = {
  Avant: 'Front',
  'Arrière': 'Rear',
  Arriere: 'Rear',
};

export function vehicleSide(fr: string): string {
  return getLocale() === 'en' ? (SIDE_EN[fr] ?? fr) : fr;
}
