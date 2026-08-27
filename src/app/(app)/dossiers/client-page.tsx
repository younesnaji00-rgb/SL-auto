'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, AlertCircle, Eye, History, Settings, X, Download, Plus, FolderOpen, ChevronLeft, ChevronRight, RotateCcw, Filter, Check, Bell, Send, Loader2 } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { getStatusBadgeStyles, getStatusDotColor, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { useTutorialMode } from '@/lib/tutorial/use-tutorial-mode';
import { tourDialogGuard } from '@/lib/tutorial/dialog-guard';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { exportToExcel, type ExportColumn } from '@/lib/export-excel';
import { CANONICAL_STATUTS } from '@/lib/dossiers-data';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
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

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'refExpert', label: 'Réf Expert' },
  { key: 'assure', label: 'Assuré' },
  { key: 'compagnie', label: 'Compagnie' },
  { key: 'referenceCompagnie', label: 'Référence de compagnie' },
  { key: 'createdAt', label: 'Date de création' },
  { key: 'nature', label: 'Nature du dossier' },
  { key: 'typeDossier', label: 'Type Dossier' },
  { key: 'statut', label: 'Statut' },
  { key: 'observation', label: 'Observation' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'matriculeAnterieur', label: 'Matricule antérieur' },
  { key: 'dateSinistre', label: 'Date sinistre' },
  { key: 'dateRequete', label: 'Date Requête' },
  { key: 'createdByName', label: 'Créé par' },
];
const ALL_COLUMN_KEYS = new Set(EXPORT_COLUMNS.map(c => c.key));

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

  const openDossier = useCallback((d: { id: string; refExpert?: string; numero?: string; assure?: any }) => {
    const a = d.assure;
    let label = '';
    if (typeof a === 'string') {
      label = a.trim();
    } else if (a && typeof a === 'object') {
      label = `${a.prenom || ''} ${a.nom || ''}`.trim();
    }
    if (!label) label = t('Sans nom');
    openTab(d.id, label);
    router.push(`/dossiers/${d.id}`);
  }, [openTab, router, t]);

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

  const filterDefaults = { search: '', nature: 'Toutes', status: 'Tous', compagnie: 'Toutes', observation: 'Toutes', creator: 'Tous', dateFrom: '', dateTo: '', rowsPerPage: 25, sortByCreation: 'desc' as 'desc' | 'asc', datePreset: null as 'jour' | 'semaine' | 'mois' | 'personnalise' | null };
  const [filters, setFilters, clearFilter] = usePersistedFilters('dossiers', filterDefaults);
  const rowsPerPage = filters.rowsPerPage;
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; refExpert: string } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workflowDossier, setWorkflowDossier] = useState<any>(null);
  const [assignmentDossier, setAssignmentDossier] = useState<any>(null);
  const [statusHistoryDossier, setStatusHistoryDossier] = useState<any>(null);
  const [observationHistoryDossier, setObservationHistoryDossier] = useState<any>(null);

  // Export mode state
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(ALL_COLUMN_KEYS));

  // Mes rappels — sender-side dialog state
  const [isSendToOpen, setIsSendToOpen] = useState(false);
  const [gestionnaires, setGestionnaires] = useState<Array<{ uid: string; nom: string; prenom: string }>>([]);
  const [gestLoading, setGestLoading] = useState(false);
  const [selectedGestUids, setSelectedGestUids] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const dossierList = useMemo(() => {
    let results = [...allDossiers];
    if (filters.nature !== 'Toutes') results = results.filter(d => d.nature === filters.nature);
    if (filters.status !== 'Tous') results = results.filter(d => d.statut === filters.status);
    if (filters.compagnie !== 'Toutes') results = results.filter(d => d.compagnie === filters.compagnie);
    if (filters.observation === 'Autre') {
      const predefined = new Set(filterObservations.map(o => o.label));
      results = results.filter(d => {
        const t = (d as any).lastObservation?.text?.trim();
        return t && t !== 'Autre' && !predefined.has(t);
      });
    } else if (filters.observation !== 'Toutes') {
      results = results.filter(d => d.lastObservation?.text === filters.observation);
    }
    if (filters.creator !== 'Tous') results = results.filter(d => resolveCreatorName(d) === filters.creator);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(d =>
        d.refExpert?.toLowerCase().includes(s) ||
        (typeof d.assure === 'string' ? d.assure : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`).toLowerCase().includes(s) ||
        d.matricule?.toLowerCase().includes(s)
      );
    }
    // Date filter now keys off `createdAt` (per R2-8) — that's the dossier's
    // own creation timestamp, not the gestionnaire-entered dateRequete.
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
  }, [allDossiers, filters, filterObservations]);

  // Pagination — total pages, and clamp current page when filtered list shrinks
  // (e.g. user searches and the previously-viewed page no longer exists).
  const totalPages = Math.max(1, Math.ceil(dossierList.length / rowsPerPage));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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

  const handleToggleColumn = useCallback((key: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    const rows = dossierList.filter(d => selectedRows.has(d.id));
    const columns = EXPORT_COLUMNS.filter(c => selectedColumns.has(c.key));
    if (rows.length === 0 || columns.length === 0) return;
    exportToExcel(rows, columns.map(c => ({ ...c, label: t(c.label) })));
    setExportMode(false);
    setSelectedRows(new Set());
    setSelectedColumns(new Set(ALL_COLUMN_KEYS));
    toast({ title: t('Export terminé'), description: `${rows.length} ${t('dossier(s) exporté(s).')}` });
  }, [dossierList, selectedRows, selectedColumns, toast, t]);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows(new Set());
    setSelectedColumns(new Set(ALL_COLUMN_KEYS));
  }, []);

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
            observation: null,
            createdAt: serverTimestamp(),
            read: false,
          }));
        }
      }
      await Promise.all(writes);
      toast({ title: t('Rappels envoyés'), description: `${writes.length} ${t('rappel(s) envoyé(s).')}` });
      setIsSendToOpen(false);
      setSelectedGestUids(new Set());
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

  const formatDate = (val: any) => {
    if (!val) return '-';
    const date = val.toDate ? val.toDate() : new Date(val);
    return format(date, 'dd/MM/yyyy');
  };

  const renderAssure = (assure: any) => {
    if (!assure) return 'N/A';
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || 'N/A';
  };

  return (
    <div className="space-y-4">
      {fetchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('Erreur')}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-grow max-sm:w-full max-w-sm" data-tour="dos-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('Rechercher...')}
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
          />
        </div>
        
        {/* Per-attribute filters (nature, statut, compagnie, observation) moved
            into their respective column headers below. The top bar keeps only
            the search box, date presets, custom-range pickers, sort-by-creation
            and reset — every other filter lives next to the column it scopes. */}

        {/* Date preset bar — matches the `Suivi d'équipe` page (monitoring) so
            users get the same Jour / Semaine / Mois / Personnalisé shortcut on
            both views. Presets write the SAME `dateFrom`/`dateTo` filter state
            (yyyy-MM-dd strings) the pipeline already consumes; `datePreset`
            tracks the active button purely for highlight, and is cleared by
            the iter-18 reset together with the date strings. */}
        <div className="flex items-center gap-1 rounded-md border p-0.5 h-9" data-tour="dos-date-presets">
          <Button
            size="sm"
            variant={filters.datePreset === 'jour' ? 'default' : 'ghost'}
            className="h-7"
            onClick={() => {
              const now = new Date();
              setFilters({
                dateFrom: format(startOfDay(now), 'yyyy-MM-dd'),
                dateTo: format(endOfDay(now), 'yyyy-MM-dd'),
                datePreset: 'jour',
              });
              setPage(1);
            }}
          >
            {t('Jour')}
          </Button>
          <Button
            size="sm"
            variant={filters.datePreset === 'semaine' ? 'default' : 'ghost'}
            className="h-7"
            onClick={() => {
              const now = new Date();
              setFilters({
                dateFrom: format(startOfWeek(now, { locale: dateFnsLocale() }), 'yyyy-MM-dd'),
                dateTo: format(endOfDay(now), 'yyyy-MM-dd'),
                datePreset: 'semaine',
              });
              setPage(1);
            }}
          >
            {t('Semaine')}
          </Button>
          <Button
            size="sm"
            variant={filters.datePreset === 'mois' ? 'default' : 'ghost'}
            className="h-7"
            onClick={() => {
              const now = new Date();
              setFilters({
                dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'),
                dateTo: format(endOfDay(now), 'yyyy-MM-dd'),
                datePreset: 'mois',
              });
              setPage(1);
            }}
          >
            {t('Mois')}
          </Button>
          <Button
            size="sm"
            variant={filters.datePreset === 'personnalise' ? 'default' : 'ghost'}
            className="h-7"
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

        {/* Sort by creation date. Default `desc` matches the Firestore-side
            ordering (newest-first) so the visible order is unchanged until
            the user opts into `asc`. Reset handler clears via `clearFilter()`,
            which restores `filterDefaults.sortByCreation = 'desc'`. */}
        <Select
          value={filters.sortByCreation}
          onValueChange={v => setFilters({ sortByCreation: v as 'desc' | 'asc' })}
        >
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('Tri par date')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">{t("Plus récent d'abord")}</SelectItem>
            <SelectItem value="asc">{t("Plus ancien d'abord")}</SelectItem>
          </SelectContent>
        </Select>

        {/* One-click reset: clears search, nature, status, compagnie,
            observation and date range back to their defaults. Kept always
            visible (per spec) so users learn it's there even before applying
            any filter. */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          data-tour="dos-reset"
          onClick={() => {
            clearFilter();
            setPage(1);
          }}
          title={t('Réinitialiser tous les filtres')}
        >
          <RotateCcw className="h-4 w-4" />
          {t('Réinitialiser')}
        </Button>
      </div>

      {/* Active filters strip */}
      {(filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.observation !== 'Toutes' || filters.creator !== 'Tous' || filters.dateFrom || filters.dateTo) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t('Filtres actifs')}</span>
          {filters.nature !== 'Toutes' && (
            <Badge variant="outline" className="gap-1 pr-1" data-tour="dos-filter-chip-nature">
              {t('Nature :')} {t(filters.nature)}
              <button onClick={() => clearFilter('nature')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label={t('Retirer le filtre nature')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status !== 'Tous' && (
            <Badge variant="outline" className="gap-1 pr-1">
              {t('Statut :')} {t(filters.status)}
              <button onClick={() => clearFilter('status')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label={t('Retirer le filtre statut')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.compagnie !== 'Toutes' && (
            <Badge variant="outline" className="gap-1 pr-1">
              {t('Compagnie :')} {t(filters.compagnie)}
              <button onClick={() => clearFilter('compagnie')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label={t('Retirer le filtre compagnie')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.observation !== 'Toutes' && (
            <Badge variant="outline" className="gap-1 pr-1">
              {t('Observation :')} {filters.observation}
              <button onClick={() => clearFilter('observation')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label={t('Retirer le filtre observation')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.creator !== 'Tous' && (
            <Badge variant="outline" className="gap-1 pr-1">
              {t('Créé par :')} {filters.creator}
              <button onClick={() => clearFilter('creator')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label={t('Retirer le filtre créé par')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="outline" className="gap-1 pr-1">
              {t('Du :')} {filters.dateFrom}
              <button onClick={() => clearFilter('dateFrom')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label={t('Retirer la date de début')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="outline" className="gap-1 pr-1">
              {t('Au :')} {filters.dateTo}
              <button onClick={() => clearFilter('dateTo')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label={t('Retirer la date de fin')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => {
              clearFilter('nature');
              clearFilter('status');
              clearFilter('compagnie');
              clearFilter('observation');
              clearFilter('creator');
              clearFilter('dateFrom');
              clearFilter('dateTo');
            }}
          >
            {t('Tout réinitialiser')}
          </Button>
        </div>
      )}

      {/* Export toolbar */}
      {exportMode ? (
        <div className="flex items-center justify-between bg-muted/50 border rounded-lg px-4 py-2" data-tour="dos-export-bar">
          <span className="text-sm font-medium">
            {selectedRows.size} / {dossierList.length} {t('dossier(s) sélectionné(s)')}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={allVisibleSelected ? () => setSelectedRows(new Set()) : handleSelectAll}>
              {allVisibleSelected ? t('Tout désélectionner') : t('Sélectionner tout')}
            </Button>
            <Button size="sm" onClick={() => setIsSendToOpen(true)} disabled={selectedRows.size === 0} data-tour="dos-send-to">
              <Send className="mr-2 h-4 w-4" />
              {t('Envoyer à')}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelExport} data-tour="dos-export-cancel">
              {t('Annuler')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          {canEditDossiers && (
            <Button size="sm" onClick={handleOpenCreate} data-tour="dos-create">
              <Plus className="mr-2 h-4 w-4" />
              {t('Création de mission')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setExportMode(true)} data-tour="dos-rappeler">
            <Bell className="mr-2 h-4 w-4" />
            {t('Rappeler')}
          </Button>
        </div>
      )}

      {/* relative wrapper so the tutorial can spotlight just the horizontal
          scrollbar strip at the card's bottom edge (dos-hscroll) */}
      <div className="relative">
      <Card className="overflow-x-scroll overflow-y-auto border rounded-lg max-h-[calc(100vh-280px)] [&>div]:overflow-visible" data-tour="dos-table">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="bg-muted/50">
              {exportMode && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={() => allVisibleSelected ? setSelectedRows(new Set()) : handleSelectAll()}
                  />
                </TableHead>
              )}
              {EXPORT_COLUMNS.map(col => {
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
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                filters.nature === 'Toutes' && "bg-muted font-medium",
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
                                  "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                  filters.nature === n.label && "bg-muted font-medium",
                                )}
                              >
                                <span>{t(n.label)}</span>
                                {filters.nature === n.label && <Check className="h-4 w-4 text-primary shrink-0" />}
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
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                filters.status === 'Tous' && "bg-muted font-medium",
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
                                  "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                  filters.status === s.label && "bg-muted font-medium",
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDotColor(s.label))} />
                                  {t(s.label)}
                                </span>
                                {filters.status === s.label && <Check className="h-4 w-4 text-primary shrink-0" />}
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
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                filters.compagnie === 'Toutes' && "bg-muted font-medium",
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
                                  "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                  filters.compagnie === c.label && "bg-muted font-medium",
                                )}
                              >
                                <span>{t(c.label)}</span>
                                {filters.compagnie === c.label && <Check className="h-4 w-4 text-primary shrink-0" />}
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
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                filters.observation === 'Toutes' && "bg-muted font-medium",
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
                                    "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                    filters.observation === o.label && "bg-muted font-medium",
                                  )}
                                >
                                  <span>{t(o.label)}</span>
                                  {filters.observation === o.label && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </button>
                                {o.label === 'Autre' && customObservationTexts.map(t => (
                                  <button
                                    key={`autre-sub-${t}`}
                                    type="button"
                                    onClick={() => setFilters({ observation: t })}
                                    className={cn(
                                      "w-full text-left flex items-center justify-between gap-2 pl-6 pr-2 py-1.5 text-sm rounded hover:bg-muted",
                                      filters.observation === t && "bg-muted font-medium",
                                    )}
                                  >
                                    <span className="truncate">{t}</span>
                                    {filters.observation === t && <Check className="h-4 w-4 text-primary shrink-0" />}
                                  </button>
                                ))}
                              </React.Fragment>
                            ))}
                            {!filterObservations.some(o => o.label === 'Autre') && customObservationTexts.length > 0 && (
                              <>
                                <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">{t('— Personnalisées —')}</div>
                                {customObservationTexts.map(t => (
                                  <button
                                    key={`custom-${t}`}
                                    type="button"
                                    onClick={() => setFilters({ observation: t })}
                                    className={cn(
                                      "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                      filters.observation === t && "bg-muted font-medium",
                                    )}
                                  >
                                    <span className="truncate">{t}</span>
                                    {filters.observation === t && <Check className="h-4 w-4 text-primary shrink-0" />}
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
                                "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                filters.creator === 'Tous' && "bg-muted font-medium",
                              )}
                            >
                              <span>{t('Tous les créateurs')}</span>
                              {filters.creator === 'Tous' && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                            {filterCreators.length === 0 ? (
                              <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('Aucun créateur')}</p>
                            ) : (
                              filterCreators.map(name => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => setFilters({ creator: name })}
                                  className={cn(
                                    "w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                    filters.creator === name && "bg-muted font-medium",
                                  )}
                                >
                                  <span>{name}</span>
                                  {filters.creator === name && <Check className="h-4 w-4 text-primary shrink-0" />}
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
                    className={col.key === 'statut' ? 'min-w-[200px]' : undefined}
                    data-tour={col.key === 'nature' ? 'dos-col-nature' : col.key === 'statut' ? 'dos-col-statut' : undefined}
                  >
                    {exportMode ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedColumns.has(col.key)}
                          onCheckedChange={() => handleToggleColumn(col.key)}
                        />
                        <span>{t(col.label)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{t(col.label)}</span>
                        {filterBtn}
                      </div>
                    )}
                  </TableHead>
                );
              })}
              {!exportMode && (
                <TableHead className="text-right sticky right-0 bg-muted/50 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                  {t('Actions')}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={17} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : dossierList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={17} className="p-0">
                  <EmptyState
                    icon={<FolderOpen />}
                    title={t('Aucun dossier trouvé')}
                    description={
                      (filters.search || filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.creator !== 'Tous' || filters.dateFrom || filters.dateTo)
                        ? t("Essayez d'ajuster les filtres pour voir plus de résultats.")
                        : t('Créez votre premier dossier pour commencer.')
                    }
                    action={canEditDossiers ? (
                      <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" /> {t('Création de mission')}
                      </Button>
                    ) : null}
                    dashed={false}
                    className="border-0 bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              dossierList.slice((page - 1) * rowsPerPage, page * rowsPerPage).map(d => (
                <TableRow
                  key={d.id}
                  data-tour="dos-row"
                  data-dossier-id={d.id}
                  className={cn(
                    "group hover:bg-muted/50 transition-colors [&_td]:!py-2",
                    !exportMode && "cursor-pointer",
                    exportMode && selectedRows.has(d.id) && "bg-primary/5",
                    d.lastObservation?.text && 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/30'
                  )}
                  onClick={() => exportMode ? handleToggleRow(d.id) : openDossier(d)}
                >
                  {exportMode && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.has(d.id)}
                        onCheckedChange={() => handleToggleRow(d.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm font-semibold text-primary tabular-nums">{d.refExpert}</TableCell>
                  <TableCell>{renderAssure(d.assure)}</TableCell>
                  <TableCell>{d.compagnie ? t(d.compagnie) : '-'}</TableCell>
                  <TableCell>{d.referenceCompagnie || ''}</TableCell>
                  <TableCell className="tabular-nums">{formatDate((d as any).createdAt)}</TableCell>
                  <TableCell>{d.nature ? t(d.nature) : '-'}</TableCell>
                  <TableCell>{d.typeDossier ? t(d.typeDossier) : '-'}</TableCell>
                  <TableCell
                    data-tour="dos-statut-cell"
                    onClick={exportMode ? undefined : (e) => {
                      e.stopPropagation();
                      setStatusHistoryDossier(d);
                    }}
                    className={cn("min-w-[200px]", !exportMode && "cursor-pointer hover:bg-muted/60 transition-colors")}
                    title={!exportMode ? t("Voir l'historique des statuts") : undefined}
                  >
                    <Badge
                      data-tour="dos-statut-pill"
                      variant="outline"
                      className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'))}
                    >
                      {t(d.statut || 'Nouveau')}
                    </Badge>
                  </TableCell>
                  <TableCell
                    onClick={exportMode ? undefined : (e) => {
                      e.stopPropagation();
                      setObservationHistoryDossier(d);
                    }}
                    className={cn(!exportMode && "cursor-pointer hover:bg-muted/60 transition-colors")}
                    title={!exportMode ? t("Voir l'historique des observations") : undefined}
                  >
                    {d.lastObservation?.text ? (
                      <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/50">
                        {d.lastObservation.text}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{d.matricule || '-'}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{d.vehicule?.immatriculationAnterieur || '-'}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(d.dateSinistre)}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(d.dateRequete)}</TableCell>
                  <TableCell>
                    {resolveCreatorName(d) || <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  {!exportMode && (
                    <TableCell
                      onClick={e => e.stopPropagation()}
                      className="text-right sticky right-0 bg-card z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] group-hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={t('Gérer')}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDossier(d);
                          }}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={t('Workflow')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setWorkflowDossier(d);
                          }}
                        >
                          <History className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t('Supprimer')}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/5"
                            loading={deletingId === d.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ id: d.id, refExpert: (d as any).refExpert || d.id });
                            }}
                          >
                            {deletingId === d.id ? null : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
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

      <div className="flex items-center justify-between px-2" data-tour="dos-pagination">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('Afficher')}</span>
          <Select value={String(rowsPerPage)} onValueChange={v => { setFilters({ rowsPerPage: Number(v) }); setPage(1); }}>
            <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-4">{t('Total')}: {dossierList.length} {t('dossiers')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page} / {totalPages}
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
          {gestLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : gestionnaires.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t('Aucun gestionnaire disponible.')}</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto py-2">
              {gestionnaires.map((g) => (
                <label key={g.uid} className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 rounded px-2 py-1.5">
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
            <Button disabled={selectedGestUids.size === 0 || sending} onClick={handleSendRappel}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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