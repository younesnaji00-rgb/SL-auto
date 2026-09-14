'use client';

/**
 * Missions terrain — PHONE rendering (mobile redesign 2026-09-14, Claude
 * Design handoff `Phone.dc.html` « Terrain · Missions — cartes par groupe »,
 * turn 3c). Mounted by `page.tsx` below md only; the desktop table and the
 * demo phone frame are untouched.
 *
 *   top bar (shell)  « Missions »  Bonjour <prénom> · mar. 16 sept. · 12 missions
 *                    ⌕ search « Réf., assuré, lieu… » · ⚙︎ Filtres (n) · [scan]
 *   sticky           Avant 12 | En cours 4 | Après 3         (36 px tabs, 2 px rule)
 *   summary chips    ⚠ En retard 2 · Aujourd’hui 4 · À venir 6 · ◷ Prochaine 11:00
 *   group band       En retard (2)                          Itinéraire →
 *   cards            [14:30 / ven. 12]  SL-25-0399                          ☏
 *                                        Rachid Idrissi
 *                                        Aïn Sebaâ · 0 photo · En retard 2 j
 *
 * Every element maps to what the page already computes: the triage groups
 * (En retard first), the 24 business-hour deadline chip, the per-phase photo
 * count, the single NEXT mission (solid terracotta block), the group route.
 * Cards are built on `RECORD_CARD_CLASS` rather than `<RecordCard>` because
 * the design puts the ☏ link OUTSIDE the card's tap target (a link inside a
 * link is invalid HTML), otherwise they follow the RecordCard anatomy to the
 * pixel (id mono 12 ink-3 above the name 15/600, meta 12 ink-3 with chips).
 */

import React, { useMemo, useRef, useState } from 'react';
import { Navigation, Phone, ScanLine, Clock, TriangleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DateBlock } from '@/components/ui/date-block';
import { RECORD_CARD_CLASS, RecordCardList, RecordCardListSkeleton } from '@/components/ui/record-card';
import { FilterSheet, FilterSection, FilterSelect } from '@/components/ui/filter-sheet';
import { usePhoneChrome } from '@/components/layout/page-chrome';
import { useT, dateFnsLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import AtScanPlaqueFlow from './at-scan-plaque-flow';
import { telHref } from './mission-quick-actions';

/* ------------------------------------------------------------------ */
/* Types — structural, so the page's PlanificationItem fits as-is       */
/* ------------------------------------------------------------------ */

export type PhoneMissionGroupKey = 'today' | 'expired' | 'future';
export type PhotoCategory = 'avant' | 'en_cours' | 'apres';

export interface PhoneMission {
  id: string;
  dossierId: string;
  dossierNom?: string;
  assureNom?: string;
  assureTelephone?: string;
  compagnie?: string;
  agentTerrain: string;
  typeMission: string;
  dateRDV: any;
  createdAt: any;
  checkinAt?: any;
  zone: string;
  adresse: string;
  observation: string;
}

export interface PhoneMissionGroup {
  key: PhoneMissionGroupKey;
  label: string;
  items: PhoneMission[];
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'time';
}

export interface PhoneMissionLive {
  photos: Record<PhotoCategory, number>;
  matricule?: string;
  assureTelephone: string;
}

/** The sheet-applied filters (the keyword lives in the bar's search field). */
export interface PhoneMissionFilters {
  compagnieFilter: string;
  agentFilter: string;
  dateFrom: string;
  dateTo: string;
}

export interface PhoneMissionsListProps {
  loading: boolean;
  /** Triage groups in display order (En retard · Aujourd’hui · À venir), empty ones included. */
  groups: PhoneMissionGroup[];
  /** Missions of the active phase BEFORE the sheet filters — feeds the live « Afficher N missions ». */
  tabItems: PhoneMission[];
  /** Missions after every filter (the subtitle count). */
  filteredCount: number;
  activeTab: string;
  countByType: Record<string, number>;
  onTabChange: (id: string) => void;
  keyword: string;
  onKeywordChange: (value: string) => void;
  filters: PhoneMissionFilters;
  filterDefaults: PhoneMissionFilters;
  onApplyFilters: (next: PhoneMissionFilters) => void;
  compagnieOptions: Array<[string, number]>;
  agentOptions: Array<[string, number]>;
  canSeeNameFilter: boolean;
  /** Realtime per-dossier facts (photo counts, plate, phone). */
  live: Record<string, PhoneMissionLive>;
  /** `${dossierId}-${planifId}` of the single next upcoming RDV. */
  nextMissionKey: string | null;
  nextTime: string | null;
  onOpenMission: (p: PhoneMission) => void;
  onOpenNext: (() => void) | null;
  /** Group « Itinéraire » — the page's multi-stop Google Maps route. */
  onRoute: (items: PhoneMission[]) => void;
  /** The page's DeadlineChip (24 business hours; `calm` inside En retard). */
  renderDeadline: (p: PhoneMission, calm: boolean) => React.ReactNode;
  /** Plate-scan entry allowed for this user (the bar's filled button). */
  canScan: boolean;
  greetingName: string;
  emptyState: React.ReactNode;
}

const MISSION_TABS = [
  { id: 'Avant', label: 'Avant' },
  { id: 'En cours', label: 'En cours' },
  { id: 'Après', label: 'Après' },
];

function toDate(ts: any): Date | null {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts);
}

function missionToCategory(typeMission: string): PhotoCategory {
  const n = typeMission === 'Apres' ? 'Après' : typeMission;
  if (n === 'En cours') return 'en_cours';
  if (n === 'Après') return 'apres';
  return 'avant';
}

function missionKey(p: PhoneMission): string {
  return `${p.dossierId}-${p.id}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function PhoneMissionsList({
  loading,
  groups,
  tabItems,
  filteredCount,
  activeTab,
  countByType,
  onTabChange,
  keyword,
  onKeywordChange,
  filters,
  filterDefaults,
  onApplyFilters,
  compagnieOptions,
  agentOptions,
  canSeeNameFilter,
  live,
  nextMissionKey,
  nextTime,
  onOpenMission,
  onOpenNext,
  onRoute,
  renderDeadline,
  canScan,
  greetingName,
  emptyState,
}: PhoneMissionsListProps) {
  const t = useT();
  const [sheetOpen, setSheetOpen] = useState(false);
  // The scan flow hands its camera trigger back here; the bar button calls it.
  const scanRef = useRef<(() => void) | null>(null);

  const filterCount =
    (filters.compagnieFilter !== 'Toutes' ? 1 : 0) +
    (canSeeNameFilter && filters.agentFilter !== 'Tous' ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  // ── Bar chrome: title + greeting, search, filters, the scan primary ──
  const subtitle = useMemo(() => {
    let day = '';
    try {
      day = format(new Date(), 'EEE d MMM', { locale: dateFnsLocale() });
    } catch {
      /* locale not loaded yet */
    }
    const n = filteredCount;
    return [`${t('Bonjour')} ${greetingName}`, day, `${n} ${n > 1 ? t('missions') : t('mission')}`].filter(Boolean).join(' · ');
  }, [t, greetingName, filteredCount]);

  usePhoneChrome(
    useMemo(
      () => ({
        title: 'Missions',
        subtitle,
        search: {
          value: keyword,
          onChange: onKeywordChange,
          placeholder: t('Réf., assuré, lieu…'),
        },
        filters: { count: filterCount, onOpen: () => setSheetOpen(true), dataTour: 'atg-filters' },
        primaryAction: canScan
          ? {
              label: t('Scanner la plaque'),
              icon: <ScanLine />,
              onClick: () => scanRef.current?.(),
              dataTour: 'atg-scan',
            }
          : null,
      }),
      [subtitle, keyword, onKeywordChange, filterCount, canScan, t],
    ),
  );

  // ── Live count for the sheet's « Afficher N missions » (Baymard) ────
  const countFor = (pending: PhoneMissionFilters): number => {
    let results = tabItems;
    if (pending.compagnieFilter !== 'Toutes') results = results.filter((p) => (p.compagnie || '').trim() === pending.compagnieFilter);
    if (pending.agentFilter !== 'Tous') results = results.filter((p) => (p.agentTerrain || '').trim() === pending.agentFilter);
    if (pending.dateFrom) {
      const from = new Date(pending.dateFrom);
      results = results.filter((p) => {
        const d = toDate(p.dateRDV || p.createdAt);
        return !!d && d >= from;
      });
    }
    if (pending.dateTo) {
      const to = new Date(pending.dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter((p) => {
        const d = toDate(p.dateRDV || p.createdAt);
        return !!d && d <= to;
      });
    }
    if (keyword.trim()) {
      const needle = keyword.trim().toLowerCase();
      results = results.filter((p) =>
        [p.dossierNom, p.assureNom, p.assureTelephone, p.adresse, p.zone, p.observation, p.compagnie, p.agentTerrain, p.typeMission, live[p.dossierId]?.matricule]
          .some((f) => typeof f === 'string' && f.toLowerCase().includes(needle)),
      );
    }
    return results.length;
  };

  const lateCount = groups.find((g) => g.key === 'expired')?.items.length ?? 0;
  const todayCount = groups.find((g) => g.key === 'today')?.items.length ?? 0;
  const futureCount = groups.find((g) => g.key === 'future')?.items.length ?? 0;
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  const jumpToGroup = (g: PhoneMissionGroupKey) => {
    document.getElementById(`atg-group-${g}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Summary chip: 40 px hit area around a 28 px pill (the design's 26 px
  // chip, lifted to the touch floor without growing the visual).
  const summaryChip = (
    key: string,
    label: React.ReactNode,
    onClick: (() => void) | null,
    pillClass: string,
    title: string,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick ?? undefined}
      disabled={!onClick}
      title={title}
      className="flex h-10 shrink-0 items-center focus-visible:outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-ring"
    >
      <span className={cn('inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium tabular-nums', pillClass)}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col">
      {/* Scan flow: inputs + result dialog only; its button lives in the bar. */}
      {canScan && <AtScanPlaqueFlow hideButton triggerRef={scanRef} />}

      {/* Phase tabs — sticky under the bar, flush with the page edges. A VIEW
          switch, so it keeps the tab grammar (2 px rule under the active one). */}
      <div
        role="tablist"
        aria-label={t('Type de mission')}
        data-tour="atg-tabs"
        className="sticky top-0 z-30 -mx-4 -mt-4 flex gap-0.5 border-b border-hairline bg-background px-4 pt-2"
      >
        {MISSION_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                '-mb-px flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 border-b-2 pb-1.5 text-[14px] transition-colors duration-200 ease-standard motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                active ? 'border-primary font-semibold text-ink' : 'border-transparent font-medium text-ink-3',
              )}
            >
              <span className="truncate">{t(tab.label)}</span>
              <span className="text-[11px] font-medium tabular-nums text-ink-3">{countByType[tab.id] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* Summary chips — the day at a glance; each one jumps to its group. */}
      {!loading && filteredCount > 0 && (
        <div
          role="group"
          aria-label={t('Résumé des missions')}
          data-tour="atg-triage"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {summaryChip(
            'late',
            <>
              {lateCount > 0 && <TriangleAlert className="h-3.5 w-3.5" aria-hidden />}
              {t('En retard')} {lateCount}
            </>,
            lateCount > 0 ? () => jumpToGroup('expired') : null,
            lateCount > 0 ? 'bg-status-danger-bg font-semibold text-status-danger-fg' : 'border border-hairline-strong text-ink-3',
            t('Voir les missions en retard'),
          )}
          {summaryChip(
            'today',
            <>{t("Aujourd'hui")} {todayCount}</>,
            todayCount > 0 ? () => jumpToGroup('today') : null,
            'bg-tertiary-bg text-tertiary-deep',
            t("Voir les missions d'aujourd'hui"),
          )}
          {summaryChip(
            'future',
            <>{t('À venir')} {futureCount}</>,
            futureCount > 0 ? () => jumpToGroup('future') : null,
            'bg-surface-3 text-ink-2',
            t('Voir les missions à venir'),
          )}
          {nextTime &&
            summaryChip(
              'next',
              <>
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {t('Prochaine')} {nextTime}
              </>,
              onOpenNext,
              'bg-tertiary-bg text-tertiary-deep',
              t('Prochaine mission planifiée'),
            )}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="pt-3">
          <RecordCardListSkeleton count={4} ariaLabel={t('Chargement des missions')} />
        </div>
      ) : filteredCount === 0 ? (
        <div className="pt-2">{emptyState}</div>
      ) : (
        <div data-tour="atg-groups" className="flex flex-col">
          {visibleGroups.map((group) => {
            const addressable = group.items.filter((p) => p.adresse?.trim()).length;
            const calm = group.key === 'expired';
            return (
              <section key={group.key} id={`atg-group-${group.key}`} data-tour={`atg-group-${group.key}`} aria-label={t(group.label)} className="scroll-mt-14">
                {/* 34 px band: label 12/600 · count chip · « Itinéraire » link. */}
                <div className="-mx-4 mt-1 flex h-[34px] items-center gap-2 border-y border-hairline bg-surface-2 px-4">
                  <h2 className="text-[12px] font-semibold text-ink-2">{t(group.label)}</h2>
                  <Badge variant={group.tone}>{group.items.length}</Badge>
                  <button
                    type="button"
                    data-tour="atg-route"
                    disabled={addressable === 0}
                    onClick={() => onRoute(group.items)}
                    title={t("Ouvrir l'itinéraire dans Google Maps")}
                    className="-my-[3px] ml-auto flex h-10 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-ink-4 disabled:hover:bg-transparent"
                  >
                    <Navigation className="h-3.5 w-3.5" aria-hidden />
                    {t('Itinéraire')}
                  </button>
                </div>

                <RecordCardList ariaLabel={`${t('Missions')} ${t(group.label)}`} className="pb-3 pt-2">
                  {group.items.map((p) => {
                    const key = missionKey(p);
                    const rdv = toDate(p.dateRDV);
                    const dossierLive = live[p.dossierId];
                    const photoCount = dossierLive?.photos?.[missionToCategory(p.typeMission)] ?? 0;
                    const tel = telHref(dossierLive?.assureTelephone ?? p.assureTelephone);
                    const isNext = !calm && key === nextMissionKey;
                    const place = p.zone?.trim() || p.adresse?.trim() || '';
                    const checkin = toDate(p.checkinAt);
                    let day = '';
                    try {
                      day = rdv ? format(rdv, 'EEE d', { locale: dateFnsLocale() }) : '';
                    } catch {
                      /* locale not loaded yet */
                    }
                    return (
                      <li key={key} id={`atg-row-${key}`} data-tour="atg-row" data-record-id={key} className={cn(RECORD_CARD_CLASS, 'list-none')}>
                        <div className={cn('flex items-start gap-1.5 py-2.5 pl-3', tel ? 'pr-1.5' : 'pr-3.5')}>
                          <button
                            type="button"
                            onClick={() => onOpenMission(p)}
                            className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg text-left text-inherit outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-ring active:bg-surface-2/60"
                          >
                            {/* Time block: the NEXT mission is the page's one solid
                                terracotta tile; En retard tiles are muted — the chip
                                carries the alarm, not the tile (alarm-fatigue rule). */}
                            <DateBlock
                              size="sm"
                              time={rdv ? format(rdv, 'HH:mm') : '—'}
                              day={day || undefined}
                              emphasis={calm ? 'muted' : isNext ? 'next' : 'default'}
                            />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="font-mono text-[12px] font-semibold leading-4 tabular-nums text-ink-3">{p.dossierNom || p.dossierId}</span>
                              <span className="text-[15px] font-semibold leading-[1.3] text-ink [text-wrap:pretty]">{p.assureNom || '—'}</span>
                              <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] leading-4 text-ink-3 [&>*]:min-w-0">
                                {place && <span>{place}</span>}
                                {/* Photo progress: colour only for the done state; zero stays quiet. */}
                                {photoCount > 0 ? (
                                  <Badge variant="success">
                                    {photoCount} {photoCount > 1 ? t('photos') : t('photo')}
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] text-ink-4">0 {t('photo')}</span>
                                )}
                                {/* Deadline: hidden once photos exist (the mission's job is done). */}
                                {photoCount === 0 && renderDeadline(p, calm)}
                                {checkin && (
                                  <Badge variant="success">
                                    {t('Arrivé')} {format(checkin, 'HH:mm')}
                                  </Badge>
                                )}
                              </span>
                            </span>
                          </button>
                          {tel && (
                            <a
                              href={tel}
                              aria-label={`${t('Appeler')} ${p.assureNom || ''}`.trim()}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Phone className="h-5 w-5" aria-hidden />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </RecordCardList>
              </section>
            );
          })}
        </div>
      )}

      {/* Filtres — pending copy, batch apply, live count (never live-filters). */}
      <FilterSheet<PhoneMissionFilters>
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        value={filters}
        defaults={filterDefaults}
        onApply={onApplyFilters}
        countFor={countFor}
        noun={t('mission')}
        nounPlural={t('missions')}
      >
        {(pending, set) => (
          <>
            <FilterSection label={t('Compagnie')} set={pending.compagnieFilter !== 'Toutes'}>
              <FilterSelect
                ariaLabel={t('Compagnie')}
                value={pending.compagnieFilter}
                onChange={(v) => set({ compagnieFilter: v })}
                options={[
                  { value: 'Toutes', label: t('Toutes les compagnies') },
                  ...compagnieOptions.map(([name, count]) => ({ value: name, label: name, count })),
                ]}
              />
            </FilterSection>
            {canSeeNameFilter && (
              <FilterSection label={t('Agent')} set={pending.agentFilter !== 'Tous'}>
                <FilterSelect
                  ariaLabel={t('Agent')}
                  value={pending.agentFilter}
                  onChange={(v) => set({ agentFilter: v })}
                  options={[
                    { value: 'Tous', label: t('Tous les agents') },
                    ...agentOptions.map(([name, count]) => ({ value: name, label: name, count })),
                  ]}
                />
              </FilterSection>
            )}
            <FilterSection label={t('Période')} set={!!pending.dateFrom || !!pending.dateTo}>
              {/* Native date inputs — never a nested picker inside a sheet. */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="t-label">{t('Du')}</span>
                  <input
                    type="date"
                    value={pending.dateFrom}
                    onChange={(e) => set({ dateFrom: e.target.value })}
                    className="h-12 w-full rounded-md border border-input bg-card px-3 text-[16px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="t-label">{t('Au')}</span>
                  <input
                    type="date"
                    value={pending.dateTo}
                    onChange={(e) => set({ dateTo: e.target.value })}
                    className="h-12 w-full rounded-md border border-input bg-card px-3 text-[16px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
              </div>
            </FilterSection>
          </>
        )}
      </FilterSheet>
    </div>
  );
}
