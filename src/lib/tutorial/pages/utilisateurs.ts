import type { PageTutorial } from '../types';

export const utilisateursTutorial: PageTutorial = {
  key: 'utilisateurs',
  match: (p) => p === '/utilisateurs',
  steps: [
    {
      title: 'Gestion des utilisateurs',
      body:
        "Cette page permet aux administrateurs de créer les comptes de l'équipe et de gérer leurs accès. Chaque compte a un rôle qui détermine les pages et actions disponibles.",
    },
    {
      anchor: 'usr-create',
      title: 'Créer un compte',
      body:
        "Renseignez le nom complet et un mot de passe. Le nom complet sert d'identifiant : l'utilisateur se connecte en tapant son nom exact, sans adresse email.",
      side: 'right',
    },
    {
      anchor: 'usr-role',
      title: 'Choisir le rôle',
      body:
        "Le rôle définit les droits : Admin et directeurs supervisent tout, le Gestionnaire suit les dossiers, le Chiffreur établit les devis, l'Agent de Terrain constate sur place. Ces trois derniers rôles sont limités à un seul appareil à la fois.",
      side: 'right',
    },
    {
      anchor: 'usr-search',
      title: 'Rechercher un utilisateur',
      body: 'Tapez un nom ou un email : la liste se filtre instantanément.',
      side: 'bottom',
    },
    {
      anchor: 'usr-filter-role',
      title: 'Filtrer par rôle',
      body:
        "Affichez uniquement les comptes d'un rôle donné. Un badge rappelle le filtre actif ; cliquez sur la croix pour le retirer.",
      side: 'bottom',
    },
    {
      anchor: 'usr-table',
      title: 'Liste des comptes',
      body:
        "Chaque ligne montre le mot de passe (icône œil), le rôle et le statut. Un compte Inactif ne peut plus se connecter. Cliquez sur une ligne pour ouvrir la fiche détaillée.",
      side: 'top',
    },
  ],
};
