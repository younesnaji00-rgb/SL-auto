import type { PageTutorial } from '../types';

// Filled by the tutorial content sweep — see docs/TUTORIALS.md.
export const dossierDetailTutorial: PageTutorial = {
  key: 'dossier-detail',
  match: (p) => p.startsWith('/dossiers/') && p !== '/dossiers',
  steps: [],
};
