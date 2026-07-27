import type { PageTutorial } from '../types';

// Annotation editor tour — see docs/TUTORIALS.md. The comparison step's
// anchor only renders when the editor was opened with a dossierId;
// DOM-presence filtering skips it otherwise.
export const editorPageTutorial: PageTutorial = {
  key: 'editor',
  match: (p) => p === '/editor',
  steps: [
    {
      title: "Éditeur d'annotations",
      body:
        "Cet éditeur sert à annoter les PDF et photos d'un dossier : ajoutez du texte, des lignes et des tampons, par exemple pour corriger un devis. Les annotations sont enregistrées avec le fichier et peuvent être exportées en PDF.",
    },
    {
      anchor: 'edp-doc-filter',
      title: 'Choisir le document',
      body:
        "Filtrez les fichiers par type (photos, devis, factures…), puis ouvrez le fichier voulu dans la liste juste à droite. Les pièces marquées « Dossier » proviennent du dossier et sont en lecture seule.",
      side: 'bottom',
    },
    {
      anchor: 'edp-tool-select',
      title: 'Sélectionner et déplacer',
      body:
        "L'outil par défaut : cliquez sur une annotation pour la sélectionner, puis glissez-la pour la déplacer.",
      side: 'bottom',
    },
    {
      anchor: 'edp-tool-text',
      title: 'Ajouter du texte',
      body:
        "Activez cet outil puis cliquez sur le document : une zone de texte apparaît, tapez directement dedans.",
      side: 'bottom',
    },
    {
      anchor: 'edp-tool-line',
      title: 'Tracer une ligne',
      body:
        "Cliquez sur le document puis glissez horizontalement, par exemple pour barrer une ligne d'un devis.",
      side: 'bottom',
    },
    {
      anchor: 'edp-tool-stamp',
      title: 'Apposer un tampon',
      body:
        "Ouvrez ce menu pour importer vos tampons (images) et en choisir un. Cliquez ensuite sur le document pour l'apposer.",
      side: 'bottom',
    },
    {
      anchor: 'edp-colors',
      title: 'Couleur et tailles',
      body:
        "Choisissez la couleur des textes et des lignes ; cliquer une couleur avec une annotation sélectionnée la recolore. Les curseurs voisins règlent la taille du texte et l'épaisseur des lignes.",
      side: 'bottom',
    },
    {
      anchor: 'edp-zoom',
      title: 'Zoom et rotation',
      body:
        "Ajustez le zoom pour travailler avec précision. Les boutons de rotation juste à droite pivotent le document par quarts de tour.",
      side: 'bottom',
    },
    {
      anchor: 'edp-comparison',
      title: 'Panneau de comparaison',
      body:
        "Affichez les photos et documents du dossier côte à côte avec le fichier que vous annotez. Le panneau peut même se diviser pour comparer deux pièces à la fois.",
      side: 'bottom',
    },
    {
      anchor: 'edp-save',
      title: 'Enregistrer les annotations',
      body:
        "Sauvegarde les annotations du fichier en cours dans le chiffrage. Elles sont aussi enregistrées automatiquement quand vous changez de fichier.",
      side: 'bottom',
    },
    {
      anchor: 'edp-export',
      title: 'Exporter en PDF',
      body:
        "Génère un PDF du document avec vos annotations incrustées : il est téléchargé et joint au chiffrage.",
      side: 'bottom',
    },
    {
      anchor: 'edp-status',
      title: "Barre d'état",
      body:
        "Suivez ici l'outil actif, le zoom et le nombre d'annotations. La mention « Lecture seule » apparaît pour les pièces du dossier : consultables mais non modifiables.",
      side: 'top',
    },
  ],
};
