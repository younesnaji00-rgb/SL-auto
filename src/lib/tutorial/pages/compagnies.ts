import type { PageTutorial } from '../types';

// Filled by the tutorial content sweep — see docs/TUTORIALS.md.
export const compagniesTutorial: PageTutorial = {
  key: 'compagnies',
  match: (p) => p.startsWith('/compagnies'),
  steps: [],
};
