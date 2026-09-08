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
import { computeChiffreurView, fmtWindow, type PersonRef, type QueueBand, type QueueEntry } from './metrics';
import type { DashboardChiffrage } from './use-dashboard-data';
import { BandHeader, Block, Delta, DoneLine, StatTile, WorkRow, fmtHours } from './ui';
import { Donut, SliceLegend, toSlices, type PieDatum } from './pie';

/**
 * The bands keep the queue's OWN colours rather than the categorical
 * `--slice-*` ramp: late → warning → today → later is a meaning the reader
 * already carries over from /assignations-chiffrage, and inventing new hues
 * for it would make the two pages disagree.
 */
const BAND_COLOR: Record<QueueBand, string> = {
  'En retard': 'hsl(var(--status-danger-fg))',
  'Moins de 6 h': 'hsl(var(--tertiary))',
  "Aujourd'hui": 'hsl(var(--chart-1))',
  'À venir': 'hsl(var(--ink) / 0.28)',
};

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

  /** The ring: the same bands the list is grouped by, in the same order. */
  const urgence: PieDatum[] = view.bands.map((b) => ({
    key: b.band,
    label: t(BAND_LABEL[b.band]),
    value: b.count,
    color: BAND_COLOR[b.band],
  }));
  const urgenceSlices = toSlices(urgence).slices;

  const joursTotal = view.terminesParJour.reduce((n, d) => n + d.count, 0);
  const joursMax = Math.max(1, ...view.terminesParJour.map((d) => d.count));

  // Rows grouped by band, in urgency order, capped as a whole.
  const shown = view.queue.slice(0, QUEUE_CAP);
  const bands = view.bands.filter((b) => shown.some((e) => e.band === b.band));

  return (
    <div className="space-y-6">
      <div data-tour="dash-tiles" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label={t('En attente')}
          value={tiles.enAttente}
          size="hero"
          // The one hero of the view is full width on a phone: a 48 px figure
          // does not fit a 2-up tile at 320 px (density §4).
          className="col-span-2 sm:col-span-1"
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

      {/* ── Rang unique ────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Block
          title={t('Ma file')}
          count={view.queue.length}
          caption={t('Le premier est le prochain à chiffrer · échéances les plus proches en premier')}
          moreHref="/assignations-chiffrage"
          moreLabel={view.queue.length > QUEUE_CAP ? `${t('Voir les')} ${view.queue.length - QUEUE_CAP} ${t('autres')}` : t('Ouvrir la file')}
          dataTour="dash-worklist"
          className="lg:col-span-8"
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

        <div className="flex flex-col gap-4 lg:col-span-4" data-tour="dash-context">
          <Block title={t('Par urgence')} caption={t('Ma file, telle que la file la découpe')} bodyClassName="px-5 pb-5">
            {view.queue.length === 0 ? (
              <DoneLine title={t('Rien en file')} />
            ) : (
              <div className="flex items-center gap-4">
                <Donut
                  data={urgence}
                  label={t('Ma file par bande d’urgence')}
                  caption={t('Par urgence')}
                  centerValue={view.queue.length}
                  centerLabel={t('en file')}
                  size={104}
                />
                <SliceLegend slices={urgenceSlices} className="min-w-0 flex-1 space-y-2" />
              </div>
            )}
          </Block>

          <Block
            title={t('Terminés par jour')}
            count={joursTotal}
            caption={t('Chiffrages rendus, jour par jour')}
            bodyClassName="px-5 pb-5"
          >
            {joursTotal === 0 ? (
              <DoneLine title={t('Aucun chiffrage rendu cette semaine.')} />
            ) : (
              <ul className="flex items-end gap-2" style={{ height: 104 }}>
                {view.terminesParJour.map((d) => (
                  <li key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] font-semibold tabular-nums text-ink">{d.count}</span>
                    <span
                      className={cn('w-full max-w-[22px] rounded-sm', d.count > 0 ? 'bg-chart-1' : 'bg-surface-3')}
                      // Floor of 3 px so an empty day is still a readable tick.
                      style={{ height: Math.max(3, (d.count / joursMax) * 64) }}
                      aria-hidden
                    />
                    <span className="t-caption text-[10px]">{d.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      </div>
    </div>
  );
}

export default ChiffreurDashboard;
