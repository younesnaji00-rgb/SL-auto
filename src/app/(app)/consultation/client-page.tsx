'use client';

import React, { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, AlertCircle, FolderOpen, Columns3, Download, Check, ChevronRight } from 'lucide-react';
import { format, parseISO, isValid, isToday, startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
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
import { useT, dateFnsLocale } from '@/i18n';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SlidingThumb } from '@/components/ui/sliding-thumb';
import { useDossierTabs } from '@/hooks/use-dossier-tabs';
import { dossierLabel } from '@/lib/dossier-label';
// Mobile pass 2026-09-06 (mobile-synthesis §4): below md the 9-column lookup
// table becomes a 3-line record list under a sticky search row; the five
// selects + the date cluster move into the « Filtres » sheet, the sort into a
// « Trier » sheet, and « Afficher plus » replaces the desktop footer button.
import { usePathname } from 'next/navigation';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { RecordList, RecordRow, RecordListSkeleton } from '@/components/ui/record-row';
import { SearchRow, type SearchRowHandle } from '@/components/ui/search-row';
import {
  FilterSheet,
  FilterSection,
  FilterSelect,
  FilterChoiceChips,
  AppliedChips,
  type AppliedChip,
} from '@/components/ui/filter-sheet';
import { SortSheet } from '@/components/ui/sort-sheet';
import { LoadMore, useRenderCap } from '@/components/ui/load-more';
import { useListScrollRestore, listScrollKey } from '@/lib/list-scroll-restore';
import { usePhoneChrome } from '@/components/layout/page-chrome';

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
// Order (owner-approved 2026-09-03): the three LOOKUP KEYS the search box
// accepts sit together on the left where 80 % of fixation lands, statut (the
// second emphasised cell) in the left third, the descriptive columns after,
// « Type de dossier » demoted to last-but-one (lowest information scent).
const COLUMNS: ExportColumn[] = [
  { key: 'refExpert', label: 'Réf. expert' },
  { key: 'assure', label: 'Assuré' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'statut', label: 'Statut' },
  { key: 'compagnie', label: 'Compagnie' },
  { key: 'nature', label: 'Nature du dossier' },
  { key: 'typeDossier', label: 'Type de dossier' },
  { key: 'dateRequete', label: 'Date de requête' },
];
const HIDEABLE_COLUMNS = COLUMNS.filter((c) => c.key !== 'refExpert');

export default function ConsultationClientPage() {
  const t = useT();
  const router = useRouter();
  const { openTab } = useDossierTabs();
  // Row click opens the dossier as a PREVIEW tab (VS Code semantics, same as
  // the dossiers list) — consultation is a lookup surface, so a look never
  // mints a permanent tab. The réf cell and the row-end chevron are real
  // <Link>s; this is the pointer-only convenience on top of them.
  const openDossier = useCallback(
    (d: { id: string; refExpert?: string; assure?: unknown }) => {
      openTab(d.id, dossierLabel(d), { preview: true });
      router.push(`/dossiers/${d.id}`);
    },
    [openTab, router],
  );

  const { options: dbCompagnies } = useOptions('compagnies');
  const { options: dbNatures } = useOptions('options_natures');
  const { options: dbStatuses } = useOptions('options_statuts');
  const { options: dbTypesDossier } = useOptions('options_types_dossier');

  // Single source of truth: Firestore. Filter inactive entries client-side.
  const compagnies = useMemo(() => dbCompagnies.filter(o => o.active !== false), [dbCompagnies]);
  const natures = useMemo(() => dbNatures.filter(o => o.active !== false), [dbNatures]);
  const statuses = useMemo(() => dbStatuses.filter(o => o.active !== false), [dbStatuses]);
  const typesDossier = useMemo(() => dbTypesDossier.filter(o => o.active !== false), [dbTypesDossier]);

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
  const filterTypesDossier = useMemo(
    () => augmentWithLiveValues(typesDossier, allDossiers.map((d) => d.typeDossier)),
    [typesDossier, allDossiers],
  );

  // Sort and hidden columns are the user's workspace setup, not filters —
  // « Tout réinitialiser » leaves them alone (same contract as /dossiers).
  const filterDefaults = {
    search: '', nature: 'Toutes', status: 'Tous', compagnie: 'Toutes', typeDossier: 'Tous',
    dateFrom: '', dateTo: '', rowsPerPage: 25,
    sortKey: 'dateRequete' as string | null, sortDir: 'desc' as Exclude<SortDirection, null>,
    hiddenCols: [] as string[],
    datePreset: null as 'jour' | 'semaine' | 'mois' | 'personnalise' | null,
  };
  type ConsultationFilters = typeof filterDefaults;
  const [filters, setFilters, clearFilter] = usePersistedFilters('consultation', filterDefaults);

  // Date presets — same Jour / Semaine / Mois cluster as /dossiers and
  // « Suivi d'équipe »; they write the SAME dateFrom/dateTo strings the
  // pipeline consumes, and the sliding tonal thumb carries the selection
  // (motion-spec addendum quater: segmented filters join the morph family).
  // `presetRange` is the pure form so the phone filter sheet can write the
  // same strings into its PENDING state.
  const presetRange = (preset: 'jour' | 'semaine' | 'mois') => {
    const now = new Date();
    const from = preset === 'jour' ? startOfDay(now) : preset === 'semaine' ? startOfWeek(now, { locale: dateFnsLocale() }) : startOfMonth(now);
    return { dateFrom: format(from, 'yyyy-MM-dd'), dateTo: format(endOfDay(now), 'yyyy-MM-dd'), datePreset: preset };
  };
  const applyPreset = (preset: 'jour' | 'semaine' | 'mois') => setFilters(presetRange(preset));
  const setDates = (patch: { dateFrom?: string; dateTo?: string }) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      return { ...next, datePreset: next.dateFrom || next.dateTo ? ('personnalise' as const) : null };
    });
  };

  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => c.key === 'refExpert' || !filters.hiddenCols.includes(c.key)),
    [filters.hiddenCols],
  );
  const isVisible = (key: string) => visibleColumns.some((c) => c.key === key);
  const colCount = visibleColumns.length;

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
  }, [filters.search, filters.nature, filters.status, filters.compagnie, filters.typeDossier, filters.dateFrom, filters.dateTo]);

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

  // Every filter EXCEPT statut — the stats strip counts by statut over this
  // base so its tiles never zero out when one of them is selected. Pure in
  // the filter object so the phone « Filtres » sheet can price a PENDING
  // state (« Afficher 42 dossiers ») without applying it.
  const filterExceptStatus = useCallback((list: any[], f: ConsultationFilters) => {
    let results = [...list];
    if (f.nature !== 'Toutes') results = results.filter(d => d.nature === f.nature);
    if (f.compagnie !== 'Toutes') results = results.filter(d => d.compagnie === f.compagnie);
    if (f.typeDossier !== 'Tous') results = results.filter(d => d.typeDossier === f.typeDossier);
    if (searchActive) results = results.filter(matchesSearch);
    if (f.dateFrom) {
      const from = new Date(f.dateFrom);
      results = results.filter(d => {
        if (!d.dateRequete) return false;
        const date = d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete);
        return date >= from;
      });
    }
    if (f.dateTo) {
      const to = new Date(f.dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(d => {
        if (!d.dateRequete) return false;
        const date = d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete);
        return date <= to;
      });
    }
    return results;
  }, [searchActive, matchesSearch]);

  const baseList = useMemo(
    () => filterExceptStatus(allDossiers, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterExceptStatus, allDossiers, filters.nature, filters.compagnie, filters.typeDossier, filters.dateFrom, filters.dateTo],
  );

  const countFor = useCallback(
    (f: ConsultationFilters) => {
      const base = filterExceptStatus(allDossiers, f);
      return f.status === 'Tous' ? base.length : base.filter((d: any) => d.statut === f.status).length;
    },
    [filterExceptStatus, allDossiers],
  );

  const dossierList = useMemo(
    () => (filters.status === 'Tous' ? baseList : baseList.filter(d => d.statut === filters.status)),
    [baseList, filters.status],
  );

  // Stats strip data: the three most frequent statuses in the base scope.
  // Rendered only when all three exist so the 2/4-column grid ends on a full
  // row (element-specs §6). Tiles are filters, not decorations: clicking one
  // applies/clears the statut filter (dossiers KPI-strip idiom, 2026-09-03).
  const topStatuses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of baseList) {
      const s = (d.statut || '').trim() || 'Nouveau';
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [baseList]);

  // Live status flash (motion-spec §8 / B1: the teal Yellow-Fade is FOR
  // "live status changes in lists another user caused"). Diff statut by id
  // between snapshots — never on first load, 2 s one-shot decay, cell-level
  // (a full accent-tinted row is a rejected pattern).
  const prevStatuts = React.useRef<Map<string, string> | null>(null);
  const [flashIds, setFlashIds] = React.useState<ReadonlySet<string>>(new Set());
  React.useEffect(() => {
    if (loading) return;
    const now = new Map(allDossiers.map(d => [d.id as string, (d.statut || '') as string]));
    const prev = prevStatuts.current;
    prevStatuts.current = now;
    if (!prev) return;
    const changed: string[] = [];
    now.forEach((s, id) => {
      const p = prev.get(id);
      if (p !== undefined && p !== s) changed.push(id);
    });
    if (changed.length === 0) return;
    setFlashIds(f => new Set([...f, ...changed]));
    window.setTimeout(() => {
      setFlashIds(f => {
        const next = new Set(f);
        for (const id of changed) next.delete(id);
        return next;
      });
    }, 2100);
  }, [allDossiers, loading]);

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

  const hasActiveFilters = !!filters.search || filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.typeDossier !== 'Tous' || !!filters.dateFrom || !!filters.dateTo;
  const hasChipFilters = filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.typeDossier !== 'Tous' || !!filters.dateFrom || !!filters.dateTo;

  const clearAll = () => {
    clearFilter('search');
    clearFilter('nature');
    clearFilter('status');
    clearFilter('compagnie');
    clearFilter('typeDossier');
    clearFilter('dateFrom');
    clearFilter('dateTo');
    clearFilter('datePreset');
  };
  const clearChipFilters = () => {
    clearFilter('nature');
    clearFilter('status');
    clearFilter('compagnie');
    clearFilter('typeDossier');
    clearFilter('dateFrom');
    clearFilter('dateTo');
    clearFilter('datePreset');
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
  if (filters.search) activeFilterNames.push(`${t('la recherche')} « ${filters.search} »`);
  if (filters.nature !== 'Toutes') activeFilterNames.push(`${t('la nature')} « ${t(filters.nature)} »`);
  if (filters.status !== 'Tous') activeFilterNames.push(`${t('le statut')} « ${t(filters.status)} »`);
  if (filters.compagnie !== 'Toutes') activeFilterNames.push(`${t('la compagnie')} « ${t(filters.compagnie)} »`);
  if (filters.typeDossier !== 'Tous') activeFilterNames.push(`${t('le type de dossier')} « ${t(filters.typeDossier)} »`);
  if (filters.dateFrom || filters.dateTo) {
    activeFilterNames.push(
      `${t('la période du')} ${filters.dateFrom ? fmtIsoDay(filters.dateFrom) : '—'} ${t('au')} ${filters.dateTo ? fmtIsoDay(filters.dateTo) : '—'}`,
    );
  }

  // Real range printed in the footer caption (§6 / §23: never "· période").
  const rangeCaption = filters.dateFrom || filters.dateTo
    ? ` · ${t('du')} ${filters.dateFrom ? fmtIsoDay(filters.dateFrom) : '—'} ${t('au')} ${filters.dateTo ? fmtIsoDay(filters.dateTo) : '—'}`
    : '';

  /* ------------------------------------------------------------------ */
  /* Phone list — mobile-synthesis §4                                    */
  /* ------------------------------------------------------------------ */
  const isPhone = useIsPhone();
  const pathname = usePathname() || '/consultation';
  const [phoneFiltersOpen, setPhoneFiltersOpen] = React.useState(false);
  const [phoneSortOpen, setPhoneSortOpen] = React.useState(false);
  const searchRowRef = React.useRef<SearchRowHandle>(null);

  const appliedFilterCount =
    (filters.nature !== 'Toutes' ? 1 : 0) +
    (filters.status !== 'Tous' ? 1 : 0) +
    (filters.compagnie !== 'Toutes' ? 1 : 0) +
    (filters.typeDossier !== 'Tous' ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  const phoneSort: 'recent' | 'ancien' = filters.sortKey === 'dateRequete' && filters.sortDir === 'asc' ? 'ancien' : 'recent';

  const capSignature = React.useMemo(
    () => JSON.stringify([filters.search, filters.nature, filters.status, filters.compagnie, filters.typeDossier, filters.dateFrom, filters.dateTo, filters.sortKey, filters.sortDir]),
    [filters],
  );
  const cap = useRenderCap(sortedList, 25, { signature: capSignature });
  const { onRowTap, returnedId } = useListScrollRestore({
    key: listScrollKey(pathname, capSignature),
    enabled: isPhone,
    ready: isPhone && !loading && cap.rows.length > 0,
    cap: cap.cap,
    setCap: cap.setCap,
  });

  const appliedChips: AppliedChip[] = [];
  if (filters.nature !== 'Toutes') appliedChips.push({ key: 'nature', label: `${t('Nature :')} ${t(filters.nature)}`, onRemove: () => clearFilter('nature') });
  if (filters.status !== 'Tous') appliedChips.push({ key: 'status', label: `${t('Statut :')} ${t(filters.status)}`, onRemove: () => clearFilter('status') });
  if (filters.compagnie !== 'Toutes') appliedChips.push({ key: 'compagnie', label: `${t('Compagnie :')} ${t(filters.compagnie)}`, onRemove: () => clearFilter('compagnie') });
  if (filters.typeDossier !== 'Tous') appliedChips.push({ key: 'type', label: `${t('Type :')} ${t(filters.typeDossier)}`, onRemove: () => clearFilter('typeDossier') });
  if (filters.datePreset && filters.datePreset !== 'personnalise') {
    appliedChips.push({
      key: 'preset',
      label: `${t('Période :')} ${t(filters.datePreset === 'jour' ? 'Jour' : filters.datePreset === 'semaine' ? 'Semaine' : 'Mois')}`,
      onRemove: () => setFilters({ dateFrom: '', dateTo: '', datePreset: null }),
    });
  } else {
    if (filters.dateFrom) appliedChips.push({ key: 'from', label: `${t('Du :')} ${fmtIsoDay(filters.dateFrom)}`, onRemove: () => setDates({ dateFrom: '' }) });
    if (filters.dateTo) appliedChips.push({ key: 'to', label: `${t('Au :')} ${fmtIsoDay(filters.dateTo)}`, onRemove: () => setDates({ dateTo: '' }) });
  }

  // Success morph on the button itself (motion-spec §5 I1 idiom + §10:
  // feedback near the element beats a corner toast) — export is this page's
  // one occasional completing action (F3-adjacent). Reverts after ~1.5 s.
  const [exported, setExported] = React.useState(false);
  const handleExport = () => {
    exportToExcel(
      sortedList,
      visibleColumns,
      `consultation_export_${format(new Date(), 'dd-MM-yyyy')}.xlsx`,
    );
    setExported(true);
    window.setTimeout(() => setExported(false), 1500);
  };

  // The page header lives in page.tsx, so the phone top bar's search icon, the
  // count pill and the « ⋯ » sheet (Exporter — the desktop toolbar's quiet
  // tools are `max-md:hidden`) are registered from here.
  usePhoneChrome(
    React.useMemo(
      () => ({
        onSearchFocus: () => searchRowRef.current?.focus(),
        count: loading ? null : sortedList.length,
        secondaryActions:
          sortedList.length > 0
            ? [{ key: 'export', label: t('Exporter'), icon: <Download />, onSelect: handleExport }]
            : [],
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [loading, sortedList.length],
    ),
  );

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
          <AlertTitle>{t('Erreur de chargement')}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {/* Stats strip — §6 stat tiles as FILTERS (dossiers KPI-strip idiom):
          total + the three most frequent statuses of the current scope, dot
          always beside its label (§11), values plain ink (Few: colour only
          for exceptions), whole tile clickable, active tile = quiet primary
          ring. No count-up (motion-spec §8), no chart. Hidden until three
          statuses exist so the grid always ends on a full row. */}
      {(loading || topStatuses.length === 3) && (
        // Phones: 2-up, 12 px gutter, 36 px figure (mobile-synthesis §7).
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={`kpi-sk-${i}`} className="p-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-9 w-16 md:h-7 md:w-14" />
                </Card>
              ))
            : (
              <>
                <Card className={cn('p-0 transition-colors', filters.status === 'Tous' && 'ring-1 ring-primary/40')}>
                  <button
                    type="button"
                    onClick={() => clearFilter('status')}
                    className="block w-full rounded-[inherit] p-4 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-pressed={filters.status === 'Tous' || undefined}
                  >
                    <span className="t-label block">{t('Total')}</span>
                    <span className="mt-0.5 block text-[36px] font-semibold leading-none tabular-nums text-ink md:text-2xl md:leading-tight">{baseList.length}</span>
                    <span className="t-caption mt-0.5 block">{t('tous statuts')}</span>
                  </button>
                </Card>
                {topStatuses.map(([label, count]) => {
                  const active = filters.status === label;
                  return (
                    <Card key={label} className={cn('p-0 transition-colors', active && 'ring-1 ring-primary/40')}>
                      <button
                        type="button"
                        onClick={() => (active ? clearFilter('status') : setFilters({ status: label }))}
                        className="block w-full rounded-[inherit] p-4 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-pressed={active || undefined}
                        title={active ? `${t('Retirer le filtre')} « ${t(label)} »` : `${t('Filtrer sur')} « ${t(label)} »`}
                      >
                        <span className="t-label flex items-center gap-1.5">
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT_BY_TONE[statusTone(label)])} aria-hidden />
                          <span className="truncate">{t(label)}</span>
                        </span>
                        <span className="mt-0.5 block text-[36px] font-semibold leading-none tabular-nums text-ink md:text-2xl md:leading-tight">{count}</span>
                      </button>
                    </Card>
                  );
                })}
              </>
            )}
        </div>
      )}

      {/* Filter toolbar (element-specs §2: Polaris filters — search first,
          clearly labelled, ≤ 3 promoted filters, applied filters as chips with
          clear-all; NN/g — order by importance; Carbon — search below the
          title). Placeholder is a FORMAT cue, not a sample name (GOV.UK).
          Toolbar and its applied-filter chips form ONE group (12 px apart).
          « Colonnes » and « Exporter » are quiet workspace tools at the right
          end (same idiom as /dossiers) — never a filled button here (§2). */}
      {/* PHONE — 48 px sticky search row; the five selects and the date
          cluster live in the « Filtres » sheet, the sort in « Trier ». */}
      {/* Direct children of the page block — a `position: sticky` row only
          travels inside its own containing block. */}
      {isPhone && (
        <>
          <SearchRow
            ref={searchRowRef}
            value={filters.search}
            onChange={(v) => setFilters({ search: v })}
            placeholder={t('Réf., assuré, matricule…')}
            ariaLabel={t('Rechercher un dossier par référence, assuré ou matricule')}
            filterCount={appliedFilterCount}
            onFilters={() => setPhoneFiltersOpen(true)}
            sortLabel={phoneSort === 'ancien' ? t('Plus anciens') : t('Plus récents')}
            onSort={() => setPhoneSortOpen(true)}
            dataTour="consult-search"
            className="md:hidden"
          />
          <AppliedChips chips={appliedChips} onClearAll={clearChipFilters} className="md:hidden" />
        </>
      )}

      <div className="space-y-3 max-md:hidden">
      <div className="flex flex-wrap items-center gap-2" data-tour="consult-filters">
        <div className="relative max-w-sm flex-grow max-sm:w-full" data-tour="consult-search">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input
            className="pl-9"
            placeholder={t('Réf., assuré, matricule…')}
            aria-label={t('Rechercher un dossier par référence, assuré ou matricule')}
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
            onKeyDown={e => {
              // Échap clears the query without leaving the field. (Enter used
              // to open the single remaining match — retired 2026-09-03 with
              // the read-only ruling: consultation never routes into the
              // editable dossier page.)
              if (e.key === 'Escape' && filters.search) {
                e.stopPropagation();
                clearFilter('search');
              }
            }}
          />
        </div>

        <Select value={filters.nature} onValueChange={v => setFilters({ nature: v })}>
          <SelectTrigger className="w-[180px]" aria-label={t('Nature du dossier')} data-tour="consult-nature"><SelectValue placeholder={t('Nature du dossier')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">{t('Toutes les natures')}</SelectItem>
            {filterNatures.map(n => <SelectItem key={n.id} value={n.label}>{t(n.label)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={v => setFilters({ status: v })}>
          <SelectTrigger className="w-[180px]" aria-label={t('Statut')} data-tour="consult-statut"><SelectValue placeholder={t('Statut')} /></SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="Tous">{t('Tous les statuts')}</SelectItem>
            {filterStatuses.map(s => (
              <SelectItem key={s.id} value={s.label}>
                {/* Status dot always beside its label (§11: never colour alone). */}
                <span className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT_BY_TONE[statusTone(s.label)])} aria-hidden />
                  {t(s.label)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.compagnie} onValueChange={v => setFilters({ compagnie: v })}>
          <SelectTrigger className="w-[180px]" aria-label={t('Compagnie')} data-tour="consult-compagnie"><SelectValue placeholder={t('Compagnie')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">{t('Toutes les compagnies')}</SelectItem>
            {filterCompagnies.map(c => <SelectItem key={c.id} value={c.label}>{t(c.label)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.typeDossier} onValueChange={v => setFilters({ typeDossier: v })}>
          <SelectTrigger className="w-[180px]" aria-label={t('Type de dossier')}><SelectValue placeholder={t('Type de dossier')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">{t('Tous les types')}</SelectItem>
            {filterTypesDossier.map(td => <SelectItem key={td.id} value={td.label}>{t(td.label)}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Date cluster: presets + range are ONE tool (they write the same
            dateFrom/dateTo strings), 8 px apart inside the cluster. The
            sliding tonal thumb carries the selection (SlidingThumb — the
            segmented-morph family, motion-spec addendum quater). */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative isolate flex h-9 items-center gap-0.5 rounded-md bg-surface-2 p-0.5" role="group" aria-label={t('Période de requête')}>
            <SlidingThumb className="rounded-md bg-accent shadow-rim" deps={[filters.datePreset]} />
            {([['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois']] as const).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant="ghost"
                className={cn(
                  'relative z-[1] h-8 px-3 shadow-none',
                  filters.datePreset === key && 'text-accent-foreground hover:bg-transparent hover:text-accent-foreground',
                )}
                data-seg-active={filters.datePreset === key || undefined}
                aria-pressed={filters.datePreset === key}
                onClick={() => applyPreset(key)}
              >
                {t(label)}
              </Button>
            ))}
          </div>

          <DateRangeFilter
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onDateFromChange={v => setDates({ dateFrom: v })}
            onDateToChange={v => setDates({ dateTo: v })}
          />
        </div>

        <div className="ms-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-ink-3" title={t('Afficher / masquer des colonnes')} data-tour="consult-colonnes">
                <Columns3 className="h-4 w-4" aria-hidden />
                {t('Colonnes')}
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
                  {t(c.label)}
                </DropdownMenuCheckboxItem>
              ))}
              {filters.hiddenCols.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => clearFilter('hiddenCols')}>
                    {t('Tout afficher')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export = the FILTERED rows in the VISIBLE column order, never the
              raw collection (Retool forums: the mismatch is the failure mode). */}
          {sortedList.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-ink-3" onClick={handleExport} disabled={exported} title={t('Exporter la liste filtrée en Excel')} data-tour="consult-export">
              {exported ? <Check className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
              {exported ? t('Exporté') : t('Exporter')}
            </Button>
          )}
        </div>
      </div>

      {/* Applied filters (§2: Polaris — chips grouped by category with ×, then
          a clear-all link at the end; §11 — informational chips are neutral).
          The count echo makes a restored filter scope visible at re-entry
          (NN/g scoped search: a silent default scope is the worst offender). */}
      {hasChipFilters && (
        <div className="flex flex-wrap items-center gap-2" aria-label={t('Filtres actifs')}>
          <span className="t-label">{t('Filtres actifs')}</span>
          {filters.nature !== 'Toutes' && (
            <FilterChip label={`${t('Nature :')} ${t(filters.nature)}`} onRemove={() => clearFilter('nature')} ariaLabel={t('Retirer le filtre nature')} />
          )}
          {filters.status !== 'Tous' && (
            <FilterChip label={`${t('Statut :')} ${t(filters.status)}`} onRemove={() => clearFilter('status')} ariaLabel={t('Retirer le filtre statut')} />
          )}
          {filters.compagnie !== 'Toutes' && (
            <FilterChip label={`${t('Compagnie :')} ${t(filters.compagnie)}`} onRemove={() => clearFilter('compagnie')} ariaLabel={t('Retirer le filtre compagnie')} />
          )}
          {filters.typeDossier !== 'Tous' && (
            <FilterChip label={`${t('Type :')} ${t(filters.typeDossier)}`} onRemove={() => clearFilter('typeDossier')} ariaLabel={t('Retirer le filtre type de dossier')} />
          )}
          {filters.dateFrom && (
            <FilterChip label={`${t('Du :')} ${fmtIsoDay(filters.dateFrom)}`} onRemove={() => setDates({ dateFrom: '' })} ariaLabel={t('Retirer la date de début')} />
          )}
          {filters.dateTo && (
            <FilterChip label={`${t('Au :')} ${fmtIsoDay(filters.dateTo)}`} onRemove={() => setDates({ dateTo: '' })} ariaLabel={t('Retirer la date de fin')} />
          )}
          <Button
            variant="link"
            size="sm"
            className="h-7 px-1 text-xs"
            onClick={clearChipFilters}
          >
            {t('Tout réinitialiser')}
          </Button>
          <span className="t-caption tabular-nums">
            {dossierList.length} {t('sur')} {allDossiers.length} {t('dossiers')}
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
      {/* PHONE — the 9-column lookup table becomes a 3-line record list:
          réf + date de requête · assuré · compagnie · statut (research §1). */}
      {isPhone && (
        <div className="md:hidden">
          {loading ? (
            <RecordListSkeleton count={6} lines={3} ariaLabel={t('Chargement des dossiers')} />
          ) : sortedList.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title={hasActiveFilters ? t('Aucun dossier pour ces filtres') : t('Aucun dossier')}
              description={
                searchOnlyCount > 0
                  ? `« ${filters.search} » ${t('existe dans')} ${searchOnlyCount} ${searchOnlyCount > 1 ? t('dossiers hors de ces filtres.') : t('dossier hors de ces filtres.')}`
                  : hasActiveFilters
                    ? `${t('Aucun résultat pour')} ${activeFilterNames.join(', ')}.`
                    : t('Aucun dossier n’a encore été créé.')
              }
              action={
                searchOnlyCount > 0 ? (
                  <Button variant="tonal" onClick={clearChipFilters}>{t('Rechercher partout')}</Button>
                ) : hasActiveFilters ? (
                  <Button variant="tonal" onClick={clearAll}>{t('Réinitialiser les filtres')}</Button>
                ) : undefined
              }
              className="bg-transparent"
            />
          ) : (
            <>
              <RecordList ariaLabel={t('Dossiers en consultation')}>
                {cap.rows.map((d: any) => {
                  const assureName = renderAssure(d.assure);
                  const requete = d.dateRequete ? (d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete)) : null;
                  return (
                    <RecordRow
                      key={d.id}
                      recordId={d.id}
                      id={d.refExpert ? <Highlight text={d.refExpert} query={filters.search} /> : <span className="font-sans font-normal text-ink-4">{t('Sans réf.')}</span>}
                      figure={
                        requete && !Number.isNaN(requete.getTime())
                          ? isToday(requete)
                            ? <Badge variant="time">{t('Aujourd’hui')}</Badge>
                            : <span className="tabular-nums">{format(requete, 'dd/MM/yyyy')}</span>
                          : null
                      }
                      primary={assureName ? <Highlight text={assureName} query={filters.search} /> : t('Assuré non renseigné')}
                      secondary={d.compagnie ? t(d.compagnie) : undefined}
                      line3={
                        <span className={cn('inline-flex max-w-full rounded-md', flashIds.has(d.id) && 'animate-value-flash')}>
                          <StatusChip status={d.statut} />
                        </span>
                      }
                      returned={returnedId === d.id}
                      href={`/dossiers/${d.id}`}
                      ariaLabel={`${t('Ouvrir le dossier')} ${d.refExpert || ''}`.trim()}
                      onClick={() => {
                        onRowTap(d.id);
                        openTab(d.id, dossierLabel(d), { preview: true });
                      }}
                    />
                  );
                })}
              </RecordList>
              <LoadMore
                shown={cap.rows.length}
                total={cap.total}
                step={25}
                hasMore={cap.hasMore}
                onMore={cap.showMore}
                noun={t('dossier')}
                nounPlural={t('dossiers')}
                suffix={rangeCaption}
              />
            </>
          )}
        </div>
      )}

      {!isPhone && (
      <div className="space-y-3 max-md:hidden">
      <Card className="overflow-hidden" data-tour="consult-table">
        <Table regionLabel={t('Dossiers en consultation')}>
          <TableHeader>
            <TableRow>
              <TableHead className={STICKY_HEAD}>
                <SortableHeader label={t('Réf. expert')} sort={sortFor('refExpert')} onChange={onSortChange('refExpert')} />
              </TableHead>
              {isVisible('assure') && (
                <TableHead>
                  <SortableHeader label={t('Assuré')} sort={sortFor('assure')} onChange={onSortChange('assure')} />
                </TableHead>
              )}
              {isVisible('matricule') && (
                <TableHead>
                  <SortableHeader label={t('Matricule')} sort={sortFor('matricule')} onChange={onSortChange('matricule')} />
                </TableHead>
              )}
              {isVisible('statut') && (
                <TableHead>
                  <SortableHeader label={t('Statut')} sort={sortFor('statut')} onChange={onSortChange('statut')} />
                </TableHead>
              )}
              {isVisible('compagnie') && (
                <TableHead>
                  <SortableHeader label={t('Compagnie')} sort={sortFor('compagnie')} onChange={onSortChange('compagnie')} />
                </TableHead>
              )}
              {isVisible('nature') && (
                <TableHead>
                  <SortableHeader label={t('Nature du dossier')} sort={sortFor('nature')} onChange={onSortChange('nature')} />
                </TableHead>
              )}
              {isVisible('typeDossier') && (
                <TableHead>
                  <SortableHeader label={t('Type de dossier')} sort={sortFor('typeDossier')} onChange={onSortChange('typeDossier')} />
                </TableHead>
              )}
              {isVisible('dateRequete') && (
                <TableHead>
                  <SortableHeader label={t('Date de requête')} sort={sortFor('dateRequete')} onChange={onSortChange('dateRequete')} />
                </TableHead>
              )}
              <TableHead className="w-10 text-right">
                <span className="sr-only">{t('Ouvrir')}</span>
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
                    title={hasActiveFilters ? t('Aucun dossier ne correspond aux filtres') : t('Aucun dossier')}
                    description={
                      searchOnlyCount > 0
                        ? `${t('Aucun résultat pour')} ${activeFilterNames.join(', ')}. « ${filters.search} » ${t('existe dans')} ${searchOnlyCount} ${searchOnlyCount > 1 ? t('dossiers hors de ces filtres.') : t('dossier hors de ces filtres.')}`
                        : hasActiveFilters
                          ? `${t('Aucun résultat pour')} ${activeFilterNames.join(', ')}.`
                          : t('Aucun dossier n’a encore été créé.')
                    }
                    action={
                      searchOnlyCount > 0 ? (
                        <Button variant="tonal" onClick={clearChipFilters}>{t('Rechercher partout')}</Button>
                      ) : hasActiveFilters ? (
                        <Button variant="tonal" onClick={clearAll}>{t('Effacer les filtres')}</Button>
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
                    openDossier(d);
                  }}
                >
                  <TableCell className={cn(STICKY_CELL, 't-mono font-semibold')}>
                    {d.refExpert ? (
                      <Link
                        href={`/dossiers/${d.id}`}
                        className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${t('Ouvrir le dossier')} ${d.refExpert}`}
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
                  {isVisible('matricule') && (
                    <TableCell className="t-mono">
                      {d.matricule ? <Highlight text={d.matricule} query={filters.search} /> : <EmptyCell />}
                    </TableCell>
                  )}
                  {isVisible('statut') && (
                    <TableCell>
                      {/* One-shot teal fade when the statut just changed in
                          the live snapshot (motion-spec §8 Yellow-Fade — the
                          cell, never the row). */}
                      <span className={cn('inline-flex max-w-full rounded-md', flashIds.has(d.id) && 'animate-value-flash')}>
                        <StatusChip status={d.statut} />
                      </span>
                    </TableCell>
                  )}
                  {isVisible('compagnie') && (
                    <TableCell className="max-w-[14rem]">
                      {d.compagnie ? (
                        <span className="block truncate" title={d.compagnie}>{t(d.compagnie)}</span>
                      ) : <EmptyCell />}
                    </TableCell>
                  )}
                  {isVisible('nature') && <TableCell>{d.nature ? t(d.nature) : <EmptyCell />}</TableCell>}
                  {isVisible('typeDossier') && <TableCell>{d.typeDossier ? t(d.typeDossier) : <EmptyCell />}</TableCell>}
                  {isVisible('dateRequete') && (
                    <TableCell>
                      {formatDate(d.dateRequete) ? (
                        <span className="inline-flex items-center gap-2">
                          {formatDate(d.dateRequete)}
                          {/* Terracotta's ONE meaning is time — « Aujourd'hui »
                              word marker, same as the chiffrage queue's Date
                              cell (addendum 2026-09-02). */}
                          {isToday(d.dateRequete.toDate ? d.dateRequete.toDate() : new Date(d.dateRequete)) && (
                            <Badge variant="time">{t('Aujourd’hui')}</Badge>
                          )}
                        </span>
                      ) : <EmptyCell />}
                    </TableCell>
                  )}
                  <TableCell className="w-10 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-ink-3 hover:text-ink"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/dossiers/${d.id}`} title={t('Ouvrir le dossier')} aria-label={`${t('Ouvrir le dossier')} ${d.refExpert || ''}`}>
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
            {`${t('Afficher plus')} (${sortedList.length - visibleCount} ${t('restants')})`}
          </Button>
        )}
        <span className="t-caption tabular-nums">
          {sortedList.length > visibleCount ? (
            <>{t('Affichés')} <span className="font-semibold text-ink">{visibleCount}</span> {t('sur')} <span className="font-semibold text-ink">{sortedList.length}</span>{' '}{t('dossiers')}{rangeCaption}</>
          ) : (
            <>{t('Total')}{' '}: <span className="font-semibold text-ink">{sortedList.length}</span>{' '}{sortedList.length > 1 ? t('dossiers') : t('dossier')}{rangeCaption}</>
          )}
        </span>
      </div>
      </div>
      )}

      {/* PHONE — every desktop filter in one sheet (research §4). */}
      {isPhone && (
        <FilterSheet<ConsultationFilters>
          open={phoneFiltersOpen}
          onOpenChange={setPhoneFiltersOpen}
          value={filters}
          // « Réinitialiser » clears the FILTERS only — search, sort and the
          // column picker are the reader's workspace, not filters.
          defaults={{
            ...filters,
            nature: 'Toutes', status: 'Tous', compagnie: 'Toutes', typeDossier: 'Tous',
            dateFrom: '', dateTo: '', datePreset: null,
          }}
          onApply={(next) => setFilters(() => next)}
          countFor={countFor}
          noun={t('dossier')}
          nounPlural={t('dossiers')}
          isSet={(p) =>
            p.nature !== 'Toutes' || p.status !== 'Tous' || p.compagnie !== 'Toutes' ||
            p.typeDossier !== 'Tous' || !!p.dateFrom || !!p.dateTo
          }
        >
          {(pending, set) => (
            <>
              <FilterSection label={t('Statut')} set={pending.status !== 'Tous'}>
                <FilterSelect
                  ariaLabel={t('Statut')}
                  value={pending.status}
                  onChange={(v) => set({ status: v })}
                  options={[
                    { value: 'Tous', label: t('Tous les statuts') },
                    ...filterStatuses.map((s) => ({ value: s.label, label: t(s.label) })),
                  ]}
                />
              </FilterSection>
              <FilterSection label={t('Compagnie')} set={pending.compagnie !== 'Toutes'}>
                <FilterSelect
                  ariaLabel={t('Compagnie')}
                  value={pending.compagnie}
                  onChange={(v) => set({ compagnie: v })}
                  options={[
                    { value: 'Toutes', label: t('Toutes les compagnies') },
                    ...filterCompagnies.map((c) => ({ value: c.label, label: t(c.label) })),
                  ]}
                />
              </FilterSection>
              <FilterSection label={t('Nature du dossier')} set={pending.nature !== 'Toutes'}>
                <FilterSelect
                  ariaLabel={t('Nature du dossier')}
                  value={pending.nature}
                  onChange={(v) => set({ nature: v })}
                  options={[
                    { value: 'Toutes', label: t('Toutes les natures') },
                    ...filterNatures.map((n) => ({ value: n.label, label: t(n.label) })),
                  ]}
                />
              </FilterSection>
              <FilterSection label={t('Type de dossier')} set={pending.typeDossier !== 'Tous'}>
                <FilterSelect
                  ariaLabel={t('Type de dossier')}
                  value={pending.typeDossier}
                  onChange={(v) => set({ typeDossier: v })}
                  options={[
                    { value: 'Tous', label: t('Tous les types') },
                    ...filterTypesDossier.map((td) => ({ value: td.label, label: t(td.label) })),
                  ]}
                />
              </FilterSection>
              <FilterSection label={t('Période de requête')} set={!!pending.dateFrom || !!pending.dateTo}>
                <FilterChoiceChips
                  ariaLabel={t('Période de requête')}
                  value={pending.datePreset === 'personnalise' ? null : pending.datePreset}
                  onChange={(v) =>
                    set(v ? presetRange(v as 'jour' | 'semaine' | 'mois') : { dateFrom: '', dateTo: '', datePreset: null })
                  }
                  options={[
                    { value: 'jour', label: t('Jour') },
                    { value: 'semaine', label: t('Semaine') },
                    { value: 'mois', label: t('Mois') },
                  ]}
                />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="t-label">{t('Du')}</span>
                    <input
                      type="date"
                      value={pending.dateFrom}
                      onChange={(e) => set({ dateFrom: e.target.value, datePreset: e.target.value || pending.dateTo ? 'personnalise' : null })}
                      className="h-12 w-full rounded-md border border-input bg-card px-3 text-[16px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="t-label">{t('Au')}</span>
                    <input
                      type="date"
                      value={pending.dateTo}
                      onChange={(e) => set({ dateTo: e.target.value, datePreset: e.target.value || pending.dateFrom ? 'personnalise' : null })}
                      className="h-12 w-full rounded-md border border-input bg-card px-3 text-[16px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>
              </FilterSection>
            </>
          )}
        </FilterSheet>
      )}

      {isPhone && (
        <SortSheet
          open={phoneSortOpen}
          onOpenChange={setPhoneSortOpen}
          value={phoneSort}
          options={[
            { value: 'recent', label: t('Plus récents'), hint: t('Date de requête') },
            { value: 'ancien', label: t('Plus anciens'), hint: t('Date de requête') },
          ]}
          onChange={(v) => setFilters({ sortKey: 'dateRequete', sortDir: v === 'ancien' ? 'asc' : 'desc' })}
        />
      )}
    </div>
  );
}
