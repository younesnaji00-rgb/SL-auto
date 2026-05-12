'use client';

import ConsultationClientPage from './client-page';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CONSULTATION_ALLOWED_ROLES = [
  'Admin',
  "Responsable d'équipe",
  'Gestionnaire',
  'Chiffreur',
  'Directeur',
  'Directeur des opérations',
  'Directeur technique',
];

export default function ConsultationPage() {
  const { profile, loading: userLoading } = useCurrentUser();

  if (userLoading) {
    return <div className="py-12 text-sm text-muted-foreground">Chargement...</div>;
  }

  if (profile?.role && !CONSULTATION_ALLOWED_ROLES.includes(profile.role)) {
    return (
      <Card className="border shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle>Accès refusé</CardTitle>
          <CardDescription>Cette page n&apos;est pas accessible à votre rôle.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consultation</h1>
        <p className="text-muted-foreground">
          Consulter tous les dossiers de sinistres (lecture seule)
        </p>
      </div>
      <ConsultationClientPage />
    </div>
  );
}
