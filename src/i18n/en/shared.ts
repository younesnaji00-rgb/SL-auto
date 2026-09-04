// French source string -> English translation. Filled by the i18n sweep.
export const SHARED_EN: Record<string, string> = {
  // ── Global search ──
  'Rechercher...': 'Search...',
  'Que cherchez-vous ?': 'What are you looking for?',
  'Erreur : suggestion indisponible.': 'Error: suggestion unavailable.',

  // ── Car diagram (impact zones — display labels only) ──
  'AV': 'Front',
  'AVG': 'Front left',
  'AVD': 'Front right',
  'LATG': 'Left side',
  'LATD': 'Right side',
  'AR': 'Rear',
  'ARG': 'Rear left',
  'ARD': 'Rear right',
  'Toit': 'Roof',
  'Vue de dessus': 'Top view',
  'Vue de dessous': 'Bottom view',
  'Vue de dessus du véhicule avec points de choc': 'Top view of the vehicle with impact points',
  'Vue de dessous du véhicule avec points de choc': 'Bottom view of the vehicle with impact points',

  // ── Holidays admin (country catalog import) ──
  'Pays': 'Country',
  'Maroc': 'Morocco',
  'Canada': 'Canada',
  'France': 'France',
  'États-Unis': 'United States',
  'Importer les jours fériés par défaut': 'Import default statutory holidays',
  'Aucune date enregistrée. Choisissez un pays puis utilisez «Importer les jours fériés par défaut» pour démarrer.':
    'No dates recorded. Pick a country, then use "Import default statutory holidays" to get started.',
  "Collez une liste de dates (une par ligne, format YYYY-MM-DD) puis cliquez sur Importer. À gauche, choisissez un pays dans la liste déroulante puis importez ses jours fériés officiels en un clic.":
    'Paste a list of dates (one per line, YYYY-MM-DD format) then click Import. On the left, pick a country from the dropdown and import its statutory holidays in one click.',

  // ── Date range filter ──
  'Du': 'From',
  'Au': 'To',
  'Début': 'Start',
  'Fin': 'End',
  'Effacer la date': 'Clear date',

  // ── Deadline bar ──
  'En retard': 'Overdue',

  // ── User name link ──
  'Utilisateur inconnu': 'Unknown user',

  // ── Collapsed-by-day list ──
  'élément': 'item',
  'éléments': 'items',
  'Sans date': 'No date',

  // ── Rapport type dialog ──
  'Générer le rapport': 'Generate report',
  'Choisissez le type de rapport à générer.': 'Choose the type of report to generate.',
  'Générer': 'Generate',
  'Rapport préliminaire': 'Preliminary report',
  "Rapport d'expertise préliminaire contradictoire — minute des deux experts (1er / 2ème).":
    'Preliminary joint appraisal report — minutes from both appraisers (1st / 2nd).',
  'Rapport final': 'Final report',
  "Rapport d'expertise contradictoire — conclusions, détail fournitures et main d'oeuvre.":
    'Joint appraisal report — conclusions, itemized parts and labor.',
  'Rapport estimatif': 'Estimate report',
  "Rapport d'expertise estimatif (forfait) — détail fournitures et main d'oeuvre par choc.":
    'Estimate appraisal report (flat rate) — itemized parts and labor per impact point.',
  'Rapport de réforme': 'Total loss report',
  'Rapport de réforme — évaluation des dommages, valeur vénale / épave et indemnisation.':
    'Total loss report — damage assessment, market value / salvage and compensation.',

  // ── UI primitives ──
  'Sélectionnez...': 'Select...',

  // ── Planification history modal ──
  'Historique des versions': 'Version history',
  'Consultez les versions précédentes et restaurez une ancienne planification.':
    'Review previous versions and restore an earlier schedule.',
  'Aucun historique disponible pour ce dossier.': 'No history available for this file.',
  'Version du': 'Version from',
  'Restauration': 'Restoration',
  'Planification restaurée avec succès': 'Schedule restored successfully',
  'Erreur lors de la restauration': 'Error while restoring',
  'Observation:': 'Observation:',

  // ── Planification tab ──
  'Nouvelle planification': 'New schedule',
  'Aucune planification': 'No schedule',
  "Ce dossier n'a pas encore de mission planifiée.": 'This file has no scheduled mission yet.',
  'Programmer une mission': 'Schedule a mission',
  'Type Mission': 'Mission type',
  'Date & Heure RDV': 'Appointment date & time',
  'Dernière': 'Latest',
  'Non assigné': 'Unassigned',
  'Détails de la Planification': 'Schedule Details',
  'Créée le': 'Created on',
  "Zone d'intervention": 'Service area',
  'Modifié par': 'Modified by',
  'Observation / Notes': 'Observation / Notes',
  'Modifier cette planification': 'Edit this schedule',

  // ── Complaints (réclamations) ──
  'Ouverte': 'Open',
  'Traitée': 'Resolved',
  'Fermée': 'Closed',
  'Voir plus': 'Show more',
  'Réduire': 'Show less',
  'Soumettre': 'Submit',
  'Soumettre une Réclamation': 'Submit a Complaint',
  "Elle sera ajoutée à l'historique du dossier.": 'It will be added to the file history.',
  'Sujet de la réclamation...': 'Subject of the complaint...',
  'Réclamation soumise': 'Complaint submitted',
  'Erreur lors de la soumission': 'Error while submitting',
  'Historique des réclamations': 'Complaint history',
  'Aucune réclamation pour le moment.': 'No complaints yet.',
  'Réclamation supprimée': 'Complaint deleted',
  'Déposer une réclamation': 'File a complaint',
  'Aucune réclamation': 'No complaints',
  'Déposez une première réclamation avec le bouton ci-dessus.':
    'File a first complaint using the button above.',
  'Réponse / Résolution': 'Response / Resolution',
  "Réponse de l'administration...": "Administration's response...",
  'Supprimer cette réclamation ?': 'Delete this complaint?',

  // ── Monitoring dossier drawer ──
  'réalisé': 'completed',
  'dossier': 'file',
  'Aucun dossier': 'No files',
  'Aucun dossier en attente sur cette étape.': 'No files waiting at this step.',
  'Aucun dossier n’est hors délai sur cette étape.': 'No files are overdue at this step.',
  'Aucun dossier n’a franchi cette étape.': 'No files have completed this step.',
  'en attente sur cette étape': 'waiting at this step',
  'hors délai sur cette étape': 'overdue at this step',
  'ayant franchi cette étape': 'that completed this step',
  'Tous les dossiers en périmètre ont franchi cette étape.':
    'All files in scope have completed this step.',
  'Tous les dossiers en périmètre sont dans les délais.': 'All files in scope are on time.',
  'Aucun dossier n’est encore associé à cette étape.':
    'No files are associated with this step yet.',
};
