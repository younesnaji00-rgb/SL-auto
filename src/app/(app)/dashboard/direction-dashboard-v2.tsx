'use client';

/**
 * Tableau de bord Direction — layout « 5a » (Dashboard redesign brief, tour 5).
 *
 * Same metric layer as before: every figure comes from `computeDirectionView`
 * (analytics.ts), `computeTeamView` (metrics.ts) and `factureToDepot48`.
 * Nothing new is computed here — this file only lays the blocks out:
 *
 *   Tuiles  délai médian requête → rapport · traitées en 24 h ouvrées ·
 *           dossiers en cours · clôturés / entrées
 *   Rang A  décomposition du délai (5) · qui porte la charge (4) ·
 *           portes des trois équipes + facture → rapport 48 h (3)
 *   Rang B  par compagnie (8) · entrées et sorties (4)
 *
 * Two deliberate departures from the mock:
 *  • the décomposition stays a PIE (owner 2026-09-08) rather than 5a's bar
 *    ladder — see the note on `pie` below for what the whole represents;
 *  • the period strip (with « Tout ») lives on the page header line in
 *    admin-dashboard.tsx — this view just receives `windowDays`.
 *
 * `view.heat` (« quand le travail arrive ») still has no consumer.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { ClipboardList, Calculator, MapPin } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Viz, VizTable, fmtPct } from '@/components/viz';
import { arcPath, sliceColor } from './pie';
import type { FunnelDossier, WorkflowLog } from '../monitoring/funnel';
import type { SlaItem } from '../monitoring/metrics';
import type { DashboardChiffrage, DashboardMission, DashboardUser } from './use-dashboard-data';
import { computeDirectionView, factureToDepot48 } from './analytics';
import { computeTeamView, fmtWindow, lateDossierIds, DASHBOARD_ROLES, type DashboardRole } from './metrics';
import { Block, StatTile } from './ui';

/** French decimals: 11,4 — never 11.4. */
const nb = (v: number | null | undefined, digits = 1): string =>
  v == null || !Number.isFinite(v) ? '—' : v.toFixed(digits).replace('.', ',');
const days = (v: number | null | undefined, digits = 1): string => (v == null ? '—' : `${nb(v, digits)} j`);
const pct = (v: number | null | undefined): string => (v == null ? '—' : `${v} %`);

const ROLE_ICON: Record<DashboardRole, typeof ClipboardList> = {
  Gestionnaire: ClipboardList,
  Chiffreur: Calculator,
  'Agent de Terrain': MapPin,
};

const ROLE_TAB: Record<DashboardRole, string> = {
  Gestionnaire: 'gestionnaires',
  Chiffreur: 'chiffreurs',
  'Agent de Terrain': 'terrain',
};

export interface DirectionDashboardV2Props {
  dossiers: FunnelDossier[];
  chiffrages: DashboardChiffrage[];
  missions: DashboardMission[];
  workflowLogs: WorkflowLog[];
  /** Admin `users` listener — needed for « qui porte la charge » and the team doors. */
  users: DashboardUser[];
  sla: SlaItem[];
  holidays: ReadonlySet<string>;
  now: Date;
  loading?: boolean;
  /** Called when a team door is clicked (the admin tabs live in admin-dashboard.tsx). */
  onOpenTeam?: (role: DashboardRole) => void;
  /** Window in days, owned by the header strip in admin-dashboard.tsx. */
  windowDays: number;
}

export function DirectionDashboardV2({
  dossiers,
  chiffrages,
  missions,
  workflowLogs,
  users,
  sla,
  holidays,
  now,
  loading,
  onOpenTeam,
  windowDays,
}: DirectionDashboardV2Props) {
  const t = useT();
  const view = useMemo(
    () => computeDirectionView({ dossiers, chiffrages, missions, workflowLogs, sla, holidays }, now, windowDays),
    [dossiers, chiffrages, missions, workflowLogs, sla, holidays, now, windowDays],
  );

  /** Open clocks breached right now — the only "maintenant" figure in the SLA card. */
  const lateNow = useMemo(() => lateDossierIds(sla).size, [sla]);

  /** Charge par personne: the gestionnaire roll-up (swap the role to read another team). */
  const chargeTeam = useMemo(
    () => computeTeamView('Gestionnaire', users, { dossiers, chiffrages, missions, sla, holidays }, now),
    [users, dossiers, chiffrages, missions, sla, holidays, now],
  );

  const teams = useMemo(
    () =>
      DASHBOARD_ROLES.map((role) => ({
        role,
        view: computeTeamView(role, users, { dossiers, chiffrages, missions, sla, holidays }, now),
      })),
    [users, dossiers, chiffrages, missions, sla, holidays, now],
  );

  // `win`, never `window` — the identifier would shadow the global inside this scope.
  const win = fmtWindow(now, windowDays);
  const slaDone = view.slaOnTime.den;
  const slaOnTime = view.slaOnTime.num;
  const slaLateDone = Math.max(0, slaDone - slaOnTime);
  const slaTotal = slaDone + lateNow || 1;

  /**
   * Ladder as a pie (owner 2026-09-08).
   *
   * The whole is the SUM OF THE STAGE MEDIANS — a real quantity a pie can
   * divide honestly. It is deliberately NOT `view.lead.requeteRapport`, the
   * total median: medians do not add up, so the two figures differ and the
   * header prints both rather than passing one off as the other.
   *
   * Slices sort by size so neighbours are comparable, and take the muted
   * `--slice-1..9` hues (globals.css) — desaturated enough that none of them
   * competes with the teal accent or the terracotta warning, and defined per
   * theme so they lift on the graphite ground. P90 and n cannot live on a
   * slice, so the legend carries them.
   */
  const pie = useMemo(() => {
    const rows = view.ladder
      .map((r) => ({ key: r.key, label: r.label, med: r.dist.p50 ?? 0, p90: r.dist.p90, n: r.dist.n }))
      .filter((r) => r.med > 0)
      .sort((a, b) => b.med - a.med);
    const total = rows.reduce((s, r) => s + r.med, 0);
    let cursor = 0;
    const slices = rows.map((r, i) => {
      const from = cursor;
      cursor += total > 0 ? (r.med / total) * Math.PI * 2 : 0;
      return {
        ...r,
        from,
        to: cursor,
        share: total > 0 ? (r.med / total) * 100 : 0,
        // Cycles if a future ladder ever exceeds nine stages.
        color: sliceColor(i),
      };
    });
    return { slices, total };
  }, [view.ladder]);

  // Charge + flow share one scale each, computed once. (The ladder is a pie now:
  // its scale is the sum of the slices, held in `pie.total`.)
  const chargeMax = Math.max(1, ...chargeTeam.perPerson.map((p) => p.enCours));
  const chargeMed = chargeTeam.stats.enCours?.med ?? null;
  const flowMax = Math.max(1, ...view.flow.flatMap((w) => [w.recus, w.termines]));

  /** The promise the compagnies quote first — the small card under the doors. */
  const facture48 = useMemo(() => factureToDepot48(dossiers, holidays, now, windowDays), [dossiers, holidays, now, windowDays]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Les quatre chiffres de tête (5a) ────────────────── */}
      <div data-tour="dash-tiles" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={t('Délai médian requête → rapport')}
          value={days(view.lead.requeteRapport.p50)}
          loading={loading}
          caption={
            <span>
              P90 {days(view.lead.requeteRapport.p90)} · n = {view.lead.requeteRapport.n}
            </span>
          }
        />
        <StatTile
          label={t('Traitées en 24 h ouvrées')}
          value={view.slaOnTime.pct == null ? '—' : `${view.slaOnTime.pct} %`}
          loading={loading}
          caption={
            <span className="tabular-nums">
              {slaOnTime} {t('dans le délai')} · {slaLateDone} {t('en retard')} ·{' '}
              <span className={cn(lateNow > 0 && 'font-medium text-status-danger-fg')}>
                {lateNow} {t('maintenant')}
              </span>
            </span>
          }
        >
          {/* The same three parts as the caption, as one strip. */}
          <div className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-3">
            <span className="bg-chart-1" style={{ width: `${(slaOnTime / slaTotal) * 100}%` }} />
            <span className="bg-tertiary" style={{ width: `${(slaLateDone / slaTotal) * 100}%` }} />
            <span className="bg-status-danger-fg" style={{ width: `${(lateNow / slaTotal) * 100}%` }} />
          </div>
        </StatTile>
        <StatTile
          label={t('Dossiers en cours')}
          value={view.enCours}
          loading={loading}
          caption={<span>{t('sans rapport déposé')} · {t('maintenant')}</span>}
          href="/dossiers"
        />
        <StatTile
          label={t('Clôturés / entrées')}
          value={view.closing == null ? '—' : nb(view.closing, 2)}
          loading={loading}
          caption={
            <span className="tabular-nums">
              {view.termines} {t('clôturés')} · {view.recus} {t('entrés')} ·{' '}
              <span className={cn(view.closing != null && view.closing >= 1 ? 'text-primary' : 'text-status-danger-fg')}>
                {view.closing != null && view.closing >= 1 ? t('le stock baisse') : t('le stock monte')}
              </span>
            </span>
          }
        />
      </div>

      {/* ── Rang A ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Block
          title={t('Décomposition du délai, étape par étape')}
          caption={
            <>
              {t(
                'Part de chaque étape dans la durée médiane cumulée — 1 dossier sur 2 passe l’étape en moins du temps indiqué.',
              )}{' '}
              <span className="text-ink-3">
                {t('Somme des médianes')} <span className="font-medium tabular-nums">{days(pie.total)}</span>
                {' · '}
                {t('les médianes ne s’additionnent pas au délai médian total')}
              </span>
            </>
          }
          className="lg:col-span-5"
          bodyClassName="px-5 pb-5"
        >
          {pie.slices.length === 0 ? (
            <p className="t-caption">{t('Pas encore de dossier terminé sur la période')}</p>
          ) : (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Viz
                className="m-0 shrink-0 self-center sm:self-start"
                label={t('Part de chaque étape dans la durée médiane totale')}
                table={
                  <VizTable
                    caption={t('Décomposition du délai, étape par étape')}
                    head={[t('Étape'), t('Médiane'), t('Part'), 'P90', 'n']}
                    rows={pie.slices.map((s) => [
                      t(s.label),
                      days(s.med),
                      `${Math.round(s.share)} %`,
                      days(s.p90),
                      s.n,
                    ])}
                  />
                }
              >
                <svg viewBox="0 0 200 200" className="block h-[184px] w-[184px]" aria-hidden>
                  {pie.slices.length === 1 ? (
                    <circle cx="100" cy="100" r="92" fill={pie.slices[0].color} />
                  ) : (
                    pie.slices.map((s) => (
                      <path
                        key={s.key}
                        d={arcPath(100, 100, 92, s.from, s.to)}
                        className="stroke-card"
                        fill={s.color}
                        strokeWidth={2}
                      />
                    ))
                  )}
                </svg>
              </Viz>

              <ul className="min-w-0 flex-1 space-y-1.5">
                {pie.slices.map((s) => (
                  <li key={s.key} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2.5 text-[13px]">
                    <span
                      className="h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-sm"
                      style={{ background: s.color }}
                      aria-hidden
                    />
                    <span className="truncate text-ink-2" title={t(s.label)}>
                      {t(s.label)}
                    </span>
                    <span className="whitespace-nowrap tabular-nums">
                      <span className="font-semibold text-ink">{days(s.med)}</span>
                      <span className="text-ink-3"> · {Math.round(s.share)} %</span>
                      <span className="text-ink-4"> · P90 {days(s.p90)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Block>

        {/* Qui porte la charge */}
        <Block
          title={t('Qui porte la charge')}
          caption={
            <>
              {t('Éléments ouverts par personne')} · {view.enCours} {t('en cours')}
              {chargeMed != null && <> · {t('médiane')} {chargeMed}</>}
            </>
          }
          className="lg:col-span-4"
          bodyClassName="px-5 pb-5"
        >
          <ul className="space-y-2.5">
            {chargeTeam.perPerson.map((p) => {
              const late = Math.min(p.enRetard, p.enCours);
              const w = (p.enCours / chargeMax) * 100;
              const lateW = (late / chargeMax) * 100;
              return (
                <li key={p.user.id} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-x-3">
                  <span className="truncate text-[13px] text-ink" title={p.user.nom || p.user.email}>
                    {p.user.nom || p.user.email || p.user.id}
                  </span>
                  <span className="relative block h-2.5 rounded-full bg-surface-3">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-chart-1" style={{ width: `${w}%` }} />
                    {late > 0 && (
                      <span
                        className="absolute inset-y-0 rounded-r-full bg-status-danger-fg"
                        style={{ left: `${w - lateW}%`, width: `${lateW}%` }}
                      />
                    )}
                    {chargeMed != null && (
                      <span
                        className="absolute -inset-y-1 w-px bg-ink"
                        style={{ left: `${(chargeMed / chargeMax) * 100}%` }}
                        aria-hidden
                      />
                    )}
                  </span>
                  <span className="min-w-[2.6rem] text-right text-[13px] font-semibold tabular-nums text-ink">
                    {p.enCours}
                    {late > 0 && <span className="font-medium text-status-danger-fg"> {late}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="t-caption mt-4">
            {t('Le trait est la médiane de l’équipe, jamais un classement · en rouge, ce qui est en retard')}
          </p>
        </Block>

        {/* Par équipe */}
        <div className="flex flex-col gap-3 lg:col-span-3">
          <p className="t-label px-1">{t('Par équipe')}</p>
          {teams.map(({ role, view: tv }) => {
            const Icon = ROLE_ICON[role];
            return (
              <Card key={role} className="min-w-0 p-0">
                <Link
                  href={`?vue=${ROLE_TAB[role]}`}
                  onClick={(e) => {
                    if (!onOpenTeam) return;
                    e.preventDefault();
                    onOpenTeam(role);
                  }}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[inherit] p-4 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-3 text-ink-2">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{t(role)}</span>
                    <span className="t-caption block">
                      {tv.tiles.enCours} {t('en cours')} · {tv.tiles.third} {t(tv.tiles.thirdLabel)}
                    </span>
                  </span>
                  <span className="text-right tabular-nums">
                    <span
                      className={cn(
                        'block text-xl font-semibold leading-none',
                        tv.tiles.enRetard > 0 ? 'text-status-danger-fg' : 'text-ink',
                      )}
                    >
                      {tv.tiles.enRetard}
                    </span>
                    <span className="t-caption block text-[10px]">{t('en retard')}</span>
                  </span>
                </Link>
              </Card>
            );
          })}
          <Card className="min-w-0 p-4">
            <p className="t-label">{t('Facture → rapport en 48 h')}</p>
            <p className="mt-1.5 text-[28px] font-semibold leading-none tabular-nums text-ink">{fmtPct(facture48.pct)}</p>
            <span className="mt-2.5 block h-2 rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-chart-1" style={{ width: `${facture48.pct ?? 0}%` }} />
            </span>
            <p className="t-caption mt-2 tabular-nums">
              {facture48.den === 0
                ? t('aucune facture validée sur la période')
                : `${facture48.num} ${t('sur')} ${facture48.den} ${t('dossiers déposés')}`}
            </p>
          </Card>
        </div>
      </div>

      {/* ── Rang B ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Block
          title={`${t('Par compagnie')} · ${win}`}
          caption={t(
            'Délai médian : 1 dossier sur 2 est déposé plus vite. P90 : 9 sur 10 le sont — la colonne des cas lents.',
          )}
          moreHref="/compagnies"
          moreLabel={t('Compagnies')}
          className="lg:col-span-8"
          bodyClassName="pb-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-t border-hairline">
                  <th className="t-label h-10 px-5 text-left font-normal">{t('Compagnie')}</th>
                  <th className="t-label h-10 px-3 text-right font-normal">{t('Entrées')}</th>
                  <th className="t-label h-10 px-3 text-right font-normal">{t('En cours')}</th>
                  <th className="t-label h-10 px-3 text-right font-normal">{t('Délai médian')}</th>
                  <th className="t-label h-10 px-3 text-right font-normal">{t('P90 · 9 sur 10')}</th>
                  <th className="t-label h-10 w-[18%] px-3 text-left font-normal">{t('Dans les délais')}</th>
                  <th className="t-label h-10 px-5 pl-3 text-right font-normal">{t('1er accord net')}</th>
                </tr>
              </thead>
              <tbody>
                {view.compagnies.map((c) => (
                  <tr key={c.key} className="border-t border-hairline">
                    <td className="h-12 px-5 font-medium text-ink">{c.label}</td>
                    <td className="h-12 px-3 text-right">{c.volume}</td>
                    <td className="h-12 px-3 text-right">{c.enCours}</td>
                    <td className="h-12 px-3 text-right font-medium">{days(c.delaiP50)}</td>
                    <td className="h-12 px-3 text-right text-ink-2">{days(c.delaiP90)}</td>
                    <td className="h-12 px-3">
                      <span className="flex items-center gap-2.5">
                        <span className="relative block h-2 min-w-0 flex-1 rounded-full bg-surface-2">
                          <span
                            className="absolute inset-y-0 left-0 rounded-full bg-chart-1"
                            style={{ width: `${c.slaOnTime.pct ?? 0}%` }}
                          />
                          <span className="absolute -inset-y-0.5 left-[90%] w-px bg-ink" aria-hidden />
                        </span>
                        <span
                          className={cn(
                            'min-w-[2.6rem] text-right text-[13px] font-medium',
                            c.slaOnTime.pct != null && c.slaOnTime.pct < 90 ? 'text-status-danger-fg' : 'text-ink',
                          )}
                        >
                          {pct(c.slaOnTime.pct)}
                        </span>
                      </span>
                    </td>
                    <td className="h-12 px-5 pl-3 text-right">{pct(c.firstPass.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Block>

        <Block
          title={t('Entrées et sorties par semaine')}
          caption={`13 ${t('sem.')}`}
          className="lg:col-span-4"
          bodyClassName="px-5 pb-5"
        >
          <div className="flex h-32 items-end gap-1.5">
            {view.flow.map((w, i) => (
              <div key={w.weekStart.toISOString()} className="flex min-w-0 flex-1 items-end justify-center gap-0.5" title={w.label}>
                <span
                  className="w-1.5 rounded-sm bg-ink/25"
                  style={{ height: `${(w.recus / flowMax) * 100}%` }}
                  aria-hidden
                />
                <span
                  className={cn('w-1.5 rounded-sm bg-chart-1', i === view.flow.length - 1 && 'opacity-45')}
                  style={{ height: `${(w.termines / flowMax) * 100}%` }}
                  aria-hidden
                />
              </div>
            ))}
          </div>
          <div className="t-caption mt-2 flex justify-between">
            <span>{view.flow[0]?.label}</span>
            <span>
              {view.flow[view.flow.length - 1]?.label} ({t('en cours')})
            </span>
          </div>
          <p className="t-caption mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-ink/25" />
              {t('Entrés')} {view.recus}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-chart-1" />
              {t('Clôturés')} {view.termines}
            </span>
            <span>
              {nb(view.closing, 2)} {t('clôturé par entrée')}
            </span>
          </p>
        </Block>
      </div>

      {loading && <p className="t-caption">{t('Chargement...')}</p>}
    </div>
  );
}
