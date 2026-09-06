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
import { Building2, Calculator, ChevronLeft, UserCheck, Users } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SlaItem } from '../monitoring/metrics';
import type { FunnelDossier } from '../monitoring/funnel';
import { DASHBOARD_ROLES, computeTeamView, fmtWindow, type DashboardRole, type PersonRow, type TeamView } from './metrics';
import type { DashboardChiffrage, DashboardMission, DashboardUser } from './use-dashboard-data';
import { BarList, Block, CompareStrip, Delta, DoneLine, StatTile, WorkRow, fmtHours } from './ui';
import { GestionnaireDashboard } from './gestionnaire-dashboard';
import { ChiffreurDashboard } from './chiffreur-dashboard';
import { TerrainDashboard } from './terrain-dashboard';

const EXCEPTIONS_CAP = 10;
const ALL_TEAM = '__team__';

type Vue = 'gestionnaires' | 'chiffreurs' | 'terrain';
const VUE_OF_ROLE: Record<DashboardRole, Vue> = { Gestionnaire: 'gestionnaires', Chiffreur: 'chiffreurs', 'Agent de Terrain': 'terrain' };
const TAB_LABEL: Record<Vue, string> = { gestionnaires: 'Gestionnaires', chiffreurs: 'Chiffreurs', terrain: 'Terrain' };
const TAB_ICON: Record<Vue, React.ElementType> = { gestionnaires: Building2, chiffreurs: Calculator, terrain: UserCheck };

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
  sla: SlaItem[];
  holidays: ReadonlySet<string>;
  now: Date;
  loading: boolean;
}

export function AdminDashboard(props: AdminDashboardProps) {
  const t = useT();
  const [vue, setVue] = useState<Vue>('gestionnaires');
  const [userId, setUserId] = useState<string | null>(null);

  // URL ↔ state (NN/g tabs: the selected tab is addressable; a person's view can be linked).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get('vue');
    if (v && (v === 'gestionnaires' || v === 'chiffreurs' || v === 'terrain')) setVue(v);
    const u = sp.get('user');
    if (u) setUserId(u);
  }, []);
  const sync = (nextVue: Vue, nextUser: string | null) => {
    const url = new URL(window.location.href);
    if (nextVue === 'gestionnaires') url.searchParams.delete('vue');
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

  return (
    <Tabs value={vue} onValueChange={(v) => changeVue(v as Vue)} className="space-y-6">
      <TabsList data-tour="dash-tabs">
        {(Object.keys(TAB_LABEL) as Vue[]).map((v) => {
          const Icon = TAB_ICON[v];
          return (
            <TabsTrigger key={v} value={v} data-tour={`dash-tab-${v}`} className="gap-2">
              <Icon className="h-4 w-4" aria-hidden />
              {t(TAB_LABEL[v])}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {DASHBOARD_ROLES.map((role) => (
        <TabsContent key={role} value={VUE_OF_ROLE[role]} className="space-y-6">
          <RoleTab role={role} userId={userId} onSelectUser={changeUser} {...props} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function RoleTab({
  role,
  userId,
  onSelectUser,
  dossiers,
  chiffrages,
  missions,
  users,
  sla,
  holidays,
  now,
  loading,
}: AdminDashboardProps & { role: DashboardRole; userId: string | null; onSelectUser: (u: string | null) => void }) {
  const t = useT();
  const team = useMemo(() => computeTeamView(role, users, { dossiers, chiffrages, missions, sla, holidays }, now), [role, users, dossiers, chiffrages, missions, sla, holidays, now]);
  const teamUsers = useMemo(() => team.perPerson.map((r) => r.user), [team]);
  const selected = userId ? teamUsers.find((u) => u.id === userId) ?? null : null;
  const words = WORDS[role];
  const week = fmtWindow(now, 7);

  return (
    <>
      {/* Selector — « Voir : Toute l'équipe ▾ », only users of this role. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-caption">
          {teamUsers.length} {t(role === 'Agent de Terrain' ? 'agents actifs' : role === 'Chiffreur' ? 'chiffreurs actifs' : 'gestionnaires actifs')}
        </p>
        <div className="flex items-center gap-2" data-tour="dash-user-select">
          <label className="t-label whitespace-nowrap">{t('Voir')}</label>
          <Select value={selected?.id ?? ALL_TEAM} onValueChange={(v) => onSelectUser(v === ALL_TEAM ? null : v)}>
            <SelectTrigger className="h-9 w-60">
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
          {/* Row 1 — team tiles. */}
          <div data-tour="dash-tiles" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* Row 2 — exceptions (who needs support now) + load per person. */}
          <div className="grid items-start gap-6 lg:grid-cols-3">
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
                    label={t(e.label)}
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
}: Omit<AdminDashboardProps, 'users'> & { role: DashboardRole; user: DashboardUser; team: TeamView; onBack: () => void }) {
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

      {role === 'Gestionnaire' && <GestionnaireDashboard dossiers={dossiers} sla={sla} rappelsRecus={[]} holidays={holidays} now={now} person={person} loading={loading} viewAs />}
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
