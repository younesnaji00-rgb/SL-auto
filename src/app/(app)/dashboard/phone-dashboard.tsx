'use client';

/**
 * Tableau de bord — PHONE rendering of the three role dashboards (mobile
 * redesign 2026-09-14, `Phone.dc.html` ll. 381–397 « Pilotage / Tableau de
 * bord »). Desktop and tablet keep gestionnaire-/chiffreur-/terrain-dashboard.tsx
 * unchanged; `page.tsx` mounts these below `md` only.
 *
 * Same metric layer as the desktop views — `computeGestionnaireView`,
 * `computeChiffreurView`, `computeTerrainView`, `photosToChiffrageOpen` —
 * nothing new is computed here. The screen is ONE column:
 *
 *   KPI line   the role's headline figures, one scrolling line
 *   Blocks     the role's work lists as cards (header · count chip ·
 *              « Voir tout › », first 3 rows), exceptions first
 *
 * The pies, donuts, bar lists and day columns of the desktop views are not
 * drawn on phones (mobile-synthesis §7): each one is folded into a figure on
 * the KPI line or a count chip.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { assureName } from '@/lib/dossier-label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateBlock } from '@/components/ui/date-block';
import { RECORD_CARD_CLASS, RecordCardActions } from '@/components/ui/record-card';
import type { Rappel } from '@/hooks/use-rappels';
import type { FunnelDossier } from '../monitoring/funnel';
import type { SlaItem } from '../monitoring/metrics';
import {
  computeChiffreurView,
  computeGestionnaireView,
  computeTerrainView,
  toDate,
  type MissionView,
  type PersonRef,
  type QueueEntry,
  type WorkItem,
} from './metrics';
import { photosToChiffrageOpen } from './analytics';
import type { DashboardChiffrage, DashboardMission } from './use-dashboard-data';
import { fmtHours } from './ui';
import { PhoneBlock, PhoneBlockRow, PhoneKpiLine, type PhoneKpi } from './phone-blocks';

/** Design: three rows per block, the rest behind « Voir tout ». */
const ROWS = 3;

const refOfDossier = (d: FunnelDossier | null | undefined, fallback: string): string => {
  const raw = (d as any)?.refExpert;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
};
const whoOfDossier = (d: FunnelDossier | null | undefined): string => assureName((d as any)?.assure) || ((d as any)?.compagnie ?? '');

// ── Gestionnaire ────────────────────────────────────────────────────────────

export interface PhoneGestionnaireDashboardProps {
  dossiers: FunnelDossier[];
  chiffrages?: DashboardChiffrage[];
  sla: SlaItem[];
  rappelsRecus: Rappel[];
  holidays: ReadonlySet<string>;
  now: Date;
  person: PersonRef | null;
  loading: boolean;
  /** Admin « view as » / team roll-up: the rappels are the signed-in user's, so their block is hidden. */
  viewAs?: boolean;
}

export function PhoneGestionnaireDashboard({ dossiers, chiffrages = [], sla, rappelsRecus, holidays, now, person, loading, viewAs }: PhoneGestionnaireDashboardProps) {
  const t = useT();
  const view = useMemo(() => computeGestionnaireView(dossiers, sla, rappelsRecus, holidays, now, person), [dossiers, sla, rappelsRecus, holidays, now, person]);
  const handoff = useMemo(() => photosToChiffrageOpen(dossiers, chiffrages, holidays, now, person), [dossiers, chiffrages, holidays, now, person]);
  const { tiles } = view;
  const attente = view.enAttente.reduce((n, g) => n + g.count, 0);
  const unread = useMemo(() => rappelsRecus.filter((r) => !r.read), [rappelsRecus]);

  const kpis: PhoneKpi[] = [
    { key: 'ouverts', value: tiles.enCours, label: t('ouverts'), href: '/dossiers' },
    { key: 'retard', value: tiles.enRetard, label: t('en retard'), danger: tiles.enRetard > 0 },
    { key: 'attente', value: attente, label: t('en attente d’un tiers') },
    { key: 'termines', value: tiles.termines7, label: `${t('terminés')} / 7 j` },
  ];
  if (!viewAs) kpis.splice(2, 0, { key: 'rappels', value: tiles.rappelsNonLus, label: t('rappels non lus'), href: '/mes-rappels' });

  const rowOf = (w: WorkItem, withWho = true) => (
    <PhoneBlockRow
      key={w.id}
      href={`/dossiers/${w.dossier.id}`}
      id={refOfDossier(w.dossier, w.dossier.id)}
      who={withWho ? whoOfDossier(w.dossier) || t(w.todo.label) : t(w.todo.label)}
      time={w.since ? fmtHours(w.ageHours) : undefined}
      timeTone={w.late ? 'danger' : 'neutral'}
    />
  );

  const late = view.aTraiter.filter((w) => w.late);

  return (
    <div className="flex flex-col gap-2">
      <PhoneKpiLine items={kpis} />

      {/* Exceptions first (Few: the exception is the reason to open the page). */}
      {(loading || late.length > 0) && (
        <PhoneBlock title={t('Hors délai')} count={late.length} countTone="danger" moreHref="/dossiers" loading={loading} dataTour="dash-late">
          {late.slice(0, ROWS).map((w) => rowOf(w))}
        </PhoneBlock>
      )}

      <PhoneBlock
        title={t('À traiter')}
        count={view.aTraiter.length}
        moreHref="/dossiers"
        moreLabel={t('Voir tout')}
        emptyText={t('Rien à traiter — vos dossiers avancent.')}
        loading={loading}
        dataTour="dash-worklist"
      >
        {view.aTraiter.filter((w) => !w.late).slice(0, ROWS).map((w) => rowOf(w))}
      </PhoneBlock>

      <PhoneBlock
        title={t('Sans mouvement')}
        count={view.sansMouvement.length}
        countTone="danger"
        caption={t('Aucune action depuis plus de 2 j ouvrés')}
        moreHref={view.sansMouvement.length > ROWS ? '/dossiers' : undefined}
        emptyText={t('Tous vos dossiers ont bougé récemment.')}
        loading={loading}
      >
        {view.sansMouvement.slice(0, ROWS).map((w) => rowOf(w, false))}
      </PhoneBlock>

      <PhoneBlock
        title={t('Photos reçues, chiffrage à demander')}
        count={handoff.length}
        moreHref={handoff.length > ROWS ? '/dossiers' : undefined}
        emptyText={t('Tout ce qui est photographié est parti au chiffrage.')}
        loading={loading}
      >
        {handoff.slice(0, ROWS).map((h) => (
          <PhoneBlockRow
            key={h.dossier.id}
            href={`/dossiers/${h.dossier.id}`}
            id={refOfDossier(h.dossier, h.dossier.id)}
            who={whoOfDossier(h.dossier)}
            time={fmtHours(h.sinceHours)}
            timeTone={h.sinceHours > 24 ? 'danger' : 'neutral'}
          />
        ))}
      </PhoneBlock>

      {!viewAs && (
        <PhoneBlock
          title={t('Rappels non lus')}
          count={unread.length}
          countTone="info"
          moreHref="/mes-rappels"
          emptyText={t('rien en attente de lecture')}
          loading={loading}
        >
          {unread.slice(0, ROWS).map((r) => {
            const at = toDate(r.createdAt);
            return (
              <PhoneBlockRow
                key={r.id}
                href={`/mes-rappels?rappel=${encodeURIComponent(r.id)}`}
                id={r.dossierRef || r.dossierId}
                who={r.senderNom || '—'}
                time={at ? format(at, 'd MMM', { locale: dateFnsLocale() }) : undefined}
              />
            );
          })}
        </PhoneBlock>
      )}
    </div>
  );
}

// ── Chiffreur ───────────────────────────────────────────────────────────────

export interface PhoneChiffreurDashboardProps {
  chiffrages: DashboardChiffrage[];
  dossiers: FunnelDossier[];
  holidays: ReadonlySet<string>;
  now: Date;
  person: PersonRef | null;
  loading: boolean;
}

const refOfEntry = (e: QueueEntry): string => {
  const raw = (e.dossier as any)?.refExpert ?? e.chiffrage.dossierNom;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : e.chiffrage.dossierId;
};
const whoOfEntry = (e: QueueEntry): string => {
  const d: any = e.dossier;
  return d?.garageName || d?.compagnie || e.chiffrage.sentByNom || '';
};

export function PhoneChiffreurDashboard({ chiffrages, dossiers, holidays, now, person, loading }: PhoneChiffreurDashboardProps) {
  const t = useT();
  const view = useMemo(() => computeChiffreurView(chiffrages, dossiers, holidays, now, person), [chiffrages, dossiers, holidays, now, person]);
  const { tiles } = view;

  const kpis: PhoneKpi[] = [
    { key: 'attente', value: tiles.enAttente, label: t('en attente'), href: '/assignations-chiffrage' },
    { key: 'hors', value: tiles.horsDelai, label: t('hors délai'), danger: tiles.horsDelai > 0 },
    { key: 'rev', value: tiles.revisionsEnAttente, label: t('révisions') },
    { key: 'termines', value: tiles.termines7, label: `${t('terminés')} / 7 j` },
    { key: 'delais', value: tiles.dansDelais30.pct == null ? '—' : `${tiles.dansDelais30.pct} %`, label: `${t('dans les délais')} · 30 j` },
  ];

  const rowOf = (e: QueueEntry) => {
    const late = e.late;
    const time = late ? `+${fmtHours(e.elapsedHours - 24)}` : fmtHours(e.remainingHours);
    return (
      <PhoneBlockRow
        key={e.chiffrage.id}
        href={`/assignations-chiffrage/${e.chiffrage.id}`}
        id={refOfEntry(e)}
        who={whoOfEntry(e)}
        chip={e.revision ? <Badge variant="info">{`${e.round}ᵉ ${t('accord')}`}</Badge> : undefined}
        time={time}
        timeTone={late ? 'danger' : e.band === 'À venir' ? 'neutral' : 'time'}
        ariaLabel={`${refOfEntry(e)} · ${late ? t('dépassée depuis') : t('échéance dans')} ${fmtHours(late ? e.elapsedHours - 24 : e.remainingHours)}`}
      />
    );
  };

  const late = view.queue.filter((e) => e.late);
  const next = view.queue.filter((e) => !e.late);
  const revisions = view.queue.filter((e) => e.revision);

  return (
    <div className="flex flex-col gap-2">
      <PhoneKpiLine items={kpis} />

      {(loading || late.length > 0) && (
        <PhoneBlock title={t('Dépassées')} count={late.length} countTone="danger" caption={t('au-delà de 24 h ouvrées · dépassement')} moreHref="/assignations-chiffrage" loading={loading} dataTour="dash-late">
          {late.slice(0, ROWS).map(rowOf)}
        </PhoneBlock>
      )}

      <PhoneBlock
        title={t('Ma file')}
        count={view.queue.length}
        caption={t('Le premier est le prochain à chiffrer · temps restant')}
        moreHref="/assignations-chiffrage"
        moreLabel={t('Ouvrir la file')}
        emptyText={t('File vide — aucun chiffrage en attente.')}
        loading={loading}
        dataTour="dash-worklist"
      >
        {next.slice(0, ROWS).map(rowOf)}
      </PhoneBlock>

      <PhoneBlock
        title={t('Révisions')}
        count={revisions.length}
        countTone="info"
        moreHref={revisions.length > ROWS ? '/assignations-chiffrage' : undefined}
        emptyText={t('Aucune révision en attente.')}
        loading={loading}
      >
        {revisions.slice(0, ROWS).map(rowOf)}
      </PhoneBlock>
    </div>
  );
}

// ── Agent de Terrain ────────────────────────────────────────────────────────

export interface PhoneTerrainDashboardProps {
  missions: DashboardMission[];
  dossiers: FunnelDossier[];
  holidays: ReadonlySet<string>;
  now: Date;
  person: PersonRef | null;
  loading: boolean;
}

const refOfMission = (v: MissionView): string => {
  const raw = (v.dossier as any)?.refExpert ?? v.mission.dossierNom;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : v.mission.dossierId;
};
const whoOfMission = (v: MissionView): string => assureName((v.dossier as any)?.assure) || (v.dossier as any)?.compagnie || '';
const phoneOfMission = (v: MissionView): string | null => {
  const a: any = (v.dossier as any)?.assure;
  const p = typeof a === 'object' && a ? a.telephone || a.whatsapp || a.telephone2 : null;
  return typeof p === 'string' && p.trim() ? p.trim() : null;
};
const placeOfMission = (v: MissionView): string => [v.mission.zone, v.mission.adresse].filter((s) => typeof s === 'string' && s.trim()).join(' · ');
const hrefOfMission = (v: MissionView): string => `/assignations-atg/${v.mission.dossierId}${v.type ? `?mission=${encodeURIComponent(v.type)}` : ''}`;
const mapsHref = (v: MissionView): string | null => {
  const dest = placeOfMission(v);
  return dest ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving` : null;
};

export function PhoneTerrainDashboard({ missions, dossiers, holidays, now, person, loading }: PhoneTerrainDashboardProps) {
  const t = useT();
  const view = useMemo(() => computeTerrainView(missions, dossiers, holidays, now, person), [missions, dossiers, holidays, now, person]);
  const next = view.next;
  const fmtTime = (d: Date | null) => (d ? format(d, 'HH:mm', { locale: dateFnsLocale() }) : '—');
  const fmtDay = (d: Date | null) => (d ? format(d, 'EEE d', { locale: dateFnsLocale() }) : '');

  const kpis: PhoneKpi[] = [
    { key: 'today', value: view.today.length, label: t('aujourd’hui'), href: '/assignations-atg' },
    { key: 'late', value: view.late.length, label: t('en retard'), danger: view.late.length > 0 },
    { key: 'photos', value: view.photosAEnvoyer.length, label: t('photos à envoyer') },
    { key: 'week', value: `${view.tiles.semaineFaites} / ${view.tiles.semainePlanifiees}`, label: t('cette semaine') },
    { key: 'tomorrow', value: view.tomorrow.length, label: t('demain') },
  ];

  const typeChip = (v: MissionView) => (v.type ? <Badge variant="neutral">{t(v.type)}</Badge> : undefined);

  return (
    <div className="flex flex-col gap-2">
      <PhoneKpiLine items={kpis} />

      {/* Prochaine mission — the one terracotta anchor of the screen. */}
      <section className={RECORD_CARD_CLASS} data-tour="dash-next">
        <div className="flex items-center gap-2 px-3.5 pb-1 pt-2.5">
          <h2 className="text-[15px] font-semibold leading-5 text-ink">{t('Prochaine mission')}</h2>
          {next?.rdv && isSameDay(next.rdv, now) && <Badge variant="time">{t("Aujourd'hui")}</Badge>}
        </div>
        {loading ? (
          <div className="space-y-2 px-3.5 pb-3.5 pt-1" aria-busy="true">
            <div className="h-11 w-[52px] animate-pulse rounded-lg bg-surface-2" />
            <div className="h-4 w-48 animate-pulse rounded bg-surface-2" />
          </div>
        ) : !next ? (
          <p className="flex min-h-[48px] items-center px-3.5 pb-2 text-[14px] text-ink-2">
            {view.late.length > 0 ? t('Aucune mission planifiée à venir.') : t('Journée terminée — aucune mission à venir.')}
          </p>
        ) : (
          <>
            <Link href={hrefOfMission(next)} className="flex items-start gap-2.5 px-3.5 pb-2.5 pt-1 active:bg-surface-2/60">
              <DateBlock time={fmtTime(next.rdv)} day={fmtDay(next.rdv)} emphasis="next" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[12px] font-semibold leading-4 tabular-nums text-ink-3">{refOfMission(next)}</span>
                  {typeChip(next)}
                </span>
                {whoOfMission(next) && <span className="text-[15px] font-semibold leading-[1.3] text-ink [text-wrap:pretty]">{whoOfMission(next)}</span>}
                {placeOfMission(next) && (
                  <span className="flex items-start gap-1 text-[12px] leading-4 text-ink-3">
                    <MapPin className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{placeOfMission(next)}</span>
                  </span>
                )}
              </span>
            </Link>
            <RecordCardActions>
              <Button asChild className="flex-1 font-semibold max-md:min-h-0">
                <Link href={hrefOfMission(next)}>{next.checkedIn ? t('Envoyer les photos') : t('Ouvrir la mission')}</Link>
              </Button>
              <Button asChild={!!mapsHref(next)} variant="outline" size="icon" className="max-md:h-9 max-md:w-9 max-md:min-h-0" disabled={!mapsHref(next)} aria-label={t('Itinéraire')}>
                {mapsHref(next) ? (
                  <a href={mapsHref(next)!} target="_blank" rel="noopener noreferrer">
                    <MapPin aria-hidden />
                  </a>
                ) : (
                  <MapPin aria-hidden />
                )}
              </Button>
              <Button asChild={!!phoneOfMission(next)} variant="outline" size="icon" className="max-md:h-9 max-md:w-9 max-md:min-h-0" disabled={!phoneOfMission(next)} aria-label={t('Appeler')}>
                {phoneOfMission(next) ? (
                  <a href={`tel:${phoneOfMission(next)}`}>
                    <Phone aria-hidden />
                  </a>
                ) : (
                  <Phone aria-hidden />
                )}
              </Button>
            </RecordCardActions>
            {(!mapsHref(next) || !phoneOfMission(next)) && (
              <p className="px-3.5 pb-2.5 text-[12px] leading-4 text-ink-3">
                {[!mapsHref(next) && t('Aucune adresse sur la mission'), !phoneOfMission(next) && t('Aucun numéro sur le dossier')].filter(Boolean).join(' · ')}
              </p>
            )}
          </>
        )}
      </section>

      {(loading || view.late.length > 0) && (
        <PhoneBlock title={t('En retard')} count={view.late.length} countTone="danger" caption={t('RDV passé sans photos, ou plus de 24 h ouvrées')} moreHref="/assignations-atg" loading={loading} dataTour="dash-late">
          {view.late.slice(0, ROWS).map((v) => (
            <PhoneBlockRow
              key={`${v.mission.dossierId}-${v.mission.id}`}
              href={hrefOfMission(v)}
              id={refOfMission(v)}
              who={whoOfMission(v)}
              chip={typeChip(v)}
              time={v.lateReason === 'rdv' ? fmtDay(v.rdv) : fmtHours(v.ageHours)}
              timeTone="danger"
            />
          ))}
        </PhoneBlock>
      )}

      <PhoneBlock
        title={t('Visites aujourd’hui')}
        count={view.today.length}
        countTone="time"
        moreHref="/assignations-atg"
        moreLabel={t('Toutes les missions')}
        emptyText={t("Aucune visite planifiée aujourd'hui")}
        loading={loading}
        dataTour="dash-worklist"
      >
        {view.today.slice(0, ROWS).map((v) => (
          <PhoneBlockRow
            key={`${v.mission.dossierId}-${v.mission.id}`}
            href={hrefOfMission(v)}
            id={refOfMission(v)}
            who={whoOfMission(v)}
            chip={typeChip(v)}
            time={fmtTime(v.rdv)}
            timeTone={v.done ? 'neutral' : 'time'}
          />
        ))}
      </PhoneBlock>

      {(loading || view.photosAEnvoyer.length > 0) && (
        <PhoneBlock title={t('Photos à envoyer')} count={view.photosAEnvoyer.length} countTone="warning" caption={t('Pointage fait, photos pas encore envoyées')} loading={loading}>
          {view.photosAEnvoyer.slice(0, ROWS).map((v) => (
            <PhoneBlockRow key={`${v.mission.dossierId}-${v.mission.id}`} href={hrefOfMission(v)} id={refOfMission(v)} who={whoOfMission(v)} chip={typeChip(v)} time={fmtDay(v.rdv)} />
          ))}
        </PhoneBlock>
      )}

      <PhoneBlock
        title={t('Demain')}
        count={view.tomorrow.length}
        caption={view.laterCount > 0 ? `${view.laterCount} ${t('ensuite')}` : undefined}
        moreHref={view.tomorrow.length > ROWS ? '/assignations-atg' : undefined}
        emptyText={t('Rien de planifié demain')}
        loading={loading}
      >
        {view.tomorrow.slice(0, ROWS).map((v) => (
          <PhoneBlockRow key={`${v.mission.dossierId}-${v.mission.id}`} href={hrefOfMission(v)} id={refOfMission(v)} who={whoOfMission(v)} chip={typeChip(v)} time={fmtTime(v.rdv)} />
        ))}
      </PhoneBlock>
    </div>
  );
}
