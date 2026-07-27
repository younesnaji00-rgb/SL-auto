import type { PageTutorial } from '../types';

// Filled by the tutorial content sweep — see docs/TUTORIALS.md.
export const chiffrageDetailTutorial: PageTutorial = {
  key: 'chiffrage-detail',
  match: (p) => p.startsWith('/assignations-chiffrage/'),
  steps: [],
};
