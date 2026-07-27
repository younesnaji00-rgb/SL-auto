import type { PageTutorial } from '../types';

/**
 * Éditeur de devis structuré (/devis-editor). Anchors live in
 * src/components/chiffreurs/devis-editor.tsx on stable toolbar/table
 * containers. The "J'ai vérifié" step only exists while the post-scan lock
 * is active — it is auto-skipped otherwise. `dev-table` is highlighted twice
 * (columns to check, then the accord columns) on purpose.
 */
export const devisEditorTutorial: PageTutorial = {
  key: 'devis-editor',
  match: (p) => p === '/devis-editor',
  steps: [
    {
      title: "L'éditeur de devis structuré",
      body:
        "L'IA lit le devis scanné du garage et le transforme en tableau, ligne par ligne. Votre rôle : vérifier chaque valeur extraite, l'ajuster si besoin, puis fixer les prix accordés et enregistrer le document.",
    },
    {
      anchor: 'dev-files',
      title: 'Documents sources',
      body:
        'Le titre indique le type de document édité et les fichiers scannés qui alimentent le tableau. Plusieurs devis du même garage peuvent être fusionnés.',
      side: 'bottom',
    },
    {
      anchor: 'dev-header',
      title: "Les informations d'en-tête",
      body:
        'Véhicule, client et assurance : ces champs sont préremplis depuis le scan, complétés par le dossier. Vérifiez-les et corrigez si nécessaire.',
      side: 'bottom',
    },
    {
      anchor: 'dev-table',
      title: 'Le tableau des lignes',
      body:
        "Une ligne par pièce ou opération détectée. Vérifiez chaque colonne par rapport au devis scanné : Réparation/Remplacement, Désignation, Type de pièce, Quantité, P.U.H.T, T.V.A et Vétusté — les totaux H.T et TTC se calculent automatiquement. Les en-têtes de colonne permettent d'appliquer une valeur à toutes les lignes d'un coup.",
      side: 'top',
    },
    {
      anchor: 'dev-verify',
      title: 'Confirmer la vérification',
      body:
        "Après un scan, le tableau est verrouillé. Comparez chaque ligne avec le document d'origine, puis cliquez sur « J'ai vérifié » pour déverrouiller l'édition.",
      side: 'bottom',
    },
    {
      anchor: 'dev-reextract',
      title: "Relancer l'extraction",
      body:
        'Relance la lecture IA des documents scannés. Attention : les données actuelles du tableau sont écrasées.',
      side: 'bottom',
    },
    {
      anchor: 'dev-table',
      title: "Les colonnes d'accord",
      body:
        "Saisissez ligne par ligne le prix unitaire accordé — ou proposé, selon le type choisi via l'en-tête de la colonne. La valeur ne peut pas dépasser le P.U.H.T d'origine : une valeur trop haute est signalée puis effacée. Le Total H.T accordé et le prix TTC se calculent automatiquement.",
      side: 'top',
    },
    {
      anchor: 'dev-summary',
      title: 'Les totaux',
      body:
        "La dernière ligne du tableau additionne les quantités et le Total H.T. Cette barre affiche le Total H.T du devis et le Total TTC Expert, calculé à partir de votre colonne d'accord.",
      side: 'top',
    },
    {
      anchor: 'dev-sans-tva',
      title: 'Sans TVA',
      body:
        "Cochez cette case quand le règlement se fait hors taxe : les totaux d'accord s'affichent et s'enregistrent en H.T au lieu du TTC.",
      side: 'bottom',
    },
    {
      anchor: 'dev-comparer',
      title: "Comparer avec l'original",
      body:
        "Affiche le document scanné à côté du tableau pour vérifier chaque ligne sans quitter l'éditeur. Le panneau s'ouvre automatiquement après une extraction.",
      side: 'bottom',
    },
    {
      anchor: 'dev-save',
      title: 'Enregistrer et prévisualiser',
      body:
        'Ouvre un aperçu PDF fidèle du document : choisissez un tampon puis cliquez sur la page pour le positionner. En confirmant, une nouvelle version est enregistrée dans les pièces jointes du dossier et le statut est mis à jour.',
      side: 'bottom',
    },
  ],
};
