import type { PageTutorial } from '../types';

/**
 * Éditeur de devis structuré (/devis-editor). Anchors live in
 * src/components/chiffreurs/devis-editor.tsx on stable toolbar/table
 * containers. The "J'ai vérifié" step only exists while the post-scan lock
 * is active — it is auto-skipped otherwise. `dev-table` is highlighted twice
 * (extracted columns, then the accord columns) on purpose. No hands-on
 * steps: every control here writes into a real estimate.
 */
export const devisEditorTutorial: PageTutorial = {
  key: 'devis-editor',
  match: (p) => p === '/devis-editor',
  steps: [
    {
      title: "L'éditeur de devis",
      body: "L'IA transforme le devis scanné du garage en tableau : vous vérifiez, sans rien ressaisir.",
    },
    {
      anchor: 'dev-files',
      title: 'Documents sources',
      body: 'Les fichiers scannés qui alimentent ce tableau.',
      side: 'bottom',
    },
    {
      anchor: 'dev-header',
      title: "L'en-tête",
      body: 'Véhicule, client, assurance : préremplis, à vérifier.',
      side: 'bottom',
    },
    {
      anchor: 'dev-table',
      title: 'Les lignes du devis',
      body: 'Une ligne par pièce ou opération ; les totaux se calculent tout seuls.',
      side: 'top',
    },
    {
      anchor: 'dev-verify',
      title: 'Confirmer la vérification',
      body: "Comparez avec l'original, puis cliquez « J'ai vérifié » pour déverrouiller.",
      side: 'bottom',
    },
    {
      anchor: 'dev-reextract',
      title: "Relancer l'IA",
      body: 'Relit les documents scannés ; le tableau actuel est écrasé.',
      side: 'bottom',
    },
    {
      anchor: 'dev-table',
      title: "Colonnes d'accord",
      body: "Saisissez le prix accordé par ligne, jamais au-dessus du prix d'origine.",
      side: 'top',
    },
    {
      anchor: 'dev-summary',
      title: 'Les totaux',
      body: 'Le total du devis et le total expert, calculés automatiquement.',
      side: 'top',
    },
    {
      anchor: 'dev-sans-tva',
      title: 'Sans TVA',
      body: 'Cochez pour travailler hors taxe.',
      side: 'bottom',
    },
    {
      anchor: 'dev-comparer',
      title: "Comparer l'original",
      body: 'Affiche le document scanné à côté du tableau.',
      side: 'bottom',
    },
    {
      anchor: 'dev-save',
      title: 'Enregistrer',
      body: 'Aperçu PDF, choix du tampon, puis enregistrement dans le dossier.',
      side: 'bottom',
    },
  ],
};
