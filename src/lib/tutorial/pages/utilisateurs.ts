import type { PageTutorial } from '../types';

export const utilisateursTutorial: PageTutorial = {
  key: 'utilisateurs',
  match: (p) => p === '/utilisateurs',
  steps: [
    {
      title: 'Gestion des utilisateurs',
      body: "Créez les comptes de l'équipe et gérez leurs accès.",
    },
    {
      anchor: 'usr-create',
      title: 'Créer un compte',
      body: "Nom complet et mot de passe : le nom sert d'identifiant de connexion.",
      side: 'right',
    },
    {
      anchor: 'usr-role',
      title: 'Le rôle',
      body: 'Il définit ce que la personne peut voir et faire.',
      side: 'right',
    },
    {
      anchor: 'usr-search',
      title: 'Recherche',
      body: 'Tapez un nom : la liste se filtre aussitôt.',
      side: 'bottom',
    },
    {
      anchor: 'usr-filter-role',
      title: 'Filtrer par rôle',
      body: "Cliquez pour n'afficher que les comptes d'un rôle.",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'usr-table',
      title: 'Les comptes',
      body: 'Cliquez sur une ligne pour ouvrir la fiche du compte.',
      side: 'top',
    },
  ],
};
