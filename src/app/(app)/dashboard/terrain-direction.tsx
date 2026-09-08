'use client';

/**
 * Terrain — vue direction, layout « 5d » (Dashboard redesign brief, tour 5).
 *
 * This is the ADMIN's Terrain tab, not the agent's own dashboard
 * (`terrain-dashboard.tsx`): 5d is titled « Terrain, vue direction » and reads
 * the team — every agent as a row, the exceptions to clear first, and the
 * quality of the visits behind the counts.
 *
 * No new computation: the rows are `computeTeamView('Agent de Terrain', …)`
 * (`PersonRow` already carries every column 5d asks for) and the strip is
 * `terrainQuality` from analytics.ts.
 *
 *   Tuiles   missions ouvertes · en retard · non assignées · faites 7 j
 *   Rang A   par agent (8) · exceptions (4)
 *   Rang B   la qualité de la visite, cinq mesures
 */

import { useMemo } from 'react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import type { FunnelDossier } from '../monitoring/funnel';
import type { DashboardMission } from './use-dashboard-data';
import { fmtWindow, type PersonRow, type TeamView } from './metrics';
import { terrainQuality } from './analytics';
import { Block, Delta, DoneLine, StatTile, WorkRow, fmtHours } from './ui';
import { fmtDays, fmtPct } from '@/components/viz';

const EXCEPTIONS_CAP = 6;

/** The firm's own target for « dans les délais »; the tick the bars carry. */
const SLA_TARGET_PCT = 90;

const nameOf = (u: { nom?: string; email?: string; id: string }): string => (u.nom || u.email || u.id).trim();

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '—';

export interface TerrainDirectionProps {
  team: TeamView;
  missions: DashboardMission[];
  dossiers: FunnelDossier[];
  holidays: ReadonlySet<string>;
  now: Date;
  loading: boolean;
  /** Window in days from the header strip — the quality strip honours it. */
  windowDays: number;
  /** Opens one agent's own dashboard (the « view as » path already in the tab). */
  onSelectUser: (id: string) => void;
}

export function TerrainDirection({ team, missions, dossiers, holidays, now, loading, windowDays, onSelectUser }: TerrainDirectionProps) {
  const t = useT();
  const week = fmtWindow(now, 7);
  const month = fmtWindow(now, windowDays);

  const quality = useMemo(
    () => terrainQuality(missions, dossiers, holidays, now, windowDays),
    [missions, dossiers, holidays, now, windowDays],
  );

  /** Team median of « dans les délais », the tick every bar is read against. */
  const median = team.stats.dansDelais30?.med ?? null;

  return (
    <>
      {/* ── Tuiles ───────────────────────────────────────────────────────── */}
      <div data-tour="dash-tiles" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={t('Missions ouvertes')}
          value={team.tiles.enCours}
          loading={loading}
          caption={<span>{t('sans photos envoyées')} · {t('maintenant')}</span>}
          href="/assignations-atg"
        />
        <StatTile
          label={t('En retard')}
          value={team.tiles.enRetard}
          danger={team.tiles.enRetard > 0}
          loading={loading}
          caption={<span>{t('RDV passé ou plus de 24 h ouvrées')} · {t('maintenant')}</span>}
        />
        <StatTile
          label={t(team.tiles.thirdLabel)}
          value={team.tiles.third}
          danger={team.tiles.third > 0}
          loading={loading}
          caption={<span>{t('aucune personne sur la mission')} · {t('maintenant')}</span>}
        />
        <StatTile label={`${t('Faites')} · 7 j`} value={team.tiles.termines7} loading={loading}>
          <div className="t-caption mt-2 flex flex-wrap items-center gap-x-1.5">
            <Delta cur={team.tiles.termines7} prev={team.tiles.termines7Prev} suffix={t('vs 7 j préc.')} />
          </div>
          <p className="t-caption mt-0.5">
            {t('photos envoyées')} · {week}
          </p>
        </StatTile>
      </div>

      {/* ── Rang A ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Block
          title={t('Par agent')}
          caption={
            median == null
              ? t('Mêmes définitions que le tableau de bord de chacun')
              : `${t('Le trait sur la barre est la médiane de l’équipe')}, ${fmtPct(median)} — ${t('jamais un classement')} · ${t('cliquez une ligne pour voir un agent')}`
          }
          dataTour="dash-par-personne"
          className="lg:col-span-8"
          bodyClassName="pb-0"
        >
          {team.perPerson.length === 0 ? (
            <DoneLine title={t('Aucun utilisateur actif avec ce rôle.')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-t border-hairline">
                    <th className="t-label h-9 px-5 text-left font-normal">{t('Agent')}</th>
                    <th className="t-label h-9 px-2 text-right font-normal">{t('Ouvertes')}</th>
                    <th className="t-label h-9 px-2 text-right font-normal">{t('Plus ancienne')}</th>
                    <th className="t-label h-9 px-2 text-right font-normal">{t('En retard')}</th>
                    <th className="t-label h-9 px-2 text-right font-normal">{t('Faites 7 j')}</th>
                    <th className="t-label h-9 w-[22%] px-2 text-left font-normal">{t('Dans les délais')} · 30 j</th>
                    <th className="t-label h-9 px-5 pl-2 text-right font-normal">{t('Reçues 30 j')}</th>
                  </tr>
                </thead>
                <tbody>
                  {team.perPerson.map((r) => (
                    <AgentRow key={r.user.id} row={r} median={median} onSelect={() => onSelectUser(r.user.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Block>

        <Block
          title={t('Exceptions')}
          count={team.exceptions.length}
          countDanger
          caption={t('À traiter avant tout, les plus anciennes en premier')}
          moreHref={team.exceptions.length > EXCEPTIONS_CAP ? '/assignations-atg' : undefined}
          moreLabel={`${t('Voir les')} ${Math.max(0, team.exceptions.length - EXCEPTIONS_CAP)} ${t('autres')}`}
          dataTour="dash-exceptions"
          className="lg:col-span-4"
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
                label={[t(e.label), e.detail ? t(e.detail) : null].filter(Boolean).join(' · ')}
                time={fmtHours(e.ageHours)}
                timeTone="danger"
              />
            ))
          )}
        </Block>
      </div>

      {/* ── Rang B — la qualité derrière les compteurs ────────────────────── */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="t-heading">{t('Qualité de la visite')}</h2>
        <p className="t-caption">
          {t('Ce que les compteurs ne disent pas')} · {month}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <QualityCell
          label={t('Visite le jour du RDV')}
          value={fmtPct(quality.visiteJourRdv.pct)}
          pct={quality.visiteJourRdv.pct}
          detail={`${quality.visiteJourRdv.num} ${t('sur')} ${quality.visiteJourRdv.den} ${t('visites')}`}
        />
        <QualityCell
          label={t('Pointage GPS présent')}
          value={fmtPct(quality.pointageGps.pct)}
          pct={quality.pointageGps.pct}
          detail={`${quality.pointageGps.num} ${t('sur')} ${quality.pointageGps.den} ${t('missions')}`}
        />
        <QualityCell
          label={t('Missions replanifiées')}
          value={fmtPct(quality.replanifiees.pct)}
          pct={quality.replanifiees.pct}
          inverse
          detail={`${quality.replanifiees.num} ${t('sur')} ${quality.replanifiees.den} ${t('planifications')}`}
        />
        <QualityCell
          label={t('Préavis médian')}
          value={fmtDays(quality.preavis.p50)}
          detail={`${t('planification → RDV')} · P90 ${fmtDays(quality.preavis.p90)}`}
        />
        <QualityCell
          label={t('Planification → photos')}
          value={fmtHours(quality.photosDelaiHours.p50)}
          detail={`${t('médiane ouvrée')} · P90 ${fmtHours(quality.photosDelaiHours.p90)}`}
        />
      </div>
    </>
  );
}

/** One agent: counts, then « dans les délais » as a bar against the team median. */
function AgentRow({ row, median, onSelect }: { row: PersonRow; median: number | null; onSelect: () => void }) {
  const t = useT();
  const name = nameOf(row.user);
  const pct = row.dansDelais30;
  return (
    <tr className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-2" onClick={onSelect}>
      <td className="h-11 px-5">
        <span className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[10px] font-semibold text-ink-2">
            {initialsOf(name)}
          </span>
          <span className="truncate font-medium text-ink">{name}</span>
        </span>
      </td>
      <td className="h-11 px-2 text-right">{row.enCours}</td>
      <td className="h-11 px-2 text-right text-ink-2">{row.plusAncienHours == null ? '—' : fmtHours(row.plusAncienHours)}</td>
      <td className={cn('h-11 px-2 text-right', row.enRetard > 0 && 'font-medium text-status-danger-fg')}>{row.enRetard}</td>
      <td className="h-11 px-2 text-right">{row.termines7}</td>
      <td className="h-11 px-2">
        <span className="flex items-center gap-2.5">
          <span className="relative block h-2 min-w-0 flex-1 rounded-full bg-surface-2">
            <span className="absolute inset-y-0 left-0 rounded-full bg-chart-1" style={{ width: `${pct ?? 0}%` }} />
            {median != null && (
              <span className="absolute -inset-y-0.5 w-px bg-ink" style={{ left: `${median}%` }} aria-hidden />
            )}
          </span>
          <span
            className={cn(
              'min-w-[2.6rem] text-right text-[13px] font-medium',
              pct != null && pct < SLA_TARGET_PCT ? 'text-status-danger-fg' : 'text-ink',
            )}
          >
            {fmtPct(pct)}
          </span>
        </span>
      </td>
      <td className="h-11 px-5 pl-2 text-right text-ink-2">{row.recus30}</td>
      <td className="sr-only">{t('Ouvrir la fiche de cet agent')}</td>
    </tr>
  );
}

/** One measure of the visit's quality: figure, then its denominator. */
function QualityCell({
  label,
  value,
  detail,
  pct,
  inverse,
}: {
  label: string;
  value: string;
  detail: string;
  /** 0–100. Given only for rates: a duration has no ceiling to draw against. */
  pct?: number | null;
  /** True when HIGH is bad (replanifications) — the bar takes the warning tone. */
  inverse?: boolean;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-xl border border-hairline bg-card p-4">
      <p className="t-label truncate" title={label}>
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums text-ink">{value}</p>
      {pct != null && (
        <span className="mt-2.5 block h-1.5 rounded-full bg-surface-2">
          <span
            className={cn('block h-full rounded-full', inverse ? 'bg-tertiary' : 'bg-chart-1')}
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </span>
      )}
      <p className="t-caption mt-2 tabular-nums">{detail}</p>
    </div>
  );
}
