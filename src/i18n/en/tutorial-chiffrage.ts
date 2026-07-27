// French source string -> English translation (guided tutorials).
// Covers: assignations-chiffrage (list), chiffrage-detail, devis-editor.
// Already defined elsewhere (do NOT re-add): 'Filtrer par compagnie',
// 'Observations', 'Sans TVA', 'Filtrer par période', 'En-tête du dossier'.
export const TUTORIAL_CHIFFRAGE_EN: Record<string, string> = {
  // ── Assignations au chiffrage (list) ──
  'Assignations au chiffrage': 'Estimating assignments',
  "Cette page liste les dossiers envoyés au chiffrage. Le chiffreur y retrouve les dossiers qui lui sont assignés ; les gestionnaires et administrateurs voient l'ensemble des assignations.":
    'This page lists the files sent for estimating. An estimator sees the files assigned to them; managers and administrators see every assignment.',
  "Affichez uniquement les chiffrages d'une compagnie d'assurance. Le nombre de dossiers par compagnie est indiqué entre parenthèses.":
    'Show only the estimates of one insurance company. The number of files per insurer is shown in parentheses.',
  'Filtrer par chiffreur': 'Filter by estimator',
  "Visible pour les administrateurs et gestionnaires : affichez les assignations d'un chiffreur précis. Le compteur correspond à ses chiffrages ouverts.":
    'Visible to administrators and managers: show the assignments of one specific estimator. The counter matches their open estimates.',
  'Filtrer par type de réforme': 'Filter by write-off type',
  'Limitez la liste aux dossiers en réforme Technique ou Économique.':
    'Narrow the list to files under a Technical or Economic write-off.',
  'Affichez uniquement les assignations créées entre deux dates.':
    'Show only the assignments created between two dates.',
  'Le délai de 24 h': 'The 24-hour deadline',
  "Chaque chiffrage doit être traité sous 24 heures ouvrées (week-ends et jours fériés exclus). La barre se remplit avec le temps et passe en rouge quand le délai est dépassé. Cliquez sur l'en-tête pour trier par urgence.":
    'Each estimate must be handled within 24 business hours (weekends and public holidays excluded). The bar fills up over time and turns red when the deadline is exceeded. Click the header to sort by urgency.',
  'La liste des assignations': 'The assignment list',
  "Chaque ligne montre le dossier, l'assuré, le statut en couleur et la dernière observation (cliquez dessus pour l'historique complet). Cliquez sur la référence du dossier pour ouvrir l'assignation ; les dossiers du jour sont surlignés.":
    'Each row shows the file, the insured, the color-coded status and the latest note (click it for the full history). Click the file reference to open the assignment; today’s files are highlighted.',

  // ── Assignation de chiffrage (detail) ──
  "Détail d'une assignation": 'Assignment detail',
  "C'est l'espace de travail du chiffrage d'un dossier : consultez les devis du garage, ouvrez l'éditeur structuré pour établir les accords, puis suivez l'envoi par mail et la décision de réforme.":
    'This is the workspace for estimating one file: review the garage estimates, open the structured editor to build the agreements, then follow the email sending and the write-off decision.',
  'Référence du dossier, chiffreur assigné et statut actuel en couleur. Les actions principales (envoi par mail, réforme) sont à droite.':
    'File reference, assigned estimator and current color-coded status. The main actions (send by email, write-off) are on the right.',
  "Échangez des remarques avec le gestionnaire sur ce dossier. Chaque observation est horodatée et conservée dans l'historique.":
    'Exchange notes with the manager about this file. Each note is timestamped and kept in the history.',
  'Devis et factures par garage': 'Estimates and invoices per garage',
  "Une ligne par source : « Devis Garage 2 » correspond à un autre garage. Chaque ligne contient le document d'origine et ses créneaux d'accord — la proposition d'accord précède l'accord, et un 2ème ou 3ème accord ré-édite la même source depuis zéro. Cliquez sur « Éditer » pour ouvrir l'éditeur structuré du créneau, ou sur une vignette pour prévisualiser.":
    'One row per source: “Devis Garage 2” is a different garage. Each row holds the original document and its agreement slots — a proposed agreement precedes the agreement, and a 2nd or 3rd agreement re-edits the SAME source from scratch. Click “Éditer” to open the structured editor for a slot, or a thumbnail to preview.',
  'Filtrer par type de document': 'Filter by document type',
  'Tous les types de pièces jointes avec leur nombre de documents. Les devis et factures sont regroupés par garage, avec leurs sous-sections Accords et Propositions. Cliquez sur un type pour filtrer la grille de droite.':
    'Every attachment type with its document count. Estimates and invoices are grouped per garage, with their Agreements and Proposals subsections. Click a type to filter the grid on the right.',
  'Les pièces jointes': 'Attachments',
  'Toutes les pièces du dossier : devis et factures du garage, contre-devis, accords, photos… Survolez une vignette pour la prévisualiser ou la télécharger.':
    'All the file’s documents: garage estimates and invoices, counter-estimates, agreements, photos… Hover a thumbnail to preview or download it.',
  'Importer des documents': 'Import documents',
  "Sur cette page, l'import est désactivé pour le chiffreur : les nouveaux documents (contre-devis reçu de la compagnie, etc.) sont importés par le gestionnaire depuis la fiche dossier.":
    'On this page, importing is disabled for the estimator: new documents (a counter-estimate received from the insurer, etc.) are imported by the manager from the file page.',
  "Envoyer l'accord par mail": 'Send the agreement by email',
  "Réservé au gestionnaire : choisissez un accord ou une proposition d'accord et envoyez-le en pièce jointe par email. Le dossier passe automatiquement au statut « Accord envoyé ».":
    'Manager only: pick an agreement or a proposed agreement and send it as an email attachment. The file automatically moves to the “Accord envoyé” status.',
  'Décider une réforme': 'Decide a write-off',
  'Quand le véhicule est irréparable, ouvrez ce dialogue pour saisir la réforme : type (Technique ou Économique), valeurs et indemnisation. Un PDF récapitulatif est généré et le statut du dossier est mis à jour.':
    'When the vehicle cannot be repaired, open this dialog to enter the write-off: type (Technical or Economic), values and compensation. A summary PDF is generated and the file status is updated.',

  // ── Éditeur de devis structuré ──
  "L'éditeur de devis structuré": 'The structured estimate editor',
  "L'IA lit le devis scanné du garage et le transforme en tableau, ligne par ligne. Votre rôle : vérifier chaque valeur extraite, l'ajuster si besoin, puis fixer les prix accordés et enregistrer le document.":
    'The AI reads the scanned garage estimate and turns it into a table, line by line. Your job: check every extracted value, adjust it if needed, then set the agreed prices and save the document.',
  'Documents sources': 'Source documents',
  'Le titre indique le type de document édité et les fichiers scannés qui alimentent le tableau. Plusieurs devis du même garage peuvent être fusionnés.':
    'The title shows which document type is being edited and the scanned files feeding the table. Several estimates from the same garage can be merged.',
  "Les informations d'en-tête": 'Header information',
  'Véhicule, client et assurance : ces champs sont préremplis depuis le scan, complétés par le dossier. Vérifiez-les et corrigez si nécessaire.':
    'Vehicle, client and insurer: these fields are prefilled from the scan and completed from the file. Check them and correct if needed.',
  'Le tableau des lignes': 'The line table',
  "Une ligne par pièce ou opération détectée. Vérifiez chaque colonne par rapport au devis scanné : Réparation/Remplacement, Désignation, Type de pièce, Quantité, P.U.H.T, T.V.A et Vétusté — les totaux H.T et TTC se calculent automatiquement. Les en-têtes de colonne permettent d'appliquer une valeur à toutes les lignes d'un coup.":
    'One row per detected part or operation. Check each column against the scanned estimate: Repair/Replace, Description, Part type, Quantity, Unit price excl. tax, VAT and Depreciation — the excl.-tax and incl.-tax totals compute automatically. Column headers let you apply one value to all rows at once.',
  'Confirmer la vérification': 'Confirm your review',
  "Après un scan, le tableau est verrouillé. Comparez chaque ligne avec le document d'origine, puis cliquez sur « J'ai vérifié » pour déverrouiller l'édition.":
    'After a scan, the table is locked. Compare each line with the original document, then click “J\'ai vérifié” to unlock editing.',
  "Relancer l'extraction": 'Re-run the extraction',
  'Relance la lecture IA des documents scannés. Attention : les données actuelles du tableau sont écrasées.':
    'Runs the AI reading of the scanned documents again. Warning: the current table data is overwritten.',
  "Les colonnes d'accord": 'The agreement columns',
  "Saisissez ligne par ligne le prix unitaire accordé — ou proposé, selon le type choisi via l'en-tête de la colonne. La valeur ne peut pas dépasser le P.U.H.T d'origine : une valeur trop haute est signalée puis effacée. Le Total H.T accordé et le prix TTC se calculent automatiquement.":
    'Enter the agreed unit price line by line — or the proposed one, depending on the type picked from the column header. The value cannot exceed the original unit price: an over-cap value is flagged then cleared. The agreed excl.-tax total and the incl.-tax price compute automatically.',
  'Les totaux': 'Totals',
  "La dernière ligne du tableau additionne les quantités et le Total H.T. Cette barre affiche le Total H.T du devis et le Total TTC Expert, calculé à partir de votre colonne d'accord.":
    'The last table row sums the quantities and the excl.-tax total. This bar shows the estimate’s excl.-tax total and the Expert incl.-tax total, computed from your agreement column.',
  "Cochez cette case quand le règlement se fait hors taxe : les totaux d'accord s'affichent et s'enregistrent en H.T au lieu du TTC.":
    'Tick this box when the settlement is tax-free: agreement totals are displayed and saved excl. tax instead of incl. tax.',
  "Comparer avec l'original": 'Compare with the original',
  "Affiche le document scanné à côté du tableau pour vérifier chaque ligne sans quitter l'éditeur. Le panneau s'ouvre automatiquement après une extraction.":
    'Shows the scanned document next to the table so you can check each line without leaving the editor. The panel opens automatically after an extraction.',
  'Enregistrer et prévisualiser': 'Save and preview',
  'Ouvre un aperçu PDF fidèle du document : choisissez un tampon puis cliquez sur la page pour le positionner. En confirmant, une nouvelle version est enregistrée dans les pièces jointes du dossier et le statut est mis à jour.':
    'Opens a faithful PDF preview of the document: pick a stamp then click on the page to place it. On confirm, a new version is saved to the file’s attachments and the status is updated.',
};
