'use client';

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, AlertCircle, FolderOpen, ChevronRight, Columns3, Download } from 'lucide-react';
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
import { SortableHeader, type SortDirection } from '@/components/ui/sortable-header';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { normalizePlate } from '@/lib/plate-match';
import { exportToExcel, type ExportColumn } from '@/lib/export-excel';

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

// ── Forgiving search (consultation pass 2026-09-03; same folding as the ⌘K
//    palette in global-search.tsx, and plate-match.ts per its own contract:
//    plates are stored unnormalized, so « 12345 A 6 » must find « 12345-a-6 »).
function fold(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** fold() plus a folded-index → source-index map so matches can be marked. */
function foldWithMap(s: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const f = fold(s[i]);
    for (let j = 0; j < f.length; j++) {
      folded += f[j];
      map.push(i);
    }
  }
  return { folded, map };
}

/**
 * Marks the matched substring in a cell (research: the highlight answers
 * « pourquoi cette ligne est là » at a glance). Soft NEUTRAL tint only —
 * the page's colour budget is closed (docs/research/consultation-color.md).
 */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!text || query.trim().length < 2) return <>{text}</>;
  const { folded, map } = foldWithMap(text);
  const q = fold(query.trim());
  const idx = folded.indexOf(q);
  if (idx === -1) return <>{text}</>;
  const start = map[idx];
  const end = map[idx + q.length - 1] + 1;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-sm bg-surface-3 px-0.5 text-inherit">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

// One column model drives the header row, the cells, the « Colonnes » picker
// and the Excel export, so they can never disagree (Retool forums: exports
// that ignore the visible filter/column set are the reported failure mode).
// Réf. expert is the row's anchor and can never be hidden.
const COLUMNS: ExportColumn[] = [
  { key: 'refExpert', label: 'Réf. expert' },
  { key: 'assure', label: 'Assuré' },
  { key: 'compagnie', label: 'Compagnie' },
  { key: 'nature', label: 'Nature du dossier' },
  { key: 'typeDossier', label: 'Type de dossier' },
  { key: 'statut', label: 'Statut' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'dateRequete', label: 'Date de requête' },
];
const HIDEABLE_COLUMNS = COLUMNS.filter((c) => c.key !== 'refExpert');

export default function ConsultationClientPage() {
  const router = useRouter();
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

  // Sort and hidden columns are the user's workspace setup, not filters —
  // « Tout réinitialiser » leaves them alone (same contract as /dossiers).
  const filterDefaults = {
    search: '', nature: 'Toutes', status: 'Tous', compagnie: 'Toutes',
    dateFrom: '', dateTo: '', rowsPerPage: 25,
    sortKey: 'dateRequete' as string | null, sortDir: 'desc' as Exclude<SortDirection, null>,
    hiddenCols: [] as string[],
  };
  const [filters, setFilters, clearFilter] = usePersistedFilters('consultation', filterDefaults);

  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => c.key === 'refExpert' || !filters.hiddenCols.includes(c.key)),
    [filters.hiddenCols],
  );
  const isVisible = (key: string) => visibleColumns.some((c) => c.key === key);
  const colCount = visibleColumns.length + 1; // + trailing « ouvrir » chevron cell

  // Overflow cap (addendum ter A): show 50, « Afficher plus » extends. The cap
  // resets whenever a filter changes so a narrowed list starts from the top —
  // but it survives list → dossier → retour via sessionStorage, so « Afficher
  // plus » depth is not lost on the way back (Baymard: load-more lists that
  // forget the return trip are a direct abandonment cause).
  const [visibleCount, setVisibleCount] = React.useState(() => {
    if (typeof window === 'undefined') return 50;
    try {
      const n = Number(window.sessionStorage.getItem('consultation_visible'));
      return Number.isFinite(n) && n > 50 ? n : 50;
    } catch {
      return 50;
    }
  });
  React.useEffect(() => {
    try {
      window.sessionStorage.setItem('consultation_visible', String(visibleCount));
    } catch { /* ignore */ }
  }, [visibleCount]);
  const firstFilterRun = React.useRef(true);
  React.useEffect(() => {
    if (firstFilterRun.current) { firstFilterRun.current = false; return; }
    setVisibleCount(50);
  }, [filters.search, filters.nature, filters.status, filters.compagnie, filters.dateFrom, filters.dateTo]);

  const renderAssure = (assure: any) => {
    if (!assure) return null;
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || null;
  };

  // Search filters from the 2nd character (addendum ter A), folded for case
  // and accents, and matches plates through normalizePlate so stored-format
  // oddities (« 12345 | أ | 6 » vs « 12345-a-6 ») still hit.
  const searchQuery = filters.search.trim();
  const searchActive = searchQuery.length >= 2;
  const matchesSearch = useCallback((d: any) => {
    if (!searchActive) return true;
    const qf = fold(searchQuery);
    const qp = normalizePlate(searchQuery);
    if (fold(d.refExpert || '').includes(qf)) return true;
    if (fold(renderAssure(d.assure) || '').includes(qf)) return true;
    if (fold(d.matricule || '').includes(qf)) return true;
    if (qp.length >= 3 && normalizePlate(d.matricule).includes(qp)) return true;
    return false;
  }, [searchActive, searchQuery]);

  const dossierList = useMemo(() => {
    let results = [...allDossiers];
    if (filters.nature !== 'Toutes') results = results.filter(d => d.nature === filters.nature);
    if (filters.status !== 'Tous') results = results.filter(d => d.statut === filters.status);
    if (filters.compagnie !== 'Toutes') results = results.filter(d => d.compagnie === filters.compagnie);
    if (searchActive) results = results.filter(matchesSearch);
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
  }, [allDossiers, filters.nature, filters.status, filters.compagnie, filters.dateFrom, filters.dateTo, searchActive, matchesSearch]);

  // Default sort = Date de requête, newest first (consultation is a lookup
  // archive, not a queue: recency is the most common first question — Pencil
  // & Paper; docs/research/consultation-structure.md). Empty values sort last
  // in both directions; the arrow lives in the column header (ter A).
  const sortedList = useMemo(() => {
    const key = filters.sortKey;
    if (!key) return dossierList;
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    const timeOf = (v: any): number | null => {
      if (!v) return null;
      const d = v.toDate ? v.toDate() : new Date(v);
      const t = d.getTime();
      return Number.isFinite(t) ? t : null;
    };
    const valOf = (d: any): string | number | null => {
      if (key === 'dateRequete') return timeOf(d.dateRequete);
      if (key === 'assure') return renderAssure(d.assure);
      const v = d[key];
      return typeof v === 'string' && v.trim() ? v : null;
    };
    return [...dossierList].sort((a, b) => {
      const va = valOf(a);
      const vb = valOf(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1; // empties last, whatever the direction
      if (vb === null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base', numeric: true }) * dir;
    });
  }, [dossierList, filters.sortKey, filters.sortDir]);

  const sortFor = (key: string): SortDirection => (filters.sortKey === key ? filters.sortDir : null);
  const onSortChange = (key: string) => (next: SortDirection) => {
    if (next === null) setFilters({ sortKey: null });
    else setFilters({ sortKey: key, sortDir: next });
  };

  const formatDate = (val: any) => {
    if (!val) return null;
    const date = val.toDate ? val.toDate() : new Date(val);
    return format(date, 'dd/MM/yyyy');
  };

  const openDossier = (id: string) => router.push(`/dossiers/${id}`);

  const hasActiveFilters = !!filters.search || filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || !!filters.dateFrom || !!filters.dateTo;
  const hasChipFilters = filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || !!filters.dateFrom || !!filters.dateTo;

  const clearAll = () => {
    clearFilter('search');
    clearFilter('nature');
    clearFilter('status');
    clearFilter('compagnie');
    clearFilter('dateFrom');
    clearFilter('dateTo');
  };
  const clearChipFilters = () => {
    clearFilter('nature');
    clearFilter('status');
    clearFilter('compagnie');
    clearFilter('dateFrom');
    clearFilter('dateTo');
  };

  // Zero-results recovery (NN/g scoped search: an invisible restored scope
  // silently hides records): when the search text WOULD match outside the
  // active chip filters, say so and offer to widen instead of a blind clear.
  const searchOnlyCount = useMemo(() => {
    if (!searchActive || !hasChipFilters || dossierList.length > 0) return 0;
    return allDossiers.filter(matchesSearch).length;
  }, [searchActive, hasChipFilters, dossierList.length, allDossiers, matchesSearch]);

  // No-results copy (§12: the filtered variant says WHICH filter to clear).
  //   inside « … » and before « : » per OQLF — the quote never strands.
  const activeFilterNames: string[] = [];
  if (filters.search) activeFilterNames.push(`la recherche « ${filters.search} »`);
  if (filters.nature !== 'Toutes') activeFilterNames.push(`la nature « ${filters.nature} »`);
  if (filters.status !== 'Tous') activeFilterNames.push(`le statut « ${filters.status} »`);
  if (filters.compagnie !== 'Toutes') activeFilterNames.push(`la compagnie « ${filters.compagnie} »`);
  if (filters.dateFrom || filters.dateTo) {
    activeFilterNames.push(
      `la période du ${filters.dateFrom ? fmtIsoDay(filters.dateFrom) : '—'} au ${filters.dateTo ? fmtIsoDay(filters.dateTo) : '—'}`,
    );
  }

  // Real range printed in the footer caption (§6 / §23: never "· période").
  const rangeCaption = filters.dateFrom || filters.dateTo
    ? ` · du ${filters.dateFrom ? fmtIsoDay(filters.dateFrom) : '—'} au ${filters.dateTo ? fmtIsoDay(filters.dateTo) : '—'}`
    : '';

  const handleExport = () => {
    exportToExcel(
      sortedList,
      visibleColumns,
      `consultation_export_${format(new Date(), 'dd-MM-yyyy')}.xlsx`,
    );
  };

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
          Toolbar and its applied-filter chips form ONE group (12 px apart).
          « Colonnes » and « Exporter » are quiet workspace tools at the right
          end (same idiom as /dossiers) — never a filled button here (§2). */}
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
            onKeyDown={e => {
              // Enter opens the single remaining match — the shortest lookup
              // loop; Échap clears the query without leaving the field.
              if (e.key === 'Enter' && searchActive && sortedList.length === 1) {
                openDossier(sortedList[0].id);
              } else if (e.key === 'Escape' && filters.search) {
                e.stopPropagation();
                clearFilter('search');
              }
            }}
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

        <div className="ms-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-ink-3" title="Afficher / masquer des colonnes">
                <Columns3 className="h-4 w-4" aria-hidden />
                Colonnes
                {filters.hiddenCols.length > 0 && (
                  <span className="rounded-full bg-surface-3 px-1.5 text-xs tabular-nums text-ink-2">
                    {visibleColumns.length}/{COLUMNS.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {HIDEABLE_COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!filters.hiddenCols.includes(c.key)}
                  onCheckedChange={(checked) => {
                    setFilters((prev) => ({
                      ...prev,
                      hiddenCols: checked
                        ? prev.hiddenCols.filter((k) => k !== c.key)
                        : [...prev.hiddenCols, c.key],
                    }));
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
              {filters.hiddenCols.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => clearFilter('hiddenCols')}>
                    Tout afficher
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export = the FILTERED rows in the VISIBLE column order, never the
              raw collection (Retool forums: the mismatch is the failure mode). */}
          {sortedList.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-ink-3" onClick={handleExport} title="Exporter la liste filtrée en Excel">
              <Download className="h-4 w-4" aria-hidden />
              Exporter
            </Button>
          )}
        </div>
      </div>

      {/* Applied filters (§2: Polaris — chips grouped by category with ×, then
          a clear-all link at the end; §11 — informational chips are neutral).
          The count echo makes a restored filter scope visible at re-entry
          (NN/g scoped search: a silent default scope is the worst offender). */}
      {hasChipFilters && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
          <span className="t-label">Filtres actifs</span>
          {filters.nature !== 'Toutes' && (
            <FilterChip label={`Nature : ${filters.nature}`} onRemove={() => clearFilter('nature')} ariaLabel="Retirer le filtre nature" />
          )}
          {filters.status !== 'Tous' && (
            <FilterChip label={`Statut : ${filters.status}`} onRemove={() => clearFilter('status')} ariaLabel="Retirer le filtre statut" />
          )}
          {filters.compagnie !== 'Toutes' && (
            <FilterChip label={`Compagnie : ${filters.compagnie}`} onRemove={() => clearFilter('compagnie')} ariaLabel="Retirer le filtre compagnie" />
          )}
          {filters.dateFrom && (
            <FilterChip label={`Du : ${fmtIsoDay(filters.dateFrom)}`} onRemove={() => clearFilter('dateFrom')} ariaLabel="Retirer la date de début" />
          )}
          {filters.dateTo && (
            <FilterChip label={`Au : ${fmtIsoDay(filters.dateTo)}`} onRemove={() => clearFilter('dateTo')} ariaLabel="Retirer la date de fin" />
          )}
          <Button
            variant="link"
            size="sm"
            className="h-7 px-1 text-xs"
            onClick={clearChipFilters}
          >
            Tout réinitialiser
          </Button>
          <span className="t-caption tabular-nums">
            {dossierList.length} sur {allDossiers.length} dossiers
          </span>
        </div>
      )}
      </div>

      {/* Data table (element-specs §3: Polaris — text left, headers aligned
          with their data, first column fixed when many columns; Carbon — 44 px
          rows, skeleton rows while loading; NN/g — sticky header, hover tint,
          no zebra). Refs and plates in t-mono; status as a chip; empty = « — ».
          Row = one unambiguous click (ter A): the whole row opens the dossier
          (read-only for the Directeur roles via the detail page's own gate),
          the Réf. cell is a real link (one crisp tab stop announcing the réf),
          and a quiet chevron closes the row — same idiom as /compagnies.
          Emphasis budget: 2 cells (réf + statut); Assuré lost its 500 weight
          (ter A: the identifier is the row's ONLY bold cell).
          Table and its footer caption form ONE group (12 px apart). */}
      <div className="space-y-3">
      <Card className="overflow-hidden">
        <Table regionLabel="Dossiers en consultation">
          <TableHeader>
            <TableRow>
              <TableHead className={STICKY_HEAD}>
                <SortableHeader label="Réf. expert" sort={sortFor('refExpert')} onChange={onSortChange('refExpert')} />
              </TableHead>
              {isVisible('assure') && (
                <TableHead>
                  <SortableHeader label="Assuré" sort={sortFor('assure')} onChange={onSortChange('assure')} />
                </TableHead>
              )}
              {isVisible('compagnie') && (
                <TableHead>
                  <SortableHeader label="Compagnie" sort={sortFor('compagnie')} onChange={onSortChange('compagnie')} />
                </TableHead>
              )}
              {isVisible('nature') && (
                <TableHead>
                  <SortableHeader label="Nature du dossier" sort={sortFor('nature')} onChange={onSortChange('nature')} />
                </TableHead>
              )}
              {isVisible('typeDossier') && (
                <TableHead>
                  <SortableHeader label="Type de dossier" sort={sortFor('typeDossier')} onChange={onSortChange('typeDossier')} />
                </TableHead>
              )}
              {isVisible('statut') && (
                <TableHead>
                  <SortableHeader label="Statut" sort={sortFor('statut')} onChange={onSortChange('statut')} />
                </TableHead>
              )}
              {isVisible('matricule') && (
                <TableHead>
                  <SortableHeader label="Matricule" sort={sortFor('matricule')} onChange={onSortChange('matricule')} />
                </TableHead>
              )}
              {isVisible('dateRequete') && (
                <TableHead>
                  <SortableHeader label="Date de requête" sort={sortFor('dateRequete')} onChange={onSortChange('dateRequete')} />
                </TableHead>
              )}
              <TableHead className="w-10 text-right">
                <span className="sr-only">Ouvrir</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={colCount} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : sortedList.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="whitespace-normal p-0">
                  {/* Empty state (§12: NN/g — state + reason + a direct pathway;
                      Polaris — one action). The filtered variant names the
                      filters to clear; when the SEARCH text exists outside the
                      chip filters, the pathway widens the scope instead. */}
                  <EmptyState
                    icon={<FolderOpen />}
                    title={hasActiveFilters ? 'Aucun dossier ne correspond aux filtres' : 'Aucun dossier'}
                    description={
                      searchOnlyCount > 0
                        ? `Aucun résultat pour ${activeFilterNames.join(', ')}. « ${filters.search} » existe dans ${searchOnlyCount} dossier${searchOnlyCount > 1 ? 's' : ''} hors de ces filtres.`
                        : hasActiveFilters
                          ? `Aucun résultat pour ${activeFilterNames.join(', ')}.`
                          : 'Aucun dossier n’a encore été créé.'
                    }
                    action={
                      searchOnlyCount > 0 ? (
                        <Button variant="tonal" onClick={clearChipFilters}>Rechercher partout</Button>
                      ) : hasActiveFilters ? (
                        <Button variant="tonal" onClick={clearAll}>Effacer les filtres</Button>
                      ) : undefined
                    }
                    dashed={false}
                    className="rounded-none bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              sortedList.slice(0, visibleCount).map(d => {
                const assureName = renderAssure(d.assure);
                return (
                <TableRow
                  key={d.id}
                  className="group cursor-pointer"
                  onClick={(e) => {
                    // Row click is a pointer-only enhancement over the real
                    // links: selecting text or clicking a control never
                    // navigates (tempertemper / Roselli on clickable rows).
                    if ((e.target as HTMLElement).closest('a,button')) return;
                    if (window.getSelection()?.toString()) return;
                    openDossier(d.id);
                  }}
                >
                  <TableCell className={cn(STICKY_CELL, 't-mono font-semibold')}>
                    {d.refExpert ? (
                      <Link
                        href={`/dossiers/${d.id}`}
                        className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Ouvrir le dossier ${d.refExpert}`}
                      >
                        <Highlight text={d.refExpert} query={filters.search} />
                      </Link>
                    ) : <EmptyCell />}
                  </TableCell>
                  {/* Data cells are values → full ink (addendum §3: darker
                      values; half the columns in ink-2 read as one gray sheet).
                      Free-text columns are capped + truncated with the full
                      value on hover (ter A; SAP Fiori: never truncate IDs). */}
                  {isVisible('assure') && (
                    <TableCell className="max-w-[16rem]">
                      {assureName ? (
                        <span className="block truncate" title={assureName}>
                          <Highlight text={assureName} query={filters.search} />
                        </span>
                      ) : <EmptyCell />}
                    </TableCell>
                  )}
                  {isVisible('compagnie') && (
                    <TableCell className="max-w-[14rem]">
                      {d.compagnie ? (
                        <span className="block truncate" title={d.compagnie}>{d.compagnie}</span>
                      ) : <EmptyCell />}
                    </TableCell>
                  )}
                  {isVisible('nature') && <TableCell>{d.nature || <EmptyCell />}</TableCell>}
                  {isVisible('typeDossier') && <TableCell>{d.typeDossier || <EmptyCell />}</TableCell>}
                  {isVisible('statut') && <TableCell><StatusChip status={d.statut} /></TableCell>}
                  {isVisible('matricule') && (
                    <TableCell className="t-mono">
                      {d.matricule ? <Highlight text={d.matricule} query={filters.search} /> : <EmptyCell />}
                    </TableCell>
                  )}
                  {isVisible('dateRequete') && <TableCell>{formatDate(d.dateRequete) || <EmptyCell />}</TableCell>}
                  <TableCell className="w-10 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-ink-3 hover:text-ink"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/dossiers/${d.id}`} title="Ouvrir le dossier" aria-label={`Ouvrir le dossier ${d.refExpert || ''}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })
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
        {sortedList.length > visibleCount && (
          <Button variant="outline" size="sm" onClick={() => setVisibleCount(c => c + 50)}>
            {`Afficher plus (${sortedList.length - visibleCount} restants)`}
          </Button>
        )}
        <span className="t-caption tabular-nums">
          {sortedList.length > visibleCount ? (
            <>Affichés <span className="font-semibold text-ink">{visibleCount}</span> sur <span className="font-semibold text-ink">{sortedList.length}</span>{' '}dossiers{rangeCaption}</>
          ) : (
            <>Total{' '}: <span className="font-semibold text-ink">{sortedList.length}</span>{' '}dossier{sortedList.length > 1 ? 's' : ''}{rangeCaption}</>
          )}
        </span>
      </div>
      </div>
    </div>
  );
}
