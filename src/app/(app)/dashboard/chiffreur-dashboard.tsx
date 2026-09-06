'use client';

/**
 * Chiffreur dashboard — "deliver each assigned chiffrage within 24 h ouvrées,
 * revisions included" (GQM viewpoint: the desk estimator, now).
 *
 * Block order (theory C2 · role-based C1 · elements B4/B10): hero « En
 * attente » + tiles → « Ma file » banded exactly like the queue, the first row
 * being the next item to open → « Révisions » (the quality twin of speed) and
 * « Par urgence » meter. Bands and clocks come from the queue's own rule, so
 * the two pages never disagree.
 */

import { useMemo } from 'react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import type { FunnelDossier } from '../monitoring/funnel';
import { chiffrageOwnedBy, computeChiffreurView, fmtWindow, type PersonRef, type QueueBand, type QueueEntry } from './metrics';
import { devisLineStats, devisRates } from './analytics';
import type { DashboardChiffrage } from './use-dashboard-data';
import { BandHeader, Block, Delta, DoneLine, Meter, StatTile, WorkRow, fmtHours } from './ui';
import { StackedBar, fmtPct } from '@/components/viz';

const QUEUE_CAP = 7;

const BAND_LABEL: Record<QueueBand, string> = {
  'En retard': 'Dépassées',
  'Moins de 6 h': 'Moins de 6 h',
  "Aujourd'hui": "Aujourd'hui",
  'À venir': 'À venir',
};

const refOf = (e: QueueEntry): string => {
  const raw = (e.dossier as any)?.refExpert ?? e.chiffrage.dossierNom;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : e.chiffrage.dossierId;
};
const whoOf = (e: QueueEntry): string => {
  const d: any = e.dossier;
  return d?.garageName || d?.compagnie || e.chiffrage.sentByNom || '';
};

/** Deadline text: countdown while inside the window, lateness once past (B4). */
const deadlineOf = (e: QueueEntry, t: (k: string) => string): { text: string; tone: 'danger' | 'time' | 'neutral' } => {
  if (e.late) return { text: `${t('dépassée depuis')} ${fmtHours(e.elapsedHours - 24)}`, tone: 'danger' };
  const text = `${t('échéance dans')} ${fmtHours(e.remainingHours)}`;
  return { text, tone: e.band === 'À venir' ? 'neutral' : 'time' };
};

export interface ChiffreurDashboardProps {
  chiffrages: DashboardChiffrage[];
  dossiers: FunnelDossier[];
  holidays: ReadonlySet<string>;
  now: Date;
  person: PersonRef | null;
  loading: boolean;
}

export function ChiffreurDashboard({ chiffrages, dossiers, holidays, now, person, loading }: ChiffreurDashboardProps) {
  const t = useT();
  const view = useMemo(() => computeChiffreurView(chiffrages, dossiers, holidays, now, person), [chiffrages, dossiers, holidays, now, person]);
  const { tiles } = view;
  const week = fmtWindow(now, 7);
  const month = fmtWindow(now, 30);

  // The control the chiffreur actually exercises, counted in LINES rather than
  // dirhams (kpi-expansion §4.2.1): what was struck off the garage's devis.
  // It sits beside « Révisions » because speed and judgment are read together.
  const lines = useMemo(
    () => devisLineStats(chiffrages, now, 30, (c) => (person ? chiffrageOwnedBy(c, person) : false)),
    [chiffrages, now, person],
  );
  const lineRates = useMemo(() => devisRates(lines), [lines]);

  // Rows grouped by band, in urgency order, capped as a whole.
  const shown = view.queue.slice(0, QUEUE_CAP);
  const bands = view.bands.filter((b) => shown.some((e) => e.band === b.band));

  return (
    <div className="space-y-6">
      <div data-tour="dash-tiles" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t('En attente')}
          value={tiles.enAttente}
          size="hero"
          loading={loading}
          caption={<span>{tiles.revisionsEnAttente} {t('révisions')} · {t('maintenant')}</span>}
          href="/assignations-chiffrage"
          title={t('Chiffrages assignés non terminés')}
        />
        <StatTile
          label={t('Hors délai')}
          value={tiles.horsDelai}
          danger={tiles.horsDelai > 0}
          loading={loading}
          caption={<span>{t('au-delà de 24 h ouvrées')} · {t('maintenant')}</span>}
        />
        <StatTile
          label={t('Terminés')}
          value={tiles.termines7}
          loading={loading}
          caption={
            <>
              <span>{week}</span>
              <span className="text-ink-4">·</span>
              <Delta cur={tiles.termines7} prev={tiles.termines7Prev} suffix={t('vs 7 j préc.')} />
            </>
          }
        />
        <StatTile
          label={t('Dans les délais')}
          value={tiles.dansDelais30.pct == null ? '—' : `${tiles.dansDelais30.pct} %`}
          loading={loading}
          caption={
            tiles.dansDelais30.n === 0 ? (
              <span>{t('aucun chiffrage terminé')} · {month}</span>
            ) : (
              <span>
                {tiles.dansDelais30.onTime} {t('sur')} {tiles.dansDelais30.n} · {month}
              </span>
            )
          }
          title={t('Part des chiffrages terminés en 24 h ouvrées ou moins, sur 30 jours')}
        >
          {/* Bullet-style strip: scale from zero to 100, the bar is the value, no target line (none is set). */}
          <div className="mt-3 h-2 w-full rounded-sm bg-surface-3" aria-hidden>
            {tiles.dansDelais30.pct != null && <div className="h-2 rounded-sm bg-chart-1" style={{ width: `${tiles.dansDelais30.pct}%` }} />}
          </div>
        </StatTile>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Block
          title={t('Ma file')}
          count={view.queue.length}
          caption={t('Le premier est le prochain à chiffrer · échéances les plus proches en premier')}
          moreHref="/assignations-chiffrage"
          moreLabel={view.queue.length > QUEUE_CAP ? `${t('Voir les')} ${view.queue.length - QUEUE_CAP} ${t('autres')}` : t('Ouvrir la file')}
          dataTour="dash-worklist"
          className="lg:col-span-2"
        >
          {loading ? (
            <div className="space-y-3 px-5 py-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-surface-2" />
              ))}
            </div>
          ) : view.queue.length === 0 ? (
            <DoneLine title={t('File vide — aucun chiffrage en attente.')} detail={`${tiles.termines7} ${t('terminés')} · ${week}`} />
          ) : (
            bands.map((b) => (
              <div key={b.band}>
                <BandHeader label={t(BAND_LABEL[b.band])} count={b.count} danger={b.band === 'En retard'} time={b.band === "Aujourd'hui" || b.band === 'Moins de 6 h'} />
                {shown
                  .filter((e) => e.band === b.band)
                  .map((e) => {
                    const dl = deadlineOf(e, t);
                    return (
                      <WorkRow
                        key={e.chiffrage.id}
                        href={`/assignations-chiffrage/${e.chiffrage.id}`}
                        id={refOf(e)}
                        who={whoOf(e)}
                        label={e.revision ? `${e.round}ᵉ ${t('accord')}` : t('1er accord')}
                        time={dl.text}
                        timeTone={dl.tone}
                        badge={
                          e.revision ? (
                            <span className="rounded-full bg-status-info-bg px-2 py-0.5 text-[11px] font-medium text-status-info-fg">{t('Révision')}</span>
                          ) : undefined
                        }
                      />
                    );
                  })}
              </div>
            ))
          )}
        </Block>

        <div className="space-y-6" data-tour="dash-context">
          <Block title={t('Révisions')} caption={`${t('2ème et 3ème accords reçus')} · ${month}`}>
            <div className="px-5 pb-3">
              <p className={cn('text-2xl font-semibold leading-tight text-ink')}>
                {view.revisions30.total === 0 ? '—' : `${Math.round((view.revisions30.revisions / view.revisions30.total) * 100)} %`}
              </p>
              <p className="t-caption mt-1 tabular-nums">
                {view.revisions30.revisions} {t('révisions')} {t('sur')} {view.revisions30.total} {t('assignations reçues')}
              </p>
              <p className="t-caption mt-2">{t('Le pendant qualité de la vitesse : un accord repris est un accord à refaire.')}</p>
            </div>
          </Block>

          <Block title={t('Mon contrôle du devis')} caption={`${t('Lignes écartées et pièces retenues')} · ${month}`}>
            <div className="px-5 pb-3">
              {lines.rows === 0 ? (
                <p className="t-caption">{t('Aucun devis structuré sur la période.')}</p>
              ) : (
                <>
                  <p className="text-2xl font-semibold leading-tight text-ink">{fmtPct(lineRates.ecartees.pct)}</p>
                  <p className="t-caption mt-1 tabular-nums">
                    {lines.ecartees} {t('lignes écartées sur')} {lines.rows} · {lines.dossiers} {t('dossiers')}
                  </p>
                  {lines.remplacement > 0 && (
                    <div className="mt-3">
                      <StackedBar
                        label={t('Nature des pièces remplacées')}
                        segments={[
                          { key: 'ori', label: t('Originale'), value: lines.originale, tone: 'accent' },
                          { key: 'ada', label: t('Adaptable'), value: lines.adaptable, tone: 'accent-2' },
                          { key: 'occ', label: t('Occasion'), value: lines.occasion, tone: 'accent-3' },
                        ]}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </Block>
          <Block title={t('Par urgence')} caption={t('Ma file, telle que la file la découpe')}>
            <div className="px-5 pb-3">
              <Meter
                segments={view.bands.map((b) => ({
                  key: b.band,
                  label: t(BAND_LABEL[b.band]).toLowerCase(),
                  value: b.count,
                  judged: b.band === 'En retard',
                  time: b.band === "Aujourd'hui" || b.band === 'Moins de 6 h',
                }))}
              />
            </div>
          </Block>
        </div>
      </div>
    </div>
  );
}

export default ChiffreurDashboard;
