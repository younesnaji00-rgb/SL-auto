// French source string -> English translation (guided tutorials).
// Titles already translated elsewhere are NOT repeated here:
// 'Mot de passe', 'Comptes de démonstration' (auth.ts); 'Ajouter du texte',
// 'Tracer une ligne', 'Lecture seule' (editor.ts); 'Choisir un fichier'
// (components.ts).
export const TUTORIAL_EDITOR_EN: Record<string, string> = {
  // ── Login ──
  'Connexion à la plateforme': 'Signing in',
  "Bienvenue ! Connectez-vous ici pour accéder à l'application. Les comptes sont créés par votre administrateur, qui vous communique vos identifiants.":
    'Welcome! Sign in here to access the application. Accounts are created by your administrator, who gives you your credentials.',
  'Votre nom complet': 'Your full name',
  "Connectez-vous avec votre nom complet, pas une adresse e-mail. Tapez-le tel qu'il a été enregistré — majuscules ou minuscules, peu importe.":
    'Sign in with your full name, not an email address. Type it as it was registered — upper or lower case does not matter.',
  "Saisissez votre mot de passe. L'icône en forme d'œil l'affiche en clair pour vérifier votre saisie.":
    'Enter your password. The eye icon reveals it so you can check what you typed.',
  'Changer de langue': 'Switch language',
  "Basculez l'interface entre le français et l'anglais à tout moment. Votre choix est mémorisé sur cet appareil.":
    'Switch the interface between French and English at any time. Your choice is remembered on this device.',
  "Pour explorer l'application, tapez l'un des noms affichés ici comme nom complet, avec le mot de passe indiqué.":
    'To explore the application, type one of the names shown here as the full name, with the password indicated.',

  // ── Annotation editor ──
  "Éditeur d'annotations": 'Annotation editor',
  "Cet éditeur sert à annoter les PDF et photos d'un dossier : ajoutez du texte, des lignes et des tampons, par exemple pour corriger un devis. Les annotations sont enregistrées avec le fichier et peuvent être exportées en PDF.":
    'This editor is for annotating a file’s PDFs and photos: add text, lines and stamps, for example to correct an estimate. Annotations are saved with the document and can be exported to PDF.',
  'Choisir le document': 'Choose the document',
  "Filtrez les fichiers par type (photos, devis, factures…), puis ouvrez le fichier voulu dans la liste juste à droite. Les pièces marquées « Dossier » proviennent du dossier et sont en lecture seule.":
    'Filter the files by type (photos, estimates, invoices…), then open the one you want in the list just to the right. Items tagged “File” come from the claim file and are read-only.',
  'Sélectionner et déplacer': 'Select and move',
  "L'outil par défaut : cliquez sur une annotation pour la sélectionner, puis glissez-la pour la déplacer.":
    'The default tool: click an annotation to select it, then drag it to move it.',
  "Activez cet outil puis cliquez sur le document : une zone de texte apparaît, tapez directement dedans.":
    'Activate this tool then click the document: a text box appears — type directly into it.',
  "Cliquez sur le document puis glissez horizontalement, par exemple pour barrer une ligne d'un devis.":
    'Click the document and drag horizontally, for example to strike through a line of an estimate.',
  'Apposer un tampon': 'Place a stamp',
  "Ouvrez ce menu pour importer vos tampons (images) et en choisir un. Cliquez ensuite sur le document pour l'apposer.":
    'Open this menu to import your stamps (images) and pick one. Then click the document to place it.',
  'Couleur et tailles': 'Color and sizes',
  "Choisissez la couleur des textes et des lignes ; cliquer une couleur avec une annotation sélectionnée la recolore. Les curseurs voisins règlent la taille du texte et l'épaisseur des lignes.":
    'Choose the color for texts and lines; clicking a color while an annotation is selected recolors it. The sliders next to it set the text size and line thickness.',
  'Zoom et rotation': 'Zoom and rotation',
  "Ajustez le zoom pour travailler avec précision. Les boutons de rotation juste à droite pivotent le document par quarts de tour.":
    'Adjust the zoom to work precisely. The rotation buttons just to the right turn the document in quarter turns.',
  'Panneau de comparaison': 'Comparison panel',
  "Affichez les photos et documents du dossier côte à côte avec le fichier que vous annotez. Le panneau peut même se diviser pour comparer deux pièces à la fois.":
    'Show the claim file’s photos and documents side by side with the one you are annotating. The panel can even split to compare two items at once.',
  'Enregistrer les annotations': 'Save the annotations',
  "Sauvegarde les annotations du fichier en cours dans le chiffrage. Elles sont aussi enregistrées automatiquement quand vous changez de fichier.":
    'Saves the current document’s annotations to the estimate. They are also saved automatically when you switch files.',
  'Exporter en PDF': 'Export to PDF',
  "Génère un PDF du document avec vos annotations incrustées : il est téléchargé et joint au chiffrage.":
    'Generates a PDF of the document with your annotations burned in: it is downloaded and attached to the estimate.',
  "Barre d'état": 'Status bar',
  "Suivez ici l'outil actif, le zoom et le nombre d'annotations. La mention « Lecture seule » apparaît pour les pièces du dossier : consultables mais non modifiables.":
    'Track the active tool, the zoom level and the number of annotations here. “Read-only” appears for claim-file items: viewable but not editable.',

  // ── Viewer ──
  'Visionneuse de documents': 'Document viewer',
  "Cette page affiche en lecture seule les fichiers d'un chiffrage et les pièces du dossier, avec les annotations existantes. Rien ne peut y être modifié.":
    'This page shows an estimate’s documents and the claim file’s items in read-only mode, with any existing annotations. Nothing can be changed here.',
  "Filtrez par type de document, puis sélectionnez le fichier à afficher dans la liste juste à droite.":
    'Filter by document type, then pick the one to display in the list just to the right.',
  'Comparer deux pièces': 'Compare two items',
  "Ouvrez le panneau de comparaison pour afficher une photo ou un document du dossier à côté du fichier consulté.":
    'Open the comparison panel to show a photo or document from the claim file next to the one you are viewing.',
  'Zoomer sur le document': 'Zoom the document',
  "Rapprochez ou éloignez la vue. Les boutons de rotation juste à droite pivotent le document par quarts de tour.":
    'Zoom in or out. The rotation buttons just to the right turn the document in quarter turns.',
  "Ce badge rappelle qu'aucune modification n'est possible ici. Pour annoter un fichier, ouvrez-le depuis l'éditeur du chiffrage.":
    'This badge is a reminder that nothing can be changed here. To annotate a document, open it from the estimate’s editor.',
};
