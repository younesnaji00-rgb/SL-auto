'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getDefaultRouteForRole } from '@/lib/nav-groups';
import { PageLoader } from '@/components/ui/page-loader';

/**
 * Renders its children for a full Admin only (Admin and the Directeurs; not a
 * « Responsable des … », whose rights stop at its own side). Anyone else is
 * sent to their own first page, and the guarded page never mounts — so its
 * listeners never start.
 *
 * Why (live check 2026-10-09): the shell guard lets a Gestionnaire or a
 * Chiffreur open any address, and Utilisateurs had no check of its own — a
 * gestionnaire typing /utilisateurs got the whole user management, Admin
 * account creation included. Tampons and Jours fériés already redirected.
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { profile, loading, isFullAdmin } = useCurrentUser();
  const router = useRouter();
  const denied = !loading && !!profile && !isFullAdmin;

  useEffect(() => {
    if (denied) router.replace(getDefaultRouteForRole(profile?.role));
  }, [denied, profile?.role, router]);

  if (loading || !isFullAdmin) return <PageLoader />;
  return <>{children}</>;
}
