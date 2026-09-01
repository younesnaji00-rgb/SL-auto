'use client';

import React, { useMemo } from 'react';
import { Search, AlertCircle, X, FolderOpen } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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

// ── Status chip (element-specs §11: Carbon tag / dataviz "status colours are
//    reserved… ship with a label, never colour alone"): one helper maps a
//    status family to the same Badge status pair everywhere on this page.
//    Local stand-in for `lib/status-colors` (hand-picked hues, shared file
//    outside this page's scope) — the duplication is flagged in the report. ──
type StatusVariant = 'info' | 'warning' | 'success' | 'neutral';

function statusPair(status: string): { variant: StatusVariant; dot: string } {
  const s = (status || '').trim();
  if (s.startsWith('Planification')) return { variant: 'info', dot: 'bg-status-info-fg' };
  if (s === 'Chiffrage en cours') return { variant: 'warning', dot: 'bg-status-warning-fg' };
  if (/accord/i.test(s)) return { variant: 'success', dot: 'bg-status-success-fg' };
  return { variant: 'neutral', dot: 'bg-ink-4' };
}

function StatusChip({ status }: { status?: string }) {
  const label = status || 'Nouveau';
  return <Badge variant={statusPair(label).variant}>{label}</Badge>;
}

/** Empty cell = « — » in ink-4 (blueprint §9), never a fake value. */
function EmptyCell() {
  return <span className="text-ink-4">—</span>;
}

/** `yyyy-MM-dd` (the persisted filter value) → `dd/MM/yyyy` for display. */
function fmtIsoDay(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : iso;
}

// ── First column frozen (element-specs §3: NN/g "freeze header rows and header
//    columns if the table is larger than the screen"; Polaris "fix the first
//    column when many columns"): eight columns pan sideways on narrow screens. ──
const STICKY_HEAD = 'sticky left-0 z-[2] min-w-[9rem] border-r border-hairline bg-card';
const STICKY_CELL = 'sticky left-0 z-[1] border-r border-hairline bg-card [tr:hover_&]:bg-surface-2';

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
  const rowsPerPage = filters.rowsPerPage;

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

  const removeChipClass = 'ml-0.5 rounded-full p-0.5 text-ink-3 hover:bg-surface-4 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="space-y-6">
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
          title). Placeholder is a FORMAT cue, not a sample name (GOV.UK). */}
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
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', statusPair(s.label).dot)} aria-hidden />
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
            <Badge variant="neutral" className="gap-1 pr-1">
              Nature : {filters.nature}
              <button type="button" onClick={() => clearFilter('nature')} className={removeChipClass} aria-label="Retirer le filtre nature">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status !== 'Tous' && (
            <Badge variant="neutral" className="gap-1 pr-1">
              Statut : {filters.status}
              <button type="button" onClick={() => clearFilter('status')} className={removeChipClass} aria-label="Retirer le filtre statut">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.compagnie !== 'Toutes' && (
            <Badge variant="neutral" className="gap-1 pr-1">
              Compagnie : {filters.compagnie}
              <button type="button" onClick={() => clearFilter('compagnie')} className={removeChipClass} aria-label="Retirer le filtre compagnie">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="neutral" className="gap-1 pr-1">
              Du : {fmtIsoDay(filters.dateFrom)}
              <button type="button" onClick={() => clearFilter('dateFrom')} className={removeChipClass} aria-label="Retirer la date de début">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="neutral" className="gap-1 pr-1">
              Au : {fmtIsoDay(filters.dateTo)}
              <button type="button" onClick={() => clearFilter('dateTo')} className={removeChipClass} aria-label="Retirer la date de fin">
                <X className="h-3 w-3" />
              </button>
            </Badge>
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

      {/* Data table (element-specs §3: Polaris — text left, headers aligned
          with their data, first column fixed when many columns; Carbon — 44 px
          rows, skeleton rows while loading; NN/g — sticky header, hover tint,
          no zebra). Refs and plates in t-mono; status as a chip; empty = « — ». */}
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
              dossierList.slice(0, rowsPerPage).map(d => (
                <TableRow key={d.id}>
                  <TableCell className={cn(STICKY_CELL, 't-mono font-semibold')}>{d.refExpert || <EmptyCell />}</TableCell>
                  <TableCell className="font-medium">{renderAssure(d.assure) || <EmptyCell />}</TableCell>
                  <TableCell className="text-ink-2">{d.compagnie || <EmptyCell />}</TableCell>
                  <TableCell className="text-ink-2">{d.nature || <EmptyCell />}</TableCell>
                  <TableCell className="text-ink-2">{d.typeDossier || <EmptyCell />}</TableCell>
                  <TableCell><StatusChip status={d.statut} /></TableCell>
                  <TableCell className="t-mono">{d.matricule || <EmptyCell />}</TableCell>
                  <TableCell className="text-ink-2">{formatDate(d.dateRequete) || <EmptyCell />}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Table footer (§3 Polaris: totals display only; §8: 36 px control only
          inside a dense row) — rows per page + the total with its real range. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2">
        <div className="flex items-center gap-2">
          <span className="t-label">Afficher</span>
          <Select value={String(rowsPerPage)} onValueChange={v => setFilters({ rowsPerPage: Number(v) })}>
            <SelectTrigger className="h-9 w-[70px]" aria-label="Lignes par page"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <span className="t-caption tabular-nums">
          Total : <span className="font-semibold text-ink">{dossierList.length}</span> dossier{dossierList.length > 1 ? 's' : ''}{rangeCaption}
        </span>
      </div>
    </div>
  );
}
