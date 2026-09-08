'use client';

/**
 * Admin / Responsable d'équipe — three tabs (one per role) with the SAME
 * block skeleton as that role's personal dashboard, aggregated, and a
 * per-user toggle that swaps the page for that person's own dashboard
 * unchanged (Salesforce « view as » running-user pattern), followed by a
 * « Contexte de charge » row comparing the person to the team MEDIAN and its
 * interquartile band — never a rank (theory C4 · role-based C2 · elements B6).
 *
 * The tab and the selected user live in the URL (`?vue=…&user=…`).
 */

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useTabSlopeMorphRef } from '@/hooks/use-tab-morph';
import { Building2, Calculator, ChevronLeft, LineChart, UserCheck, Users } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SlaItem } from '../monitoring/metrics';
import type { FunnelDossier, WorkflowLog } from '../monitoring/funnel';
import { DASHBOARD_ROLES, computeTeamView, fmtWindow, toDate, type DashboardRole, type PersonRow, type TeamView } from './metrics';
import type { DashboardChiffrage, DashboardMission, DashboardUser } from './use-dashboard-data';
import { BarList, Block, CompareStrip, Delta, DoneLine, StatTile, WorkRow, fmtHours } from './ui';
import { GestionnaireDashboard } from './gestionnaire-dashboard';
import { ChiffreurDashboard } from './chiffreur-dashboard';
import { TerrainDashboard } from './terrain-dashboard';
import { TerrainDirection } from './terrain-direction';
import { DirectionDashboardV2 } from './direction-dashboard-v2';

/** Period choices shared by the header strip; « tout » spans the whole history. */
type Period = 30 | 90 | 365 | 'tout';
const PERIODS: readonly Period[] = [30, 90, 365, 'tout'];
const PERIOD_LABEL: Record<Period, string> = { 30: '30 j', 90: '90 j', 365: '12 mois', tout: 'Tout' };
const TOUT_FALLBACK_DAYS = 365;

const EXCEPTIONS_CAP = 10;
const ALL_TEAM = '__team__';

/**
 * « Direction » is first because a director opens on the outcome and peels
 * back to the teams (demo-impact C1.1: do the last thing first); the three
 * role tabs keep the operating view unchanged behind it.
 */
type Vue = 'direction' | 'gestionnaires' | 'chiffreurs' | 'terrain';
const VUE_OF_ROLE: Record<DashboardRole, Vue> = { Gestionnaire: 'gestionnaires', Chiffreur: 'chiffreurs', 'Agent de Terrain': 'terrain' };
const TAB_LABEL: Record<Vue, string> = { direction: 'Direction', gestionnaires: 'Gestionnaires', chiffreurs: 'Chiffreurs', terrain: 'Terrain' };
const TAB_ICON: Record<Vue, React.ElementType> = { direction: LineChart, gestionnaires: Building2, chiffreurs: Calculator, terrain: UserCheck };
const VUES: Vue[] = ['direction', 'gestionnaires', 'chiffreurs', 'terrain'];

/** Vocabulary of the per-role tiles and columns (same measures, role words). */
const WORDS: Record<DashboardRole, { enCours: string; enCoursCaption: string; termines: string; sla: string; queueHref: string }> = {
  Gestionnaire: { enCours: 'Dossiers ouverts', enCoursCaption: 'sans rapport déposé', termines: 'Rapports déposés', sla: 'Ouverture ≤ 24 h', queueHref: '/dossiers' },
  Chiffreur: { enCours: 'Chiffrages en attente', enCoursCaption: 'assignés, non terminés', termines: 'Chiffrages terminés', sla: 'Chiffrage ≤ 24 h', queueHref: '/assignations-chiffrage' },
  'Agent de Terrain': { enCours: 'Missions ouvertes', enCoursCaption: 'sans photos', termines: 'Missions faites', sla: 'Photos ≤ 24 h', queueHref: '/assignations-atg' },
};

const nameOf = (u: DashboardUser): string => (u.nom || u.email || u.id).trim();

export interface AdminDashboardProps {
  dossiers: FunnelDossier[];
  chiffrages: DashboardChiffrage[];
  missions: DashboardMission[];
  users: DashboardUser[];
  /** Per-dossier audit entries — the Direction view's « touches par dossier ». */
  workflowLogs: WorkflowLog[];
  sla: SlaItem[];
  holidays: ReadonlySet<string>;
  now: Date;
  loading: boolean;
  /** Last listener tick — the « En direct » stamp on the header line. */
  updatedAt?: Date | null;
}

export function AdminDashboard(props: AdminDashboardProps) {
  const t = useT();
  const [vue, setVue] = useState<Vue>('direction');
  const [userId, setUserId] = useState<string | null>(null);
  // The period lives HERE, not inside the Direction view: 5a puts the strip on
  // the header line beside the role tabs, and that line belongs to this shell.
  const [period, setPeriod] = useState<Period>('tout');
  const periodRef = useTabSlopeMorphRef();

  /**
   * « Tout » as a real number of days — the span back to the oldest dossier —
   * rather than a sentinel like 36500, so `fmtWindow` prints a true first date
   * instead of a fabricated one in the 1920s.
   */
  const toutDays = useMemo(() => {
    let oldest: number | null = null;
    for (const d of props.dossiers) {
      const c = toDate(d.createdAt)?.getTime();
      if (c != null && (oldest == null || c < oldest)) oldest = c;
    }
    if (oldest == null) return TOUT_FALLBACK_DAYS;
    return Math.max(1, Math.ceil((props.now.getTime() - oldest) / 86_400_000) + 1);
  }, [props.dossiers, props.now]);
  const windowDays = period === 'tout' ? toutDays : period;

  // URL ↔ state (NN/g tabs: the selected tab is addressable; a person's view can be linked).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get('vue');
    if (v && (VUES as string[]).includes(v)) setVue(v as Vue);
    const u = sp.get('user');
    if (u) setUserId(u);
  }, []);
  const sync = (nextVue: Vue, nextUser: string | null) => {
    const url = new URL(window.location.href);
    if (nextVue === 'direction') url.searchParams.delete('vue');
    else url.searchParams.set('vue', nextVue);
    if (nextUser) url.searchParams.set('user', nextUser);
    else url.searchParams.delete('user');
    window.history.replaceState(window.history.state, '', url);
  };
  const changeVue = (v: Vue) => {
    setVue(v);
    setUserId(null);
    sync(v, null);
  };
  const changeUser = (u: string | null) => {
    setUserId(u);
    sync(vue, u);
  };

  const tabsList = (
    /* Phone: the tab row is the page's own sticky row under the 48 px bar,
       full width and scrollable if the labels overflow (mobile pass). */
    <TabsList data-tour="dash-tabs" className="max-md:sticky max-md:top-0 max-md:z-20 max-md:-mx-4 max-md:w-[calc(100%+2rem)] max-md:justify-start max-md:overflow-x-auto max-md:rounded-none max-md:px-4 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
      {VUES.map((v) => {
        const Icon = TAB_ICON[v];
        return (
          <TabsTrigger key={v} value={v} data-tour={`dash-tab-${v}`} className="gap-2">
            <Icon className="h-4 w-4" aria-hidden />
            {t(TAB_LABEL[v])}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );

  /* Same tab idiom as the row beside it — one control language on the line. */
  const periodStrip = (
    <div
      ref={periodRef}
      role="tablist"
      aria-label={t('Période')}
      className="relative isolate inline-flex h-10 items-end gap-4 rounded-lg border border-hairline bg-surface-2 px-2 pt-1 text-ink-2"
    >
      {PERIODS.map((p) => {
        const active = period === p;
        return (
          <button
            key={String(p)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setPeriod(p)}
            className={cn(
              'tab-slope inline-flex h-[34px] items-center justify-center whitespace-nowrap px-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              active && 'font-semibold text-ink',
            )}
          >
            {t(PERIOD_LABEL[p])}
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-3 bottom-[3px] h-0.5 rounded-full bg-primary transition-opacity',
                active ? 'opacity-100' : 'opacity-0',
              )}
            />
            <span className="tab-feet" aria-hidden />
          </button>
        );
      })}
    </div>
  );

  return (
    <Tabs value={vue} onValueChange={(v) => changeVue(v as Vue)} className="space-y-6">
      {/* ONE header line (owner 2026-09-08, layout 5a): the title alone on the
          left, role tabs + period strip on the right. Nothing sits beside the
          title any more — the freshness stamp and the window were there, and
          every block already prints its own window in its caption. */}
      <PageHeader
        title={t('Tableau de bord')}
        size="compact"
        actions={
          <>
            {tabsList}
            {periodStrip}
          </>
        }
      />
      <TabsContent value="direction" className="space-y-6">
        <DirectionDashboardV2
          dossiers={props.dossiers}
          chiffrages={props.chiffrages}
          missions={props.missions}
          workflowLogs={props.workflowLogs}
          users={props.users}
          sla={props.sla}
          holidays={props.holidays}
          now={props.now}
          loading={props.loading}
          windowDays={windowDays}
          onOpenTeam={(role) => changeVue(VUE_OF_ROLE[role])}
        />
      </TabsContent>
      {DASHBOARD_ROLES.map((role) => (
        <TabsContent key={role} value={VUE_OF_ROLE[role]} className="space-y-6">
          <RoleTab role={role} userId={userId} onSelectUser={changeUser} windowDays={windowDays} {...props} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function RoleTab({
  role,
  userId,
  onSelectUser,
  windowDays,
  dossiers,
  chiffrages,
  missions,
  users,
  sla,
  holidays,
  now,
  loading,
}: AdminDashboardProps & { role: DashboardRole; userId: string | null; onSelectUser: (u: string | null) => void; windowDays: number }) {
  const t = useT();
  const team = useMemo(() => computeTeamView(role, users, { dossiers, chiffrages, missions, sla, holidays }, now), [role, users, dossiers, chiffrages, missions, sla, holidays, now]);
  const teamUsers = useMemo(() => team.perPerson.map((r) => r.user), [team]);
  const selected = userId ? teamUsers.find((u) => u.id === userId) ?? null : null;
  const words = WORDS[role];
  const week = fmtWindow(now, 7);

  return (
    <>
      {/*
        Selector — « Voir : Toute l'équipe ▾ », only users of this role.
        Hidden on Terrain: 5d has no selector row, because a row of the
        per-agent table is itself the way into one agent, and the count now
        prints on the header line. The « Retour à l'équipe » button inside
        the person view is still the way back.
      */}
      <div className={cn('flex flex-wrap items-center justify-end gap-3', role === 'Agent de Terrain' && !selected && 'hidden')}>
        <div className="flex items-center gap-2" data-tour="dash-user-select">
          <label className="t-label whitespace-nowrap">{t('Voir')}</label>
          <Select value={selected?.id ?? ALL_TEAM} onValueChange={(v) => onSelectUser(v === ALL_TEAM ? null : v)}>
            <SelectTrigger className="h-9 w-60 max-md:h-12 max-md:w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TEAM}>{t("Toute l'équipe")}</SelectItem>
              {teamUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {nameOf(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selected ? (
        <PersonView role={role} user={selected} team={team} onBack={() => onSelectUser(null)} dossiers={dossiers} chiffrages={chiffrages} missions={missions} sla={sla} holidays={holidays} now={now} loading={loading} />
      ) : (
        <>
          {/*
            Row 1 — for Gestionnaire this IS the redesigned role page (layout
            5b), read team-wide: `person={null}` makes computeGestionnaireView
            keep every dossier instead of one owner's, so the same blocks
            summarise the whole team. Owner 2026-09-08: the admin has to see
            the new page on this tab, not only after drilling into a person.
            It replaces the generic tile row rather than sitting above it —
            5b carries its own richer tiles, and two `dash-tiles` anchors on
            one screen would break the tour. The other roles are unchanged.
          */}
          {role === 'Gestionnaire' ? (
            <GestionnaireDashboard
              dossiers={dossiers}
              chiffrages={chiffrages}
              sla={sla}
              rappelsRecus={[]}
              holidays={holidays}
              now={now}
              person={null}
              loading={loading}
              viewAs
              users={users}
            />
          ) : role === 'Chiffreur' ? (
            /* 5c, read team-wide: `person={null}` keeps every assignment. */
            <ChiffreurDashboard
              chiffrages={chiffrages}
              dossiers={dossiers}
              holidays={holidays}
              now={now}
              person={null}
              loading={loading}
            />
          ) : role === 'Agent de Terrain' ? (
            /* 5d is itself a direction view — it replaces the whole generic
               team branch (tiles, exceptions, charge, « Par personne »)
               rather than sitting beside it. */
            <TerrainDirection
              windowDays={windowDays}
              team={team}
              missions={missions}
              dossiers={dossiers}
              holidays={holidays}
              now={now}
              loading={loading}
              onSelectUser={onSelectUser}
            />
          ) : (
          <div data-tour="dash-tiles" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile label={t(words.enCours)} value={team.tiles.enCours} loading={loading} caption={<span>{t(words.enCoursCaption)} · {t('maintenant')}</span>} href={words.queueHref} />
            <StatTile label={t('En retard')} value={team.tiles.enRetard} danger={team.tiles.enRetard > 0} loading={loading} caption={<span>{t('au-delà de 24 h ouvrées')} · {t('maintenant')}</span>} />
            <StatTile
              label={t(team.tiles.thirdLabel)}
              value={team.tiles.third}
              danger={team.tiles.third > 0}
              loading={loading}
              caption={<span>{team.tiles.thirdLabel === 'Non assignés' ? t('arrivés, pas encore pris') : t('plus de 2 j ouvrés sans action')} · {t('maintenant')}</span>}
            />
            <StatTile
              label={t(words.termines)}
              value={team.tiles.termines7}
              loading={loading}
              caption={
                <>
                  <span>{week}</span>
                  <span className="text-ink-4">·</span>
                  <Delta cur={team.tiles.termines7} prev={team.tiles.termines7Prev} suffix={t('vs 7 j préc.')} />
                </>
              }
            />
          </div>
          )}

          {/* Rows 2–3 — skipped for Terrain (5d already carries the exceptions
              and the per-agent table) and for Gestionnaire (5b now carries
              « Charge par personne », and the owner dropped the exceptions and
              the « Par personne » table from that tab, 2026-09-08). Rendering
              them again would print the same lists twice under one tab. */}
          {role === 'Chiffreur' && (
            <>
          {/* Row 2 — exceptions (who needs support now) + load per person. */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Block
              title={t('Exceptions')}
              count={team.exceptions.length}
              countDanger
              caption={t('Ce qui est en retard maintenant, les plus anciens en premier')}
              moreHref={team.exceptions.length > EXCEPTIONS_CAP ? words.queueHref : undefined}
              moreLabel={`${t('Voir les')} ${Math.max(0, team.exceptions.length - EXCEPTIONS_CAP)} ${t('autres')}`}
              dataTour="dash-exceptions"
              className="lg:col-span-2"
            >
              {loading ? (
                <div className="space-y-3 px-5 py-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-5 animate-pulse rounded bg-surface-2" />
                  ))}
                </div>
              ) : team.exceptions.length === 0 ? (
                <DoneLine title={t('Rien en retard dans cette équipe.')} />
              ) : (
                team.exceptions.slice(0, EXCEPTIONS_CAP).map((e) => (
                  <WorkRow
                    key={e.id}
                    href={e.href}
                    id={(e.dossier as any)?.refExpert || e.dossierId}
                    who={e.owner}
                    label={[t(e.label), e.round ? `${e.round}ᵉ ${t('accord')}` : null, e.detail ? t(e.detail) : null].filter(Boolean).join(' · ')}
                    time={fmtHours(e.ageHours)}
                    timeTone="danger"
                  />
                ))
              )}
            </Block>
            <Block title={t('Charge par personne')} caption={t('Éléments ouverts · le second chiffre est en retard · cliquer pour voir la personne')} dataTour="dash-charge">
              {team.perPerson.length === 0 ? (
                <DoneLine title={t('Aucun utilisateur actif avec ce rôle.')} />
              ) : (
                <BarList
                  rows={team.perPerson.map((r) => ({ key: r.user.id, label: nameOf(r.user), value: r.enCours, late: r.enRetard, onClick: () => onSelectUser(r.user.id) }))}
                  labelWidth="w-28"
                />
              )}
            </Block>
          </div>

          {/* Row 3 — the comparison table, with the team median as its last row. */}
          <Block title={t('Par personne')} caption={t('Mêmes définitions que le tableau de bord de chacun · ligne « Médiane équipe » pour situer')} dataTour="dash-par-personne" bodyClassName="pb-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Nom')}</TableHead>
                    <TableHead className="text-right">{t('En cours')}</TableHead>
                    <TableHead className="text-right">{t('Plus ancien')}</TableHead>
                    <TableHead className="text-right">{t('En retard')}</TableHead>
                    <TableHead className="text-right">{t('Terminés · 7 j')}</TableHead>
                    <TableHead className="text-right">{t(words.sla)} · 30 j</TableHead>
                    <TableHead className="text-right">{t('Reçus · 30 j')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.perPerson.map((r) => (
                    <TableRow key={r.user.id} className="cursor-pointer" onClick={() => onSelectUser(r.user.id)}>
                      <TableCell className="font-medium text-ink">{nameOf(r.user)}</TableCell>
                      <TableCell className="text-right">{r.enCours}</TableCell>
                      <TableCell className="text-right text-ink-2">{fmtHours(r.plusAncienHours)}</TableCell>
                      <TableCell className={cn('text-right', r.enRetard > 0 ? 'font-medium text-status-danger-fg' : 'text-ink-4')}>{r.enRetard}</TableCell>
                      <TableCell className="text-right">{r.termines7}</TableCell>
                      <TableCell className="text-right">{r.dansDelais30 == null ? <span className="text-ink-4">—</span> : `${r.dansDelais30} %`}</TableCell>
                      <TableCell className="text-right text-ink-2">{r.recus30}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-surface-2 hover:bg-surface-2">
                    <TableCell className="font-medium text-ink-2">{t('Médiane équipe')}</TableCell>
                    <TableCell className="text-right text-ink-2">{team.stats.enCours?.med ?? '—'}</TableCell>
                    <TableCell className="text-right text-ink-4">—</TableCell>
                    <TableCell className="text-right text-ink-2">{team.stats.enRetard?.med ?? '—'}</TableCell>
                    <TableCell className="text-right text-ink-2">{team.stats.termines7?.med ?? '—'}</TableCell>
                    <TableCell className="text-right text-ink-2">{team.stats.dansDelais30?.med == null ? '—' : `${team.stats.dansDelais30.med} %`}</TableCell>
                    <TableCell className="text-right text-ink-4">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Block>
            </>
          )}
        </>
      )}
    </>
  );
}

function PersonView({
  role,
  user,
  team,
  onBack,
  dossiers,
  chiffrages,
  missions,
  sla,
  holidays,
  now,
  loading,
}: Omit<AdminDashboardProps, 'users' | 'workflowLogs'> & { role: DashboardRole; user: DashboardUser; team: TeamView; onBack: () => void }) {
  const t = useT();
  const person = { uid: user.id, nom: user.nom, email: user.email };
  const row: PersonRow | undefined = team.perPerson.find((r) => r.user.id === user.id);
  const words = WORDS[role];

  return (
    <div className="space-y-6">
      {/* Persistent banner: whose data this is (running-user pattern). */}
      <div data-tour="dash-view-as" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-2.5">
        <p className="text-sm text-ink">
          <span className="t-label">{t('Vue')} : </span>
          <span className="font-semibold">{nameOf(user)}</span>
          <span className="text-ink-3"> — {t(role)}</span>
          <span className="t-caption ml-2">{t('exactement ce que cette personne voit sur son tableau de bord')}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
          {t("Retour à l'équipe")}
        </Button>
      </div>

      {role === 'Gestionnaire' && (
        <GestionnaireDashboard dossiers={dossiers} chiffrages={chiffrages} sla={sla} rappelsRecus={[]} holidays={holidays} now={now} person={person} loading={loading} viewAs />
      )}
      {role === 'Chiffreur' && <ChiffreurDashboard chiffrages={chiffrages} dossiers={dossiers} holidays={holidays} now={now} person={person} loading={loading} />}
      {role === 'Agent de Terrain' && <TerrainDashboard missions={missions} dossiers={dossiers} holidays={holidays} now={now} person={person} loading={loading} />}

      {/* Contexte de charge — the denominator next to every rate, and the person vs the team median + IQR band. */}
      <Card className="p-5" data-tour="dash-contexte">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-ink-3" aria-hidden />
          <h2 className="t-heading">{t('Contexte de charge')}</h2>
        </div>
        <p className="t-caption mt-0.5">{t('Un taux se lit avec son volume · la comparaison est à la médiane de l’équipe, jamais à un classement')}</p>
        {row && (
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            <div>
              <p className="t-label">{t('Reçus')} · {fmtWindow(now, 30)}</p>
              <p className="mt-1 text-2xl font-semibold leading-tight text-ink">{row.recus30}</p>
              {row.mix.length > 0 && (
                <p className="t-caption mt-1 tabular-nums">{row.mix.map((m) => `${m.count} ${t(m.label)}`).join(' · ')}</p>
              )}
            </div>
            <div className="space-y-4 lg:col-span-2">
              <CompareStrip label={t('En cours')} value={row.enCours} stats={team.stats.enCours} lowerIsBetter />
              <CompareStrip label={t('Terminés · 7 j')} value={row.termines7} stats={team.stats.termines7} />
              <CompareStrip label={`${t(words.sla)} · 30 j`} value={row.dansDelais30} stats={team.stats.dansDelais30} max={100} unit=" %" />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminDashboard;
