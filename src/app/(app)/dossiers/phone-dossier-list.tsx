'use client';

/**
 * Phone rendering of the Dossiers list (mobile redesign 2026-09-14 — Claude
 * Design handoff `Phone.dc.html`, dossiers `fvMerged` variant; turn 2 notes
 * « puces de portée, sans ligne KPI », turn 3 « cartes partout »).
 *
 *   [ À traiter 42 ] [ Tous 318 ] [ En retard 7 ] [ Chiffrage en cours 11 ] … [ Wafa Assurance 14 ] [ Filtres 2 ]
 *   ┌────────────────────────────────────────────┐
 *   │ SL-25-0412                        12 j     │
 *   │ Karim Benjelloun                  [statut] │
 *   │ Wafa Assurance · [observation]          ⌄  │
 *   ├─ expanded ─────────────────────────────────┤
 *   │ Statut · Compagnie · Créé par · Immat. …   │
 *   │ [ Ouvrir le dossier ] [ ☏ ] [ 🔔 ]          │
 *   └────────────────────────────────────────────┘
 *
 * Search / sort / « Filtres » live in the phone top bar (`usePhoneChrome` in
 * client-page.tsx); this file owns the sticky scope row and the card list.
 * Everything here is phone-only and wired from `client-page.tsx`'s
 * `isPhone` blocks — desktop/tablet never mount it.
 */

import * as React from 'react';
import { Bell, Phone } from 'lucide-react';
import { format, formatDistanceToNowStrict, isToday } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusChip } from '@/components/ui/status-chip';
import { ScopePills, type ScopePill } from '@/components/ui/scope-pills';
import { RecordCard, RecordCardActions, RecordCardFields, RecordCardList } from '@/components/ui/record-card';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Scope pills                                                         */
/* ------------------------------------------------------------------ */

export type PhoneDossierScope = 'a-traiter' | 'tous' | 'retard';

export interface PhoneDossierScopePillsProps {
  scope: 'a-traiter' | 'tous';
  lateOnly: boolean;
  /** Applied `status` filter (« Tous » = none). */
  statusFilter: string;
  counts: { aTraiter: number; total: number; enRetard: number };
  /** Quick status pills present in the data (label as stored + faceted count). */
  statusPills: Array<{ label: string; count: number }>;
  /** Applied `compagnie` filter (« Toutes » = none). */
  compagnieFilter?: string;
  /** ONE compagnie pill after the status pills (design « Wafa Assurance 14 »): the applied one, else the top facet. */
  compagniePill?: { label: string; count: number } | null;
  /** Applied attribute-filter count printed on the « Filtres » pill. */
  filterCount: number;
  loading?: boolean;
  onScope: (scope: PhoneDossierScope) => void;
  /** Toggles the single-valued status filter. */
  onStatus: (label: string) => void;
  /** Toggles the single-valued compagnie filter. */
  onCompagnie?: (label: string) => void;
  onOpenFilters: () => void;
}

export function PhoneDossierScopePills({
  scope,
  lateOnly,
  statusFilter,
  counts,
  statusPills,
  compagnieFilter = 'Toutes',
  compagniePill,
  filterCount,
  loading,
  onScope,
  onStatus,
  onCompagnie,
  onOpenFilters,
}: PhoneDossierScopePillsProps) {
  const t = useT();
  const n = (v: number) => (loading ? '…' : v);
  const pills: ScopePill[] = [
    { key: 'a-traiter', label: t('À traiter'), count: n(counts.aTraiter), active: scope === 'a-traiter' && !lateOnly, onClick: () => onScope('a-traiter'), dataTour: 'dos-scope-tabs' },
    { key: 'tous', label: t('Tous'), count: n(counts.total), active: scope === 'tous' && !lateOnly, onClick: () => onScope('tous') },
    { key: 'retard', label: t('En retard'), count: n(counts.enRetard), tone: 'danger', active: lateOnly, onClick: () => onScope('retard') },
    ...statusPills.map((s) => ({
      key: `status:${s.label}`,
      // The label IS the state (element-specs §11) — printed whole, never a
      // family nickname the data cannot filter on.
      label: t(s.label),
      count: n(s.count),
      active: statusFilter === s.label,
      onClick: () => onStatus(s.label),
    })),
    ...(compagniePill && onCompagnie
      ? [
          {
            key: `compagnie:${compagniePill.label}`,
            label: compagniePill.label,
            count: n(compagniePill.count),
            active: compagnieFilter === compagniePill.label,
            onClick: () => onCompagnie(compagniePill.label),
          },
        ]
      : []),
    { key: 'filtres', kind: 'filters' as const, label: t('Filtres'), count: filterCount > 0 ? filterCount : undefined, onClick: onOpenFilters, ariaLabel: filterCount > 0 ? `${t('Filtres')} (${filterCount})` : t('Filtres') },
  ];
  return (
    // `!-mt-4`: the page root's `space-y` selector out-specifies the pills'
    // own `-mt-4` bleed (PageHeader leaves an empty <header> sibling on
    // phones), so the flush-under-the-bar margin is forced here.
    <ScopePills pills={pills} sticky ariaLabel={t('Portée de la liste')} className="!-mt-4" />
  );
}

/* ------------------------------------------------------------------ */
/* Card list                                                           */
/* ------------------------------------------------------------------ */

const toDate = (v: any): Date | null => {
  if (!v) return null;
  const d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** `tel:` target — keep a leading « + », strip everything else but digits (as on the mission page). */
const telHref = (raw: string): string => {
  const s = (raw || '').trim();
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  if (!digits) return '';
  return s.startsWith('+') ? `+${digits}` : digits;
};

const RIM_ICON_BTN =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card text-ink-2 shadow-rim transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:h-4 [&>svg]:w-4';

export interface PhoneDossierListProps {
  rows: any[];
  exportMode: boolean;
  selectedRows: Set<string>;
  returnedId: string | null | undefined;
  /** Whole days since a timestamp-ish value (page helper). */
  ageDays: (v: any) => number | null;
  /** SLA lateness (page helper: action still needed AND age ≥ threshold). */
  isLate: (d: any) => boolean;
  assureName: (d: any) => string;
  creatorName: (d: any) => string;
  /** Header tap — the page's existing navigation (scroll-restore + preview tab, or the selection toggle). */
  onHeaderTap: (d: any, e: React.MouseEvent<HTMLElement>) => void;
  /** « Ouvrir le dossier » — navigates (the header may only be a Link). */
  onOpen: (d: any) => void;
  /** Bell — the page's « créer un rappel » flow; omitted → no bell. */
  onRappel?: (d: any) => void;
  ariaLabel?: string;
}

export function PhoneDossierList({
  rows,
  exportMode,
  selectedRows,
  returnedId,
  ageDays,
  isLate,
  assureName,
  creatorName,
  onHeaderTap,
  onOpen,
  onRappel,
  ariaLabel,
}: PhoneDossierListProps) {
  const t = useT();
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const toggle = React.useCallback((id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] })), []);
  const locale = dateFnsLocale();

  return (
    <RecordCardList ariaLabel={ariaLabel}>
      {rows.map((d: any) => {
        const age = ageDays(d.createdAt);
        const late = isLate(d);
        const created = toDate(d.createdAt);
        const isNew = !!created && isToday(created);
        const name = assureName(d);
        const obs: string | undefined = d.lastObservation?.text?.trim() || undefined;
        const modified = toDate(d.updatedAt ?? d.lastStatusChange?.at ?? d.lastObservation?.at ?? d.createdAt);
        const plate: string = (d.matricule || d.vehicule?.immatriculation || '').trim();
        const vehicule = [d.vehicule?.marque, d.vehicule?.modele].filter(Boolean).join(' ').trim();
        const tel = typeof d.assure === 'object' && d.assure ? telHref(d.assure.telephone || d.assure.telephone2 || d.assure.whatsapp || '') : '';
        const isOpen = !!expanded[d.id];

        // Age: terracotta owns TIME (« Aujourd'hui »); lateness is the danger
        // pair as text (12 px semibold), never a second chip (design ageStyle).
        const ageNode = isNew ? (
          <Badge variant="time">{t("Aujourd'hui")}</Badge>
        ) : age === null ? null : (
          <span className={cn('text-[12px] leading-4 tabular-nums', late ? 'font-semibold text-status-danger-fg' : 'text-ink-3')}>
            {age} {t('j')}
          </span>
        );

        return (
          <RecordCard
            key={d.id}
            recordId={d.id}
            dataTour="dos-row"
            id={d.refExpert || <span className="font-sans font-normal text-ink-4">{t('Sans réf.')}</span>}
            title={name || t('Assuré non renseigné')}
            meta={
              d.compagnie || obs ? (
                <>
                  {d.compagnie && <span>{d.compagnie}</span>}
                  {obs && (
                    <Badge variant="warning" className="max-w-[140px] min-w-0">
                      <span className="truncate">{obs}</span>
                    </Badge>
                  )}
                </>
              ) : undefined
            }
            trailing={
              <>
                {ageNode}
                <StatusChip status={d.statut} data-tour="dos-statut-pill" />
              </>
            }
            leading={
              exportMode ? (
                <Checkbox
                  className="pointer-events-none mt-0.5 animate-in fade-in-0 zoom-in-75 duration-300 ease-enter motion-reduce:animate-none"
                  checked={selectedRows.has(d.id)}
                  tabIndex={-1}
                  aria-hidden
                />
              ) : undefined
            }
            current={exportMode && selectedRows.has(d.id)}
            returned={returnedId === d.id}
            href={exportMode ? undefined : `/dossiers/${d.id}`}
            ariaLabel={`${d.refExpert || t('Sans réf.')} — ${name || t('Assuré non renseigné')}`}
            onClick={(e) => onHeaderTap(d, e)}
            expandable
            expanded={isOpen}
            onToggle={() => toggle(d.id)}
          >
            <RecordCardFields
              fields={[
                { label: t('Statut'), value: d.statut ? t(d.statut) : '', full: true },
                { label: t('Compagnie'), value: d.compagnie },
                // The dossier carries no separate gestionnaire field — the
                // creator (a Gestionnaire in practice) is the honest value.
                { label: t('Créé par'), value: creatorName(d) },
                { label: t('Immatriculation'), value: plate, mono: true },
                { label: t('Véhicule'), value: vehicule },
                { label: t('Nature'), value: d.nature ? t(d.nature) : '' },
                { label: t('Créé le'), value: created ? format(created, 'dd/MM/yyyy', { locale }) : '' },
                {
                  label: t('Dernière modification'),
                  value: modified
                    ? isToday(modified)
                      ? `${t("Aujourd'hui")} ${format(modified, 'HH:mm', { locale })}`
                      : formatDistanceToNowStrict(modified, { locale, addSuffix: true })
                    : '',
                },
                { label: t('Observation'), value: obs ?? '', full: true },
              ]}
            />
            <RecordCardActions>
              {/* h-9 on purpose (design: 36 px row) — twMerge lets it beat the phone min-h-11 floor. */}
              <Button className="flex-1 text-[13px] font-semibold max-md:min-h-9" onClick={() => onOpen(d)}>
                {t('Ouvrir le dossier')}
              </Button>
              {tel && (
                <a href={`tel:${tel}`} aria-label={t('Appeler')} className={RIM_ICON_BTN}>
                  <Phone aria-hidden />
                </a>
              )}
              {onRappel && (
                <button type="button" aria-label={t('Créer un rappel')} onClick={() => onRappel(d)} className={RIM_ICON_BTN}>
                  <Bell aria-hidden />
                </button>
              )}
            </RecordCardActions>
          </RecordCard>
        );
      })}
    </RecordCardList>
  );
}

export default PhoneDossierList;
