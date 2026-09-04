import { BRAND } from '../brand';

/**
 * Dossier id of the rappel the user treated during the guided journey.
 * Written while the treatment session is live (the session handshake key is
 * cleared on save, but the tour must still recognize the dossier afterwards:
 * the return trip re-enters it through File Management).
 *
 * Lives in its own dependency-light module (relative imports only) so the
 * tour PAGE definitions can use it while remaining importable by plain
 * node tooling (the i18n coverage checker) — tour.ts pulls in driver.js
 * and its CSS, which node cannot load.
 */
export const treatedDossierKey = () => `${BRAND.storagePrefix}.tour.treatedDossier`;
