import { PageHeader } from '@/components/layout/page-header';
import UtilisateursClientPage from './client-page';

export default function UtilisateursPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Utilisateurs" subtitle="Ajouter, gérer et assigner des rôles aux utilisateurs." />
      <UtilisateursClientPage />
    </div>
  );
}
