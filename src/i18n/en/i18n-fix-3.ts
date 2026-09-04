/**
 * i18n gap-fill batch 3 — rappels detail pane, Profil, monitoring data.
 *
 * Strings the UI-redesign × i18n merge never internationalized in:
 *   - app/(app)/mes-rappels/rappel-detail-panel.tsx
 *   - app/(app)/profil/page.tsx
 *   - app/(app)/monitoring/metrics.ts
 *
 * Key = the exact FRENCH source string as it appears in code. Entries already
 * covered by another dictionary file are intentionally absent.
 */
export const I18N_FIX_3_EN: Record<string, string> = {
  // ── Mes rappels — detail pane (rappel-detail-panel.tsx) ─────────────
  'traité le': 'resolved on',
  'Comparer avant/après': 'Compare before/after',
  "Aucune session de traitement pour l'instant.": 'No handling session yet.',
  'Aucune action enregistrée': 'No action recorded',
  "Rien n'a été enregistré pendant cette session.": 'Nothing was recorded during this session.',
  'Sélectionnez un rappel': 'Select a reminder',
  "Cliquez sur une ligne pour lire l'observation et le travail effectué sans quitter la liste.":
    'Click a row to read the note and the work performed without leaving the list.',
  // Keyboard hints — lowercase on purpose (they follow a <Kbd> chip).
  'ouvrir le dossier': 'open file',
  'marquer traité': 'mark as resolved',

  // ── Profil (profil/page.tsx) ────────────────────────────────────────
  "Vos informations, vos préférences d'affichage et l'aide.":
    'Your details, your display preferences and help.',
  'Navigateur': 'Browser',
  'Thème': 'Theme',
  '« Système » suit le réglage de votre appareil. Appliqué à cet appareil.':
    '“System” follows your device setting. Applies to this device.',
  'Clair': 'Light',
  'Sombre': 'Dark',
  'Densité des listes': 'List density',
  'Compact affiche plus de lignes par écran.': 'Compact fits more rows per screen.',
  'Densité': 'Density',
  'Décrivez un problème, joignez une capture ou un message vocal.':
    'Describe an issue, attach a screenshot or a voice message.',
  'Ouvrir le formulaire': 'Open the form',
  'Cet appareil': 'This device',
  'Session en cours sur ce navigateur.': 'Current session on this browser.',
};
