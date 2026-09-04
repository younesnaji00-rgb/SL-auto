import type { PageTutorial } from './types';
import { loginTutorial } from './pages/login';
import { dashboardTutorial } from './pages/dashboard';
import { dossiersTutorial } from './pages/dossiers';
import { dossierDetailTutorial } from './pages/dossier-detail';
import { assignationsChiffrageTutorial } from './pages/assignations-chiffrage';
import { chiffrageDetailTutorial } from './pages/chiffrage-detail';
import { devisEditorTutorial } from './pages/devis-editor';
import { assignationsAtgTutorial } from './pages/assignations-atg';
import { atgDetailTutorial } from './pages/atg-detail';
import { mesRappelsTutorial } from './pages/mes-rappels';
import { monitoringTutorial } from './pages/monitoring';
import { consultationTutorial } from './pages/consultation';
import { utilisateursTutorial } from './pages/utilisateurs';
import { utilisateurDetailTutorial } from './pages/utilisateur-detail';
import { compagniesTutorial } from './pages/compagnies';
import { tamponsTutorial } from './pages/tampons';
import { joursFeriesTutorial } from './pages/jours-feries';
import { signalerBugTutorial } from './pages/signaler-bug';
import { editorPageTutorial } from './pages/editor';
import { viewerPageTutorial } from './pages/viewer';

/** Specific (detail) matchers listed before their list-page prefixes. */
export const TUTORIALS: PageTutorial[] = [
  loginTutorial,
  dashboardTutorial,
  dossierDetailTutorial,
  dossiersTutorial,
  chiffrageDetailTutorial,
  assignationsChiffrageTutorial,
  devisEditorTutorial,
  atgDetailTutorial,
  assignationsAtgTutorial,
  mesRappelsTutorial,
  monitoringTutorial,
  consultationTutorial,
  utilisateurDetailTutorial,
  utilisateursTutorial,
  compagniesTutorial,
  tamponsTutorial,
  joursFeriesTutorial,
  signalerBugTutorial,
  editorPageTutorial,
  viewerPageTutorial,
];

/** The tutorial for the current pathname, or null when the page has none. */
export function tutorialForPath(pathname: string): PageTutorial | null {
  const tut = TUTORIALS.find((t) => t.match(pathname));
  return tut && tut.steps.length > 0 ? tut : null;
}
