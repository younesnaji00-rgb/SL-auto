'use client';

import React, { useMemo } from 'react';
import { Search, AlertCircle, FolderOpen } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, STICKY_HEAD, STICKY_CELL, EmptyCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDossiers } from '@/hooks/use-dossiers';
import { DateRangeFilter } from '@/components/date-range-filter';
import { useOptions } from '@/hooks/use-options';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusChip, statusTone } from '@/components/ui/status-chip';
import { FilterChip } from '@/components/ui/filter-chip';

// ── Status chip (element-specs §11): the shared app-wide mapping — the local
//    stand-in was retired 2026-09-02 (it coloured « Proposition d'accord »
//    success while the canonical map says info). Dots reuse the same tone. ──
const DOT_BY_TONE: Record<ReturnType<typeof statusTone>, string> = {
  neutral: 'bg-ink-4',
  info: 'bg-status-info-fg',
  warning: 'bg-status-warning-fg',
  success: 'bg-status-success-fg',
  danger: 'bg-status-danger-fg',
};

/** `yyyy-MM-dd` (the persisted filter value) → `dd/MM/yyyy` for display. */
function fmtIsoDay(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : iso;
}


export default function ConsultationClientPage() {
  const { options: dbCompagnies } = useOptions('compagnies');
  const { options: dbNatures } = useOptions('options_natures');
  const { options: dbStatuses } = useOptions('options_statuts');

  // Single source of truth: Firestore. Filter inactive entries client-side.
  const compagnies = useMemo(() => dbCompagnies.filter(o => o.active !== false), [dbCompagnies]);
  const natures = useMemo(() => dbNatures.filter(o => o.active !== false), [dbNatures]);
  const statuses = useMemo(() => dbStatuses.filter(o => o.active !== false), [dbStatuses]);

  // Fetch ALL dossiers — no company restriction
  const { dossiers: allDossiers, loading, error: fetchError } = useDossiers();

  // Union the seeded option lists with values present on real dossiers, so
  // dropdowns expose any value live data has but the seed lacks (e.g.,
  // `4ème accord` from the uncapped status machine, or legacy values from
  // deleted options that some dossiers still reference).
  const augmentWithLiveValues = (
    seeded: { id: string; label: string; order: number; active: boolean }[],
    rawValues: (string | undefined)[],
  ) => {
    const seen = new Set(seeded.map((o) => o.label));
    const extras: typeof seeded = [];
    for (const v of rawValues) {
      if (!v || typeof v !== 'string') continue;
      const trimmed = v.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      extras.push({ id: `live-${trimmed}`, label: trimmed, order: 9999, active: true });
    }
    return extras.length === 0 ? seeded : [...seeded, ...extras];
  };
  const filterStatuses = useMemo(
    () => augmentWithLiveValues(statuses, allDossiers.map((d) => d.statut)),
    [statuses, allDossiers],
  );
  const filterNatures = useMemo(
    () => augmentWithLiveValues(natures, allDossiers.map((d) => d.nature)),
    [natures, allDossiers],
  );
  const filterCompagnies = useMemo(
    () => augmentWithLiveValues(compagnies, allDossiers.map((d) => d.compagnie)),
    [compagnies, allDossiers],
  );

  const filterDefaults = { search: '', nature: 'Toutes', status: 'Tous', compagnie: 'Toutes', dateFrom: '', dateTo: '', rowsPerPage: 25 };
  const [filters, setFilters, clearFilter] = usePersistedFilters('consultation', filterDefaults);

  // Overflow cap (addendum ter A): show 50, « Afficher plus » extends. The cap
  // resets whenever a filter changes so a narrowed list starts from the top.
  const [visibleCount, setVisibleCount] = React.useState(50);
  React.useEffect(() => {
    setVisibleCount(50);
  }, [filters.search, filters.nature, filters.status, filters.compagnie, filters.dateFrom, filters.dateTo]);

  const dossierList = useMemo(() => {
    let results = [...allDossiers];
    if (filters.nature !== 'Toutes') results = results.filter(d => d.nature === filters.nature);
    if (filters.status !== 'Tous') results = results.filter(d => d.statut === filters.status);
    if (filters.compagnie !== 'Toutes') results = results.filter(d => d.compagnie === filters.compagnie);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(d =>
        d.refExpert?.toLowerCase().includes(s) ||
        (typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`).toLowerCase().includes(s) ||
        d.matricule?.toLowerCase().includes(s)
      );
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      results = results.filter(d => {
        if (!d.dateRequete) return false;
        const date = d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete);
        return date >= from;
      });
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(d => {
        if (!d.dateRequete) return false;
        const date = d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete);
        return date <= to;
      });
    }
    return results;
  }, [allDossiers, filters]);

  const formatDate = (val: any) => {
    if (!val) return null;
    const date = val.toDate ? val.toDate() : new Date(val);
    return format(date, 'dd/MM/yyyy');
  };

  const renderAssure = (assure: any) => {
    if (!assure) return null;
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || null;
  };

  const hasActiveFilters = filters.search || filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.dateFrom || filters.dateTo;
  const hasChipFilters = filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.dateFrom || filters.dateTo;

  const clearAll = () => {
    clearFilter('search');
    clearFilter('nature');
    clearFilter('status');
    clearFilter('compagnie');
    clearFilter('dateFrom');
    clearFilter('dateTo');
  };

  // No-results copy (§12: the filtered variant says WHICH filter to clear).
  const activeFilterNames: string[] = [];
  if (filters.search) activeFilterNames.push(`la recherche « ${filters.search} »`);
  if (filters.nature !== 'Toutes') activeFilterNames.push(`la nature « ${filters.nature} »`);
  if (filters.status !== 'Tous') activeFilterNames.push(`le statut « ${filters.status} »`);
  if (filters.compagnie !== 'Toutes') activeFilterNames.push(`la compagnie « ${filters.compagnie} »`);
  if (filters.dateFrom || filters.dateTo) {
    activeFilterNames.push(
      `la période du ${filters.dateFrom ? fmtIsoDay(filters.dateFrom) : '—'} au ${filters.dateTo ? fmtIsoDay(filters.dateTo) : '—'}`,
    );
  }

  // Real range printed in the footer caption (§6 / §23: never "· période").
  const rangeCaption = filters.dateFrom || filters.dateTo
    ? ` · du ${filters.dateFrom ? fmtIsoDay(filters.dateFrom) : '—'} au ${filters.dateTo ? fmtIsoDay(filters.dateTo) : '—'}`
    : '';

  return (
    // Sections 32 px apart (addendum §4); inside a section, related rows stay
    // tight (toolbar + its applied-filter chips; table + its footer caption).
    <div className="space-y-8">
      {/* Inline alert (element-specs §14: Carbon notification — inline persists
          until acted on, status pair + its icon; NN/g — errors never in toasts).
          Sits at the top of the block it concerns. */}
      {fetchError && (
        <Alert variant="danger">
          <AlertCircle />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {/* Filter toolbar (element-specs §2: Polaris filters — search first,
          clearly labelled, ≤ 3 promoted filters, applied filters as chips with
          clear-all; NN/g — order by importance; Carbon — search below the
          title). Placeholder is a FORMAT cue, not a sample name (GOV.UK).
          Toolbar and its applied-filter chips form ONE group (12 px apart). */}
      <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-grow max-sm:w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Réf., assuré, matricule…"
            aria-label="Rechercher un dossier par référence, assuré ou matricule"
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
          />
        </div>

        <Select value={filters.nature} onValueChange={v => setFilters({ nature: v })}>
          <SelectTrigger className="w-[180px]" aria-label="Nature du dossier"><SelectValue placeholder="Nature du dossier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">Toutes les natures</SelectItem>
            {filterNatures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={v => setFilters({ status: v })}>
          <SelectTrigger className="w-[180px]" aria-label="Statut"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="Tous">Tous les statuts</SelectItem>
            {filterStatuses.map(s => (
              <SelectItem key={s.id} value={s.label}>
                {/* Status dot always beside its label (§11: never colour alone). */}
                <span className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT_BY_TONE[statusTone(s.label)])} aria-hidden />
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.compagnie} onValueChange={v => setFilters({ compagnie: v })}>
          <SelectTrigger className="w-[180px]" aria-label="Compagnie"><SelectValue placeholder="Compagnie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">Toutes les compagnies</SelectItem>
            {filterCompagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={v => setFilters({ dateFrom: v })}
          onDateToChange={v => setFilters({ dateTo: v })}
        />
      </div>

      {/* Applied filters (§2: Polaris — chips grouped by category with ×, then
          a clear-all link at the end; §11 — informational chips are neutral). */}
      {hasChipFilters && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
          <span className="t-label">Filtres actifs</span>
          {filters.nature !== 'Toutes' && (
            <FilterChip label={`Nature : ${filters.nature}`} onRemove={() => clearFilter('nature')} ariaLabel="Retirer le filtre nature" />
          )}
          {filters.status !== 'Tous' && (
            <FilterChip label={`Statut : ${filters.status}`} onRemove={() => clearFilter('status')} ariaLabel="Retirer le filtre statut" />
          )}
          {filters.compagnie !== 'Toutes' && (
            <FilterChip label={`Compagnie : ${filters.compagnie}`} onRemove={() => clearFilter('compagnie')} ariaLabel="Retirer le filtre compagnie" />
          )}
          {filters.dateFrom && (
            <FilterChip label={`Du : ${fmtIsoDay(filters.dateFrom)}`} onRemove={() => clearFilter('dateFrom')} ariaLabel="Retirer la date de début" />
          )}
          {filters.dateTo && (
            <FilterChip label={`Au : ${fmtIsoDay(filters.dateTo)}`} onRemove={() => clearFilter('dateTo')} ariaLabel="Retirer la date de fin" />
          )}
          <Button
            variant="link"
            size="sm"
            className="h-7 px-1 text-xs"
            onClick={() => {
              clearFilter('nature');
              clearFilter('status');
              clearFilter('compagnie');
              clearFilter('dateFrom');
              clearFilter('dateTo');
            }}
          >
            Tout réinitialiser
          </Button>
        </div>
      )}
      </div>

      {/* Data table (element-specs §3: Polaris — text left, headers aligned
          with their data, first column fixed when many columns; Carbon — 44 px
          rows, skeleton rows while loading; NN/g — sticky header, hover tint,
          no zebra). Refs and plates in t-mono; status as a chip; empty = « — ».
          Table and its footer caption form ONE group (12 px apart). */}
      <div className="space-y-3">
      <Card className="overflow-hidden">
        <Table regionLabel="Dossiers en consultation">
          <TableHeader>
            <TableRow>
              <TableHead className={STICKY_HEAD}>Réf. expert</TableHead>
              <TableHead>Assuré</TableHead>
              <TableHead>Compagnie</TableHead>
              <TableHead>Nature du dossier</TableHead>
              <TableHead>Type de dossier</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Date de requête</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={8} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : dossierList.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="whitespace-normal p-0">
                  {/* Empty state (§12: NN/g — state + reason + a direct pathway;
                      Polaris — one action). Filtered variant names the filters
                      to clear; the plain variant has nothing to offer on a
                      read-only page, so no action. */}
                  <EmptyState
                    icon={<FolderOpen />}
                    title={hasActiveFilters ? 'Aucun dossier ne correspond aux filtres' : 'Aucun dossier'}
                    description={
                      hasActiveFilters
                        ? `Aucun résultat pour ${activeFilterNames.join(', ')}.`
                        : 'Aucun dossier n’a encore été créé.'
                    }
                    action={
                      hasActiveFilters ? (
                        <Button variant="tonal" onClick={clearAll}>Effacer les filtres</Button>
                      ) : undefined
                    }
                    dashed={false}
                    className="rounded-none bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              dossierList.slice(0, visibleCount).map(d => (
                <TableRow key={d.id}>
                  <TableCell className={cn(STICKY_CELL, 't-mono font-semibold')}>{d.refExpert || <EmptyCell />}</TableCell>
                  <TableCell className="font-medium">{renderAssure(d.assure) || <EmptyCell />}</TableCell>
                  {/* Data cells are values → full ink (addendum §3: darker
                      values; half the columns in ink-2 read as one gray sheet). */}
                  <TableCell>{d.compagnie || <EmptyCell />}</TableCell>
                  <TableCell>{d.nature || <EmptyCell />}</TableCell>
                  <TableCell>{d.typeDossier || <EmptyCell />}</TableCell>
                  <TableCell><StatusChip status={d.statut} /></TableCell>
                  <TableCell className="t-mono">{d.matricule || <EmptyCell />}</TableCell>
                  <TableCell>{formatDate(d.dateRequete) || <EmptyCell />}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Table footer — addendum ter A (uxdesign.cc: a queue "is successful if
          there is no need to paginate"; overflow = cap + explicit « Afficher
          plus » + a visible total, never page numbers). The old rows-per-page
          select silently HID rows (choosing 25 dropped rows 26+ with no way to
          reach them) — retired 2026-09-02. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2">
        {dossierList.length > visibleCount && (
          <Button variant="outline" size="sm" onClick={() => setVisibleCount(c => c + 50)}>
            Afficher plus ({dossierList.length - visibleCount} restants)
          </Button>
        )}
        <span className="t-caption tabular-nums">
          {dossierList.length > visibleCount ? (
            <>Affichés <span className="font-semibold text-ink">{visibleCount}</span> sur <span className="font-semibold text-ink">{dossierList.length}</span> dossiers{rangeCaption}</>
          ) : (
            <>Total : <span className="font-semibold text-ink">{dossierList.length}</span> dossier{dossierList.length > 1 ? 's' : ''}{rangeCaption}</>
          )}
        </span>
      </div>
      </div>
    </div>
  );
}
