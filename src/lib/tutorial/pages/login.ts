import type { PageTutorial } from '../types';

// Filled by the tutorial content sweep — see docs/TUTORIALS.md.
export const loginTutorial: PageTutorial = {
  key: 'login',
  match: (p) => p === '/login',
  steps: [],
};
