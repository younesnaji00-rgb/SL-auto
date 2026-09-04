'use client';

import { PageHeader } from '@/components/layout/page-header';
import React from 'react';
import { useRouter } from 'next/navigation';
import ConsultationClientPage from './client-page';
import { useT } from '@/i18n';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getDefaultRouteForRole, NAV_ITEMS, titleForRoute } from '@/lib/nav-groups';
import { PageSkeleton } from '@/components/ui/page-skeleton';

const CONSULTATION_ALLOWED_ROLES = [
  'Admin',
  "Responsable d'équipe",
  'Gestionnaire',
  'Directeur',
  'Directeur des opérations',
  'Directeur technique',
];

export default function ConsultationPage() {
  const t = useT();
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
    // Same skeleton as the route's loading.tsx so the two loading phases
    // look identical instead of a bare "Chargement..." line.
    return <PageSkeleton variant="list" action={false} />;
  }

  if (denied) return null;

  // Title / subtitle come from nav-groups (DESIGN.md §1: one source of names).
  const nav = NAV_ITEMS.find((i) => i.href === '/consultation');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(titleForRoute('/consultation') ?? 'Consultation')}
        subtitle={nav?.subtitle ? t(nav.subtitle) : undefined}
      />
      <ConsultationClientPage />
    </div>
  );
}
