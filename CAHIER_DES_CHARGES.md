# Cahier des Charges Fonctionnel

Application SL-Auto — Système de Gestion d'Expertise Automobile

**Version :** 1.0 | **Date :** 13 Avril 2026 | **Statut :** Document final | **Confidentialité :** Usage interne & présentation client

---

# 1. Présentation Générale du Projet

**Identification**

| Élément | Détail |
|---|---|
| **Nom** | SL-Auto |
| **Nature** | Application de gestion d'expertise automobile |
| **Langue** | Français |
| **Marché** | Assurance automobile — Maroc |
| **Accès** | Depuis un ordinateur, une tablette ou un téléphone via un navigateur web |
| **Hébergement** | Serveurs Google Cloud (Firebase) |

**Contexte et Problématique**

Le secteur de l'expertise automobile au Maroc implique de multiples acteurs : compagnies d'assurance, cabinets d'expertise, agents de terrain, chiffreurs et gestionnaires. Chaque sinistre génère un dossier traversant plusieurs étapes — de la déclaration initiale à la clôture — en passant par l'expertise terrain, le chiffrage, la validation des devis et la facturation.

Ces processus sont traditionnellement fragmentés (dossiers papier, emails, fichiers Excel), entraînant : pertes de temps, manque de traçabilité, erreurs de saisie, difficultés de coordination, absence de tableaux de bord, et risques de perte de données.

**SL-Auto digitalise intégralement le cycle de vie d'un dossier d'expertise automobile** dans une plateforme unique, centralisée et intelligente.

**Objectifs**

| # | Objectif | Description |
|---|---|---|
| 1 | Centralisation | Regrouper toutes les informations d'un dossier (assuré, véhicule, documents, photos, chiffrage, historique) dans une fiche unique consultable en temps réel |
| 2 | Automatisation intelligente | Extraire automatiquement les données des documents scannés grâce à l'intelligence artificielle pour pré-remplir les formulaires |
| 3 | Rôles et permissions | 5 profils utilisateurs (Admin, Responsable, Gestionnaire, Chiffreur, Agent Terrain) avec des droits d'accès distincts |
| 4 | Suivi du workflow | 84 statuts prédéfinis avec un historique complet et horodaté de chaque action |
| 5 | Coordination terrain | Module de planification de missions pour les agents de terrain |
| 6 | Chiffrage | Saisie détaillée des pièces de rechange, de la main-d'œuvre et des opérations de réparation |
| 7 | Gestion documentaire | Prise en charge de 16 types de documents avec envoi, classement et consultation |
| 8 | Export PDF | Génération de rapports d'expertise complets au format PDF |
| 9 | Mode hors-ligne | Possibilité de travailler sans connexion Internet — les données sont synchronisées automatiquement à la reconnexion |
| 10 | Tableau de bord | Graphiques et indicateurs visuels pour le pilotage de l'activité du cabinet |

**Sections de l'Application**

L'application propose 7 sections principales accessibles depuis un menu latéral :

| # | Section | Description |
|---|---|---|
| 1 | **Tableau de bord** | Vue d'ensemble de l'activité avec graphiques et indicateurs |
| 2 | **Dossiers** | Création, consultation, modification et suivi des dossiers |
| 3 | **Consultation** | Vue en lecture seule de tous les dossiers |
| 4 | **Assignations Chiffrage** | Gestion des tâches de chiffrage confiées aux chiffreurs |
| 5 | **Assignations ATG** | Planification et suivi des missions de terrain |
| 6 | **Utilisateurs** | Gestion des comptes (réservé à l'administrateur) |
| 7 | **Compagnies** | Gestion des compagnies d'assurance partenaires |

**Données de Référence**

L'application est préconfigurée avec les données suivantes, toutes modifiables par l'administrateur :

- **Compagnies d'assurance (10) :** Allianz, RMA, Sanlam, Wafa Assurance, ATLANTA, CP, Zurich, Saham, AXA Maroc, SANAD — chacune identifiée par une couleur distincte dans l'interface.
- **Natures de sinistre (10) :** Automobile, Incendie, Classique, Contradictoire, Arbitrage, Réforme, Collégiale, Forfait, Appréciation, EAD.
- **Types de dossier (4) :** Normale, Classique, Agrée, Forfait.
- **Rangs d'expert (4) :** Leur expert, 1er expert, 2ème expert, Arbitre.
- **Marques de véhicules (26) :** Renault, Peugeot, Citroën, Dacia, Volkswagen, Toyota, Hyundai, Kia, Ford, Fiat, BMW, Mercedes, Audi, Nissan, Opel, Suzuki, Honda, Mazda, Mitsubishi, Skoda, Seat, Chevrolet, MG, Chery, DFSK, Autre.
- **Types de documents (16) :** Rapport d'expertise, Devis, Facture, Photos avant/après/sinistre, PV de constat, Carte grise, Permis, Attestation d'assurance, Avis de dommage, Bon de commande, Ordre de mission, Procuration, CIN, Autre.

**Statuts de Workflow (84 statuts)**

Le suivi des dossiers repose sur 84 statuts organisés par couleur :

| Couleur | Catégorie | Exemples |
|---|---|---|
| Violet | Création | Nouveau, Création de mission |
| Bleu | En cours | Expertise avant/après, En cours de réparation |
| Orange | En attente | Assigné au chiffrage, Demande d'accord, Att. Signature |
| Vert | Validé | Accord devis, Facture contrôlée, Dossier signé |
| Rouge | Problème | Accord refusé, Document illisible, Hors zone, Mission annulée |
| Cyan | Information | Avis de dommage, PV Carence, Commentaire |
| Gris | Clôture | Clôture |

---

# 2. Profils Utilisateurs

**Vue d'Ensemble**

L'application distingue 5 profils, chacun correspondant à un métier au sein du cabinet. Le profil détermine les sections visibles, les actions autorisées et les données affichées.

| Profil | Métier | Niveau d'accès |
|---|---|---|
| **Administrateur** | Directeur / Responsable IT | Accès total |
| **Responsable d'Équipe** | Chef d'équipe / Superviseur | Gestion complète des dossiers |
| **Gestionnaire** | Gestionnaire de sinistres | Gestion complète des dossiers |
| **Chiffreur** | Spécialiste en chiffrage | Ses tâches de chiffrage uniquement |
| **Agent de Terrain** | Expert terrain / Inspecteur | Ses missions terrain uniquement |

**Informations d'un Compte Utilisateur**

Chaque compte contient : nom complet, prénom, adresse email (générée automatiquement depuis le nom, ex : `ahmed.benali@sl-auto.app`), mot de passe, rôle, compagnies d'assurance assignées, statut (Actif ou Inactif), date de création, date de dernière connexion.

**Connexion**

- **Premier lancement :** L'application affiche un formulaire pour créer le premier compte Administrateur (nom + mot de passe).
- **Connexion habituelle :** L'utilisateur saisit son nom complet et son mot de passe. Si le compte est désactivé, l'accès est refusé. En cas de succès, l'utilisateur est redirigé vers le tableau de bord.
- **Sécurité :** Toutes les pages sont protégées — un utilisateur non connecté est automatiquement renvoyé vers la page de connexion.

**Profil 1 — Administrateur**

L'Administrateur est le super-utilisateur de l'application. Il a un accès total et sans restriction à toutes les sections.

*Gestion des utilisateurs (accès exclusif) :*
- Créer un compte : nom, mot de passe, rôle, compagnies. Le système génère l'email automatiquement et prépare les données nécessaires selon le rôle choisi (par exemple, un chiffreur est automatiquement ajouté à la liste de sélection du chiffrage).
- Consulter la liste des utilisateurs avec filtrage par nom ou rôle.
- Modifier les informations d'un utilisateur et consulter ses 20 dernières actions.
- Désactiver ou réactiver un compte sans le supprimer.
- Supprimer définitivement un compte (avec nettoyage automatique des données liées).

*Dossiers :* Accès à tous les dossiers de toutes les compagnies. Création, modification, suppression, assignation au chiffrage, planification de missions, changement de statut, export PDF.

*Supervision :* Tableau de bord complet, historique global, recherche intelligente.

**Profil 2 — Responsable d'Équipe**

Chef d'équipe avec des droits complets sur les dossiers, à l'exception de la gestion des utilisateurs. Il ne voit que les dossiers des compagnies qui lui sont assignées. Il peut consulter toutes les assignations de chiffrage et missions terrain pour suivre le travail de son équipe.

**Profil 3 — Gestionnaire**

Utilisateur principal au quotidien. Mêmes droits que le Responsable d'Équipe. La distinction est organisationnelle : le Responsable supervise, le Gestionnaire traite les dossiers.

Workflow type : Réception d'une lettre de mission → Scan intelligent du document → Création du dossier → Envoi des pièces → Planification d'une mission terrain → Envoi au chiffrage → Suivi → Export du rapport PDF.

**Profil 4 — Chiffreur**

Spécialiste qui ne voit que les tâches de chiffrage qui lui sont personnellement assignées. Il ne peut ni créer ni modifier de dossiers.

Son travail en 5 étapes :
1. Consulter ses assignations (tableau avec dossier, fichiers, statut, date).
2. Ouvrir une assignation pour voir les fichiers envoyés (photos et documents).
3. Annoter et corriger les documents grâce à un éditeur intégré : tracer des lignes de biffure, ajouter du texte correctif, appliquer des tampons personnalisés, le tout en 4 couleurs (rouge, bleu, noir, vert).
4. Enregistrer les annotations et exporter un PDF corrigé.
5. Consulter les documents en mode lecture seule pour comparer avec les originaux.

**Profil 5 — Agent de Terrain**

Expert de terrain qui ne voit que les missions qui lui sont personnellement assignées. Il ne peut ni créer ni modifier de dossiers. Il n'a pas accès à la section chiffrage.

Son travail :
1. Consulter ses missions organisées par type : **Avant** (inspection initiale), **En cours** (suivi pendant réparation), **Après** (contrôle final). Chaque onglet affiche le nombre de missions.
2. Ouvrir une mission pour voir les détails : date du rendez-vous, zone, adresse, observations du gestionnaire.
3. Envoyer des photos depuis le terrain, automatiquement classées par catégorie (avant, en cours, après). **Le système fonctionne même sans connexion Internet** — les photos sont envoyées automatiquement dès que la connexion est rétablie.
4. Envoyer des documents complémentaires (PV, carte grise, etc.).

**Tableau Récapitulatif des Permissions**

| Action | Admin | Resp. Équipe | Gestionnaire | Chiffreur | Agent Terrain |
|---|---|---|---|---|---|
| Voir le tableau de bord | Oui | Oui | Oui | Oui | Oui |
| Créer un dossier | Oui | Oui | Oui | Non | Non |
| Modifier un dossier | Oui | Oui | Oui | Non | Non |
| Supprimer un dossier | Oui | Oui | Oui | Non | Non |
| Envoyer au chiffrage | Oui | Oui | Oui | Non | Non |
| Planifier une mission terrain | Oui | Oui | Oui | Non | Non |
| Traiter un chiffrage | Oui | Non | Non | Oui (le sien) | Non |
| Traiter une mission terrain | Oui | Non | Non | Non | Oui (la sienne) |
| Gérer les utilisateurs | Oui | Non | Non | Non | Non |
| Exporter un rapport PDF | Oui | Oui | Oui | Oui | Non |

| Données visibles | Admin | Resp./Gest. | Chiffreur | Agent Terrain |
|---|---|---|---|---|
| Dossiers | Tous | Ses compagnies | Ses compagnies | Ses compagnies |
| Assignations | Toutes | Toutes | Les siennes | Les siennes |

---

# 3. Parcours Utilisateur et Flux de Travail

**Cycle de Vie d'un Dossier**

```
Lettre de mission reçue
        │
        ▼
  CRÉATION DU DOSSIER
  (Gestionnaire ou Admin)
  Scan intelligent + 5 étapes
        │
   ┌────┴────┐
   ▼         ▼
MISSION    ENVOI DE
TERRAIN    DOCUMENTS
(Agent)    & PHOTOS
   │         │
   ▼         │
EXPERTISE    │
SUR SITE     │
(Photos)     │
   │         │
   └────┬────┘
        ▼
  ENVOI AU CHIFFRAGE
  (Chiffreur assigné)
        │
        ▼
  ANNOTATION & CORRECTION
  (Éditeur de documents)
        │
        ▼
  EXPORT PDF CORRIGÉ
        │
        ▼
  VALIDATION & ACCORD
  (Changements de statut)
        │
        ▼
  RAPPORT PDF FINAL
        │
        ▼
  ENVOI PAR EMAIL
  À LA COMPAGNIE
        │
        ▼
     CLÔTURE
```

**Création d'un Dossier — Assistant en 5 Étapes**

*Étape 1 — Documents (Scan Intelligent)*

L'utilisateur envoie un ou plusieurs documents (lettre de mission, avis de dommage). L'application propose un **scan par intelligence artificielle** qui analyse le document et en extrait automatiquement les informations : rang d'expert, type de dossier, nature, compagnie, nom et téléphone de l'assuré, marque et immatriculation du véhicule, numéro de police, dates, type de réparateur, partie adverse. Les champs pré-remplis sont signalés par un contour ambre et un badge "AUTO". L'utilisateur passe ensuite à l'étape suivante.

*Étape 2 — Informations*

Formulaire principal organisé en sections :
- **Dossier :** Rang d'expert, type, nature, compagnie, référence expert (générée automatiquement), référence compagnie, numéro de police.
- **Assuré :** Nom, prénom, téléphone, WhatsApp, téléphone secondaire, email, adresse, CIN.
- **Véhicule :** Marque, modèle, immatriculation, numéro de série, énergie, puissance, date de mise en circulation, kilométrage.
- **Partie adverse :** Nom, matricule, marque, police, compagnie.
- **Intermédiaire :** Nom, email.
- **Dates :** Date du sinistre, date de la requête.

*Étape 3 — Planification (Optionnelle)*

Si une expertise sur le terrain est nécessaire : choix de l'agent de terrain, type de mission (Avant / En cours / Après), date et heure du rendez-vous, zone géographique, adresse, observations.

*Étape 4 — Pièces Jointes*

Envoi de photos et documents supplémentaires, classés par type.

*Étape 5 — Confirmation*

Récapitulatif de toutes les informations. Validation et enregistrement définitif du dossier.

**Gestion d'un Dossier — Fiche Détaillée (5 Onglets)**

*Onglet Informations :* Fiche complète avec tous les champs du dossier en consultation ou modification (selon le profil). Inclut un espace de discussion (commentaires) et la gestion des planifications de missions.

*Onglet Photos :* Galerie de photos organisée par catégorie (Avant, En cours, Après). Envoi, aperçu, renommage, suppression. Affichage en grille.

*Onglet Documents :* Gestion des documents par type (16 catégories). Envoi, consultation, téléchargement.

*Onglet Chiffrage :* Module détaillé de chiffrage des réparations :
- Type de rapport : Réparation ou Réforme
- Tableau des pièces : désignation, opération (Échange / Réparation / Peinture), type de pièce, vétusté, quantité, prix unitaire HT, remise, TVA
- Main-d'œuvre : Tôlerie, Peinture, Mécanique, Électrique (heures et taux horaire)
- Schéma interactif du véhicule : vue dessus (9 zones cliquables : AV, AR, AVG, AVD, ARG, ARD, LATG, LATD, Toit) et vue dessous (8 zones : suspension, soubassement, plancher, transmission, différentiel, échappement, réservoir) — les zones touchées sont colorées en rouge
- Observations de l'expert

*Onglet Historique :* Journal chronologique de toutes les actions effectuées sur le dossier : changements de statut, assignations, envois de fichiers, modifications. Chaque entrée indique l'action, sa description, l'utilisateur responsable et la date.

*Boutons d'action disponibles :*

| Action | Description |
|---|---|
| Envoyer vers chiffrage | Choisir un chiffreur et lui envoyer les fichiers du dossier |
| Exporter PDF | Générer le rapport d'expertise complet |
| Réclamation | Créer une réclamation sur le dossier |
| Décision de statut | Changer le statut du dossier parmi les 84 disponibles |

**Flux d'Assignation au Chiffrage**

1. Le Gestionnaire ouvre un dossier et clique sur "Envoyer vers chiffrage"
2. Il choisit un chiffreur dans la liste
3. Toutes les photos et documents du dossier sont automatiquement envoyés
4. Le statut du dossier passe à "Assigné au chiffrage"
5. Le Chiffreur voit l'assignation apparaître dans sa page dédiée

**Flux des Missions Terrain**

1. Le Gestionnaire ouvre un dossier et crée une planification de mission
2. Il renseigne : agent de terrain, type de mission, date et heure, zone, adresse, observations
3. L'Agent de Terrain voit la mission apparaître dans sa page "Assignations ATG"
4. L'Agent se rend sur place, prend les photos et envoie les documents
5. Les fichiers sont disponibles dans le dossier pour le chiffrage

**Contenu du Rapport PDF Exporté**

1. En-tête avec type de rapport, référence et date
2. Informations du véhicule : marque, modèle, immatriculation, mise en circulation, énergie, kilométrage
3. Informations de l'assuré : nom, CIN, téléphone, compagnie, police, référence sinistre
4. Schémas du véhicule avec les zones d'impact marquées (vue dessus et dessous)
5. Tableau des fournitures : désignation, type, vétusté, quantité, prix unitaire, remise, montants HT et TTC
6. Tableau de la main-d'œuvre : tôlerie, peinture, mécanique, électrique
7. Récapitulatif des totaux : montants HT, TVA et TTC (en MAD)
8. Observations de l'expert
9. Annexe : galerie des photos du dossier

**Envoi d'Email**

L'application permet d'envoyer des emails directement depuis l'interface (rapports, notifications) vers les compagnies d'assurance ou d'autres destinataires.

---

# 4. Fonctionnalités Détaillées

**Tableau de Bord**

- Nombre total de dossiers actifs (non clôturés)
- Répartition par ancienneté : Jour 0, Jour 1, Jour 2, Jour 3+ (4 cartes cliquables)
- Graphique à barres "Volume par Statut" (Nouveau, En cours, Clôturé, Annulé)
- Graphique à barres "Répartition par Compagnie"
- Journal d'activité récente avec filtres : plage de dates, type d'action, utilisateur
- Clic sur un graphique ou une carte → affichage des dossiers correspondants

**Recherche Intelligente**

Raccourci clavier Ctrl+K pour ouvrir une barre de recherche. L'utilisateur tape sa recherche en langage naturel, et l'intelligence artificielle propose une navigation vers la section la plus pertinente.

**Scan Intelligent de Documents**

Lors de la création d'un dossier, l'utilisateur peut envoyer un document (lettre de mission, avis de dommage). L'intelligence artificielle analyse le document et extrait automatiquement les informations : compagnie, assuré, véhicule, dates, numéro de police, partie adverse. Les champs du formulaire sont pré-remplis. Seules les informations identifiées avec une confiance de 95% ou plus sont utilisées.

**Reconstruction Intelligente de Documents**

L'application peut convertir une image de document (facture, devis) en un document numérique éditable, en préservant fidèlement la mise en page, les tableaux, les couleurs et les polices.

**Extraction Intelligente de Rapports**

Les factures et devis de réparation peuvent être analysés automatiquement pour en extraire : le tableau des pièces, la main-d'œuvre, les points de choc du véhicule et les observations de l'expert.

**Éditeur d'Annotations**

Outil intégré permettant aux chiffreurs de marquer et corriger les documents :
- Tracer des lignes de biffure pour signaler les erreurs
- Ajouter du texte de correction
- Appliquer des tampons personnalisés (images importables)
- 4 couleurs disponibles : rouge, bleu, noir, vert
- Enregistrement des annotations et export en PDF

**Visualiseur de Documents**

Consultation de documents en lecture seule avec affichage des annotations. Navigation entre les pages, zoom, rotation. Panneau de comparaison avec les documents originaux.

**Schéma Interactif du Véhicule**

Dessin détaillé du véhicule avec des zones cliquables pour marquer les points d'impact. Vue de dessus (9 zones) et vue de dessous (8 zones). Les zones sélectionnées sont colorées en rouge. Utilisé dans le module de chiffrage.

**Mode Hors-Ligne**

Lorsque l'utilisateur perd sa connexion Internet :
- Un bandeau visuel l'informe qu'il est hors-ligne
- Les fichiers envoyés (photos, documents) sont mis en attente localement (jusqu'à 50 Mo par fichier)
- Dès que la connexion est rétablie, tout est envoyé automatiquement

**Gestion des Compagnies**

Page dédiée pour ajouter, modifier ou supprimer les compagnies d'assurance partenaires. Chaque compagnie est identifiée par une couleur (bleu, rouge, vert, jaune, etc.) pour la reconnaître rapidement dans les listes et graphiques.

**Gestion des Listes de Référence**

L'administrateur peut modifier toutes les listes déroulantes de l'application : natures de sinistre, statuts, types de mission, types de documents, rôles, agents, types de dossier, opérations de réparation, types de pièces, types de réparateur, catégories de main-d'œuvre. Chaque option peut être activée, désactivée ou réordonnée.

**Notifications**

Panneau accessible depuis l'en-tête informant les utilisateurs des événements récents : nouvelles assignations, changements de statut, etc.

**Thème Clair / Sombre**

L'utilisateur peut basculer entre un affichage clair (fond blanc) et un affichage sombre (fond foncé) via un bouton dans le menu latéral. Toutes les couleurs s'adaptent automatiquement.

---

# 5. Technologies Utilisées

**Interface Utilisateur**

| Technologie | Rôle |
|---|---|
| Next.js 15 | Structure principale de l'application |
| React 19 | Construction de l'interface |
| TypeScript | Langage de programmation |
| Tailwind CSS | Mise en forme visuelle |
| shadcn/ui + Radix UI | Bibliothèque de 37 composants visuels (boutons, tableaux, formulaires, etc.) |
| Lucide React | Icônes |
| Recharts | Graphiques du tableau de bord |
| date-fns | Gestion des dates (format français) |

**Services en Ligne**

| Service | Rôle |
|---|---|
| Firebase Authentication | Gestion des connexions et comptes |
| Firestore | Base de données en temps réel |
| Firebase Storage | Stockage des photos, documents et PDFs |
| Firebase App Hosting | Hébergement de l'application |
| Google Gemini (IA) | Scan de documents, reconstruction, recherche intelligente |
| Nodemailer | Envoi d'emails |

**Traitement des Documents**

| Outil | Rôle |
|---|---|
| jsPDF | Génération de rapports PDF |
| pdf-lib | Manipulation de fichiers PDF |
| pdfjs-dist | Affichage de PDFs dans le navigateur |
| html2canvas | Capture d'écran pour l'export des annotations |

**Organisation des Données**

Les données sont organisées comme suit dans la base de données :

- **Utilisateurs** : profils avec rôle, compagnies, statut
- **Dossiers** : informations du sinistre, avec sous-dossiers pour :
  - Photos (classées par catégorie : avant, en cours, après)
  - Documents (classés par type)
  - Planifications de missions terrain
  - Historique des actions
  - Commentaires et discussions
  - Réclamations
- **Chiffrages** : assignations avec fichiers, annotations et PDF corrigés
- **Chiffreurs** : liste des chiffreurs disponibles
- **Agents de terrain** : liste des agents disponibles
- **Options** : toutes les listes de référence configurables
- **Compagnies** : liste des compagnies d'assurance

---

# 6. Design et Ergonomie

**Palette de Couleurs**

| Rôle | Couleur |
|---|---|
| Couleur principale | Bleu |
| Fond clair | Bleu-gris très clair |
| Fond sombre | Bleu-noir profond |
| Accent | Cyan (bleu clair) |
| Alertes et suppressions | Rouge |
| Cartes et panneaux | Blanc |
| Texte | Quasi-noir |

Les statuts des dossiers sont identifiés par des couleurs distinctes pour une lecture rapide :
- **Rouge** : refus, erreurs, annulations
- **Vert** : validations, accords, signatures
- **Bleu** : travail en cours, expertise
- **Orange** : en attente, assignations
- **Violet** : nouveau, création
- **Cyan** : informations, avis
- **Gris** : clôture, archive

Chaque compagnie d'assurance a également sa propre couleur : Allianz (bleu), RMA (rouge), Sanlam (vert), Wafa (jaune), Atlanta (indigo), CP (violet), Zurich (rose), Saham (cyan), AXA (sarcelle).

Toutes les couleurs s'adaptent automatiquement au thème clair ou sombre.

**Police de Caractères**

Police Inter (Google Fonts) utilisée dans toute l'application, en plusieurs épaisseurs pour distinguer les titres, le texte courant et les éléments d'interface.

**Disposition de l'Écran**

```
┌──────────┬────────────────────────────────────┐
│          │  En-tête (fixe en haut de page)     │
│  Menu    ├────────────────────────────────────┤
│  latéral │  Bandeau hors-ligne (si applicable)│
│          ├────────────────────────────────────┤
│  (replia-│                                    │
│   ble)   │  Zone de contenu principal         │
│          │                                    │
│          │                                    │
└──────────┴────────────────────────────────────┘
```

*Menu latéral :* Logo, liens de navigation (filtrés selon le profil), liste des compagnies avec pastilles de couleur, bouton de changement de thème, profil utilisateur, bouton de déconnexion. Le menu peut être réduit en mode icônes pour gagner de l'espace. Sur mobile, il apparaît comme un panneau coulissant.

*En-tête :* Fixe en haut de l'écran avec un léger effet de flou. Contient le fil d'Ariane (chemin de navigation) et l'accès aux notifications.

**Composants Visuels**

L'application utilise une bibliothèque de 37 composants cohérents :
- Boutons en 6 variantes : principal (bleu), secondaire (gris), discret (transparent), bordure, suppression (rouge), lien texte
- Badges de statut : petites pilules arrondies avec la couleur correspondant à la catégorie du statut
- Cartes : panneaux blancs avec en-tête, titre et contenu, utilisés pour regrouper les informations
- Formulaires : champs de saisie, listes déroulantes, cases à cocher, sélecteurs de date, zones de texte
- Fenêtres de dialogue : pour les confirmations, les formulaires rapides et les alertes
- Tableaux de données : avec tri, filtrage et actions par ligne
- Messages de confirmation : notifications temporaires en bas de l'écran

**Adaptation aux Écrans**

L'application s'adapte automatiquement à la taille de l'écran :
- **Ordinateur** : menu latéral étendu, grilles à 3 colonnes, espacement large
- **Tablette** : menu latéral réduit, grilles à 2 colonnes, espacement moyen
- **Téléphone** : menu latéral en panneau coulissant, affichage sur 1 colonne, espacement compact

La zone de contenu est limitée à une largeur maximale de 1600 pixels et centrée sur les grands écrans.

**Animations**

L'interface utilise des animations légères pour fluidifier l'expérience :
- Ouverture et fermeture progressives des panneaux repliables
- Apparition en fondu des éléments lors du chargement
- Transitions douces lors des changements de section
- Défilement fluide

**Accessibilité**

L'application respecte les bonnes pratiques d'accessibilité :
- Navigation possible entièrement au clavier
- Indicateurs visuels clairs lors de la sélection d'un élément
- Contraste élevé entre le texte et l'arrière-plan (en modes clair et sombre)
- Les informations ne sont jamais transmises uniquement par la couleur — des icônes et du texte accompagnent toujours les indicateurs colorés

---

*Fin du Cahier des Charges — SL-Auto v1.0*
