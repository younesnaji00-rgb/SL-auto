// French source string -> English translation.
export const LEFTOVERS_EN: Record<string, string> = {
  // ── UI primitives ──
  'Choisir une date': 'Pick a date',

  // ── Chiffrage detail page (chiffrage/[id]) ──
  'Chiffrage introuvable.': 'Estimating job not found.',
  'Correcteur assigné :': 'Assigned reviewer:',
  'Aucun fichier': 'No files',
  "Aucun fichier n'a encore été associé à ce chiffrage.": 'No files have been attached to this estimating job yet.',
  'Mode "Correction Native" : Utilisez l\'éditeur pour barrer les erreurs et ajouter vos corrections directement sur le document.':
    'Native Correction mode: use the editor to strike out errors and add your corrections directly on the document.',
  'Voir le PDF Exporté': 'View exported PDF',
  'Corrigé': 'Corrected',
  'En traitement': 'Processing',

  // ── Send-to-estimating modal (modal-chiffrage) ──
  'Erreur de chargement des fichiers': 'Failed to load files',
  'Sélection requise': 'Selection required',
  'Veuillez choisir un chiffreur dans la liste.': 'Please choose an estimator from the list.',
  'Aucun fichier disponible': 'No files available',
  'Ce dossier ne contient aucun fichier à envoyer.': 'This file has no documents to send.',
  'Impossible de procéder. Données du chiffreur manquantes.': 'Unable to proceed. Estimator data is missing.',
  'Dossier envoyé': 'File sent',
  'fichier(s) transmis au chiffreur.': 'file(s) sent to the estimator.',
  'Envoyer vers Chiffrage': 'Send to Estimating',
  'Sélectionnez le chiffreur et les fichiers à transmettre.': 'Select the estimator and the files to send.',
  'Chiffreur responsable': 'Assigned estimator',
  'Fichiers à envoyer': 'Files to send',
  'Chargement des fichiers...': 'Loading files...',
  'Aucun fichier disponible dans ce dossier.': 'No files available in this file.',
  'Tous les fichiers seront envoyés': 'All files will be sent',

  // ── Camera capture ──
  "Votre navigateur ne supporte pas l'accès à la caméra. Utilisez Chrome ou Safari.":
    'Your browser does not support camera access. Use Chrome or Safari.',
  "Accès à la caméra refusé. Allez dans les paramètres de votre navigateur pour autoriser l'accès à la caméra pour ce site.":
    'Camera access denied. Go to your browser settings to allow camera access for this site.',
  'Aucune caméra détectée sur cet appareil.': 'No camera detected on this device.',
  'La caméra est utilisée par une autre application. Fermez-la et réessayez.':
    'The camera is in use by another application. Close it and try again.',
  "Impossible d'accéder à la caméra:": 'Unable to access the camera:',
  'erreur inconnue': 'unknown error',
  'Limite de photos atteinte': 'Photo limit reached',
  'photos atteinte': 'photos reached',
  'Prendre une photo': 'Take a photo',

  // ── Voice recorder ──
  'Arrêter': 'Stop',

  // ── Dynamic map values surfaced through t(variable) ──
  '— non précisé —': '— not specified —',
  'Nouvelle': 'New',
  'Validation directeur': 'Director approval',
};
