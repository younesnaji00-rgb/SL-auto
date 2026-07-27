import type { PageTutorial } from '../types';

// Filled by the tutorial content sweep — see docs/TUTORIALS.md.
export const utilisateurDetailTutorial: PageTutorial = {
  key: 'utilisateur-detail',
  match: (p) => p.startsWith('/utilisateurs/'),
  steps: [],
};
