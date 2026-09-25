'use client';

/**
 * Mission detail — PHONE body (mobile redesign 2026-09-14, Claude Design
 * handoff `Phone.dc.html` « Mission detail »). Mounted by `page.tsx` below md
 * only; the desktop header, panels and every upload / camera / watermark
 * handler stay in the page and are passed in as callbacks.
 *
 *   top bar (shell)   ‹ Missions   SL-25-0412 (Avant)
 *                                  Karim Benjelloun · 12345-A-6
 *   header card       [11:00 / mar. 16]  Casablanca · Maârif  (Prochain)
 *                                        Garage Atlas, 182 bd Al Massira
 *                     [ ⇗ Itinéraire ]  [ ☏ 06 61 23 45 67 ]  [ ✉ ]
 *   phases            ( Avant 12 | En cours 0 | Après 0 )          Segmented xs
 *   counter           12/40 photos                    ⇡ Importer   Réforme
 *   grid              3 columns · 1:1 tiles · dashed « + Ajouter » tile
 *   bottom bar        [ ⇗ ] [ ⌖ ]  [ ◉ Prendre des photos ]
 *
 * One header card per planification of the phase (usually one); the
 * contact row (Itinéraire · téléphone · WhatsApp) sits on the primary card
 * only — the next upcoming RDV, else the most recent plan. The agent's
 * arrival is stamped automatically at the address (GeofenceAutoCheckin, owner
 * ruling 2026-09-25); only another editor (Admin) still has the bottom bar's
 * « Confirmer l’arrivée » (useMissionCheckin), until the plan carries
 * `checkinAt`.
 *
 * Photos: « Par date / Par localisation » over one disclosure row per day or
 * place — the same gallery as the dossier's Photos on a phone (owner request
 * 2026-09-25).
 */

import React, { useMemo, useState } from 'react';
import { Camera, MapPin, MessageCircle, Navigation, Phone, Plus } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DateBlock } from '@/components/ui/date-block';
import { Segmented } from '@/components/ui/segmented';
import { BottomActionBar, type BottomActionBarSecondary } from '@/components/layout/bottom-action-bar';
import { useT, dateFnsLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { mapsSearchUrl, useMissionCheckin, waHref } from '../mission-quick-actions';
import { PhotoGrid, PhotoGroup } from '@/components/common/photo-grid';
import { usePhotoLocations } from '@/hooks/use-photo-locations';
import { PartitionTabs, type PartitionMode } from '@/app/(app)/dossiers/[id]/photos-tab';

export type MissionPhase = 'Avant' | 'En cours' | 'Après';
type PhotoCategory = 'avant' | 'en_cours' | 'apres';

const PHASES: Array<{ id: MissionPhase; label: string; category: PhotoCategory }> = [
  { id: 'Avant', label: 'Avant', category: 'avant' },
  { id: 'En cours', label: 'En cours', category: 'en_cours' },
  { id: 'Après', label: 'Après', category: 'apres' },
];

/** Structural view of a planification document. */
export interface PhonePlan {
  id: string;
  dateRDV?: any;
  zone?: string;
  adresse?: string;
  checkinAt?: any;
}

export interface PhonePhoto {
  id: string;
  url: string;
  name: string;
  category: PhotoCategory | string;
  pendingUpload?: boolean;
  /** For the « Par date / Par localisation » groups. */
  uploadedAt?: any;
  _localCreatedAt?: unknown;
  lat?: unknown;
  lng?: unknown;
  location?: unknown;
}

export interface PhoneMissionScreenProps<TPhoto extends PhonePhoto> {
  dossierId: string;
  /** Planifications of the active phase (newest first, as the page sorts them). */
  plans: PhonePlan[];
  /** The next upcoming RDV among `plans` — the solid terracotta block + « Prochain ». */
  nextPlanId: string | null;
  activeTab: MissionPhase;
  onTabChange: (phase: MissionPhase) => void;
  /** Every photo of the dossier (per-phase counts on the segments). */
  photos: TPhoto[];
  /** The active phase's photos, in display order. */
  phasePhotos: TPhoto[];
  photoCap: number;
  canEdit: boolean;
  isATG: boolean;
  isUploading: boolean;
  propositionReforme: boolean;
  reformeDisabled?: boolean;
  onToggleReforme: () => void;
  /** « Prendre des photos » / the « + » tile — the in-app camera. */
  onCamera: () => void;
  onOpenPhoto: (photo: TPhoto) => void;
  telephoneRaw: string;
  telephoneHref: string;
  /** Set when no mission of the active phase is planned: photo intake is closed, and this says why (QA bug 048). */
  noMissionReason?: string;
  /** Every planification of the dossier — a photo without GPS is placed at its visit's address. */
  allPlans?: ReadonlyArray<{ typeMission?: unknown; adresse?: unknown; dateRDV?: any }>;
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts);
}

const RIM_BTN =
  'flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md bg-card text-[13px] font-medium text-ink shadow-rim transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0';

export default function PhoneMissionScreen<TPhoto extends PhonePhoto>({
  dossierId,
  plans,
  nextPlanId,
  activeTab,
  onTabChange,
  photos,
  phasePhotos,
  photoCap,
  canEdit,
  isATG,
  isUploading,
  propositionReforme,
  reformeDisabled,
  onToggleReforme,
  onCamera,
  onOpenPhoto,
  telephoneRaw,
  telephoneHref,
  noMissionReason,
  allPlans,
}: PhoneMissionScreenProps<TPhoto>) {
  const t = useT();
  const { checkin, saving: checkinSaving } = useMissionCheckin();

  // « Par date » (default) or « Par localisation », as on the dossier's Photos.
  const [partitionMode, setPartitionMode] = useState<PartitionMode>('date');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const locationOf = usePhotoLocations(photos, allPlans ?? [], {
    unknown: t('Sans localisation'),
    rdv: t('adresse du RDV'),
  });
  const groups = useMemo(() => {
    type Group = { key: string; label: string; items: TPhoto[] };
    const list: Group[] = [];
    const byKey = new Map<string, Group>();
    const push = (key: string, label: string, photo: TPhoto) => {
      let g = byKey.get(key);
      if (!g) {
        g = { key, label, items: [] };
        byKey.set(key, g);
        list.push(g);
      }
      g.items.push(photo);
    };
    if (partitionMode === 'location') {
      for (const photo of phasePhotos) {
        const { key, label } = locationOf(photo);
        push(key, label, photo);
      }
      list.sort((a, b) => (a.key === '__unknown__' ? 1 : b.key === '__unknown__' ? -1 : a.label.localeCompare(b.label, 'fr')));
    } else {
      for (const photo of phasePhotos) {
        const d = toDate(photo.uploadedAt);
        if (!d || Number.isNaN(d.getTime())) {
          push('__undated__', t('Sans date'), photo);
          continue;
        }
        const day = startOfDay(d);
        push(String(day.getTime()), format(day, 'd MMMM yyyy', { locale: dateFnsLocale() }), photo);
      }
      list.sort((a, b) => (a.key === '__undated__' ? 1 : b.key === '__undated__' ? -1 : Number(b.key) - Number(a.key)));
    }
    return list;
  }, [phasePhotos, partitionMode, locationOf, t]);

  // Primary plan first (the next RDV, else the newest), the others after it.
  const orderedPlans = useMemo(() => {
    const primary = (nextPlanId && plans.find((p) => p.id === nextPlanId)) || plans[0] || null;
    return primary ? [primary, ...plans.filter((p) => p.id !== primary.id)] : [];
  }, [plans, nextPlanId]);
  const primaryPlan = orderedPlans[0] ?? null;

  const photoCountByPhase = useMemo(() => {
    const counts: Record<MissionPhase, number> = { Avant: 0, 'En cours': 0, 'Après': 0 };
    for (const ph of PHASES) counts[ph.id] = photos.filter((p) => p.category === ph.category).length;
    return counts;
  }, [photos]);

  // « Closed » = full, or no mission of this phase planned yet (QA bug 048).
  const atCap = phasePhotos.length >= photoCap || !!noMissionReason;
  const wa = waHref(telephoneRaw);
  const now = Date.now();

  const fmtDay = (d: Date) => {
    try {
      return format(d, 'EEE d', { locale: dateFnsLocale() });
    } catch {
      return '';
    }
  };

  const checkinTime = toDate(primaryPlan?.checkinAt);
  const caption = noMissionReason
    ? noMissionReason
    : atCap
    ? `${t('Photos complètes')} (${phasePhotos.length}/${photoCap})`
    : checkinTime
      ? `${t('Arrivé sur place')} · ${format(checkinTime, 'HH:mm')}`
      : undefined;

  const secondary: BottomActionBarSecondary[] = [
    ...(primaryPlan?.adresse?.trim()
      ? [{ label: t('Itinéraire'), icon: <Navigation />, href: mapsSearchUrl(primaryPlan.adresse.trim()), external: true }]
      : []),
    // The check-in write stays an editor's action (the bar itself always
    // shows) — never the agent's: their arrival is detected automatically.
    ...(canEdit && !isATG && primaryPlan && !primaryPlan.checkinAt
      ? [{
          label: t('Confirmer l’arrivée'),
          icon: <MapPin />,
          onClick: () => void checkin(dossierId, primaryPlan.id),
          disabled: checkinSaving,
          dataTour: 'atg-checkin',
        }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* ── Header card(s): time block · place · Prochain · address · contacts ── */}
      {orderedPlans.length === 0 ? (
        <div data-tour="atgd-header" className="flex flex-col gap-2 rounded-xl bg-card p-3 shadow-rim">
          <p className="text-[13px] text-ink-3">{t('Aucun rendez-vous planifié pour cette phase.')}</p>
          {(telephoneHref || wa) && (
            <div className="flex gap-2">
              {telephoneHref && (
                <a href={`tel:${telephoneHref}`} className={cn(RIM_BTN, 'flex-1 tabular-nums')}>
                  <Phone aria-hidden />
                  <span className="whitespace-nowrap">{telephoneRaw}</span>
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={t('Écrire sur WhatsApp')} className={cn(RIM_BTN, 'w-10 shrink-0 text-ink-2')}>
                  <MessageCircle aria-hidden />
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        orderedPlans.map((plan, i) => {
          const rdv = toDate(plan.dateRDV);
          const isNext = plan.id === nextPlanId;
          const past = !!rdv && rdv.getTime() < now;
          const zone = plan.zone?.trim() || '';
          const adresse = plan.adresse?.trim() || '';
          const primary = i === 0;
          return (
            <div key={plan.id} data-tour={primary ? 'atgd-header' : undefined} className="flex flex-col gap-2 rounded-xl bg-card p-3 shadow-rim">
              <div className="flex items-center gap-2.5">
                {/* The next RDV is the page's ONE solid terracotta block; a
                    past RDV goes muted (the chip says the state, not the tile). */}
                <DateBlock
                  time={rdv ? format(rdv, 'HH:mm') : '—'}
                  day={rdv ? fmtDay(rdv) : undefined}
                  emphasis={isNext ? 'next' : past || !rdv ? 'muted' : 'default'}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="text-[14px] font-semibold leading-tight text-ink [text-wrap:pretty]">{zone || adresse || '—'}</span>
                    {isNext && <Badge variant="time">{t('Prochain')}</Badge>}
                    {/* The check-in time is the bottom bar's caption, not a second badge here. */}
                  </span>
                  {zone && adresse && (
                    <span className="line-clamp-2 text-[13px] leading-snug text-ink-2 [overflow-wrap:anywhere]">{adresse}</span>
                  )}
                </span>
              </div>

              {/* Contacts — on the primary card only: route · call · WhatsApp. */}
              {primary && (adresse || telephoneHref || wa) && (
                <div className="flex gap-2">
                  {/* The number is never cut: it keeps its width, « Itinéraire » absorbs the overflow. */}
                  {adresse && (
                    <a href={mapsSearchUrl(adresse)} target="_blank" rel="noopener noreferrer" className={cn(RIM_BTN, 'flex-1')}>
                      <Navigation aria-hidden />
                      <span className="truncate">{t('Itinéraire')}</span>
                    </a>
                  )}
                  {telephoneHref && (
                    <a href={`tel:${telephoneHref}`} className={cn(RIM_BTN, 'shrink-0 px-3 tabular-nums', !adresse && 'flex-1')}>
                      <Phone aria-hidden />
                      <span className="whitespace-nowrap">{telephoneRaw}</span>
                    </a>
                  )}
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={t('Écrire sur WhatsApp')} className={cn(RIM_BTN, 'w-10 shrink-0 text-ink-2')}>
                      <MessageCircle aria-hidden />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* ── Phases · counter · grid ── */}
      <section aria-label={`${t('Photos')} — ${t(activeTab)}`} data-tour="atgd-photos-toggle" className="flex flex-col gap-2">
        {/* Phase segments — a VALUE picker over the photo section (xs, 30 px);
            each segment carries its photo count. */}
        <Segmented<MissionPhase>
          size="xs"
          aria-label={t('Phase de la mission')}
          value={activeTab}
          onValueChange={onTabChange}
          className="mt-1"
          options={PHASES.map((ph) => ({
            value: ph.id,
            labelText: `${t(ph.label)} ${photoCountByPhase[ph.id]}`,
            label: (
              <>
                <span className="truncate">{t(ph.label)}</span>
                <span className={cn('text-[11px] font-medium tabular-nums', activeTab === ph.id ? 'text-ink-2' : 'text-ink-3')}>{photoCountByPhase[ph.id]}</span>
              </>
            ),
          }))}
        />

        {/* « 12/40 photos » · Importer · Réforme */}
        <div data-tour="atgd-photo-actions" className="flex min-h-[40px] items-center justify-between gap-2 text-[12px] text-ink-3">
          <span className="tabular-nums">
            <b className="font-semibold text-ink">{phasePhotos.length}</b>/{photoCap} {t('photos')}
          </span>
          {canEdit && (
            <div className="flex items-center gap-3">
              {/* No gallery import (owner ruling 2026-09-24): photos come
                  from the in-app camera only (the « + » tile and the bar). */}
              {/* Proposition réforme (item 021): AT-only, reversible toggle that
                  lifts the per-mission cap — pressed = tonal, never destructive.
                  The label is FIXED; `aria-pressed` + the fill carry the state. */}
              {isATG && (
                <button
                  type="button"
                  data-tour="atgd-reforme"
                  aria-pressed={propositionReforme}
                  disabled={reformeDisabled}
                  onClick={onToggleReforme}
                  className={cn(
                    'flex h-10 items-center rounded-md px-2 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                    propositionReforme ? 'bg-accent text-accent-foreground shadow-rim' : 'text-ink-2 hover:bg-surface-2',
                  )}
                >
                  {t('Réforme')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* The phase's photos: « Par date / Par localisation », one disclosure
            row per day or place over a 3-column grid (the dossier's Photos
            gallery on a phone), then the dashed add tile. */}
        {phasePhotos.length === 0 && !(canEdit && !atCap) ? (
          <p className="py-8 text-center text-[13px] text-ink-3">{`${t('Aucune photo')} ${t(activeTab).toLowerCase()}`}</p>
        ) : (
          <>
            {phasePhotos.length > 0 && (
              <>
                <PartitionTabs value={partitionMode} onChange={setPartitionMode} />
                <div className="-mx-1">
                  {groups.map((g) => (
                    <PhotoGroup
                      key={g.key}
                      label={g.label}
                      count={g.items.length}
                      open={openGroups[g.key] ?? true}
                      onToggle={() => setOpenGroups((prev) => ({ ...prev, [g.key]: !(prev[g.key] ?? true) }))}
                    >
                      <PhotoGrid photos={g.items} onOpen={(photo) => onOpenPhoto(photo)} />
                    </PhotoGroup>
                  ))}
                </div>
              </>
            )}
            {canEdit && !atCap && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={onCamera}
                  disabled={isUploading}
                  className="flex aspect-square w-full items-center justify-center rounded-lg border-[1.5px] border-dashed border-hairline-strong px-2 text-center text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <span className="flex flex-col items-center gap-1">
                    {phasePhotos.length > 0 ? <Plus className="h-4 w-4" aria-hidden /> : <Camera className="h-5 w-5" aria-hidden />}
                    {phasePhotos.length > 0 ? t('Ajouter') : t('Prendre une photo')}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Bottom bar: Itinéraire · Confirmer l’arrivée · Prendre des photos ──
          Always painted: on a record screen it REPLACES the nav. A viewer who
          cannot edit gets the same bar with the primary closed. */}
      <BottomActionBar
        primary={{
          // The label never changes; the caption carries the reason it is
          // closed (a disabled primary must say WHY, not rename itself).
          label: t('Prendre des photos'),
          icon: <Camera />,
          onClick: onCamera,
          disabled: !canEdit || atCap || isUploading,
          loading: isUploading,
          dataTour: 'atgd-camera',
        }}
        secondary={secondary}
        caption={caption}
      />
    </div>
  );
}
