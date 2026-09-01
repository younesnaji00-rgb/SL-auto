import { Suspense } from 'react';
import UtilisateursClientPage from './client-page';
import Loading from './loading';

// The page header (title · count · « Nouvel utilisateur » · filters) is
// rendered by the client page so the single primary action can open the
// creation dialog (DESIGN.md §2 — one primary in PageHeader `actions`).
export default function UtilisateursPage() {
  return (
    <Suspense fallback={<Loading />}>
      <UtilisateursClientPage />
    </Suspense>
  );
}
