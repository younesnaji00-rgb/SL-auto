/**
 * English dictionary — merged from per-area files.
 *
 * Keys are the FRENCH source strings exactly as they appear in code
 * (including punctuation and accents); values are the English translations.
 * Later spreads win on duplicate keys, so keep truly shared strings in
 * common.ts and area-specific phrasing in the area files.
 */

import { COMMON_EN } from './common';
import { NAV_EN } from './nav';
import { AUTH_EN } from './auth';
import { DASHBOARD_EN } from './dashboard';
import { DOSSIERS_EN } from './dossiers';
import { DOSSIER_DETAIL_EN } from './dossier-detail';
import { CHIFFRAGE_EN } from './chiffrage';
import { TERRAIN_EN } from './terrain';
import { ADMIN_EN } from './admin';
import { RAPPELS_EN } from './rappels';
import { COMPONENTS_EN } from './components';
import { PDF_EN } from './pdf';

export const EN: Record<string, string> = {
  ...COMMON_EN,
  ...NAV_EN,
  ...AUTH_EN,
  ...DASHBOARD_EN,
  ...DOSSIERS_EN,
  ...DOSSIER_DETAIL_EN,
  ...CHIFFRAGE_EN,
  ...TERRAIN_EN,
  ...ADMIN_EN,
  ...RAPPELS_EN,
  ...COMPONENTS_EN,
  ...PDF_EN,
};
