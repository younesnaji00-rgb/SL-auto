'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, AlertCircle, Eye, History, FolderOpen, ChevronLeft, ChevronRight, RotateCcw, Filter, Check, Columns3 } from 'lucide-react';
import { format, formatDistanceToNowStrict, differenceInCalendarDays, isToday, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, STICKY_HEAD, STICKY_CELL, EmptyCell } from '@/components/ui/table';
import { FilterChip } from '@/components/ui/filter-chip';
import { SortableHeader } from '@/components/ui/sortable-header';
import { findNavItem } from '@/lib/nav-groups';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useDossiers } from '@/hooks/use-dossiers';
import { useAuth, useFirestore } from '@/firebase';
import { logWorkflow } from './[id]/log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { CreateDossierDialog } from '@/components/dossiers/create-dossier-dialog';
import WorkflowStatusSheet from './workflow-status-sheet';
import { DateRangeFilter } from '@/components/date-range-filter';
import AssignmentHistorySheet from './assignment-history-sheet';
import StatusHistorySheet from './status-history-sheet';
import ObservationHistorySheet from './observation-history-sheet';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDossierTabs } from '@/hooks/use-dossier-tabs';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { PageHeader } from '@/components/layout/page-header';
import { SavedViews } from '@/components/ui/saved-views';
import { dossierLabel } from '@/lib/dossier-label';
import { writeDossierListOrder } from '@/lib/dossier-list-order';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DossierPeekPanel } from '@/components/dossiers/dossier-peek-panel';
import { DossierKpiStrip } from '@/components/dossiers/dossier-kpi-strip';
import { MoreHorizontal, ExternalLink } from 'lucide-react';
import { getStatusDotColor } from '@/lib/status-colors';
import { StatusChip } from '@/components/ui/status-chip';
import { useTutorialMode } from '@/lib/tutorial/use-tutorial-mode';
import { tourDialogGuard } from '@/lib/tutorial/dialog-guard';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { SlidingThumb } from '@/components/ui/sliding-thumb';
import { type ExportColumn } from '@/lib/export-excel';
import { CANONICAL_STATUTS } from '@/lib/dossiers-data';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { addDoc, collection, doc, updateDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Column order = five logical chunks on the hierarchical scan path (research
// 2026-09-03, docs/research/dossiers-attention-efficiency.md): identity →
// state → parties → véhicule → dates → provenance. Eyetracking shows users
// sample the first columns of each row then skip (NN/g data tables), so the
// two action signals (statut, observation) move into the left third instead
// of positions 8–9; the lookup-only columns pan right.
const EXPORT_COLUMNS: ExportColumn[] = [
  // identité
  { key: 'refExpert', label: 'Réf Expert' },
  { key: 'assure', label: 'Assuré' },
  // état — ce qui demande une action
  { key: 'statut', label: 'Statut' },
  { key: 'observation', label: 'Observation' },
  { key: 'anciennete', label: 'Ancienneté' },
  { key: 'createdAt', label: 'Date de création' },
  // parties
  { key: 'compagnie', label: 'Compagnie' },
  { key: 'referenceCompagnie', label: 'Référence de compagnie' },
  { key: 'policeNumber', label: 'N° police' },
  { key: 'garageName', label: 'Garage' },
  // classification
  { key: 'nature', label: 'Nature du dossier' },
  { key: 'typeDossier', label: 'Type Dossier' },
  // véhicule
  { key: 'vehicule', label: 'Véhicule' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'matriculeAnterieur', label: 'Matricule antérieur' },
  // dates du sinistre
  { key: 'dateSinistre', label: 'Date sinistre' },
  { key: 'dateRequete', label: 'Date Requête' },
  // provenance
  { key: 'createdByName', label: 'Créé par' },
];

// The identifier column can never be hidden — it is the row's anchor.
const HIDEABLE_COLUMNS = EXPORT_COLUMNS.filter((c) => c.key !== 'refExpert');

// Wide-monitor columns (owner request 2026-09-03: with the 1600px shell cap
// lifted for this page, the table takes over the freed width on 1440p/4K).
// CSS-hidden below their breakpoint so the laptop/mobile layout is unchanged;
// applied to BOTH the header and the body cell of the key, and the column
// picker can still trim them like any other column. Chunk placement follows
// the research-fixed order (parties / véhicule).
const WIDE_COL_CLASS: Record<string, string> = {
  garageName: 'hidden 2xl:table-cell',
  vehicule: 'hidden 2xl:table-cell',
  policeNumber: 'hidden min-[1920px]:table-cell',
};

// « À traiter » scope: every status that still needs work. Only « Accord
// envoyé » is terminal in the canonical status machine today — a Réforme
// still moves through rapport/honoraires. Extend this set if a new terminal
// status appears.
const TERMINAL_STATUTS: ReadonlySet<string> = new Set(['Accord envoyé']);
const isActionNeeded = (statut: string | undefined) => !TERMINAL_STATUTS.has((statut || '').trim());

// Age alarm threshold in days (SLA aging — attention research 2026-09-03).
// Lateness uses the DANGER pair, never terracotta (addendum 2026-09-02:
// terracotta marks aujourd'hui/prochain, "lateness belongs to the danger
// pair"). Tune here.
const LATE_AFTER_DAYS = 7;

// Diacritic/case-insensitive search normalizer (fuzzy-search upgrade — the
// TanStack `rankItem` value delivered natively; ecosystem research
// 2026-09-03). Every space-separated term must match somewhere in the row.
const normSearch = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function DossiersClientPage() {
  const router = useRouter();
  const t = useT();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const { profile, canWrite, canDelete } = useCurrentUser();
  const tutorialMode = useTutorialMode();
  const canEditDossiers = canWrite('dossiers');
  const { openTab } = useDossierTabs();

  // Single click = preview tab (replaced by the next preview); "Ouvrir dans un
  // onglet" / double-click = permanent tab (VS Code preview-tab semantics).
  // Snapshot the filtered order whenever a dossier is opened, so the record
  // bar can iterate « précédent / suivant » in the same order (see
  // src/lib/dossier-list-order.ts). A ref rather than a dep: dossierList
  // changes on every keystroke of the search box.
  const dossierListRef = React.useRef<Array<{ id: string }>>([]);
  const openDossier = useCallback((d: { id: string; refExpert?: string; numero?: string; assure?: any }, opts?: { preview?: boolean; navigate?: boolean }) => {
    writeDossierListOrder(dossierListRef.current.map((row) => row.id));
    openTab(d.id, dossierLabel(d), { preview: opts?.preview ?? true });
    if (opts?.navigate !== false) router.push(`/dossiers/${d.id}`);
  }, [openTab, router]);

  const { options: dbCompagnies } = useOptions('compagnies');
  const { options: dbNatures } = useOptions('options_natures');
  const { options: dbStatuses } = useOptions('options_statuts');
  const { options: dbObservationOptions } = useOptions('options_observations');

  // Single source of truth: Firestore. Filter inactive entries client-side so
  // an option deactivated via the manager modal disappears from every dropdown.
  const allCompagnies = useMemo(() => dbCompagnies.filter(o => o.active !== false), [dbCompagnies]);
  const natures = useMemo(() => dbNatures.filter(o => o.active !== false), [dbNatures]);
  const statuses = useMemo(() => dbStatuses.filter(o => o.active !== false), [dbStatuses]);

  const userCompagnies = profile?.compagnies || [];

  // Filter company dropdown to only show user's assigned companies
  const compagnies = useMemo(() => {
    if (userCompagnies.length === 0) return allCompagnies;
    const allowed = userCompagnies.map(c => c.toLowerCase().trim());
    return allCompagnies.filter(c => allowed.includes(c.label.toLowerCase().trim()));
  }, [allCompagnies, userCompagnies]);

  const { dossiers: allDossiers, loading, error: fetchError, deleteDossier } = useDossiers(userCompagnies.length > 0 ? userCompagnies : undefined);

  // Union the seeded option lists with any values present on real dossiers,
  // so the filter dropdowns include values that live data has but the seeded
  // list doesn't (e.g., `4ème accord` produced by the uncapped status machine,
  // or legacy values from deleted options that some dossiers still reference).
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
  // Status filter shows the CANONICAL automatic-status set (the actual values
  // the status machine emits as a dossier moves through its timeline steps).
  // We intentionally bypass the seeded `options_statuts` collection here so
  // that legacy / manually-added entries don't leak back into the filter.
  // Live values from dossiers (e.g. uncapped `Nème accord` for N≥4) are still
  // appended so rows carrying those statuses remain filterable.
  const canonicalStatusOptions = useMemo(
    () => CANONICAL_STATUTS.map((label, i) => ({ id: `canonical-${label}`, label, order: i, active: true })),
    [],
  );
  const filterStatuses = useMemo(
    () => augmentWithLiveValues(canonicalStatusOptions, allDossiers.map((d) => d.statut)),
    [canonicalStatusOptions, allDossiers],
  );
  const filterNatures = useMemo(
    () => augmentWithLiveValues(natures, allDossiers.map((d) => d.nature)),
    [natures, allDossiers],
  );
  const filterCompagnies = useMemo(
    () => augmentWithLiveValues(compagnies, allDossiers.map((d) => d.compagnie)),
    [compagnies, allDossiers],
  );
  const filterObservations = useMemo(
    () => dbObservationOptions.filter(o => o.active !== false),
    [dbObservationOptions]
  );
  const customObservationTexts = useMemo(() => {
    const predefined = new Set(filterObservations.map(o => o.label));
    const seen = new Set<string>();
    for (const d of allDossiers) {
      const t = (d as any).lastObservation?.text?.trim();
      if (t && !predefined.has(t)) seen.add(t);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [filterObservations, allDossiers]);

  // One-shot load of all users → uid map. Used by the "Créé par" column so we
  // can render the user's real name ("Prenom Nom") even when the legacy
  // `createdByName` field on the dossier stored their email (older accounts
  // had no displayName when create-empty-dossier captured the field).
  const [userNameByUid, setUserNameByUid] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    getDocs(collection(db, 'users'))
      .then((snap) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const d of snap.docs) {
          const data = d.data() as any;
          const full = `${data.prenom || ''} ${data.nom || ''}`.trim();
          if (full) map[d.id] = full;
        }
        setUserNameByUid(map);
      })
      .catch((err) => console.warn('[dossiers] fetch users map failed', err));
    return () => { cancelled = true; };
  }, [db]);

  /** Resolve the creator's display name for a dossier. Prefer the live users
   *  collection ("Prenom Nom") looked up by `createdBy` uid; fall back to the
   *  stored `createdByName` (which is sometimes an email for older accounts);
   *  finally fall back to empty string (rendered as "—" by callers). */
  const resolveCreatorName = (d: any): string => {
    const uid = (d?.createdBy || '').trim();
    if (uid && userNameByUid[uid]) return userNameByUid[uid];
    return ((d?.createdByName || '') as string).trim();
  };

  // Creator filter options — distinct resolved creator names present on the
  // current dossier set. We list only creators who appear in the visible data
  // (per spec) rather than enumerating every user in the system. Resolution
  // uses the live users map first, so renamed users / fixed displayName
  // surface here too.
  const filterCreators = useMemo(() => {
    const seen = new Set<string>();
    for (const d of allDossiers) {
      const name = resolveCreatorName(d);
      if (name) seen.add(name);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [allDossiers, userNameByUid]);

  // Armed default view (owner-approved 2026-09-03): the page opens on
  // « À traiter » — the zero-interaction answer to the day's actual question
  // (default bias / Split-Inbox research). « Tous » is one tab away.
  const filterDefaults = { search: '', scope: 'a-traiter' as 'a-traiter' | 'tous', lateOnly: false, nature: 'Toutes', status: 'Tous', compagnie: 'Toutes', observation: 'Toutes', creator: 'Tous', dateFrom: '', dateTo: '', rowsPerPage: 25, sortByCreation: 'desc' as 'desc' | 'asc', datePreset: null as 'jour' | 'semaine' | 'mois' | 'personnalise' | null, hiddenCols: [] as string[], density: 'normale' as 'compacte' | 'normale' | 'confortable' };
  const [filters, setFilters, clearFilter] = usePersistedFilters('dossiers', filterDefaults);
  const rowsPerPage = filters.rowsPerPage;
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; refExpert: string } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workflowDossier, setWorkflowDossier] = useState<any>(null);
  const [assignmentDossier, setAssignmentDossier] = useState<any>(null);
  const [rappelObservation, setRappelObservation] = useState('');
  const [statusHistoryDossier, setStatusHistoryDossier] = useState<any>(null);
  const [observationHistoryDossier, setObservationHistoryDossier] = useState<any>(null);

  // Export mode state
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Mes rappels — sender-side dialog state
  const [isSendToOpen, setIsSendToOpen] = useState(false);
  const [gestionnaires, setGestionnaires] = useState<Array<{ uid: string; nom: string; prenom: string }>>([]);
  const [gestLoading, setGestLoading] = useState(false);
  const [selectedGestUids, setSelectedGestUids] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  /** Whole days since a timestamp-ish value; null when absent/invalid. */
  const ageDays = (val: any): number | null => {
    if (!val) return null;
    const date = val.toDate ? val.toDate() : new Date(val);
    if (Number.isNaN(date.getTime())) return null;
    return Math.max(0, differenceInCalendarDays(new Date(), date));
  };

  // One filter pass, with an optional excluded dimension. `except` powers the
  // faceted option counts (native equivalent of TanStack's
  // getFacetedUniqueValues, ecosystem research 2026-09-03): each column's
  // counts come from the list filtered by every OTHER filter, so a popover
  // shows exactly what choosing an option would yield.
  const filteredExcept = useCallback((except: string | null) => {
    let results = [...allDossiers];
    if (except !== 'scope' && filters.scope !== 'tous') results = results.filter(d => isActionNeeded(d.statut));
    if (except !== 'scope' && filters.lateOnly) {
      results = results.filter(d => {
        const age = ageDays((d as any).createdAt);
        return isActionNeeded(d.statut) && age !== null && age >= LATE_AFTER_DAYS;
      });
    }
    if (except !== 'nature' && filters.nature !== 'Toutes') results = results.filter(d => d.nature === filters.nature);
    if (except !== 'status' && filters.status !== 'Tous') results = results.filter(d => d.statut === filters.status);
    if (except !== 'compagnie' && filters.compagnie !== 'Toutes') results = results.filter(d => d.compagnie === filters.compagnie);
    if (except !== 'observation') {
      if (filters.observation === 'Autre') {
        const predefined = new Set(filterObservations.map(o => o.label));
        results = results.filter(d => {
          const t = (d as any).lastObservation?.text?.trim();
          return t && t !== 'Autre' && !predefined.has(t);
        });
      } else if (filters.observation !== 'Toutes') {
        results = results.filter(d => d.lastObservation?.text === filters.observation);
      }
    }
    if (except !== 'creator' && filters.creator !== 'Tous') results = results.filter(d => resolveCreatorName(d) === filters.creator);
    if (filters.search) {
      // Diacritic/case-insensitive, multi-term AND across the row's
      // identifying fields (search upgrade, ecosystem research 2026-09-03 —
      // « réf compagnie », both matricules and the creator are now findable).
      const terms = normSearch(filters.search).split(/\s+/).filter(Boolean);
      results = results.filter(d => {
        const hay = normSearch([
          d.refExpert,
          typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`,
          d.matricule,
          d.vehicule?.immatriculationAnterieur,
          d.compagnie,
          d.referenceCompagnie,
          resolveCreatorName(d),
        ].filter(Boolean).join(' '));
        return terms.every(t => hay.includes(t));
      });
    }
    // Date filter keys off `createdAt` (per R2-8) — the dossier's own creation
    // timestamp, not the gestionnaire-entered dateRequete.
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      results = results.filter(d => {
        const raw = (d as any).createdAt;
        if (!raw) return false;
        const date = raw.toDate ? raw.toDate() : (raw.toMillis ? new Date(raw.toMillis()) : new Date(raw));
        return date >= from;
      });
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(d => {
        const raw = (d as any).createdAt;
        if (!raw) return false;
        const date = raw.toDate ? raw.toDate() : (raw.toMillis ? new Date(raw.toMillis()) : new Date(raw));
        return date <= to;
      });
    }
    return results;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDossiers, filters, filterObservations, userNameByUid]);

  const dossierList = useMemo(() => {
    const results = filteredExcept(null);
    // Sort by creation date. Firestore subscription already returns rows in
    // `createdAt desc` order, but we re-sort here so the `asc` toggle works
    // and so dossiers missing `createdAt` land deterministically at the end.
    const toMillis = (val: any): number => {
      if (!val) return 0;
      if (typeof val.toMillis === 'function') return val.toMillis();
      if (typeof val.toDate === 'function') return val.toDate().getTime();
      const t = new Date(val).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const dir = filters.sortByCreation === 'asc' ? 1 : -1;
    results.sort((a, b) => (toMillis((a as any).createdAt) - toMillis((b as any).createdAt)) * dir);
    return results;
  }, [filteredExcept, filters.sortByCreation]);

  // Faceted option counts for the per-column filter popovers.
  const facetCounts = useMemo(() => {
    const count = (rows: any[], get: (d: any) => string | undefined) => {
      const m = new Map<string, number>();
      for (const d of rows) {
        const v = (get(d) || '').trim();
        if (!v) continue;
        m.set(v, (m.get(v) || 0) + 1);
      }
      return m;
    };
    return {
      nature: count(filteredExcept('nature'), d => d.nature),
      status: count(filteredExcept('status'), d => d.statut),
      compagnie: count(filteredExcept('compagnie'), d => d.compagnie),
      observation: count(filteredExcept('observation'), d => d.lastObservation?.text),
      creator: count(filteredExcept('creator'), d => resolveCreatorName(d)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExcept]);

  // KPI strip figures — company-scoped totals, independent of the filters so
  // the tiles stay stable navigation anchors (they SET filters, they don't
  // follow them).
  const kpi = useMemo(() => {
    let aTraiter = 0, enRetard = 0, aujourdHui = 0;
    for (const d of allDossiers) {
      const action = isActionNeeded(d.statut);
      if (action) aTraiter++;
      const age = ageDays((d as any).createdAt);
      if (action && age !== null && age >= LATE_AFTER_DAYS) enRetard++;
      const raw = (d as any).createdAt;
      if (raw) {
        const dt = raw.toDate ? raw.toDate() : new Date(raw);
        if (!Number.isNaN(dt.getTime()) && isToday(dt)) aujourdHui++;
      }
    }
    return { aTraiter, enRetard, aujourdHui, total: allDossiers.length };
  }, [allDossiers]);

  useEffect(() => { dossierListRef.current = dossierList; }, [dossierList]);

  // Pagination — total pages, and clamp current page when filtered list shrinks
  // (e.g. user searches and the previously-viewed page no longer exists).
  const totalPages = Math.max(1, Math.ceil(dossierList.length / rowsPerPage));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Columns the user chose to hide (persisted with the filters; default = all
  // visible so nothing changes until the user opts in via « Colonnes »).
  const visibleColumns = useMemo(
    () => EXPORT_COLUMNS.filter((c) => c.key === 'refExpert' || !filters.hiddenCols.includes(c.key)),
    [filters.hiddenCols],
  );
  const colCount = visibleColumns.length + 1; // + checkbox (Rappeler) or actions column

  const pageRows = useMemo(
    () => dossierList.slice((page - 1) * rowsPerPage, page * rowsPerPage),
    [dossierList, page, rowsPerPage],
  );

  // Keyboard row focus state (spine registered below, after the selection
  // handlers it drives are declared).
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  useEffect(() => { setFocusIdx(null); }, [page, dossierList.length]);
  useEffect(() => {
    if (focusIdx !== null && focusIdx >= pageRows.length) {
      setFocusIdx(pageRows.length ? pageRows.length - 1 : null);
    }
  }, [focusIdx, pageRows.length]);
  const moveFocus = useCallback((delta: number) => {
    setFocusIdx((prev) => {
      if (pageRows.length === 0) return null;
      if (prev === null) return delta > 0 ? 0 : pageRows.length - 1;
      return Math.min(pageRows.length - 1, Math.max(0, prev + delta));
    });
  }, [pageRows.length]);
  useEffect(() => {
    if (focusIdx === null) return;
    document
      .querySelector(`[data-row-idx="${focusIdx}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx]);
  const focusedRow = focusIdx !== null ? pageRows[focusIdx] : undefined;

  // Peek panel (owner-approved 2026-09-03) — the ephemeral detail tier.
  // Single click opens it; ↑/↓ retarget it; Entrée / « Ouvrir » commit to the
  // full page; Échap closes (before dropping the row focus).
  const [peekId, setPeekId] = useState<string | null>(null);
  const peekDossier = useMemo(
    () => (peekId ? dossierList.find(d => d.id === peekId) ?? null : null),
    [peekId, dossierList],
  );
  const peekPosition = useMemo(() => {
    if (!peekId) return undefined;
    const i = dossierList.findIndex(d => d.id === peekId);
    return i === -1 ? undefined : { index: i + 1, total: dossierList.length };
  }, [peekId, dossierList]);
  // Retarget the open peek when the keyboard focus moves to another row.
  useEffect(() => {
    if (peekId && focusedRow && focusedRow.id !== peekId) setPeekId(focusedRow.id);
  }, [peekId, focusedRow]);
  // Close the peek when its row leaves the filtered list.
  useEffect(() => {
    if (peekId && !dossierList.some(d => d.id === peekId)) setPeekId(null);
  }, [peekId, dossierList]);

  // Clean up stale row selections when filters change
  const dossierIds = useMemo(() => new Set(dossierList.map(d => d.id)), [dossierList]);
  useEffect(() => {
    if (!exportMode) return;
    setSelectedRows(prev => {
      const cleaned = new Set([...prev].filter(id => dossierIds.has(id)));
      if (cleaned.size === prev.size) return prev;
      return cleaned;
    });
  }, [dossierIds, exportMode]);

  const handleToggleRow = useCallback((id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedRows(new Set(dossierList.map(d => d.id)));
  }, [dossierList]);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows(new Set());
  }, []);

  // Keyboard spine (research 2026-09-03: Linear/Airtable list conventions —
  // ↑/↓ or j/k move a visible row focus, Entrée opens, x selects in Rappeler
  // mode, Échap drops the focus). Registered through the app-wide hotkey
  // registry so the bindings appear in the « ? » sheet and stay quiet while
  // typing in a field or inside a dialog.
  useHotkeys([
    { keys: 'arrowdown', label: t('Ligne suivante'), group: t('Liste des dossiers'), handler: () => moveFocus(1) },
    { keys: 'j', label: t('Ligne suivante'), group: t('Liste des dossiers'), handler: () => moveFocus(1) },
    { keys: 'arrowup', label: t('Ligne précédente'), group: t('Liste des dossiers'), handler: () => moveFocus(-1) },
    { keys: 'k', label: t('Ligne précédente'), group: t('Liste des dossiers'), handler: () => moveFocus(-1) },
    {
      keys: 'enter',
      label: t('Ouvrir la ligne en surbrillance'),
      group: t('Liste des dossiers'),
      enabled: !!focusedRow,
      handler: () => {
        if (!focusedRow) return;
        if (exportMode) handleToggleRow(focusedRow.id);
        else openDossier(focusedRow);
      },
    },
    {
      keys: 'x',
      label: t('Sélectionner la ligne (mode rappel)'),
      group: t('Liste des dossiers'),
      enabled: exportMode && !!focusedRow,
      handler: () => { if (focusedRow) handleToggleRow(focusedRow.id); },
    },
    {
      keys: 'space',
      label: t("Aperçu de la ligne (ouvrir / fermer)"),
      group: t('Liste des dossiers'),
      enabled: !exportMode && !!focusedRow,
      handler: () => {
        if (!focusedRow) return;
        setPeekId(prev => (prev === focusedRow.id ? null : focusedRow.id));
      },
    },
    {
      keys: 'escape',
      label: t("Fermer l'aperçu / quitter la surbrillance"),
      group: t('Liste des dossiers'),
      enabled: peekId !== null || focusIdx !== null,
      handler: () => {
        if (peekId !== null) setPeekId(null);
        else setFocusIdx(null);
      },
    },
  ], [moveFocus, focusedRow, focusIdx, peekId, exportMode, handleToggleRow, openDossier, t]);

  useEffect(() => {
    if (!isSendToOpen || !db) return;
    setGestLoading(true);
    getDocs(query(collection(db, 'users'), where('role', '==', 'Gestionnaire')))
      .then((snap) => {
        const list = snap.docs.map((d) => ({
          uid: d.id,
          nom: (d.data() as any).nom || '',
          prenom: (d.data() as any).prenom || '',
        }));
        // Tutorial mode: the user explores alone, so let them address a rappel
        // to THEMSELVES and play both sender and recipient in one browser.
        if (tutorialMode && profile?.uid && !list.some((g) => g.uid === profile.uid)) {
          list.unshift({ uid: profile.uid, nom: profile.nom || '', prenom: profile.prenom || '' });
        }
        setGestionnaires(list);
      })
      .catch((err) => console.warn('[mes-rappels] fetch gestionnaires failed', err))
      .finally(() => setGestLoading(false));
  }, [isSendToOpen, db, profile?.uid, profile?.nom, profile?.prenom, tutorialMode]);

  const handleSendRappel = async () => {
    if (!db || !profile || selectedRows.size === 0 || selectedGestUids.size === 0) return;
    setSending(true);
    try {
      const senderName = `${profile.prenom || ''} ${profile.nom || ''}`.trim() || profile.email || profile.uid;
      const selectedDossiers = dossierList.filter((d) => selectedRows.has(d.id));
      // One batchId per send action, shared across every (recipient × dossier) write.
      const batchId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const writes: Promise<any>[] = [];
      for (const g of gestionnaires.filter((gg) => selectedGestUids.has(gg.uid))) {
        for (const d of selectedDossiers) {
          writes.push(addDoc(collection(db, 'rappels'), {
            batchId,
            recipientUid: g.uid,
            recipientNom: `${g.prenom || ''} ${g.nom || ''}`.trim(),
            senderUid: profile.uid,
            senderNom: senderName,
            dossierId: d.id,
            dossierRef: (d as any).refExpert || '',
            observation: rappelObservation.trim() || null,
            createdAt: serverTimestamp(),
            read: false,
          }));
        }
      }
      await Promise.all(writes);
      toast({ title: t('Rappels envoyés'), description: `${writes.length} ${t('rappel(s) envoyé(s).')}` });
      setIsSendToOpen(false);
      setSelectedGestUids(new Set());
      setRappelObservation('');
      setSelectedRows(new Set());
      setExportMode(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: err.message || t("Impossible d'envoyer les rappels.") });
    } finally {
      setSending(false);
    }
  };

  const allVisibleSelected = dossierList.length > 0 && dossierList.every(d => selectedRows.has(d.id));

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
  };

  const handleDeleteDossier = (dossierId: string) => {
    // Optimistic UI: close the dialog and clear the spinner immediately. The
    // forced long-polling transport (mandatory for Firefox, see
    // src/firebase/index.ts) can take several seconds to acknowledge a single
    // write, so awaiting here used to freeze the dialog for ~10s. Firestore's
    // local cache fires the snapshot listener as soon as the local write
    // commits, so the row disappears from the table near-instantly even
    // while the network round-trip is still in flight.
    const dossier = allDossiers.find(d => d.id === dossierId);
    const userEmail = auth?.currentUser?.email || 'Admin';
    const userId = auth?.currentUser?.uid || 'unknown';
    const dossierRef = (dossier as any)?.refExpert || dossierId;

    setDeleteTarget(null);
    toast({ title: t('Dossier supprimé'), description: t('Le dossier et ses données ont été purgés.') });

    void logWorkflow(db, dossierId, 'Suppression de dossier', userEmail, userId, 'done', { dossierRef, details: `Dossier "${dossierRef}" supprimé définitivement` }, profile?.nom);
    deleteDossier(dossierId).catch((err: any) => {
      console.error('Delete error:', err);
      toast({ variant: 'destructive', title: t('Erreur'), description: err?.message || t('Suppression impossible') });
    });
  };

  const formatDate = (val: any): string => {
    if (!val) return '';
    const date = val.toDate ? val.toDate() : new Date(val);
    return Number.isNaN(date.getTime()) ? '' : format(date, 'dd/MM/yyyy');
  };

  // Cells keep the absolute dd/MM/yyyy (claims work is a reference context —
  // cross-row comparison + insurer correspondence; research 2026-09-03,
  // dossiers-color-type-polish.md §3); the relative age rides in the tooltip
  // so nobody does per-row date arithmetic.
  const relativeDate = (val: any): string | undefined => {
    if (!val) return undefined;
    const date = val.toDate ? val.toDate() : new Date(val);
    if (Number.isNaN(date.getTime())) return undefined;
    try {
      return formatDistanceToNowStrict(date, { locale: dateFnsLocale(), addSuffix: true });
    } catch {
      return undefined;
    }
  };

  const renderAssure = (assure: any): string => {
    if (!assure) return '';
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim();
  };

  // Empty cell = quiet dash (blueprint §2: values are the star, empties recede).
  const cell = (v: string | undefined | null) => (v ? v : <EmptyCell />);

  // One renderer per column key so the body always follows the header's
  // visible-column order (column picker). Emphasis budget: 2 cells per row —
  // identifier + status chip (addendum ter B; attention research 2026-09-03:
  // the old row spent 4 emphasis tokens on a 3-token budget, so the assuré
  // name is back to normal weight).
  const renderDataCell = (d: any, key: string, isFocused: boolean): React.ReactNode => {
    switch (key) {
      case 'refExpert':
        return (
          <TableCell
            key={key}
            className={cn(!exportMode && STICKY_CELL, 't-mono font-semibold', isFocused && '!bg-surface-2')}
          >
            {d.refExpert || <span className="font-sans font-normal text-ink-4">{t('Sans réf.')}</span>}
          </TableCell>
        );
      case 'assure':
        return (
          <TableCell key={key} className="max-w-[220px] truncate" title={renderAssure(d.assure) || undefined}>
            {cell(renderAssure(d.assure))}
          </TableCell>
        );
      case 'statut':
        return (
          <TableCell
            key={key}
            onClick={exportMode ? undefined : (e) => {
              e.stopPropagation();
              setStatusHistoryDossier(d);
            }}
            className={cn('min-w-[200px]', !exportMode && 'cursor-pointer hover:bg-surface-3 transition-colors')}
            title={!exportMode ? t("Voir l'historique des statuts") : undefined}
            data-tour="dos-statut-cell"
          >
            {/* Shared app-wide status mapping (element-specs §11) — the
                inline Badge-outline path was retired 2026-09-02. */}
            <StatusChip status={d.statut} data-tour="dos-statut-pill" />
          </TableCell>
        );
      case 'observation':
        return (
          <TableCell
            key={key}
            onClick={exportMode ? undefined : (e) => {
              e.stopPropagation();
              setObservationHistoryDossier(d);
            }}
            className={cn(!exportMode && 'cursor-pointer hover:bg-surface-3 transition-colors')}
            title={!exportMode ? t("Voir l'historique des observations") : undefined}
          >
            {d.lastObservation?.text ? (
              // Warning pair chip — the only emphasis for an open observation
              // (Badge primitive instead of raw markup, element-specs §11).
              <Badge variant="warning" className="max-w-[260px]" title={d.lastObservation.text}>
                <span className="truncate">{d.lastObservation.text}</span>
              </Badge>
            ) : (
              <span className="text-ink-4">—</span>
            )}
          </TableCell>
        );
      case 'anciennete': {
        // The triage signal (attention research 2026-09-03): plain quiet age
        // for on-time rows; the DANGER pair only past the SLA threshold and
        // only while the dossier still needs action — a rare, lawful alarm.
        const age = ageDays((d as any).createdAt);
        if (age === null) return <TableCell key={key}><EmptyCell /></TableCell>;
        const late = isActionNeeded(d.statut) && age >= LATE_AFTER_DAYS;
        return (
          <TableCell key={key} className="tabular-nums" title={relativeDate((d as any).createdAt)}>
            {late ? (
              <Badge variant="danger" className="tabular-nums">{age} {t('j')}</Badge>
            ) : (
              <span className="text-ink-2">{age} {t('j')}</span>
            )}
          </TableCell>
        );
      }
      case 'createdAt':
        return (
          <TableCell key={key} className="tabular-nums" title={relativeDate((d as any).createdAt)}>
            {cell(formatDate((d as any).createdAt))}
          </TableCell>
        );
      case 'compagnie':
        return (
          <TableCell key={key} className="max-w-[200px] truncate" title={d.compagnie || undefined}>
            {cell(d.compagnie)}
          </TableCell>
        );
      case 'referenceCompagnie':
        return <TableCell key={key}>{cell(d.referenceCompagnie)}</TableCell>;
      case 'policeNumber':
        // Insurance identifier → mono ink, like refs and plates (DESIGN §4).
        return <TableCell key={key} className={cn(WIDE_COL_CLASS[key], 't-mono')}>{cell(d.policeNumber)}</TableCell>;
      case 'garageName':
        return (
          <TableCell key={key} className={cn(WIDE_COL_CLASS[key], 'max-w-[180px] truncate')} title={d.garageName || undefined}>
            {cell(d.garageName)}
          </TableCell>
        );
      case 'vehicule': {
        const veh = [d.vehicule?.marque, d.vehicule?.modele].filter(Boolean).join(' ').trim();
        return (
          <TableCell key={key} className={cn(WIDE_COL_CLASS[key], 'max-w-[180px] truncate')} title={veh || undefined}>
            {cell(veh)}
          </TableCell>
        );
      }
      case 'nature':
        return <TableCell key={key}>{cell(d.nature ? t(d.nature) : '')}</TableCell>;
      case 'typeDossier':
        return <TableCell key={key}>{cell(d.typeDossier ? t(d.typeDossier) : '')}</TableCell>;
      case 'matricule':
        return <TableCell key={key} className="t-mono">{cell(d.matricule)}</TableCell>;
      case 'matriculeAnterieur':
        return <TableCell key={key} className="t-mono">{cell(d.vehicule?.immatriculationAnterieur)}</TableCell>;
      case 'dateSinistre':
        return (
          <TableCell key={key} className="tabular-nums" title={relativeDate(d.dateSinistre)}>
            {cell(formatDate(d.dateSinistre))}
          </TableCell>
        );
      case 'dateRequete':
        return (
          <TableCell key={key} className="tabular-nums" title={relativeDate(d.dateRequete)}>
            {cell(formatDate(d.dateRequete))}
          </TableCell>
        );
      case 'createdByName':
        return <TableCell key={key}>{cell(resolveCreatorName(d))}</TableCell>;
      default:
        return <TableCell key={key} />;
    }
  };

  // Names come from one place (DESIGN.md §1).
  const navItem = findNavItem('/dossiers');
  const pageTitle = navItem?.title ?? navItem?.label ?? 'Dossiers';
  const pageSubtitle = navItem?.subtitle;

  const hasAttributeFilters =
    filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' ||
    filters.observation !== 'Toutes' || filters.creator !== 'Tous' || !!filters.dateFrom || !!filters.dateTo ||
    filters.lateOnly;

  const applyPreset = (preset: 'jour' | 'semaine' | 'mois') => {
    const now = new Date();
    const from = preset === 'jour' ? startOfDay(now) : preset === 'semaine' ? startOfWeek(now, { locale: dateFnsLocale() }) : startOfMonth(now);
    setFilters({ dateFrom: format(from, 'yyyy-MM-dd'), dateTo: format(endOfDay(now), 'yyyy-MM-dd'), datePreset: preset });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        count={loading ? undefined : dossierList.length}
        tabs={
          // View scope — a real view switcher, so it draws the browser-tab
          // anatomy (owner ruling §4: "every tab switch"; the Tabs primitive
          // carries .tab-slope). « À traiter » is the armed default view.
          <Tabs value={filters.scope} onValueChange={(v) => { setFilters({ scope: v as 'a-traiter' | 'tous' }); setPage(1); }}>
            <TabsList aria-label={t('Portée de la liste')} data-tour="dos-scope-tabs">
              <TabsTrigger value="a-traiter">
                {t('À traiter')}
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                  {loading ? '…' : kpi.aTraiter}
                </span>
              </TabsTrigger>
              <TabsTrigger value="tous">
                {t('Tous')}
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                  {loading ? '…' : kpi.total}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
        actions={
          // One solid primary at the right end of the title row; the
          // selection-mode entry is outline (blueprint §6: emphasis follows the job).
          exportMode ? undefined : (
            <>
              <Button variant="outline" onClick={() => { setPeekId(null); setExportMode(true); }} title={t('Sélectionner des dossiers à rappeler')} data-tour="dos-rappeler">
                {t('Rappeler')}
              </Button>
              {canEditDossiers && (
                <Button className="font-semibold" onClick={handleOpenCreate} title={t('Nouveau dossier (C)')} data-tour="dos-create">
                  {t('Nouveau dossier')}
                </Button>
              )}
            </>
          )
        }
      />
      {fetchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('Erreur')}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {/* KPI strip — actionable counters (each tile SETS a view/filter). The
          « En retard » value is the page's only exception colour (§6). */}
      <DossierKpiStrip
        dataTour="dos-kpis"
        loading={loading}
        tiles={[
          {
            key: 'a-traiter',
            label: t('À traiter'),
            value: kpi.aTraiter,
            caption: t('statut non terminé'),
            active: filters.scope === 'a-traiter' && !filters.lateOnly,
            onClick: () => { setFilters({ scope: 'a-traiter', lateOnly: false }); setPage(1); },
          },
          {
            key: 'en-retard',
            label: t('En retard'),
            value: kpi.enRetard,
            caption: `${t('à traiter depuis ≥')} ${LATE_AFTER_DAYS} ${t('j')}`,
            danger: true,
            active: filters.lateOnly,
            onClick: () => { setFilters({ scope: 'a-traiter', lateOnly: true, sortByCreation: 'asc' }); setPage(1); },
          },
          {
            key: 'aujourdhui',
            label: t("Créés aujourd'hui"),
            value: kpi.aujourdHui,
            caption: t('sur la journée'),
            active: filters.datePreset === 'jour',
            onClick: () => applyPreset('jour'),
          },
          {
            key: 'total',
            label: t('Total'),
            value: kpi.total,
            caption: t('tous statuts'),
            active: filters.scope === 'tous' && !hasAttributeFilters,
            onClick: () => {
              setFilters({ scope: 'tous', lateOnly: false, dateFrom: '', dateTo: '', datePreset: null });
              setPage(1);
            },
          },
        ]}
      />

      {/* Filter toolbar — ONE quiet row (NN/g data tables: search first and
          widest, then scoped controls); wraps below lg. Spacing grammar
          (research 2026-09-03, polish §7): 8 px inside a cluster, 24 px
          between clusters — the gaps are the syntax. The per-attribute
          filters (nature, statut, compagnie, observation, créé par) live in
          their column headers below. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3" role="search">
        <div className="flex min-w-[240px] flex-1 basis-72 items-center gap-2 lg:max-w-xl">
          <div className="relative flex-1" data-tour="dos-search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input
              className="pl-9"
              placeholder={t('Rechercher (réf, assuré, plaque…)')}
              value={filters.search}
              onChange={e => setFilters({ search: e.target.value })}
              aria-label={t('Rechercher un dossier')}
            />
          </div>
          {/* Merge over the defaults: a view saved before a filter key
              existed (scope, lateOnly, hiddenCols, density…) must not strip
              that key from the state. */}
          <SavedViews storageKey="dossiers" dataTour="dos-views" current={filters} onApply={(f) => { setFilters(() => ({ ...filterDefaults, ...f })); setPage(1); }} />
        </div>

        {/* Date cluster: presets + range are ONE tool (they write the same
            dateFrom/dateTo strings), so they sit 8 px apart in one group. */}
        <div className="flex flex-wrap items-center gap-2">
        {/* Date presets — same Jour / Semaine / Mois / Personnalisé shortcut as
            `Suivi d'équipe`; they write the SAME `dateFrom`/`dateTo` strings the
            pipeline consumes. Selected segment = `tonal` (M3 segmented button),
            never the accent fill — the page primary is « Nouveau dossier ». */}
        {/* Sliding tonal thumb carries the selection (motion-spec addendum
            ter) — the segment buttons stay ghost and only recolour. */}
        <div className="relative isolate flex h-9 items-center gap-0.5 rounded-md bg-surface-2 p-0.5" role="group" aria-label={t('Période de création')} data-tour="dos-date-presets">
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
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'relative z-[1] h-8 px-3 shadow-none',
              filters.datePreset === 'personnalise' && 'text-accent-foreground hover:bg-transparent hover:text-accent-foreground',
            )}
            data-seg-active={filters.datePreset === 'personnalise' || undefined}
            aria-pressed={filters.datePreset === 'personnalise'}
            onClick={() => setFilters({ datePreset: 'personnalise' })}
          >
            {t('Personnalisé')}
          </Button>
        </div>

        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={v => setFilters({ dateFrom: v, datePreset: v ? 'personnalise' : null })}
          onDateToChange={v => setFilters({ dateTo: v, datePreset: v ? 'personnalise' : null })}
        />
        </div>

        {/* Sort moved into the « Date de création » column header
            (element-specs §2: "sort lives in the column header, not the
            toolbar"; the chiffrage/ATG queues already do this). */}

        <div className="flex items-center gap-1">
          {/* Column picker — user-controlled trimming of the 14 columns
              (research 2026-09-03: always-on lookup columns tax every scan;
              default keeps everything visible so nothing changes unasked). */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-ink-3" title={t("Colonnes et densité d'affichage")} data-tour="dos-affichage">
                <Columns3 className="h-4 w-4" aria-hidden />
                {t('Affichage')}
                {filters.hiddenCols.length > 0 && (
                  <span className="rounded-full bg-surface-3 px-1.5 text-xs tabular-nums text-ink-2">
                    {visibleColumns.length}/{EXPORT_COLUMNS.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* Density — persisted per user ("the right row height is the
                  one each user picked", polish research 2026-09-03 §11). */}
              <DropdownMenuLabel className="t-label font-normal">{t('Densité des lignes')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filters.density}
                onValueChange={(v) => setFilters({ density: v as 'compacte' | 'normale' | 'confortable' })}
              >
                {([['compacte', 'Compacte'], ['normale', 'Normale'], ['confortable', 'Confortable']] as const).map(([value, label]) => (
                  <DropdownMenuRadioItem key={value} value={value} onSelect={(e) => e.preventDefault()}>
                    {t(label)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="t-label font-normal">{t('Colonnes')}</DropdownMenuLabel>
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

          {/* One-click reset — shown only while something is actually applied
              (Hick: no standing choice without a standing job; the filter
              chips already teach that filters are removable). */}
          {(hasAttributeFilters || !!filters.search) && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-ink-3"
              onClick={() => {
                // Filters only — the column layout, sort and page size are the
                // user's workspace setup, not a filter.
                setFilters({
                  search: '', nature: 'Toutes', status: 'Tous', compagnie: 'Toutes',
                  observation: 'Toutes', creator: 'Tous', dateFrom: '', dateTo: '', datePreset: null,
                });
                setPage(1);
              }}
              title={t('Réinitialiser tous les filtres')}
              data-tour="dos-reset"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              {t('Réinitialiser')}
            </Button>
          )}
        </div>
      </div>

      {/* Active filters — removable chips (surface-3 / ink-2, ghost ×). */}
      {hasAttributeFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-label">{t('Filtres actifs')}</span>
          {filters.lateOnly && (
            <FilterChip label={`${t('En retard (≥')} ${LATE_AFTER_DAYS} ${t('j)')}`} onRemove={() => clearFilter('lateOnly')} ariaLabel={t('Retirer le filtre en retard')} />
          )}
          {filters.nature !== 'Toutes' && (
            <span className="inline-flex" data-tour="dos-filter-chip-nature">
              <FilterChip label={`${t('Nature :')} ${t(filters.nature)}`} onRemove={() => clearFilter('nature')} ariaLabel={t('Retirer le filtre nature')} />
            </span>
          )}
          {filters.status !== 'Tous' && (
            <FilterChip label={`${t('Statut :')} ${t(filters.status)}`} onRemove={() => clearFilter('status')} ariaLabel={t('Retirer le filtre statut')} />
          )}
          {filters.compagnie !== 'Toutes' && (
            <FilterChip label={`${t('Compagnie :')} ${filters.compagnie}`} onRemove={() => clearFilter('compagnie')} ariaLabel={t('Retirer le filtre compagnie')} />
          )}
          {filters.observation !== 'Toutes' && (
            <FilterChip label={`${t('Observation :')} ${t(filters.observation)}`} onRemove={() => clearFilter('observation')} ariaLabel={t('Retirer le filtre observation')} />
          )}
          {filters.creator !== 'Tous' && (
            <FilterChip label={`${t('Créé par :')} ${filters.creator}`} onRemove={() => clearFilter('creator')} ariaLabel={t('Retirer le filtre créé par')} />
          )}
          {filters.dateFrom && (
            <FilterChip
              label={`${t('Du :')} ${filters.dateFrom}`}
              onRemove={() => setFilters({ dateFrom: '', datePreset: filters.dateTo ? 'personnalise' : null })}
              ariaLabel={t('Retirer la date de début')}
            />
          )}
          {filters.dateTo && (
            <FilterChip
              label={`${t('Au :')} ${filters.dateTo}`}
              onRemove={() => setFilters({ dateTo: '', datePreset: filters.dateFrom ? 'personnalise' : null })}
              ariaLabel={t('Retirer la date de fin')}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-ink-3"
            onClick={() => {
              setFilters({
                nature: 'Toutes', status: 'Tous', compagnie: 'Toutes',
                observation: 'Toutes', creator: 'Tous',
                dateFrom: '', dateTo: '', datePreset: null,
              });
            }}
          >
            {t('Tout réinitialiser')}
          </Button>
        </div>
      )}

      {/* Selection toolbar (Rappeler mode) */}
      {exportMode ? (
        // Selection toolbar: while selecting, « Envoyer à » is the page's one
        // solid primary (the header actions are hidden in this mode). Enters
        // with the standard 200ms fade + small rise (owner 2026-09-02:
        // everything that appears after « Rappeler » animates).
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface-2 px-4 py-2 animate-in fade-in-0 slide-in-from-top-2 duration-300 ease-enter motion-reduce:animate-none" data-tour="dos-export-bar">
          <span className="text-sm font-semibold tabular-nums text-ink">
            {selectedRows.size} / {dossierList.length} {t('dossier(s) sélectionné(s)')}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={allVisibleSelected ? () => setSelectedRows(new Set()) : handleSelectAll}>
              {allVisibleSelected ? t('Tout désélectionner') : t('Sélectionner tout')}
            </Button>
            <Button size="sm" className="font-semibold" onClick={() => setIsSendToOpen(true)} disabled={selectedRows.size === 0} data-tour="dos-send-to">
              {t('Envoyer à')}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelExport} data-tour="dos-export-cancel">
              {t('Annuler')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* relative wrapper so the tutorial can spotlight just the horizontal
          scrollbar strip at the card's bottom edge (dos-hscroll) */}
      <div className="relative">
      {/* Table paper: glass edge only, hairline rows, sticky header on card. */}
      <Card
        data-table-density={filters.density}
        data-tour="dos-table"
        className="max-h-[calc((100dvh-280px)/var(--app-zoom))] overflow-x-auto overflow-y-auto [&>div]:overflow-visible"
      >
        <Table regionLabel="Liste des dossiers">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {exportMode && (
                <TableHead className="w-10">
                  <Checkbox
                    className="animate-in fade-in-0 zoom-in-75 duration-300 ease-enter motion-reduce:animate-none"
                    checked={allVisibleSelected}
                    onCheckedChange={() => allVisibleSelected ? setSelectedRows(new Set()) : handleSelectAll()}
                  />
                </TableHead>
              )}
              {visibleColumns.map(col => {
                // Per-column filter popovers (iter-21). Each entry pairs a
                // column key with the filter UI that scopes it. Columns NOT in
                // this map (refExpert, assure, referenceCompagnie, matricule,
                // matriculeAnterieur, typeDossier, dateSinistre, dateRequete)
                // render plain labels and are searched via the global search
                // box only.
                const renderColumnFilter = () => {
                  if (col.key === 'nature') {
                    const active = filters.nature !== 'Toutes';
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-6 w-6 -mr-1", active && "text-primary")}
                            onClick={(e) => e.stopPropagation()}
                            title={t('Filtrer par nature')}
                          >
                            <Filter className={cn("h-3.5 w-3.5", active && "fill-current")} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[240px] p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          {/* Inline option list — one click selects, no nested Select. */}
                          <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => setFilters({ nature: 'Toutes' })}
                              className={cn(
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                filters.nature === 'Toutes' && "bg-surface-2 font-medium",
                              )}
                            >
                              <span>{t('Toutes les natures')}</span>
                              {filters.nature === 'Toutes' && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                            {filterNatures.map(n => (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => setFilters({ nature: n.label })}
                                className={cn(
                                  "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                  filters.nature === n.label && "bg-surface-2 font-medium",
                                )}
                              >
                                <span className="truncate">{t(n.label)}</span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                  <span className="t-caption tabular-nums">{facetCounts.nature.get(n.label) ?? 0}</span>
                                  {filters.nature === n.label && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <OptionsManagerModal collectionName="options_natures" title={t('Natures')} />
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  }
                  if (col.key === 'statut') {
                    const active = filters.status !== 'Tous';
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-6 w-6 -mr-1", active && "text-primary")}
                            onClick={(e) => e.stopPropagation()}
                            title={t('Filtrer par statut')}
                          >
                            <Filter className={cn("h-3.5 w-3.5", active && "fill-current")} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[260px] p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => setFilters({ status: 'Tous' })}
                              className={cn(
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                filters.status === 'Tous' && "bg-surface-2 font-medium",
                              )}
                            >
                              <span>{t('Tous les statuts')}</span>
                              {filters.status === 'Tous' && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                            {filterStatuses.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setFilters({ status: s.label })}
                                className={cn(
                                  "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                  filters.status === s.label && "bg-surface-2 font-medium",
                                )}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDotColor(s.label))} />
                                  <span className="truncate">{t(s.label)}</span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                  <span className="t-caption tabular-nums">{facetCounts.status.get(s.label) ?? 0}</span>
                                  {filters.status === s.label && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <OptionsManagerModal collectionName="options_statuts" title={t('Statuts')} />
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  }
                  if (col.key === 'compagnie') {
                    const active = filters.compagnie !== 'Toutes';
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-6 w-6 -mr-1", active && "text-primary")}
                            onClick={(e) => e.stopPropagation()}
                            title={t('Filtrer par compagnie')}
                          >
                            <Filter className={cn("h-3.5 w-3.5", active && "fill-current")} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[240px] p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => setFilters({ compagnie: 'Toutes' })}
                              className={cn(
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                filters.compagnie === 'Toutes' && "bg-surface-2 font-medium",
                              )}
                            >
                              <span>{t('Toutes les compagnies')}</span>
                              {filters.compagnie === 'Toutes' && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                            {filterCompagnies.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setFilters({ compagnie: c.label })}
                                className={cn(
                                  "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                  filters.compagnie === c.label && "bg-surface-2 font-medium",
                                )}
                              >
                                <span className="truncate">{c.label}</span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                  <span className="t-caption tabular-nums">{facetCounts.compagnie.get(c.label) ?? 0}</span>
                                  {filters.compagnie === c.label && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <OptionsManagerModal collectionName="compagnies" title={t('Compagnies')} />
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  }
                  if (col.key === 'observation') {
                    const active = filters.observation !== 'Toutes';
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-6 w-6 -mr-1", active && "text-primary")}
                            onClick={(e) => e.stopPropagation()}
                            title={t('Filtrer par observation')}
                          >
                            <Filter className={cn("h-3.5 w-3.5", active && "fill-current")} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[260px] p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => setFilters({ observation: 'Toutes' })}
                              className={cn(
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                filters.observation === 'Toutes' && "bg-surface-2 font-medium",
                              )}
                            >
                              <span>{t('Toutes les observations')}</span>
                              {filters.observation === 'Toutes' && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                            {filterObservations.map(o => (
                              <React.Fragment key={o.id}>
                                <button
                                  type="button"
                                  onClick={() => setFilters({ observation: o.label })}
                                  className={cn(
                                    "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                    filters.observation === o.label && "bg-surface-2 font-medium",
                                  )}
                                >
                                  <span className="truncate">{t(o.label)}</span>
                                  <span className="flex shrink-0 items-center gap-1.5">
                                    <span className="t-caption tabular-nums">{facetCounts.observation.get(o.label) ?? 0}</span>
                                    {filters.observation === o.label && <Check className="h-4 w-4 text-primary shrink-0" />}
                                  </span>
                                </button>
                                {o.label === 'Autre' && customObservationTexts.map(t => (
                                  <button
                                    key={`autre-sub-${t}`}
                                    type="button"
                                    onClick={() => setFilters({ observation: t })}
                                    className={cn(
                                      "w-full text-left flex items-center justify-between gap-2 pl-6 pr-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                      filters.observation === t && "bg-surface-2 font-medium",
                                    )}
                                  >
                                    <span className="truncate">{t}</span>
                                    <span className="flex shrink-0 items-center gap-1.5">
                                      <span className="t-caption tabular-nums">{facetCounts.observation.get(t) ?? 0}</span>
                                      {filters.observation === t && <Check className="h-4 w-4 text-primary shrink-0" />}
                                    </span>
                                  </button>
                                ))}
                              </React.Fragment>
                            ))}
                            {!filterObservations.some(o => o.label === 'Autre') && customObservationTexts.length > 0 && (
                              <>
                                <div className="px-2 pt-2 pb-1 t-caption">— Personnalisées —</div>
                                {customObservationTexts.map(t => (
                                  <button
                                    key={`custom-${t}`}
                                    type="button"
                                    onClick={() => setFilters({ observation: t })}
                                    className={cn(
                                      "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                      filters.observation === t && "bg-surface-2 font-medium",
                                    )}
                                  >
                                    <span className="truncate">{t}</span>
                                    <span className="flex shrink-0 items-center gap-1.5">
                                      <span className="t-caption tabular-nums">{facetCounts.observation.get(t) ?? 0}</span>
                                      {filters.observation === t && <Check className="h-4 w-4 text-primary shrink-0" />}
                                    </span>
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <OptionsManagerModal collectionName="options_observations" title={t('Observations')} />
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  }
                  if (col.key === 'createdByName') {
                    const active = filters.creator !== 'Tous';
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-6 w-6 -mr-1", active && "text-primary")}
                            onClick={(e) => e.stopPropagation()}
                            title={t('Filtrer par créateur')}
                          >
                            <Filter className={cn("h-3.5 w-3.5", active && "fill-current")} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[240px] p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => setFilters({ creator: 'Tous' })}
                              className={cn(
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                filters.creator === 'Tous' && "bg-surface-2 font-medium",
                              )}
                            >
                              <span>{t('Tous les créateurs')}</span>
                              {filters.creator === 'Tous' && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                            {filterCreators.length === 0 ? (
                              <p className="px-2 py-1.5 t-caption">Aucun créateur</p>
                            ) : (
                              filterCreators.map(name => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => setFilters({ creator: name })}
                                  className={cn(
                                    "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-surface-2",
                                    filters.creator === name && "bg-surface-2 font-medium",
                                  )}
                                >
                                  <span className="truncate">{name}</span>
                                  <span className="flex shrink-0 items-center gap-1.5">
                                    <span className="t-caption tabular-nums">{facetCounts.creator.get(name) ?? 0}</span>
                                    {filters.creator === name && <Check className="h-4 w-4 text-primary shrink-0" />}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  }
                  return null;
                };
                const filterBtn = exportMode ? null : renderColumnFilter();
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.key === 'statut' && 'min-w-[200px]',
                      // Frozen identifier column (element-specs §3 + addendum
                      // ter A) — 15 columns pan sideways; the ref stays put.
                      // Not in exportMode: the checkbox column sits first there.
                      !exportMode && col.key === 'refExpert' && STICKY_HEAD,
                    )}
                    data-tour={col.key === 'nature' ? 'dos-col-nature' : col.key === 'statut' ? 'dos-col-statut' : undefined}
                  >
                    {/* Column tick boxes removed in Rappeler mode (owner
                        2026-09-02): they belonged to the retired Excel
                        export and no longer had a function. */}
                    <div className="flex items-center gap-1">
                      {col.key === 'createdAt' ? (
                        // Sort in the header (§2). State is binary desc/asc
                        // (there is always an order): the null step of the
                        // cycle re-enters as `asc` so the click toggles.
                        <SortableHeader
                          label={t(col.label)}
                          sort={filters.sortByCreation}
                          onChange={(next) => setFilters({ sortByCreation: next === 'desc' ? 'desc' : 'asc' })}
                        />
                      ) : (
                        <span>{t(col.label)}</span>
                      )}
                      {filterBtn}
                    </div>
                  </TableHead>
                );
              })}
              {!exportMode && (
                <TableHead className="sticky right-0 z-10 bg-card text-right shadow-[-4px_0_6px_-2px_hsl(var(--shadow-color)/0.08)]">
                  {t('Actions')}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={colCount} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : dossierList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="p-0">
                  <EmptyState
                    icon={<FolderOpen />}
                    title={t('Aucun dossier trouvé')}
                    description={
                      (filters.search || filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.creator !== 'Tous' || filters.dateFrom || filters.dateTo)
                        ? t("Essayez d'ajuster les filtres pour voir plus de résultats.")
                        : t('Créez votre premier dossier pour commencer.')
                    }
                    action={canEditDossiers ? (
                      <Button onClick={handleOpenCreate} className="font-semibold">
                        {t('Nouveau dossier')}
                      </Button>
                    ) : null}
                    dashed={false}
                    className="border-0 bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((d, idx) => {
                const isFocused = focusIdx === idx;
                return (
                <TableRow
                  key={d.id}
                  data-row-idx={idx}
                  data-tour="dos-row"
                  data-dossier-id={d.id}
                  className={cn(
                    // Hover = surface-2 (table primitive); selected = accent tint.
                    // Keyboard focus = the same one-surface-step shift as hover
                    // (polish research 2026-09-03: nothing louder on dense rows).
                    // No row tint for observations — the warning chip carries it.
                    "group",
                    !exportMode && "cursor-pointer",
                    (isFocused || (!exportMode && peekId === d.id)) && "bg-surface-2",
                    exportMode && selectedRows.has(d.id) && "bg-accent/40 hover:bg-accent/40",
                  )}
                  aria-selected={exportMode ? selectedRows.has(d.id) : undefined}
                  // Two-tier detail access (owner-approved 2026-09-03): single
                  // click = ephemeral peek; double-click / Entrée / « Ouvrir »
                  // = the committed full page. Middle-click keeps opening a
                  // background tab.
                  onClick={() => {
                    setFocusIdx(idx);
                    if (exportMode) handleToggleRow(d.id);
                    else setPeekId(prev => (prev === d.id ? null : d.id));
                  }}
                  onDoubleClick={() => { if (!exportMode) openDossier(d, { preview: false }); }}
                  onAuxClick={(e) => { if (!exportMode && e.button === 1) { e.preventDefault(); openDossier(d, { preview: false, navigate: false }); } }}
                >
                  {exportMode && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        className="animate-in fade-in-0 zoom-in-75 duration-300 ease-enter motion-reduce:animate-none"
                        checked={selectedRows.has(d.id)}
                        onCheckedChange={() => handleToggleRow(d.id)}
                      />
                    </TableCell>
                  )}
                  {/* Predictable strings truncate with a title tooltip
                      (addendum ter A) — same 200 px cap as chiffrage/ATG. */}
                  {visibleColumns.map((col) => renderDataCell(d, col.key, isFocused))}

                  {!exportMode && (
                    <TableCell
                      onClick={e => e.stopPropagation()}
                      className={cn(
                        "sticky right-0 z-10 bg-card text-right shadow-[-4px_0_6px_-2px_hsl(var(--shadow-color)/0.08)] group-hover:bg-surface-2",
                        isFocused && "!bg-surface-2",
                      )}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-ink-3 opacity-60 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                              aria-label={`${t('Actions pour')} ${d.refExpert || t('ce dossier')}`}
                              loading={deletingId === d.id}
                            >
                              {deletingId === d.id ? null : <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onSelect={() => openDossier(d, { preview: false })}>
                              <Eye className="mr-2 h-4 w-4" /> {t('Ouvrir')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openDossier(d, { preview: false, navigate: false })}>
                              <ExternalLink className="mr-2 h-4 w-4" /> {t('Ouvrir dans un onglet')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setWorkflowDossier(d)}>
                              <History className="mr-2 h-4 w-4" /> {t('Workflow')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setStatusHistoryDossier(d)}>
                              <History className="mr-2 h-4 w-4" /> {t('Historique des statuts')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setObservationHistoryDossier(d)}>
                              <History className="mr-2 h-4 w-4" /> {t('Historique des observations')}
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => setDeleteTarget({ id: d.id, refExpert: (d as any).refExpert || d.id })}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> {t('Supprimer')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Decorative chevron removed 2026-09-02 — §3 says
                            chevron OR ⋯ at the row end, never both. */}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
      <div
        data-tour="dos-hscroll"
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-4"
      />
      </div>

      {/* Pagination footer: caption count · rows-per-page · prev/next (NN/g data tables). */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-2" data-tour="dos-pagination">
        <div className="flex items-center gap-3">
          <label htmlFor="dossiers-rows-per-page" className="t-caption">{t('Lignes par page')}</label>
          <Select value={String(rowsPerPage)} onValueChange={v => { setFilters({ rowsPerPage: Number(v) }); setPage(1); }}>
            <SelectTrigger id="dossiers-rows-per-page" className="h-8 w-[76px] tabular-nums"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="t-caption tabular-nums">
            {/* Filtered ≠ unfiltered must be unmistakable (polish research
                2026-09-03 §6): print the total next to the filtered count. */}
            {dossierList.length < allDossiers.length
              ? `${dossierList.length} ${t('sur')} ${allDossiers.length} ${t('dossiers')}`
              : `${dossierList.length} ${dossierList.length > 1 ? t('dossiers') : t('dossier')}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="t-caption tabular-nums">
            {t('Page')} {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label={t('Page précédente')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label={t('Page suivante')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DossierPeekPanel
        dossier={peekDossier}
        position={peekPosition}
        onClose={() => setPeekId(null)}
        onOpen={() => peekDossier && openDossier(peekDossier, { preview: false })}
        onOpenInTab={() => peekDossier && openDossier(peekDossier, { preview: false, navigate: false })}
        onStatusHistory={() => peekDossier && setStatusHistoryDossier(peekDossier)}
        onObservationHistory={() => peekDossier && setObservationHistoryDossier(peekDossier)}
        formatDate={formatDate}
        relativeDate={relativeDate}
        renderAssure={renderAssure}
        creatorName={peekDossier ? resolveCreatorName(peekDossier) : ''}
      />

      <WorkflowStatusSheet
        open={!!workflowDossier}
        onOpenChange={(open) => !open && setWorkflowDossier(null)}
        dossier={workflowDossier}
      />
      <StatusHistorySheet
        open={!!statusHistoryDossier}
        onOpenChange={(open) => !open && setStatusHistoryDossier(null)}
        dossier={statusHistoryDossier}
      />
      <ObservationHistorySheet
        open={!!observationHistoryDossier}
        onOpenChange={(open) => !open && setObservationHistoryDossier(null)}
        dossier={observationHistoryDossier}
      />
      <Dialog open={isSendToOpen} onOpenChange={setIsSendToOpen}>
        <DialogContent data-tour="dos-sendto-dialog" {...tourDialogGuard()}>
          <DialogHeader>
            <DialogTitle>{t('Envoyer à')}</DialogTitle>
            <DialogDescription>{t('Sélectionnez un ou plusieurs gestionnaires destinataires.')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rappelObservation}
            onChange={(e) => setRappelObservation(e.target.value)}
            placeholder={t('Observation (optionnel)')}
            rows={3}
            className="resize-none"
          />
          {gestLoading ? (
            // Skeleton in the list's own shape (element-specs §15), not text.
            <div className="space-y-1 py-2" aria-busy="true" aria-live="polite">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          ) : gestionnaires.length === 0 ? (
            <p className="text-sm text-ink-3 py-4">{t('Aucun gestionnaire disponible.')}</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto py-2">
              {gestionnaires.map((g) => (
                <label key={g.uid} className="flex items-center gap-2 cursor-pointer hover:bg-surface-2 rounded px-2 py-1.5">
                  <Checkbox
                    checked={selectedGestUids.has(g.uid)}
                    onCheckedChange={(v) => {
                      setSelectedGestUids((prev) => {
                        const next = new Set(prev);
                        if (v === true) next.add(g.uid); else next.delete(g.uid);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm">
                    {`${g.prenom} ${g.nom}`.trim() || '—'}
                    {g.uid === profile?.uid ? ` (${t('vous')})` : ''}
                  </span>
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSendToOpen(false)}>{t('Annuler')}</Button>
            <Button disabled={selectedGestUids.size === 0} loading={sending} onClick={handleSendRappel}>
              {t('Envoyer')} ({selectedGestUids.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AssignmentHistorySheet
        open={!!assignmentDossier}
        onOpenChange={(open) => !open && setAssignmentDossier(null)}
        dossier={assignmentDossier}
      />
      <CreateDossierDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(id) => openDossier({ id })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deletingId && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Supprimer ce dossier ?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Cette action supprime définitivement le dossier')} {deleteTarget?.refExpert ? <span className="font-semibold">{deleteTarget.refExpert}</span> : ''} {t("ainsi que tous les documents, photos et l'historique associés. Elle est irréversible.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>{t('Annuler')}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              disabled={!!deletingId}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDeleteDossier(deleteTarget.id);
              }}
            >
              {t('Supprimer')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}