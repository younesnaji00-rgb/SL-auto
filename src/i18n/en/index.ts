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
import { CHIFFRAGE_B_EN } from './chiffrage-b';
import { DETAIL_DOCS_EN } from './detail-docs';
import { EDITOR_EN } from './editor';
import { SHARED_EN } from './shared';
import { TERRAIN_EN } from './terrain';
import { ADMIN_EN } from './admin';
import { RAPPELS_EN } from './rappels';
import { COMPONENTS_EN } from './components';
import { PDF_EN } from './pdf';
import { TUTORIAL_EDITOR_EN } from './tutorial-editor';
import { TUTORIAL_ADMIN_EN } from './tutorial-admin';
import { TUTORIAL_TERRAIN_EN } from './tutorial-terrain';
import { TUTORIAL_CHIFFRAGE_EN } from './tutorial-chiffrage';
import { TUTORIAL_DOSSIERS_EN } from './tutorial-dossiers';
import { TUTORIAL_DASHBOARD_EN } from './tutorial-dashboard';
import { TUTORIAL_CORE_EN } from './tutorial-core';
import { LABS_EN } from './labs';
import { LEFTOVERS_EN } from './leftovers';
import { TRIAL_EN } from './trial';
import { DEMO_KIT_EN } from './demo-kit';
// UI-redesign merge (2026-09-04): strings the redesign introduced, one file
// per merge batch. Spread LAST so a redesigned screen's wording wins over an
// older entry for the same French key.
import { MERGE_A_EN } from './merge-A';
import { MERGE_B_EN } from './merge-B';
import { MERGE_C_EN } from './merge-C';
import { MERGE_D_EN } from './merge-D';
import { MERGE_E_EN } from './merge-E';
import { MERGE_F_EN } from './merge-F';
import { MERGE_G_EN } from './merge-G';
import { MERGE_H_EN } from './merge-H';
// i18n gap-fill (2026-09-04): the merge only touched files that CONFLICTED, so
// everything the redesign created new (peek panels, record bar, tab strip, ATG
// mission surfaces…) shipped hardcoded French. One file per fix batch.
import { I18N_FIX_0_EN } from './i18n-fix-0';
import { I18N_FIX_1_EN } from './i18n-fix-1';
import { I18N_FIX_2_EN } from './i18n-fix-2';
import { I18N_FIX_3_EN } from './i18n-fix-3';
import { I18N_FIX_4_EN } from './i18n-fix-4';
import { I18N_FIX_5_EN } from './i18n-fix-5';

export const EN: Record<string, string> = {
  ...COMMON_EN,
  ...NAV_EN,
  ...AUTH_EN,
  ...DASHBOARD_EN,
  ...DOSSIERS_EN,
  ...DOSSIER_DETAIL_EN,
  ...CHIFFRAGE_EN,
  ...CHIFFRAGE_B_EN,
  ...DETAIL_DOCS_EN,
  ...EDITOR_EN,
  ...SHARED_EN,
  ...TERRAIN_EN,
  ...ADMIN_EN,
  ...RAPPELS_EN,
  ...COMPONENTS_EN,
  ...PDF_EN,
  ...TUTORIAL_EDITOR_EN,
  ...TUTORIAL_ADMIN_EN,
  ...TUTORIAL_TERRAIN_EN,
  ...TUTORIAL_CHIFFRAGE_EN,
  ...TUTORIAL_DOSSIERS_EN,
  ...TUTORIAL_DASHBOARD_EN,
  ...TUTORIAL_CORE_EN,
  ...LABS_EN,
  ...LEFTOVERS_EN,
  ...TRIAL_EN,
  ...DEMO_KIT_EN,
  ...MERGE_A_EN,
  ...MERGE_B_EN,
  ...MERGE_C_EN,
  ...MERGE_D_EN,
  ...MERGE_E_EN,
  ...MERGE_F_EN,
  ...MERGE_G_EN,
  ...MERGE_H_EN,
  ...I18N_FIX_0_EN,
  ...I18N_FIX_1_EN,
  ...I18N_FIX_2_EN,
  ...I18N_FIX_3_EN,
  ...I18N_FIX_4_EN,
  ...I18N_FIX_5_EN,
};
