import type { PageTutorial } from '../types';

// Annotation editor tour — see docs/TUTORIALS.md. The comparison step's
// anchor only renders when the editor was opened with a dossierId;
// DOM-presence filtering skips it otherwise. No hands-on steps: activating
// tools mid-tour risks accidental annotations on a real document.
export const editorPageTutorial: PageTutorial = {
  key: 'editor',
  match: (p) => p === '/editor',
  steps: [
    {
      title: "Éditeur d'annotations",
      body: 'Annotez les PDF et photos du dossier : texte, lignes et tampons, exportables en PDF.',
    },
    {
      anchor: 'edp-doc-filter',
      title: 'Choisir le document',
      body: 'Filtrez par type, puis ouvrez un fichier dans la liste juste à droite.',
      side: 'bottom',
    },
    {
      anchor: 'edp-tool-select',
      title: 'Sélectionner',
      body: "L'outil par défaut : cliquez une annotation, glissez pour la déplacer.",
      side: 'bottom',
    },
    {
      anchor: 'edp-tool-text',
      title: 'Texte',
      body: 'Activez cet outil, cliquez sur le document et tapez directement.',
      side: 'bottom',
    },
    {
      anchor: 'edp-tool-line',
      title: 'Ligne',
      body: 'Glissez sur le document, par exemple pour barrer une ligne de devis.',
      side: 'bottom',
    },
    {
      anchor: 'edp-tool-stamp',
      title: 'Tampon',
      body: "Choisissez un tampon puis cliquez sur le document pour l'apposer.",
      side: 'bottom',
    },
    {
      anchor: 'edp-colors',
      title: 'Couleur et tailles',
      body: "Réglez la couleur, la taille du texte et l'épaisseur des lignes.",
      side: 'bottom',
    },
    {
      anchor: 'edp-zoom',
      title: 'Zoom et rotation',
      body: 'Zoomez pour la précision ; les boutons voisins pivotent le document.',
      side: 'bottom',
    },
    {
      anchor: 'edp-comparison',
      title: 'Comparaison',
      body: 'Affichez une pièce du dossier à côté du fichier que vous annotez.',
      side: 'bottom',
    },
    {
      anchor: 'edp-save',
      title: 'Enregistrer',
      body: 'Sauvegarde vos annotations dans le chiffrage.',
      side: 'bottom',
    },
    {
      anchor: 'edp-export',
      title: 'Exporter en PDF',
      body: 'Génère un PDF avec vos annotations incrustées.',
      side: 'bottom',
    },
    {
      anchor: 'edp-status',
      title: "Barre d'état",
      body: "L'outil actif, le zoom et la mention « Lecture seule » le cas échéant.",
      side: 'top',
    },
  ],
};
