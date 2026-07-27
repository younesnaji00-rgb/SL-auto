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
      title: 'Connexion à la plateforme',
      body:
        "Bienvenue ! Connectez-vous ici pour accéder à l'application. Les comptes sont créés par votre administrateur, qui vous communique vos identifiants.",
    },
    {
      anchor: 'login-nom',
      title: 'Votre nom complet',
      body:
        "Connectez-vous avec votre nom complet, pas une adresse e-mail. Tapez-le tel qu'il a été enregistré — majuscules ou minuscules, peu importe.",
      side: 'bottom',
    },
    {
      anchor: 'login-password',
      title: 'Mot de passe',
      body:
        "Saisissez votre mot de passe. L'icône en forme d'œil l'affiche en clair pour vérifier votre saisie.",
      side: 'bottom',
    },
    {
      anchor: 'login-lang',
      title: 'Changer de langue',
      body:
        "Basculez l'interface entre le français et l'anglais à tout moment. Votre choix est mémorisé sur cet appareil.",
      side: 'bottom',
      align: 'end',
    },
    {
      anchor: 'login-demo',
      title: 'Comptes de démonstration',
      body:
        "Pour explorer l'application, tapez l'un des noms affichés ici comme nom complet, avec le mot de passe indiqué.",
      side: 'top',
    },
  ],
};
