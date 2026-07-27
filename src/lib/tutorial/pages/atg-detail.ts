import type { PageTutorial } from '../types';

// Filled by the tutorial content sweep — see docs/TUTORIALS.md.
export const atgDetailTutorial: PageTutorial = {
  key: 'atg-detail',
  match: (p) => p.startsWith('/assignations-atg/'),
  steps: [],
};
