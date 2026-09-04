/**
 * i18n gap-fill batch 5 — timeline drop box, PDF viewer chrome, step tab
 * strip and the underside impact-zone diagram.
 *
 * Files covered:
 *   src/components/dossier-timeline/smart-inbox.tsx
 *   src/components/dossier-timeline/step-tabs.tsx
 *   src/app/editor/pdf-canvas.tsx
 *   src/components/car-svg-top.tsx
 *   src/components/car-svg-bottom.tsx
 *
 * Keys are the FRENCH source strings exactly as written in the code.
 */
export const I18N_FIX_5_EN: Record<string, string> = {
  // ── Boîte de dépôt / SmartInbox (components/dossier-timeline/smart-inbox.tsx) ──
  'Boîte de dépôt des documents': 'Document drop box',
  'Choisir des fichiers': 'Choose files',
  'fichier(s) ignoré(s)': 'file(s) ignored',
  'PDF ou image, 15 Mo maximum.': 'PDF or image, 15 MB maximum.',
  'Classification impossible': 'Classification failed',
  'Échec': 'Failed',
  'Correction impossible': 'Correction failed',
  'Classement validé': 'Classification confirmed',
  "classement(s) confirmé(s) — l'IA s'en souviendra.":
    "classification(s) confirmed — the AI will remember.",
  'Rien à confirmer.': 'Nothing to confirm.',
  'Classes de documents': 'Document classes',
  'Déposez sur la bonne classe': 'Drop on the right class',
  'Glissez un fichier sur une classe pour le classer vous-même':
    'Drag a file onto a class to file it yourself',
  "Analyse par l'IA…": 'AI analysis…',
  'Proposé :': 'Suggested:',
  'Classé manuellement': 'Filed manually',
  'exemple(s) appris utilisé(s)': 'learned example(s) used',
  'Sûr': 'Confident',
  'À vérifier': 'Check',
  'Incertain': 'Uncertain',
  "Confiance de l'IA. Corrigez la classe si nécessaire — elle s'en souviendra.":
    'AI confidence. Correct the class if needed — it will remember.',
  'Confirmé': 'Confirmed',
  'Classe de': 'Class of',
  'Retirer de la liste': 'Remove from the list',
  'Retirer de la liste (le document reste dans le dossier)':
    'Remove from the list (the document stays in the file)',
  'document classé': 'document filed',
  'documents classés': 'documents filed',
  'à confirmer': 'to confirm',
  'Pré-remplir les informations': 'Pre-fill the information',
  'Tout valider': 'Confirm all',

  // Document-class labels shown in the drop box chips and the class select.
  // The stored `type` value stays French — these translate the visible text
  // only (source of truth: src/lib/doc-classes.ts).
  'Lettre de mission': 'Assignment Letter',
  'Photo du véhicule': 'Vehicle Photo',
  "Rapport d'expertise": 'Appraisal Report',
  'À classer': 'To be filed',

  // Class chip tooltips (DocClass.description, doc-classes.ts).
  "Ordre de mission / lettre de mission d'une compagnie d'assurance ou capture d'écran d'un portail assureur (Sanlam, RMA, Wafa, AXA…) décrivant le sinistre, l'assuré et le véhicule.":
    "Assignment order / assignment letter from an insurer, or a screenshot of an insurer portal (Sanlam, RMA, Wafa, AXA…) describing the loss, the insured and the vehicle.",
  'Constat amiable, procès-verbal de police ou de gendarmerie, récépissé de dépôt de plainte.':
    'Accident report form, police or gendarmerie report, receipt for a filed complaint.',
  "Certificat d'immatriculation (carte grise marocaine, recto/verso) avec immatriculation, châssis, propriétaire.":
    'Vehicle registration certificate (front/back) showing the plate, chassis number and owner.',
  "Attestation ou carte verte d'assurance : compagnie, numéro de police, période de validité.":
    'Insurance certificate or green card: insurer, policy number, validity period.',
  'Devis de réparation émis par un garage / carrossier : lignes de pièces et main-d’œuvre avec prix, total HT/TTC, sans mention « facture ».':
    'Repair estimate issued by a repair shop / body shop: parts and labour lines with prices, subtotal/total, with no "invoice" wording.',
  'Facture de réparation émise par un garage (mention « Facture », numéro de facture, TVA, montant payé).':
    'Repair invoice issued by a repair shop ("Invoice" wording, invoice number, tax, amount paid).',
  'Photo du compteur kilométrique / tableau de bord montrant le kilométrage.':
    'Photo of the odometer / dashboard showing the mileage.',
  'Photo de la plaque constructeur ou du numéro de châssis (VIN) gravé.':
    'Photo of the manufacturer plate or the stamped chassis number (VIN).',
  'Photo du véhicule, des dégâts ou de la scène (pas un document).':
    'Photo of the vehicle, the damage or the scene (not a document).',
  "Rapport d'expertise (préliminaire, final, réforme) rédigé par un autre expert ou cabinet.":
    'Appraisal report (preliminary, final, write-off) produced by another appraiser or firm.',
  'Tout autre document : courrier, pièce d’identité, permis, relevé, etc.':
    'Any other document: letter, ID, licence, statement, etc.',

  // ── PDF viewer chrome (app/editor/pdf-canvas.tsx) ──
  'Pivoter de 90°': 'Rotate 90°',
  'Document PDF': 'PDF document',
  'Chargement du PDF…': 'Loading the PDF…',

  // ── Step facet tabs (components/dossier-timeline/step-tabs.tsx) ──
  "Sections de l'étape": 'Step sections',

  // ── Impact-zone diagrams (components/car-svg-top.tsx, car-svg-bottom.tsx) ──
  // Zone ids and the top-view AV/AVG/… abbreviations are NOT translated: they
  // are the stored `pointsChoc` keys and are shared with the PDF port.
  'Vue de dessus du véhicule — points de choc': 'Top view of the vehicle — impact points',
  'Vue de dessous du véhicule — points de choc': 'Underside view of the vehicle — impact points',
  'Soubassement AV': 'Front underbody',
  'Susp. AV': 'Front susp.',
  'Susp. AR': 'Rear susp.',
  'Plancher': 'Floor pan',
  'Transmission': 'Transmission',
  'Réservoir': 'Fuel tank',
  'Différentiel': 'Differential',
  'Échappement': 'Exhaust',
};
