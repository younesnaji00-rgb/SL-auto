'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, STICKY_HEAD, STICKY_CELL, EmptyCell,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calculator, MessageSquare, Search } from 'lucide-react';
import { DeadlineBar } from '@/components/deadline-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { DateRangeFilter } from '@/components/date-range-filter';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { StatusChip } from '@/components/ui/status-chip';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { SortableHeader, type SortDirection } from '@/components/ui/sortable-header';
import { useChiffreurWorkload } from '@/hooks/use-workload-counts';
import { REFORME_TYPES, normalizeReformeType } from '@/components/chiffreurs/reforme-dialog';
import { addBusinessHours, businessHoursBetween, formatBusinessLateness } from '@/lib/business-days';
import { useHolidays } from '@/hooks/use-holidays';
import { titleForRoute } from '@/lib/nav-groups';
import { saveQueueOrder } from '@/lib/queue-session';
import { SlidingThumb } from '@/components/ui/sliding-thumb';
import ObservationHistorySheet from '@/app/(app)/dossiers/observation-history-sheet';
import { QueuePeekSheet, type QueuePeekData } from '@/components/chiffrage/queue-peek-sheet';
import { useChiffrageTabs } from '@/hooks/use-chiffrage-tabs';

interface ChiffrageItem {
  id: string;
  dossierId: string;
  dossierNom: string;
  assignedChiffreurId?: string;
  assignedChiffreurNom: string;
  status: string;
  files: any[];
  createdAt: any;
  sentByNom?: string;
  sentByEmail?: string;
  completedAt?: any;
}

const DEADLINE_HOURS = 24;
// A2 — warning chip once ≤ 6 business hours remain (chiffrage-redesign-spec).
const WARNING_HOURS = 6;

const HOTKEY_GROUP = 'File de chiffrage';

// A3 — urgency bands, deadline-asc only (attention R2: the band header carries
// the urgency meaning once instead of every row carrying it).
const BAND_ORDER = ['En retard', 'Moins de 6 h', "Aujourd'hui", 'À venir', 'Terminés'] as const;
type BandName = (typeof BAND_ORDER)[number];

interface QueueEntry {
  item: ChiffrageItem;
  completed: Date | null;
  overdue: boolean;
  elapsedHours: number;
  remainingHours: number;
  band: BandName;
}

type RenderRow =
  | { kind: 'band'; band: BandName; count: number }
  | { kind: 'item'; entry: QueueEntry; idx: number };

function formatRemaining(hours: number): string {
  if (hours >= 1) return `${Math.floor(hours)} h restantes`;
  return `${Math.max(1, Math.round(hours * 60))} min restantes`;
}

// A6 — case/diacritic-insensitive search normalization.
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function AssignationsChiffragePage() {
  const db = useFirestore();
  const router = useRouter();
  const { profile } = useCurrentUser();
  const { openTab } = useChiffrageTabs();
  const chiffreurWorkload = useChiffreurWorkload();
  const [chiffrages, setChiffrages] = useState<ChiffrageItem[]>([]);
  const [dossierStatuts, setDossierStatuts] = useState<Record<string, string>>({});
  const [dossierObs, setDossierObs] = useState<Record<string, { text: string; count: number }>>({});
  const [dossierReformeTypes, setDossierReformeTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  // Default = most urgent first (addendum ter A, Pencil & Paper: a queue's
  // default order is "entries most needing action" — under the 24 h deadline
  // that is deadline ascending, so yesterday's nearly-expired dossiers sit on
  // top, not under today's fresh ones). Cycling the Délai header to null
  // restores the old today-first/newest order.
  const [deadlineSort, setDeadlineSort] = useState<SortDirection>('asc');
  const [obsHistoryDossier, setObsHistoryDossier] = useState<{ id: string; refExpert?: string } | null>(null);
  const filterDefaults = { q: '', dateFrom: '', dateTo: '', compagnieFilter: 'Toutes', chiffreurFilter: 'Tous', typeReformeFilter: 'Tous' };
  const [filters, setFilters, clearFilter] = usePersistedFilters('assignations-chiffrage', filterDefaults);
  const { q, dateFrom, dateTo, compagnieFilter, chiffreurFilter, typeReformeFilter } = filters;
  // « À traiter / Tous » scope — deliberately NOT persisted: the queue always
  // reopens on what still needs the chiffreur (its default working set).
  const [queueScope, setQueueScope] = useState<'a-traiter' | 'tous'>('a-traiter');

  // Listen to chiffrages
  useEffect(() => {
    if (!db) return;
    const qy = query(collection(db, 'chiffrages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qy, (snap) => {
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChiffrageItem)).filter(c => c.files && c.files.length > 0);
      if (profile?.role === 'Chiffreur' && profile?.nom) {
        const myName = profile.nom.toLowerCase().trim();
        items = items.filter(c => c.assignedChiffreurNom?.toLowerCase().trim() === myName);
      }
      setChiffrages(items);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db, profile?.role, profile?.nom]);

  // Listen to dossier statuts + compagnies + natures for all referenced dossierIds
  const [dossierCompagnies, setDossierCompagnies] = useState<Record<string, string>>({});
  const [dossierNatures, setDossierNatures] = useState<Record<string, string>>({});
  const [dossierAssure, setDossierAssure] = useState<Record<string, any>>({});
  const [dossierMatricule, setDossierMatricule] = useState<Record<string, string>>({});
  const dossierIds = useMemo(() => [...new Set(chiffrages.map(c => c.dossierId).filter(Boolean))], [chiffrages]);

  useEffect(() => {
    if (!db || dossierIds.length === 0) return;
    const unsubs = dossierIds.map(did =>
      onSnapshot(doc(db, 'dossiers', did), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setDossierStatuts(prev => ({ ...prev, [did]: data.statut || 'Nouveau' }));
          setDossierCompagnies(prev => ({ ...prev, [did]: data.compagnie || '' }));
          setDossierNatures(prev => ({ ...prev, [did]: data.nature || '' }));
          setDossierReformeTypes(prev => ({ ...prev, [did]: data.reforme?.typeReforme || '' }));
          setDossierAssure(prev => ({ ...prev, [did]: data.assure }));
          setDossierMatricule(prev => ({ ...prev, [did]: data.matricule || '' }));
        }
      })
    );
    return () => unsubs.forEach(u => u());
  }, [db, dossierIds.join(',')]);

  // Listen to observations subcollection per dossier (latest text + count)
  useEffect(() => {
    if (!db || dossierIds.length === 0) return;
    const unsubs = dossierIds.map(did =>
      onSnapshot(
        query(collection(db, 'dossiers', did, 'observations'), orderBy('createdAt', 'desc')),
        (snap) => {
          const text = (snap.docs[0]?.data().text as string) || '';
          setDossierObs(prev => ({ ...prev, [did]: { text, count: snap.size } }));
        }
      )
    );
    return () => unsubs.forEach(u => u());
  }, [db, dossierIds.join(',')]);

  // Build filter options from loaded data
  const compagnieOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    chiffrages.forEach(c => {
      const comp = dossierCompagnies[c.dossierId] || '';
      if (comp) counts[comp] = (counts[comp] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [chiffrages, dossierCompagnies]);

  // Chiffreur filter counts. We group for DISPLAY by name (what the user
  // picks in the dropdown) but compute counts from the shared "open chiffrage"
  // workload keyed by chiffreur id — so these numbers always match the ones
  // shown in the "Envoyer vers chiffrage" modal's chiffreur dropdown.
  // See src/lib/chiffreur-workload.ts for the single source of truth.
  const chiffreurOptions = useMemo(() => {
    const namesById: Record<string, string> = {};
    chiffrages.forEach(c => {
      const id = c.assignedChiffreurId;
      const name = c.assignedChiffreurNom?.trim();
      if (id && name && !namesById[id]) namesById[id] = name;
    });
    const byName: Record<string, number> = {};
    Object.entries(namesById).forEach(([id, name]) => {
      const n = chiffreurWorkload[id] || 0;
      byName[name] = (byName[name] || 0) + n;
    });
    return Object.entries(byName)
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [chiffrages, chiffreurWorkload]);

  const isToday = (ts: any) => {
    if (!ts) return false;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  };

  const holidays = useHolidays();

  const toDate = (ts: any): Date | null => {
    if (!ts) return null;
    return ts.toDate ? ts.toDate() : new Date(ts);
  };

  const formatDate = (ts: any) => {
    const date = toDate(ts);
    if (!date) return null;
    try { return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr }); }
    catch { return null; }
  };

  const renderAssure = (assure: any): string | null => {
    if (!assure) return null;
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || null;
  };

  const filteredChiffrages = useMemo(() => {
    let results = [...chiffrages];
    // A6 — search from the 2nd character across réf · assuré · plaque · chiffreur.
    const qNorm = normalize(q.trim());
    if (qNorm.length >= 2) {
      results = results.filter(c => {
        const hay = [
          c.dossierNom || '',
          renderAssure(dossierAssure[c.dossierId]) || '',
          dossierMatricule[c.dossierId] || '',
          c.assignedChiffreurNom || '',
        ];
        return hay.some(h => h && normalize(h).includes(qNorm));
      });
    }
    if (compagnieFilter !== 'Toutes') {
      results = results.filter(c => (dossierCompagnies[c.dossierId] || '') === compagnieFilter);
    }
    if (chiffreurFilter !== 'Tous') {
      results = results.filter(c => c.assignedChiffreurNom?.trim() === chiffreurFilter);
    }
    if (typeReformeFilter !== 'Tous') {
      results = results.filter(c => normalizeReformeType(dossierReformeTypes[c.dossierId]) === typeReformeFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      results = results.filter(c => {
        if (!c.createdAt) return false;
        const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return date >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(c => {
        if (!c.createdAt) return false;
        const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return date <= to;
      });
    }
    if (deadlineSort) {
      // Sort by deadline end time (createdAt + 24h). Ascending = most urgent first.
      const DEADLINE_MS = DEADLINE_HOURS * 3600 * 1000;
      results.sort((a, b) => {
        const aCreated = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : null);
        const bCreated = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : null);
        const aEnd = aCreated === null ? (deadlineSort === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : aCreated + DEADLINE_MS;
        const bEnd = bCreated === null ? (deadlineSort === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : bCreated + DEADLINE_MS;
        return deadlineSort === 'asc' ? aEnd - bEnd : bEnd - aEnd;
      });
    } else {
      // Default: today's items first, then by createdAt desc
      results.sort((a, b) => {
        const aToday = isToday(a.createdAt) ? 1 : 0;
        const bToday = isToday(b.createdAt) ? 1 : 0;
        if (aToday !== bToday) return bToday - aToday;
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return bDate - aDate;
      });
    }
    return results;
  }, [chiffrages, q, compagnieFilter, chiffreurFilter, typeReformeFilter, dossierCompagnies, dossierReformeTypes, dossierAssure, dossierMatricule, dateFrom, dateTo, deadlineSort]);

  // « À traiter / Tous » scope. « À traiter » = still needing the chiffreur's
  // action, i.e. no completedAt — the exact signal that otherwise sends an
  // entry to the « Terminés » band. Counts are computed on the filtered (but
  // unscoped) list so each figure matches what its segment would display.
  const nbATraiter = useMemo(
    () => filteredChiffrages.filter(c => !c.completedAt).length,
    [filteredChiffrages],
  );
  const scopedChiffrages = useMemo(
    () => (queueScope === 'a-traiter' ? filteredChiffrages.filter(c => !c.completedAt) : filteredChiffrages),
    [filteredChiffrages, queueScope],
  );

  // Bands only under the default deadline-asc sort; any other sort = flat list
  // (A3). « Terminés » renders last either way when banded.
  const banded = deadlineSort === 'asc';

  const { renderRows, flatEntries, orderedIds, completedIds, nbRetard, nbAujourdhui } = useMemo(() => {
    const now = new Date();
    const entries: QueueEntry[] = scopedChiffrages.map((c) => {
      const created = toDate(c.createdAt);
      const completed = toDate(c.completedAt);
      // Business-hours deadline: weekends + Moroccan holidays don't count.
      const elapsedHours = created ? businessHoursBetween(created, now, holidays) : 0;
      const overdue = !!created && elapsedHours >= DEADLINE_HOURS;
      const remainingHours = Math.max(0, DEADLINE_HOURS - elapsedHours);
      const end = created ? addBusinessHours(created, DEADLINE_HOURS, holidays) : null;
      let band: BandName;
      if (completed) band = 'Terminés';
      else if (overdue) band = 'En retard';
      else if (remainingHours <= WARNING_HOURS) band = 'Moins de 6 h';
      else if (end && isToday(end)) band = "Aujourd'hui";
      else band = 'À venir';
      return { item: c, completed, overdue, elapsedHours, remainingHours, band };
    });

    // A5 — calm load summary figures (attention R5: the count is the ambient signal).
    const retard = entries.filter(e => !e.completed && e.overdue).length;
    const today = entries.filter(e => e.band === 'Moins de 6 h' || e.band === "Aujourd'hui").length;

    const rows: RenderRow[] = [];
    const flat: QueueEntry[] = [];
    if (banded) {
      for (const band of BAND_ORDER) {
        const inBand = entries.filter(e => e.band === band);
        if (inBand.length === 0) continue; // empty bands hidden — absence IS the calm signal
        rows.push({ kind: 'band', band, count: inBand.length });
        for (const entry of inBand) {
          rows.push({ kind: 'item', entry, idx: flat.length });
          flat.push(entry);
        }
      }
    } else {
      for (const entry of entries) {
        rows.push({ kind: 'item', entry, idx: flat.length });
        flat.push(entry);
      }
    }
    return {
      renderRows: rows,
      flatEntries: flat,
      orderedIds: flat.map(e => e.item.id),
      completedIds: flat.filter(e => e.completed).map(e => e.item.id),
      nbRetard: retard,
      nbAujourdhui: today,
    };
  }, [scopedChiffrages, banded, holidays]);

  // D1 — persist the rendered order (band order = render order) so the
  // detail page's Précédent / Suivant follows what the queue displayed.
  const orderKey = orderedIds.join('|');
  const completedKey = completedIds.join('|');
  useEffect(() => {
    if (loading) return;
    saveQueueOrder(orderedIds, completedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, orderKey, completedKey]);

  // A7 — keyboard spine: roving focus over the flat visible-row list (band
  // headers skipped); same one-surface-step tint as hover, ring for the rove.
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [peekOpen, setPeekOpen] = useState(false);
  useEffect(() => {
    if (focusIdx !== null && focusIdx >= flatEntries.length) {
      setFocusIdx(flatEntries.length ? flatEntries.length - 1 : null);
    }
  }, [focusIdx, flatEntries.length]);
  const moveFocus = useCallback((delta: number) => {
    setFocusIdx((prev) => {
      if (flatEntries.length === 0) return null;
      if (prev === null) return delta > 0 ? 0 : flatEntries.length - 1;
      return Math.min(flatEntries.length - 1, Math.max(0, prev + delta));
    });
  }, [flatEntries.length]);
  useEffect(() => {
    if (focusIdx === null) return;
    document
      .querySelector(`[data-row-idx="${focusIdx}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx]);
  const focusedEntry = focusIdx !== null ? flatEntries[focusIdx] : undefined;
  useEffect(() => {
    if (peekOpen && !focusedEntry) setPeekOpen(false);
  }, [peekOpen, focusedEntry]);

  const openChiffrage = useCallback((c: ChiffrageItem) => {
    openTab(c.id, c.dossierNom || `Chiffrage ${c.id.slice(0, 6)}`);
    router.push(`/assignations-chiffrage/${c.id}`);
  }, [openTab, router]);

  // Registered through the app-wide registry so the bindings appear in the
  // « ? » sheet. While the peek is open (focus trapped in the dialog), the
  // arrow/j/k bindings run with allowInInput so ↑/↓ retarget the peek (A8);
  // Échap inside the peek is Radix's own close.
  useHotkeys([
    { keys: 'arrowdown', label: 'Ligne suivante', group: HOTKEY_GROUP, allowInInput: peekOpen, handler: () => moveFocus(1) },
    { keys: 'j', label: 'Ligne suivante', group: HOTKEY_GROUP, allowInInput: peekOpen, handler: () => moveFocus(1) },
    { keys: 'arrowup', label: 'Ligne précédente', group: HOTKEY_GROUP, allowInInput: peekOpen, handler: () => moveFocus(-1) },
    { keys: 'k', label: 'Ligne précédente', group: HOTKEY_GROUP, allowInInput: peekOpen, handler: () => moveFocus(-1) },
    {
      keys: 'enter',
      label: 'Ouvrir le chiffrage en surbrillance',
      group: HOTKEY_GROUP,
      enabled: !!focusedEntry,
      handler: () => { if (focusedEntry) openChiffrage(focusedEntry.item); },
    },
    {
      keys: 'space',
      label: 'Aperçu du chiffrage en surbrillance',
      group: HOTKEY_GROUP,
      enabled: !!focusedEntry,
      handler: () => setPeekOpen(true),
    },
    {
      keys: 'escape',
      label: 'Quitter la surbrillance',
      group: HOTKEY_GROUP,
      enabled: focusIdx !== null && !peekOpen,
      handler: () => setFocusIdx(null),
    },
  ], [moveFocus, focusedEntry, focusIdx, peekOpen, openChiffrage]);

  // A10 — auto-animate row reorders; off while loading, respects reduced motion.
  const [tbodyRef, enableAnimations] = useAutoAnimate<HTMLTableSectionElement>({ duration: 200 });
  useEffect(() => { enableAnimations(!loading); }, [loading, enableAnimations]);

  // A2 — Délai cell: countdown text is the load-bearing datum (attention R1/R6);
  // no graphic on healthy rows, chip only at threshold, ✓ + date when done.
  const renderDelai = (entry: QueueEntry) => {
    if (entry.completed) {
      return (
        <DeadlineBar
          percent={100}
          overdue={false}
          completedLabel={`Chiffré le ${format(entry.completed, 'dd/MM/yyyy HH:mm')}`}
        />
      );
    }
    if (entry.overdue) {
      const late = formatBusinessLateness(entry.elapsedHours - DEADLINE_HOURS);
      return <Badge variant="danger">{late ? `En retard ${late}` : 'En retard'}</Badge>;
    }
    if (entry.remainingHours <= WARNING_HOURS) {
      return <Badge variant="warning">{formatRemaining(entry.remainingHours)}</Badge>;
    }
    return <span className="t-body-sm tabular-nums text-ink-2">{formatRemaining(entry.remainingHours)}</span>;
  };

  // Empty table cells read « — » in ink-4 (blueprint §9: empty = — muted).
  const emptyCell = <EmptyCell />;

  const isChiffreur = profile?.role === 'Chiffreur';
  const canSeeNameFilter = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const showChiffreurColumn = !isChiffreur;
  // A4 — « Assigné par » demoted to the peek panel (fixation budget).
  const colCount = showChiffreurColumn ? 9 : 8;
  const hasActiveFilter =
    q.trim() !== '' || compagnieFilter !== 'Toutes' || chiffreurFilter !== 'Tous' || typeReformeFilter !== 'Tous' || !!dateFrom || !!dateTo;

  const resetFilters = () => {
    clearFilter('q');
    clearFilter('compagnieFilter');
    clearFilter('chiffreurFilter');
    clearFilter('typeReformeFilter');
    clearFilter('dateFrom');
    clearFilter('dateTo');
  };

  // A8 — peek content from data ALREADY in the page's state maps.
  const peekData: QueuePeekData | null = useMemo(() => {
    if (!focusedEntry) return null;
    const c = focusedEntry.item;
    const obs = dossierObs[c.dossierId];
    return {
      id: c.id,
      dossierRef: c.dossierNom || 'Sans réf.',
      assure: renderAssure(dossierAssure[c.dossierId]),
      statut: dossierStatuts[c.dossierId] || 'Nouveau',
      matricule: dossierMatricule[c.dossierId] || '',
      chiffreur: c.assignedChiffreurNom || '',
      assignePar: c.sentByNom || c.sentByEmail || '',
      dateLabel: formatDate(c.createdAt),
      isToday: isToday(c.createdAt),
      delai: renderDelai(focusedEntry),
      obsText: obs?.text || '',
      obsCount: obs?.count ?? 0,
      filesCount: Array.isArray(c.files) ? c.files.length : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedEntry, dossierObs, dossierAssure, dossierStatuts, dossierMatricule]);

  return (
    <div className="space-y-6">
      {/* Page header (element-specs §1: Polaris Page ✓ — plural object title,
          count pill, filters row below; no page action — the queue's work
          happens row by row). */}
      <PageHeader
        title={titleForRoute('/assignations-chiffrage') ?? 'Assignations au chiffrage'}
        count={scopedChiffrages.length}
        meta={
          // A5 — quiet load summary (attention R5: periphery informs without
          // overburdening); danger-fg only when > 0; zero-state omitted.
          !loading && (nbRetard > 0 || nbAujourdhui > 0) ? (
            <span className="t-caption tabular-nums">
              {nbRetard > 0 && (
                <span className="font-medium text-status-danger-fg">{nbRetard} en retard</span>
              )}
              {nbRetard > 0 && nbAujourdhui > 0 && ' · '}
              {nbAujourdhui > 0 && <>{nbAujourdhui} aujourd&apos;hui</>}
            </span>
          ) : undefined
        }
        filters={
          // Filter toolbar (element-specs §2: search first with a format-cue
          // placeholder, ≤ 3 promoted filters + clear-all; NN/g filter
          // categories ✓ general → specific). Labels are `t-label` sentence
          // case; the sort lives in the column header, not here.
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            {/* « À traiter / Tous » scope — a value picker over the SAME list,
                so segmented control + SlidingThumb (element-specs §7; tabs are
                reserved for view switchers). Sits first: it names the working
                set the other filters then narrow. Counts = neutral pills (§11),
                computed after the other filters so the figures always match
                what each segment would show. */}
            <div className="flex flex-col gap-1">
              <span className="t-label">Afficher</span>
              <div
                role="group"
                aria-label="Portée de la file"
                className="relative isolate flex h-9 w-fit items-center gap-0.5 rounded-md bg-surface-2 p-0.5"
              >
                <SlidingThumb className="rounded-md bg-accent shadow-rim" deps={[queueScope, nbATraiter, filteredChiffrages.length]} />
                {([['a-traiter', 'À traiter', nbATraiter], ['tous', 'Tous', filteredChiffrages.length]] as const).map(([key, label, count]) => (
                  <Button
                    key={key}
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-seg-active={queueScope === key}
                    aria-pressed={queueScope === key}
                    onClick={() => setQueueScope(key)}
                    className={cn(
                      'relative z-[1] h-8 gap-1.5 px-3 shadow-none',
                      queueScope === key && 'text-accent-foreground hover:bg-transparent hover:text-accent-foreground',
                    )}
                  >
                    {label}
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                      {count}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="t-label">Recherche</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
                <Input
                  value={q}
                  onChange={(e) => setFilters({ q: e.target.value })}
                  placeholder="Réf., assuré, plaque…"
                  aria-label="Rechercher dans la file"
                  className="h-9 w-[220px] pl-8"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="t-label">Compagnie</span>
              <Select value={compagnieFilter} onValueChange={v => setFilters({ compagnieFilter: v })}>
                <SelectTrigger className="h-9 w-[180px]" aria-label="Compagnie">
                  <SelectValue placeholder="Compagnie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Toutes">Toutes les compagnies</SelectItem>
                  {compagnieOptions.map(([name, count]) => (
                    <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canSeeNameFilter && (
              <div className="flex flex-col gap-1">
                <span className="t-label">Chiffreur</span>
                <Select value={chiffreurFilter} onValueChange={v => setFilters({ chiffreurFilter: v })}>
                  <SelectTrigger className="h-9 w-[180px]" aria-label="Chiffreur">
                    <SelectValue placeholder="Chiffreur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tous">Tous les chiffreurs</SelectItem>
                    {chiffreurOptions.map(([name, count]) => (
                      <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="t-label">Type de réforme</span>
              <Select value={typeReformeFilter} onValueChange={v => setFilters({ typeReformeFilter: v })}>
                <SelectTrigger className="h-9 w-[160px]" aria-label="Type de réforme">
                  <SelectValue placeholder="Type de réforme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous les types</SelectItem>
                  {REFORME_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="t-label">Période</span>
              <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
            </div>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
            )}
          </div>
        }
      />

      {/* Data table (element-specs §3 + A4 column order: identifier → deadline
          → status, decision columns adjacent and left-of-centre; « Assigné
          par » lives in the peek). The Card is the table's only frame. */}
      <Card className="overflow-hidden">
        <Table regionLabel="Assignations au chiffrage">
          <TableHeader>
            <TableRow>
              <TableHead className={STICKY_HEAD}>Dossier</TableHead>
              <TableHead>
                <SortableHeader label="Délai" sort={deadlineSort} onChange={setDeadlineSort} />
              </TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Nom d&apos;assuré</TableHead>
              <TableHead>Immatriculation</TableHead>
              {showChiffreurColumn && <TableHead>Chiffreur</TableHead>}
              <TableHead>Nature du dossier</TableHead>
              <TableHead>Observations</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody ref={tbodyRef}>
            {loading ? (
              // Loading (element-specs §15: NN/g skeleton screens ✓ mirror the
              // final layout — row-shaped, 44 px, pulse only).
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={colCount} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : renderRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="p-0">
                  {/* Empty state (element-specs §12: NN/g ✓ state + reason +
                      pathway; Polaris ✓ one action). The filtered variant names
                      the fix — clear the filters — as its ONE `tonal` action. */}
                  <EmptyState
                    icon={<Calculator />}
                    title={hasActiveFilter ? 'Aucun chiffrage pour ces filtres' : 'Aucun chiffrage assigné'}
                    description={hasActiveFilter
                      ? 'Élargissez la période ou réinitialisez les filtres pour revoir la file.'
                      : 'Les nouvelles assignations de chiffrage apparaîtront ici.'}
                    action={hasActiveFilter ? (
                      <Button variant="tonal" onClick={resetFilters}>Réinitialiser les filtres</Button>
                    ) : undefined}
                    dashed={false}
                    className="border-0 bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              renderRows.map((row) => {
                if (row.kind === 'band') {
                  // A3 — band header row: t-label + count pill, whitespace +
                  // hairline only (no tinted section), layer-cake scanning.
                  return (
                    <TableRow key={`band-${row.band}`} className="hover:bg-transparent">
                      <TableCell colSpan={colCount} className="h-auto pb-1.5 pt-5">
                        <span className="inline-flex items-center gap-2">
                          <span className="t-label">{row.band}</span>
                          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                            {row.count}
                          </span>
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                }

                const { entry, idx } = row;
                const c = entry.item;
                const statut = dossierStatuts[c.dossierId] || 'Nouveau';
                const nature = dossierNatures[c.dossierId] || '';
                const today = isToday(c.createdAt);
                const obs = dossierObs[c.dossierId];
                const obsCount = obs?.count ?? 0;
                const dateLabel = formatDate(c.createdAt);
                const isFocused = focusIdx === idx;

                return (
                  // The whole row is the link (owner 2026-09-02; §3 "row =
                  // link") — clicks anywhere open the chiffrage; the inner
                  // Link and the obs button stop propagation. A1: the
                  // identifier keeps its real <a>.
                  <TableRow
                    key={c.id}
                    data-row-idx={idx}
                    data-state={isFocused ? 'focused' : undefined}
                    tabIndex={isFocused ? 0 : -1}
                    className={cn(
                      'group cursor-pointer',
                      // A7 — roving focus: same one-surface-step tint as hover
                      // + a calm ring so the rove survives the hover state.
                      isFocused && 'bg-surface-2 ring-1 ring-inset ring-primary/40',
                    )}
                    onClick={() => {
                      setFocusIdx(idx);
                      openChiffrage(c);
                    }}
                  >
                    {/* Frozen identifier column: sticky left, solid card so rows
                        scroll under it, hairline on its right edge (§3). */}
                    <TableCell className={cn(STICKY_CELL, isFocused && 'bg-surface-2')}>
                      <Link
                        href={`/assignations-chiffrage/${c.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openTab(c.id, c.dossierNom || `Chiffrage ${c.id.slice(0, 6)}`);
                        }}
                        className="t-mono font-semibold hover:underline"
                      >
                        {c.dossierNom || 'Sans réf.'}
                      </Link>
                    </TableCell>
                    {/* A2 — deadline: countdown text, chip only at threshold. */}
                    <TableCell>{renderDelai(entry)}</TableCell>
                    <TableCell>
                      {/* Status chip (§11: Carbon tag ✓ read-only category; label always, one pair per state). */}
                      <StatusChip status={statut} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium text-ink">{renderAssure(dossierAssure[c.dossierId]) ?? emptyCell}</TableCell>
                    {/* Values in full ink (addendum 5 — values stuck at ink-2 read gray). */}
                    <TableCell className="t-mono text-ink">{dossierMatricule[c.dossierId] || emptyCell}</TableCell>
                    {showChiffreurColumn && <TableCell className="text-ink">{c.assignedChiffreurNom || emptyCell}</TableCell>}
                    <TableCell className="text-ink">{nature || emptyCell}</TableCell>
                    <TableCell>
                      {/* Row action (§3/§8: 1–2 inline row actions as `ghost`
                          buttons; the count is the trailing figure). Opens the
                          observation history sheet. */}
                      {obsCount === 0 ? emptyCell : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setObsHistoryDossier({ id: c.dossierId, refExpert: c.dossierNom }); }}
                          title={obs?.text || "Voir l'historique des observations"}
                          aria-label={`Voir les ${obsCount} observation${obsCount > 1 ? 's' : ''}`}
                        >
                          <MessageSquare />
                          <span className="tabular-nums">{obsCount}</span>
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-ink">
                      {/* Date is text → left-aligned like the other text columns;
                          the figure is Inter 600 tabular (addendum 3). Today = a
                          time chip with a label (§11) instead of tinting the row. */}
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="font-semibold tabular-nums">{dateLabel ?? emptyCell}</span>
                        {today && <Badge variant="time">Aujourd&apos;hui</Badge>}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
      {/* A8 — peek: read-mostly, never mints a workspace tab; Entrée / footer
          button does. */}
      <QueuePeekSheet
        open={peekOpen && !!peekData}
        onOpenChange={(open) => { if (!open) setPeekOpen(false); }}
        data={peekData}
        onOpen={() => {
          if (focusedEntry) {
            setPeekOpen(false);
            openChiffrage(focusedEntry.item);
          }
        }}
        onShowObservations={() => {
          if (!focusedEntry) return;
          const c = focusedEntry.item;
          setPeekOpen(false);
          setObsHistoryDossier({ id: c.dossierId, refExpert: c.dossierNom });
        }}
      />
      <ObservationHistorySheet
        open={!!obsHistoryDossier}
        onOpenChange={(open) => !open && setObsHistoryDossier(null)}
        dossier={obsHistoryDossier}
      />
    </div>
  );
}
