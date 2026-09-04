/**
 * Merge batch B — strings introduced by the redesigned dossiers list, its side
 * sheets and the dossier record page (nav-upgrade UI × origin/main i18n merge).
 *
 * Key = the exact French source string as it appears in the code.
 */
export const MERGE_B_EN: Record<string, string> = {
  // ── Dossiers list: view scope + KPI strip ──
  'À traiter': 'To handle',
  'statut non terminé': 'status not closed',
  'à traiter depuis ≥': 'pending for ≥',
  'j': 'd',
  'j)': 'd)',
  'En retard (≥': 'Overdue (≥',
  'Retirer le filtre en retard': 'Remove the overdue filter',
  "Créés aujourd'hui": 'Created today',
  'sur la journée': 'today',
  'tous statuts': 'all statuses',
  'Portée de la liste': 'List scope',

  // ── Dossiers list: filter toolbar ──
  'Rechercher (réf, assuré, plaque…)': 'Search (ref, insured, plate…)',
  'Rechercher un dossier': 'Search for a file',
  'Période de création': 'Creation period',
  'Affichage': 'Display',
  "Colonnes et densité d'affichage": 'Columns and display density',
  'Densité des lignes': 'Row density',
  'Compacte': 'Compact',
  'Normale': 'Normal',
  'Confortable': 'Comfortable',
  'Colonnes': 'Columns',
  'Tout afficher': 'Show all',

  // ── Dossiers list: header actions + table ──
  'Sélectionner des dossiers à rappeler': 'Select files to send a reminder about',
  'Nouveau dossier (C)': 'New file (C)',
  'Ancienneté': 'Age',
  'N° police': 'Policy no.',
  'Actions pour': 'Actions for',
  'ce dossier': 'this file',
  'Ouvrir dans un onglet': 'Open in a tab',
  'Workflow': 'Workflow',
  'Historique des statuts': 'Status history',
  'Lignes par page': 'Rows per page',
  'vous': 'you',

  // ── Dossiers list: keyboard shortcuts (« ? » sheet) ──
  'Liste des dossiers': 'File list',
  'Ligne suivante': 'Next row',
  'Ligne précédente': 'Previous row',
  'Ouvrir la ligne en surbrillance': 'Open the highlighted row',
  'Sélectionner la ligne (mode rappel)': 'Select the row (reminder mode)',
  'Aperçu de la ligne (ouvrir / fermer)': 'Row preview (open / close)',
  "Fermer l'aperçu / quitter la surbrillance": 'Close the preview / clear the highlight',

  // ── History side sheets ──
  'États du dossier': 'File Status History',
  "Les statuts s'enregistrent ici au fil des étapes.": 'Statuses are recorded here as the file moves through its steps.',
  'Par': 'By',
  'Aucune assignation': 'No assignments',
  'Les envois au chiffrage et les planifications apparaissent ici.':
    'Estimating hand-offs and scheduling appear here.',
  'Les observations saisies sur le dossier apparaissent ici.':
    'Observations recorded on this file appear here.',
  'Workflow du dossier': 'File workflow',
  'Les actions du workflow apparaissent ici au fil du dossier.':
    'Workflow actions appear here as the file progresses.',

  // ── Dossier record page (step tabs) ──
  'Informations': 'Information',
  'champ manquant': 'missing field',
  'champs manquants': 'missing fields',
};

export default MERGE_B_EN;
