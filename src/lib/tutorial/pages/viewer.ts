import type { PageTutorial } from '../types';

// Filled by the tutorial content sweep — see docs/TUTORIALS.md.
export const viewerPageTutorial: PageTutorial = {
  key: 'viewer',
  match: (p) => p === '/viewer',
  steps: [],
};
