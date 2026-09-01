import { Suspense } from 'react';
import UtilisateursClientPage from './client-page';
import Loading from './loading';

// The page header (title · count) is rendered by the client page because the
// count comes from the live users query. The header carries NO action: the
// page primary is the inline « Ajouter un utilisateur » form's submit
// (element-specs §1/§8 — one filled button per screen; GOV.UK button:
// "avoid using multiple default buttons on a single page").
export default function UtilisateursPage() {
  return (
    <Suspense fallback={<Loading />}>
      <UtilisateursClientPage />
    </Suspense>
  );
}
