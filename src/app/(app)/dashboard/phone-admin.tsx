'use client';

/**
 * Admin / Responsable d'équipe — PHONE rendering (mobile redesign 2026-09-14).
 *
 * Desktop keeps admin-dashboard.tsx's tabs + period strip on the header line;
 * `PageHeader` paints no `actions` below `md`, so the phone gets its own row
 * of scope pills (Direction · Gestionnaires · Chiffreurs · Terrain) bound to
 * the SAME `vue` / `user` / `period` state the desktop owns (URL-synced).
 *
 *   Direction      period pills · KPI line · « Par équipe » · « Qui porte la
 *                  charge » (bars) · « Par compagnie » (rows). The pie
 *                  (décomposition du délai) and the weekly entrées/sorties
 *                  columns are NOT drawn on phones (mobile-synthesis §7); the
 *                  page says so in one caption.
 *   Gestionnaires  the role's phone dashboard team-wide + « Charge par personne »
 *   Chiffreurs     the role's phone dashboard team-wide + « Exceptions » + charge
 *   Terrain        KPI line · « Exceptions » · « Par agent » (initials · open · late)
 *   Person         « Vue : Nom — rôle » banner + that person's phone dashboard
 *                  + three plain lines against the team median (no CompareStrip).
 */

import { useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RECORD_CARD_CLASS } from '@/components/ui/record-card';
import { ScopePills, type ScopePill } from '@/components/ui/scope-pills';
import type { SlaItem } from '../monitoring/metrics';
import type { FunnelDossier, WorkflowLog } from '../monitoring/funnel';
import { DASHBOARD_ROLES, computeTeamView, fmtWindow, lateDossierIds, type DashboardRole, type PersonRow, type TeamView } from './metrics';
import { computeDirectionView, terrainQuality } from './analytics';
import type { DashboardChiffrage, DashboardMission, DashboardUser } from './use-dashboard-data';
import { fmtHours } from './ui';
import { PhoneBarCard, PhoneBarRow, PhoneBlock, PhoneBlockRow, PhoneKpiLine, PhonePersonRow, fmtDaysFr, type PhoneKpi } from './phone-blocks';
import { PhoneChiffreurDashboard, PhoneGestionnaireDashboard, PhoneTerrainDashboard } from './phone-dashboard';

export type PhoneAdminVue = 'direction' | 'gestionnaires' | 'chiffreurs' | 'terrain';
export type PhoneAdminPeriod = 30 | 90 | 365 | 'tout';

const VUE_LABEL: Record<PhoneAdminVue, string> = { direction: 'Direction', gestionnaires: 'Gestionnaires', chiffreurs: 'Chiffreurs', terrain: 'Terrain' };
const VUES: PhoneAdminVue[] = ['direction', 'gestionnaires', 'chiffreurs', 'terrain'];
const VUE_OF_ROLE: Record<DashboardRole, PhoneAdminVue> = { Gestionnaire: 'gestionnaires', Chiffreur: 'chiffreurs', 'Agent de Terrain': 'terrain' };
const ROLE_OF_VUE: Partial<Record<PhoneAdminVue, DashboardRole>> = { gestionnaires: 'Gestionnaire', chiffreurs: 'Chiffreur', terrain: 'Agent de Terrain' };
const PERIODS: readonly PhoneAdminPeriod[] = [30, 90, 365, 'tout'];
const PERIOD_LABEL: Record<PhoneAdminPeriod, string> = { 30: '30 j', 90: '90 j', 365: '12 mois', tout: 'Tout' };
const ROWS = 3;
const BARS = 7;

const nameOf = (u: DashboardUser): string => (u.nom || u.email || u.id).trim();
const pctOf = (v: number | null | undefined): string => (v == null ? '—' : `${v} %`);

export interface PhoneAdminDashboardProps {
  vue: PhoneAdminVue;
  onChangeVue: (v: PhoneAdminVue) => void;
  userId: string | null;
  onSelectUser: (id: string | null) => void;
  period: PhoneAdminPeriod;
  onChangePeriod: (p: PhoneAdminPeriod) => void;
  windowDays: number;
  dossiers: FunnelDossier[];
  chiffrages: DashboardChiffrage[];
  missions: DashboardMission[];
  users: DashboardUser[];
  workflowLogs: WorkflowLog[];
  sla: SlaItem[];
  holidays: ReadonlySet<string>;
  now: Date;
  loading: boolean;
}

export function PhoneAdminDashboard(props: PhoneAdminDashboardProps) {
  const t = useT();
  const { vue, onChangeVue, userId, onSelectUser, dossiers, chiffrages, missions, users, sla, holidays, now, loading } = props;

  const pills: ScopePill[] = VUES.map((v) => ({ key: v, label: t(VUE_LABEL[v]), active: vue === v, onClick: () => onChangeVue(v), dataTour: `dash-tab-${v}` }));

  const role = ROLE_OF_VUE[vue] ?? null;
  const team = useMemo(
    () => (role ? computeTeamView(role, users, { dossiers, chiffrages, missions, sla, holidays }, now) : null),
    [role, users, dossiers, chiffrages, missions, sla, holidays, now],
  );
  const selected = role && team && userId ? team.perPerson.find((r) => r.user.id === userId) ?? null : null;

  return (
    <div className="flex flex-col gap-2">
      <ScopePills pills={pills} sticky ariaLabel={t('Vue')} dataTour="dash-tabs" />

      {vue === 'direction' && <PhoneDirection {...props} />}

      {role && team && selected && (
        <PhonePersonView role={role} row={selected} team={team} onBack={() => onSelectUser(null)} {...props} />
      )}

      {role && team && !selected && vue === 'gestionnaires' && (
        <>
          <PhoneGestionnaireDashboard dossiers={dossiers} chiffrages={chiffrages} sla={sla} rappelsRecus={[]} holidays={holidays} now={now} person={null} loading={loading} viewAs />
          <PhoneCharge team={team} onSelectUser={onSelectUser} />
        </>
      )}

      {role && team && !selected && vue === 'chiffreurs' && (
        <>
          <PhoneChiffreurDashboard chiffrages={chiffrages} dossiers={dossiers} holidays={holidays} now={now} person={null} loading={loading} />
          <PhoneExceptions team={team} moreHref="/assignations-chiffrage" loading={loading} />
          <PhoneCharge team={team} onSelectUser={onSelectUser} />
        </>
      )}

      {role && team && !selected && vue === 'terrain' && <PhoneTerrainDirection team={team} {...props} />}
    </div>
  );
}

// ── Direction ───────────────────────────────────────────────────────────────

function PhoneDirection({ dossiers, chiffrages, missions, workflowLogs, users, sla, holidays, now, loading, windowDays, period, onChangePeriod, onChangeVue }: PhoneAdminDashboardProps) {
  const t = useT();
  const view = useMemo(
    () => computeDirectionView({ dossiers, chiffrages, missions, workflowLogs, sla, holidays }, now, windowDays),
    [dossiers, chiffrages, missions, workflowLogs, sla, holidays, now, windowDays],
  );
  const lateNow = useMemo(() => lateDossierIds(sla).size, [sla]);
  const teams = useMemo(
    () => DASHBOARD_ROLES.map((role) => ({ role, view: computeTeamView(role, users, { dossiers, chiffrages, missions, sla, holidays }, now) })),
    [users, dossiers, chiffrages, missions, sla, holidays, now],
  );
  const charge = teams.find((x) => x.role === 'Gestionnaire')?.view ?? null;
  const win = fmtWindow(now, windowDays);

  const periodPills: ScopePill[] = PERIODS.map((p) => ({ key: String(p), label: t(PERIOD_LABEL[p]), active: period === p, onClick: () => onChangePeriod(p) }));

  const kpis: PhoneKpi[] = [
    { key: 'lead', value: fmtDaysFr(view.lead.requeteRapport.p50), label: t('délai médian requête → rapport') },
    { key: 'sla', value: pctOf(view.slaOnTime.pct), label: t('traitées en 24 h ouvrées') },
    { key: 'late', value: lateNow, label: t('en retard maintenant'), danger: lateNow > 0 },
    { key: 'open', value: view.enCours, label: t('en cours'), href: '/dossiers' },
    { key: 'closing', value: view.closing == null ? '—' : view.closing.toFixed(2).replace('.', ','), label: t('clôturé par entrée') },
    { key: 'f48', value: pctOf(view.facture48.pct), label: t('facture → rapport en 48 h') },
  ];

  const chargeMax = Math.max(1, ...(charge?.perPerson.map((p) => p.enCours) ?? [0]));

  return (
    <>
      <ScopePills pills={periodPills} flush={false} ariaLabel={t('Période')} className="-mx-4" />
      <PhoneKpiLine items={kpis} className="pt-0" />
      <p className="px-0.5 text-[12px] leading-4 text-ink-3">{win}</p>

      <PhoneBlock title={t('Par équipe')} caption={`${t('en cours')} · ${t('en retard')}`} loading={loading}>
        {teams.map(({ role, view: tv }) => (
          <li key={role} className="border-t border-hairline">
            <button
              type="button"
              onClick={() => onChangeVue(VUE_OF_ROLE[role])}
              className="flex min-h-[48px] w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-[14px] transition-colors active:bg-surface-2/60 focus-visible:outline-none focus-visible:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{t(role)}</span>
                <span className="block text-[12px] leading-4 text-ink-3">
                  {tv.tiles.third} {t(tv.tiles.thirdLabel).toLowerCase()} · {tv.tiles.termines7} {t('terminés')} / 7 j
                </span>
              </span>
              <span className="min-w-[28px] text-right text-[13px] font-semibold tabular-nums text-ink">{tv.tiles.enCours}</span>
              <span className={cn('min-w-[28px] text-right text-[13px] font-semibold tabular-nums', tv.tiles.enRetard > 0 ? 'text-status-danger-fg' : 'text-ink-4')}>{tv.tiles.enRetard}</span>
              <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-ink-4" aria-hidden />
            </button>
          </li>
        ))}
      </PhoneBlock>

      {charge && charge.perPerson.length > 0 && (
        <PhoneBarCard title={t('Qui porte la charge')} caption={`${t('Éléments ouverts par gestionnaire')} · ${t('en rouge, en retard')}`}>
          {charge.perPerson.slice(0, BARS).map((p) => (
            <PhoneBarRow key={p.user.id} label={nameOf(p.user)} value={p.enCours} frac={p.enCours / chargeMax} late={Math.min(p.enRetard, p.enCours)} />
          ))}
        </PhoneBarCard>
      )}

      <PhoneBlock title={t('Par compagnie')} caption={`${t('entrées')} · ${t('délai médian')} · ${win}`} moreHref="/compagnies" moreLabel={t('Compagnies')} loading={loading} emptyText={t('Pas encore de dossier terminé sur la période')}>
        {view.compagnies.slice(0, 5).map((c) => (
          <li key={c.key} className="flex min-h-[44px] items-center gap-2.5 border-t border-hairline px-3.5 py-1 text-[14px]">
            <span className="min-w-0 flex-1 truncate text-ink">{c.label}</span>
            <span className="min-w-[28px] text-right text-[13px] tabular-nums text-ink-2">{c.volume}</span>
            <span className="min-w-[44px] text-right text-[13px] font-semibold tabular-nums text-ink">{fmtDaysFr(c.delaiP50)}</span>
            <span className={cn('min-w-[40px] text-right text-[13px] tabular-nums', c.slaOnTime.pct != null && c.slaOnTime.pct < 90 ? 'font-semibold text-status-danger-fg' : 'text-ink-2')}>{pctOf(c.slaOnTime.pct)}</span>
          </li>
        ))}
      </PhoneBlock>

      <p className="px-0.5 pb-2 text-[12px] leading-4 text-ink-3">{t('La décomposition du délai par étape et les entrées / sorties par semaine se lisent sur grand écran.')}</p>
    </>
  );
}

// ── Team pieces ─────────────────────────────────────────────────────────────

function PhoneExceptions({ team, moreHref, loading }: { team: TeamView; moreHref: string; loading: boolean }) {
  const t = useT();
  return (
    <PhoneBlock
      title={t('Exceptions')}
      count={team.exceptions.length}
      countTone="danger"
      caption={t('Ce qui est en retard maintenant, les plus anciens en premier')}
      moreHref={team.exceptions.length > ROWS ? moreHref : undefined}
      emptyText={t('Rien en retard dans cette équipe.')}
      loading={loading}
      dataTour="dash-exceptions"
    >
      {team.exceptions.slice(0, ROWS).map((e) => (
        <PhoneBlockRow
          key={e.id}
          href={e.href}
          id={(e.dossier as any)?.refExpert || e.dossierId}
          who={[e.owner, t(e.label), e.round ? `${e.round}ᵉ ${t('accord')}` : null, e.detail ? t(e.detail) : null].filter(Boolean).join(' · ')}
          time={fmtHours(e.ageHours)}
          timeTone="danger"
        />
      ))}
    </PhoneBlock>
  );
}

function PhoneCharge({ team, onSelectUser }: { team: TeamView; onSelectUser: (id: string) => void }) {
  const t = useT();
  const max = Math.max(1, ...team.perPerson.map((p) => p.enCours));
  if (team.perPerson.length === 0) return null;
  return (
    <PhoneBarCard title={t('Charge par personne')} caption={`${t('Éléments ouverts · le second chiffre est en retard')} · ${t('toucher pour voir la personne')}`} dataTour="dash-charge">
      {team.perPerson.slice(0, BARS).map((p) => (
        <PhoneBarRow key={p.user.id} label={nameOf(p.user)} value={p.enCours} frac={p.enCours / max} late={p.enRetard} onClick={() => onSelectUser(p.user.id)} ariaLabel={`${nameOf(p.user)} · ${p.enCours} ${t('en cours')} · ${p.enRetard} ${t('en retard')}`} />
      ))}
    </PhoneBarCard>
  );
}

function PhoneTerrainDirection({ team, onSelectUser, missions, dossiers, holidays, now, loading, windowDays }: PhoneAdminDashboardProps & { team: TeamView }) {
  const t = useT();
  const quality = useMemo(() => terrainQuality(missions, dossiers, holidays, now, windowDays), [missions, dossiers, holidays, now, windowDays]);
  const kpis: PhoneKpi[] = [
    { key: 'open', value: team.tiles.enCours, label: t('missions ouvertes'), href: '/assignations-atg' },
    { key: 'late', value: team.tiles.enRetard, label: t('en retard'), danger: team.tiles.enRetard > 0 },
    { key: 'third', value: team.tiles.third, label: t(team.tiles.thirdLabel).toLowerCase(), danger: team.tiles.third > 0 },
    { key: 'done', value: team.tiles.termines7, label: `${t('faites')} / 7 j` },
    { key: 'q', value: pctOf(quality.visiteJourRdv.pct), label: t('visites le jour du RDV') },
  ];
  return (
    <>
      <PhoneKpiLine items={kpis} />
      <PhoneExceptions team={team} moreHref="/assignations-atg" loading={loading} />
      <PhoneBlock title={t('Par agent')} caption={`${t('ouvertes')} · ${t('en retard')}`} emptyText={t('Aucun utilisateur actif avec ce rôle.')} loading={loading} dataTour="dash-par-personne">
        {team.perPerson.map((r) => (
          <PhonePersonRow key={r.user.id} name={nameOf(r.user)} open={r.enCours} late={r.enRetard} onClick={() => onSelectUser(r.user.id)} ariaLabel={`${nameOf(r.user)} · ${t('Ouvrir la fiche de cet agent')}`} />
        ))}
      </PhoneBlock>
    </>
  );
}

// ── Person view (« view as ») ───────────────────────────────────────────────

function PhonePersonView({ role, row, team, onBack, dossiers, chiffrages, missions, sla, holidays, now, loading }: PhoneAdminDashboardProps & { role: DashboardRole; row: PersonRow; team: TeamView; onBack: () => void }) {
  const t = useT();
  const user = row.user;
  const person = useMemo(() => ({ uid: user.id, nom: user.nom, email: user.email }), [user.id, user.nom, user.email]);
  const med = (s: { med: number } | null | undefined) => (s ? s.med : null);
  const line = (label: string, value: number | null, m: number | null, unit = '') => (
    <li key={label} className="flex min-h-[40px] items-center gap-2.5 border-t border-hairline px-3.5 text-[13px]">
      <span className="min-w-0 flex-1 text-ink-2">{label}</span>
      <span className="font-semibold tabular-nums text-ink">{value == null ? '—' : `${value}${unit}`}</span>
      <span className="min-w-[88px] text-right tabular-nums text-ink-3">
        {t('médiane')} {m == null ? '—' : `${m}${unit}`}
      </span>
    </li>
  );
  return (
    <>
      <div className={cn(RECORD_CARD_CLASS, 'flex items-center gap-2 px-3.5 py-2')} data-tour="dash-view-as">
        <p className="min-w-0 flex-1 text-[13px] text-ink">
          <span className="text-ink-3">{t('Vue')} : </span>
          <span className="font-semibold">{nameOf(user)}</span>
          <span className="text-ink-3"> — {t(role)}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t('Équipe')}
        </Button>
      </div>

      {role === 'Gestionnaire' && <PhoneGestionnaireDashboard dossiers={dossiers} chiffrages={chiffrages} sla={sla} rappelsRecus={[]} holidays={holidays} now={now} person={person} loading={loading} viewAs />}
      {role === 'Chiffreur' && <PhoneChiffreurDashboard chiffrages={chiffrages} dossiers={dossiers} holidays={holidays} now={now} person={person} loading={loading} />}
      {role === 'Agent de Terrain' && <PhoneTerrainDashboard missions={missions} dossiers={dossiers} holidays={holidays} now={now} person={person} loading={loading} />}

      <PhoneBlock title={t('Contexte de charge')} caption={`${row.recus30} ${t('reçus')} · ${fmtWindow(now, 30)} · ${t('comparé à la médiane de l’équipe, jamais à un classement')}`} dataTour="dash-contexte">
        {line(t('En cours'), row.enCours, med(team.stats.enCours))}
        {line(`${t('Terminés')} · 7 j`, row.termines7, med(team.stats.termines7))}
        {line(`${t('Dans les délais')} · 30 j`, row.dansDelais30, med(team.stats.dansDelais30), ' %')}
      </PhoneBlock>
    </>
  );
}
