'use client';

import { PageHeader } from '@/components/layout/page-header';
import React from 'react';
import { useRouter } from 'next/navigation';
import ConsultationClientPage from './client-page';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getDefaultRouteForRole } from '@/lib/nav-groups';

const CONSULTATION_ALLOWED_ROLES = [
  'Admin',
  "Responsable d'équipe",
  'Gestionnaire',
  'Directeur',
  'Directeur des opérations',
  'Directeur technique',
];

export default function ConsultationPage() {
  const { profile, loading: userLoading } = useCurrentUser();
  const router = useRouter();

  const denied =
    !!profile?.role && !CONSULTATION_ALLOWED_ROLES.includes(profile.role);

  React.useEffect(() => {
    if (!userLoading && denied && profile?.role) {
      router.replace(getDefaultRouteForRole(profile.role));
    }
  }, [userLoading, denied, profile?.role, router]);

  if (userLoading) {
    return <div className="py-12 text-sm text-muted-foreground">Chargement...</div>;
  }

  if (denied) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Consultation" subtitle="Consulter tous les dossiers de sinistres (lecture seule)" />
      <ConsultationClientPage />
    </div>
  );
}
