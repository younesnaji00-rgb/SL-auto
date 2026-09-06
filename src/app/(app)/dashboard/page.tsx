'use client';

/**
 * Tableau de bord — one dashboard per role (owner 2026-09-06).
 *
 *   Gestionnaire · Chiffreur · Agent de Terrain → their own operational view
 *   (docs/research/dashboard-*.md: work-item age against the SLA, WIP, the
 *   smallest actionable set first, self-referenced figures only).
 *   Admin · Responsable d'équipe → three tabs (one per role) summarising the
 *   team, with a per-user toggle that shows that person's dashboard unchanged.
 *
 * The page carries no period selector: every caption prints its own window
 * (« 30 août – 6 sept. », « maintenant »), and a freshness stamp says the
 * figures are live. Analytical views (funnel, cycle time, trends, compagnie
 * split) live on Suivi d'équipe.
 */

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { useT } from '@/i18n';
import { useCurrentUser } from '@/hooks/use-current-user';
import { landingPathFor } from '@/lib/role-landing';
import { useDashboardData } from './use-dashboard-data';
import { buildDashboardSla } from './metrics';
import { Freshness } from './ui';
import { GestionnaireDashboard } from './gestionnaire-dashboard';
import { ChiffreurDashboard } from './chiffreur-dashboard';
import { TerrainDashboard } from './terrain-dashboard';
import { AdminDashboard } from './admin-dashboard';

const ADMIN_ROLES = ['Admin', "Responsable d'équipe"];
const PERSONAL_ROLES = ['Gestionnaire', 'Chiffreur', 'Agent de Terrain'];

export default function DashboardPage() {
  const t = useT();
  const { profile, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const role = profile?.role;
  const isAllowed = !!role && (ADMIN_ROLES.includes(role) || PERSONAL_ROLES.includes(role));

  useEffect(() => {
    if (userLoading || !role || isAllowed) return;
    router.replace(landingPathFor(role));
  }, [userLoading, role, isAllowed, router]);

  if (userLoading || !role || !isAllowed) {
    return <div className="py-12 text-sm text-muted-foreground">{t('Chargement...')}</div>;
  }
  return <DashboardInner role={role} />;
}

function DashboardInner({ role }: { role: string }) {
  const t = useT();
  const { profile } = useCurrentUser();
  const isAdmin = ADMIN_ROLES.includes(role);
  // The workflow logs are the Direction view's « touches par dossier » — admin only.
  const data = useDashboardData({ withUsers: isAdmin, withWorkflow: isAdmin, withRappels: role === 'Gestionnaire' });
  const { dossiers, chiffrages, missions, holidays, loading } = data;

  // One "now" per data change so every « maintenant » figure agrees.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [dossiers, chiffrages, missions]);
  const sla = useMemo(() => buildDashboardSla(dossiers, chiffrages, missions, holidays, now), [dossiers, chiffrages, missions, holidays, now]);
  const person = useMemo(
    () => (profile ? { uid: profile.uid, nom: profile.nom, email: profile.email } : null),
    [profile],
  );

  const subtitle = isAdmin
    ? t("L'équipe par rôle, maintenant — et chaque personne telle qu'elle se voit.")
    : role === 'Chiffreur'
      ? t('Votre file, vos délais — telle que la file la découpe.')
      : role === 'Agent de Terrain'
        ? t('Où être ensuite, ce qui est en retard, les photos qui manquent.')
        : t('Ce qui vous attend, ce qui attend un tiers, ce qui n’a pas bougé.');

  return (
    <div className="flex-1 space-y-6">
      <PageHeader title={t('Tableau de bord')} subtitle={subtitle} size="compact" meta={<Freshness at={data.updatedAt} />} />
      {isAdmin && (
        <AdminDashboard
          dossiers={dossiers}
          chiffrages={chiffrages}
          missions={missions}
          users={data.users}
          workflowLogs={data.workflowLogs}
          sla={sla}
          holidays={holidays}
          now={now}
          loading={loading}
        />
      )}
      {role === 'Gestionnaire' && (
        <GestionnaireDashboard dossiers={dossiers} chiffrages={chiffrages} sla={sla} rappelsRecus={data.rappelsRecus} holidays={holidays} now={now} person={person} loading={loading} />
      )}
      {role === 'Chiffreur' && <ChiffreurDashboard chiffrages={chiffrages} dossiers={dossiers} holidays={holidays} now={now} person={person} loading={loading} />}
      {role === 'Agent de Terrain' && <TerrainDashboard missions={missions} dossiers={dossiers} holidays={holidays} now={now} person={person} loading={loading} />}
    </div>
  );
}
