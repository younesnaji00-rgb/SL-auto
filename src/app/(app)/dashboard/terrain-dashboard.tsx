'use client';

/**
 * Agent de Terrain dashboard — "be at the right vehicle at the right time with
 * the right photos" (GQM viewpoint: the inspector, today). Phone-first: ONE
 * column, the next mission as a card with the three one-tap actions, then
 * today, then what is late, then photos to send, tomorrow collapsed. No
 * charts (theory C3 · role-based C1 · elements B7/B10). Contrast: body ink,
 * ≥ 48 px rows and full-width primary action.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Phone, ChevronRight } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { assureName } from '@/lib/dossier-label';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FunnelDossier } from '../monitoring/funnel';
import { computeTerrainView, type MissionView, type PersonRef } from './metrics';
import type { DashboardMission } from './use-dashboard-data';
import { Block, DoneLine, StatTile, WorkRow, fmtHours } from './ui';

const refOf = (v: MissionView): string => {
  const raw = (v.dossier as any)?.refExpert ?? v.mission.dossierNom;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : v.mission.dossierId;
};
const whoOf = (v: MissionView): string => assureName((v.dossier as any)?.assure) || (v.dossier as any)?.compagnie || '';
const phoneOf = (v: MissionView): string | null => {
  const a: any = (v.dossier as any)?.assure;
  const p = typeof a === 'object' && a ? a.telephone || a.whatsapp || a.telephone2 : null;
  return typeof p === 'string' && p.trim() ? p.trim() : null;
};
const placeOf = (v: MissionView): string => [v.mission.zone, v.mission.adresse].filter((s) => typeof s === 'string' && s.trim()).join(' · ');
const hrefOf = (v: MissionView): string =>
  `/assignations-atg/${v.mission.dossierId}${v.type ? `?mission=${encodeURIComponent(v.type)}` : ''}`;
const mapsHref = (v: MissionView): string | null => {
  const dest = placeOf(v);
  return dest ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving` : null;
};

function TypeChip({ type }: { type: MissionView['type'] }) {
  const t = useT();
  if (!type) return null;
  return <Badge variant="neutral">{t(type)}</Badge>;
}

function StatusChip({ v }: { v: MissionView }) {
  const t = useT();
  if (v.done) return <Badge variant="success">{t('Photos envoyées')}</Badge>;
  if (v.late) return <Badge variant="danger">{v.lateReason === 'rdv' ? t('RDV passé') : t('Hors délai')}</Badge>;
  if (v.checkedIn) return <Badge variant="warning">{t('Photos à envoyer')}</Badge>;
  return null;
}

export interface TerrainDashboardProps {
  missions: DashboardMission[];
  dossiers: FunnelDossier[];
  holidays: ReadonlySet<string>;
  now: Date;
  person: PersonRef | null;
  loading: boolean;
}

export function TerrainDashboard({ missions, dossiers, holidays, now, person, loading }: TerrainDashboardProps) {
  const t = useT();
  const view = useMemo(() => computeTerrainView(missions, dossiers, holidays, now, person), [missions, dossiers, holidays, now, person]);
  const next = view.next;
  const fmtTime = (d: Date | null) => (d ? format(d, 'HH:mm', { locale: dateFnsLocale() }) : '—');
  const fmtDay = (d: Date | null) => (d ? format(d, 'EEE d MMM', { locale: dateFnsLocale() }) : '');

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* 1 — Next mission: the one terracotta anchor of the screen (time = terracotta). */}
      <Card data-tour="dash-next" className="overflow-hidden p-0">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <h2 className="t-heading">{t('Prochaine mission')}</h2>
          {next?.rdv && isSameDay(next.rdv, now) && <Badge variant="time">{t("Aujourd'hui")}</Badge>}
        </div>
        {loading ? (
          <div className="space-y-3 p-5">
            <div className="h-10 w-24 animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-48 animate-pulse rounded bg-surface-2" />
          </div>
        ) : !next ? (
          <DoneLine
            title={view.late.length > 0 ? t('Aucune mission planifiée à venir.') : t('Journée terminée — aucune mission à venir.')}
            detail={`${view.tiles.semaineFaites} ${t('faites cette semaine')}`}
          />
        ) : (
          <div className="p-5 pt-3">
            <div className="flex items-start gap-4">
              {/* Date block: solid terracotta = THE next one (element-specs §4 / time ruling). */}
              <div className="flex shrink-0 flex-col items-center rounded-lg bg-tertiary px-3 py-2 text-tertiary-foreground shadow-rim-filled">
                <span className="text-xl font-semibold leading-none tabular-nums">{fmtTime(next.rdv)}</span>
                <span className="mt-1 text-[11px] font-medium leading-none opacity-90">{fmtDay(next.rdv)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="t-mono font-semibold">{refOf(next)}</span>
                  <TypeChip type={next.type} />
                  <StatusChip v={next} />
                </p>
                {whoOf(next) && <p className="mt-1 text-sm font-medium text-ink">{whoOf(next)}</p>}
                {placeOf(next) && (
                  <p className="mt-0.5 flex items-start gap-1 text-sm text-ink-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                    <span>{placeOf(next)}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button asChild className="h-12 w-full font-semibold sm:col-span-1">
                <Link href={hrefOf(next)}>{next.checkedIn ? t('Envoyer les photos') : t('Ouvrir la mission')}</Link>
              </Button>
              {mapsHref(next) ? (
                <Button asChild variant="outline" className="h-12 w-full">
                  <a href={mapsHref(next)!} target="_blank" rel="noopener noreferrer">
                    <MapPin className="mr-2 h-4 w-4" aria-hidden />
                    {t('Itinéraire')}
                  </a>
                </Button>
              ) : (
                <Button variant="outline" className="h-12 w-full" disabled title={t('Aucune adresse sur la mission')}>
                  <MapPin className="mr-2 h-4 w-4" aria-hidden />
                  {t('Itinéraire')}
                </Button>
              )}
              {phoneOf(next) ? (
                <Button asChild variant="outline" className="h-12 w-full">
                  <a href={`tel:${phoneOf(next)}`}>
                    <Phone className="mr-2 h-4 w-4" aria-hidden />
                    {t('Appeler')}
                  </a>
                </Button>
              ) : (
                <Button variant="outline" className="h-12 w-full" disabled title={t('Aucun numéro sur le dossier')}>
                  <Phone className="mr-2 h-4 w-4" aria-hidden />
                  {t('Appeler')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 2 — Late: the exception colour only on the header count and only when > 0. */}
      <Block title={t('En retard')} count={view.late.length} countDanger caption={t('RDV passé sans photos, ou plus de 24 h ouvrées depuis la planification')} dataTour="dash-late">
        {view.late.length === 0 ? (
          <DoneLine title={t('Rien en retard')} detail={next?.rdv ? `${t('prochaine échéance')} : ${fmtDay(next.rdv)} ${fmtTime(next.rdv)} · ${refOf(next)}` : undefined} />
        ) : (
          view.late.map((v) => (
            <WorkRow
              key={`${v.mission.dossierId}-${v.mission.id}`}
              href={hrefOf(v)}
              id={refOf(v)}
              who={whoOf(v)}
              label={v.type ? t(v.type) : undefined}
              time={v.lateReason === 'rdv' ? `${t('RDV le')} ${fmtDay(v.rdv)}` : `${t('depuis')} ${fmtHours(v.ageHours)}`}
              timeTone="danger"
              tall
            />
          ))
        )}
      </Block>

      {/* 3 — Today, in RDV order. */}
      <Block title={t("Aujourd'hui")} count={view.today.length} caption={t('Dans l’ordre des rendez-vous')} moreHref="/assignations-atg" moreLabel={t('Toutes les missions')} dataTour="dash-worklist">
        {view.today.length === 0 ? (
          <DoneLine title={t("Aucune visite planifiée aujourd'hui")} detail={view.tomorrow.length > 0 ? `${view.tomorrow.length} ${t('demain')}` : undefined} />
        ) : (
          view.today.map((v) => (
            <Link
              key={`${v.mission.dossierId}-${v.mission.id}`}
              href={hrefOf(v)}
              className={cn(
                'flex min-h-[56px] items-center gap-3 border-t border-hairline px-5 py-2 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2',
                v === next && 'border-l-[3px] border-l-tertiary pl-[17px]',
              )}
            >
              <span className="w-12 shrink-0 font-semibold tabular-nums text-ink">{fmtTime(v.rdv)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="t-mono font-semibold">{refOf(v)}</span>
                  <TypeChip type={v.type} />
                  <StatusChip v={v} />
                </span>
                {(whoOf(v) || placeOf(v)) && <span className="mt-0.5 block truncate text-ink-2">{[whoOf(v), placeOf(v)].filter(Boolean).join(' · ')}</span>}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" aria-hidden />
            </Link>
          ))
        )}
      </Block>

      {/* 4 — Photos to send: only when non-empty. */}
      {view.photosAEnvoyer.length > 0 && (
        <Block title={t('Photos à envoyer')} count={view.photosAEnvoyer.length} caption={t('Pointage fait, photos pas encore envoyées')}>
          {view.photosAEnvoyer.map((v) => (
            <WorkRow key={`${v.mission.dossierId}-${v.mission.id}`} href={hrefOf(v)} id={refOf(v)} who={whoOf(v)} label={v.type ? t(v.type) : undefined} time={fmtDay(v.rdv)} tall />
          ))}
        </Block>
      )}

      {/* 5 — Tomorrow collapsed + two detail tiles (one chunk on a phone). */}
      <div className="grid grid-cols-2 gap-4">
        <StatTile
          label={t('Cette semaine')}
          size="detail"
          value={
            <span className="tabular-nums">
              {view.tiles.semaineFaites} <span className="text-base font-normal text-ink-3">/ {view.tiles.semainePlanifiees}</span>
            </span>
          }
          caption={<span>{t('faites / planifiées')}</span>}
          loading={loading}
          dataTour="dash-tiles"
        />
        <StatTile
          label={t('Demain')}
          size="detail"
          value={view.tomorrow.length}
          caption={<span>{view.laterCount > 0 ? `${view.laterCount} ${t('ensuite')}` : t('rien ensuite')}</span>}
          loading={loading}
          href="/assignations-atg"
        />
      </div>
    </div>
  );
}

export default TerrainDashboard;
