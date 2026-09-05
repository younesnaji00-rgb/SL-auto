import type { PageTutorial } from '../types';

// Login page tour — see docs/TUTORIALS.md. The launcher is only mounted on
// the NORMAL login branch, so every anchor lives in that branch. The demo
// accounts step anchors a box that only exists when BRAND.id === 'demo';
// DOM-presence filtering skips it everywhere else.
export const loginTutorial: PageTutorial = {
  key: 'login',
  match: (p) => p === '/login',
  steps: [
    {
      title: 'Connexion',
      body: "Connectez-vous avec les identifiants fournis par votre administrateur.",
    },
    {
      anchor: 'login-nom',
      title: 'Votre nom complet',
      body: "Tapez votre nom complet, pas une adresse e-mail ; majuscules ou minuscules, peu importe.",
      side: 'bottom',
    },
    {
      anchor: 'login-password',
      title: 'Mot de passe',
      body: "L'icône en forme d'œil affiche votre saisie en clair.",
      side: 'bottom',
    },
    {
      anchor: 'login-lang',
      title: 'Changer de langue',
      body: 'Basculez entre français et anglais à tout moment.',
      side: 'bottom',
      align: 'end',
    },
    {
      anchor: 'login-roles',
      title: 'Qui fait quoi',
      body:
        "« Découvrir les rôles » explique chaque métier de l'application — gestionnaire, chiffreur, agent de terrain, responsable — et ce que chacun voit.\nUtile avant de choisir le compte avec lequel se connecter.",
      side: 'top',
    },
    {
      anchor: 'login-demo',
      title: 'Comptes de démonstration',
      body: "Utilisez l'un de ces noms avec le mot de passe indiqué.",
      side: 'top',
    },
  ],
};
