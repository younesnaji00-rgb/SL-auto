'use client';

/**
 * Phone rendering of the chiffrage queue (mobile redesign 2026-09-14 —
 * Claude Design handoff `Phone.dc.html` screen « chiffrage », turn 3 « cartes
 * partout · recherche et filtres dans la barre »).
 *
 *   [ bar: Chiffrage 5 · ⌕ · ⚙︎² ]            ← published through usePhoneChrome
 *   ( À traiter 5 ) ( Tous 38 )                ← ScopePills, sticky under the bar
 *   EN RETARD 2                                ← slim band label (the urgency
 *   ┌────────────────────────────────────────┐    bands ARE the sort, A3)
 *   │ SL-25-0412                18 450,00 DHS │
 *   │ Karim Benjelloun          [En retard 2h]│
 *   │ Wafa Assurance · reçu il y a 3 j · S. E.│
 *   └────────────────────────────────────────┘
 *
 * Card = RecordCard: ref (mono) stacked ABOVE the assuré (wraps), meta line
 * « compagnie · reçu il y a … · gestionnaire », trailing column = the devis /
 * chiffré amount (13/600 tabular) over the délai chip (the assignment's own
 * state: En retard · n h restantes · Chiffré). The page owns the data, the
 * filters, the sort and the sheets; this file only paints and publishes the
 * bar (count · search + sort · filters).
 */

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Calculator } from 'lucide-react';
import { usePhoneChrome } from '@/components/layout/page-chrome';
import { RecordCard, RecordCardList, RecordCardListSkeleton } from '@/components/ui/record-card';
import { ScopePills } from '@/components/ui/scope-pills';
import { AppliedChips, type AppliedChip } from '@/components/ui/filter-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { chiffrageAmounts, formatDhs } from '@/lib/chiffrage-amounts';
import { cn } from '@/lib/utils';
import { dateFnsLocale, useT } from '@/i18n';

/* Structural mirrors of the page's private types (page.tsx cannot export
   arbitrary values from a Next route module). */
export interface PhoneQueueItem {
  id: string;
  dossierId: string;
  dossierNom: string;
  sentByNom?: string;
  sentByEmail?: string;
  createdAt: any;
  completedAt?: any;
  structuredEditables?: Record<string, unknown>;
}

export interface PhoneQueueEntry {
  item: PhoneQueueItem;
  completed: Date | null;
  band: string;
}

export interface PhoneQueueGroup {
  band: string | null;
  count: number;
  entries: PhoneQueueEntry[];
}

export type PhoneQueueScope = 'a-traiter' | 'tous';

export interface PhoneChiffrageQueueProps {
  loading: boolean;
  groups: PhoneQueueGroup[];
  scope: PhoneQueueScope;
  onScopeChange: (scope: PhoneQueueScope) => void;
  nbATraiter: number;
  nbTous: number;
  /** Rows currently displayed (the bar's count pill). */
  nbShown: number;
  search: string;
  onSearchChange: (value: string) => void;
  sortLabel: string;
  onSort: () => void;
  filterCount: number;
  onOpenFilters: () => void;
  appliedChips: AppliedChip[];
  hasActiveFilter: boolean;
  onResetFilters: () => void;
  /** The page's délai chip (danger / warning / success / plain countdown). */
  renderDelaiChip: (entry: PhoneQueueEntry) => React.ReactNode;
  /** Page state maps, keyed by dossierId. */
  dossierAssure: Record<string, any>;
  dossierCompagnies: Record<string, string>;
  renderAssure: (assure: any) => string | null;
  /** Mint the workspace tab before the link navigates. */
  onOpen: (item: PhoneQueueItem) => void;
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function PhoneChiffrageQueue({
  loading,
  groups,
  scope,
  onScopeChange,
  nbATraiter,
  nbTous,
  nbShown,
  search,
  onSearchChange,
  sortLabel,
  onSort,
  filterCount,
  onOpenFilters,
  appliedChips,
  hasActiveFilter,
  onResetFilters,
  renderDelaiChip,
  dossierAssure,
  dossierCompagnies,
  renderAssure,
  onOpen,
}: PhoneChiffrageQueueProps) {
  const t = useT();

  // Bar: own count · inline search with the sort button · filters icon.
  // Functions are stable by identity from the page (hook compares by value
  // for primitives, identity for functions).
  const chrome = React.useMemo(
    () => ({
      count: nbShown,
      search: {
        value: search,
        onChange: onSearchChange,
        placeholder: t('Réf., assuré, garage…'),
        ariaLabel: t('Rechercher dans la file'),
        sortLabel,
        onSort,
        dataTour: 'ach-search',
      },
      filters: { count: filterCount, onOpen: onOpenFilters, dataTour: 'ach-filters' },
    }),
    [nbShown, search, onSearchChange, sortLabel, onSort, filterCount, onOpenFilters, t],
  );
  usePhoneChrome(chrome);

  const pills = React.useMemo(
    () => [
      { key: 'a-traiter', label: t('À traiter'), count: nbATraiter, active: scope === 'a-traiter', onClick: () => onScopeChange('a-traiter') },
      { key: 'tous', label: t('Tous'), count: nbTous, active: scope === 'tous', onClick: () => onScopeChange('tous') },
    ],
    [t, nbATraiter, nbTous, scope, onScopeChange],
  );

  return (
    <div className="md:hidden">
      <ScopePills pills={pills} sticky ariaLabel={t('Portée de la file')} dataTour="ach-scope" />
      <AppliedChips chips={appliedChips} onClearAll={onResetFilters} className="mt-3" />

      {loading ? (
        <RecordCardListSkeleton count={6} ariaLabel={t('Chargement de la file')} className="mt-3" />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Calculator />}
          title={hasActiveFilter ? t('Aucun chiffrage pour ces filtres') : t('Aucun chiffrage assigné')}
          description={
            hasActiveFilter
              ? t('Élargissez la période ou réinitialisez les filtres pour revoir la file.')
              : t('Les nouvelles assignations de chiffrage apparaîtront ici.')
          }
          action={
            hasActiveFilter ? (
              <Button variant="tonal" onClick={onResetFilters}>
                {t('Réinitialiser les filtres')}
              </Button>
            ) : undefined
          }
          className="mt-3 bg-transparent"
        />
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {groups.map((group, gi) => (
            <section key={group.band ?? `flat-${gi}`} className="flex flex-col gap-2">
              {group.band && (
                // Slim band label — the header carries the urgency meaning once
                // (A3) so the cards stay calm; danger pair only on « En retard ».
                <h2 data-tour="ach-band" className="flex min-h-6 items-center gap-2 px-0.5">
                  <span className="t-label">{t(group.band)}</span>
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums',
                      group.band === 'En retard' ? 'bg-status-danger-bg text-status-danger-fg' : 'bg-surface-3 text-ink-2',
                    )}
                  >
                    {group.count}
                  </span>
                </h2>
              )}
              <RecordCardList ariaLabel={group.band ? t(group.band) : t('Assignations au chiffrage')}>
                {group.entries.map((entry) => {
                  const c = entry.item;
                  const ref = c.dossierNom || t('Sans réf.');
                  const assure = renderAssure(dossierAssure[c.dossierId]) ?? t('Assuré non renseigné');
                  const compagnie = dossierCompagnies[c.dossierId] || '';
                  const when = entry.completed ?? toDate(c.createdAt);
                  const ago = when ? formatDistanceToNow(when, { locale: dateFnsLocale(), addSuffix: true }) : null;
                  const whenLabel = ago ? `${entry.completed ? t('chiffré') : t('reçu')} ${ago}` : null;
                  const meta = [compagnie, whenLabel, c.sentByNom?.trim() || null].filter(Boolean).join(' · ');
                  // Chiffré → the accord total; otherwise the garage's devis
                  // total the chiffreur is about to work on. « — » when neither
                  // snapshot carries rows yet.
                  const amounts = chiffrageAmounts(c.structuredEditables);
                  const amount = entry.completed ? (amounts.accordTTC ?? amounts.devisTTC) : amounts.devisTTC;
                  return (
                    <RecordCard
                      key={c.id}
                      recordId={c.id}
                      dataTour="ach-row"
                      id={ref}
                      title={assure}
                      meta={meta ? <span className="[overflow-wrap:anywhere]">{meta}</span> : undefined}
                      trailing={
                        <>
                          <span className={cn('text-[13px] font-semibold tabular-nums', amount === null ? 'text-ink-4' : 'text-ink')}>
                            {amount === null ? '—' : formatDhs(amount)}
                          </span>
                          <span className="text-[12px] text-ink-3">{renderDelaiChip(entry)}</span>
                        </>
                      }
                      href={`/assignations-chiffrage/${c.id}`}
                      ariaLabel={`${ref} — ${assure}${group.band ? ` — ${t(group.band)}` : ''}`}
                      onClick={() => onOpen(c)}
                    />
                  );
                })}
              </RecordCardList>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default PhoneChiffrageQueue;
