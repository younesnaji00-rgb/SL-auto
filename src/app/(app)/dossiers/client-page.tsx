'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, AlertCircle, Eye, History, Settings, Users, X, Download, Plus, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
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
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDossierTabs } from '@/hooks/use-dossier-tabs';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { getStatusBadgeStyles, getStatusDotColor, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { exportToExcel, type ExportColumn } from '@/lib/export-excel';
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

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'refExpert', label: 'Réf Expert' },
  { key: 'assure', label: 'Assuré' },
  { key: 'compagnie', label: 'Compagnie' },
  { key: 'referenceCompagnie', label: 'Référence de compagnie' },
  { key: 'nature', label: 'Nature du dossier' },
  { key: 'typeDossier', label: 'Type Dossier' },
  { key: 'statut', label: 'Statut' },
  { key: 'observation', label: 'Observation' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'matriculeAnterieur', label: 'Matricule antérieur' },
  { key: 'dateSinistre', label: 'Date sinistre' },
  { key: 'dateRequete', label: 'Date Requête' },
  { key: 'dateMissionAgentTerrain', label: 'Date mission AT' },
  { key: 'dateChiffrage', label: 'Date chiffrage' },
];
const ALL_COLUMN_KEYS = new Set(EXPORT_COLUMNS.map(c => c.key));

export default function DossiersClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const { profile, canWrite } = useCurrentUser();
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
    if (!label) label = 'Sans nom';
    openTab(d.id, label);
    router.push(`/dossiers/${d.id}`);
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
  const filterObservations = useMemo(
    () => dbObservationOptions.filter(o => o.active !== false),
    [dbObservationOptions]
  );

  const filterDefaults = { search: '', nature: 'Toutes', status: 'Tous', compagnie: 'Toutes', observation: 'Toutes', dateFrom: '', dateTo: '', rowsPerPage: 25 };
  const [filters, setFilters, clearFilter] = usePersistedFilters('dossiers', filterDefaults);
  const rowsPerPage = filters.rowsPerPage;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; refExpert: string } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workflowDossier, setWorkflowDossier] = useState<any>(null);
  const [assignmentDossier, setAssignmentDossier] = useState<any>(null);
  const [statusHistoryDossier, setStatusHistoryDossier] = useState<any>(null);

  // Export mode state
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(ALL_COLUMN_KEYS));

  const dossierList = useMemo(() => {
    let results = [...allDossiers];
    if (filters.nature !== 'Toutes') results = results.filter(d => d.nature === filters.nature);
    if (filters.status !== 'Tous') results = results.filter(d => d.statut === filters.status);
    if (filters.compagnie !== 'Toutes') results = results.filter(d => d.compagnie === filters.compagnie);
    if (filters.observation !== 'Toutes') results = results.filter(d => d.lastObservation?.text === filters.observation);
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
    exportToExcel(rows, columns);
    setExportMode(false);
    setSelectedRows(new Set());
    setSelectedColumns(new Set(ALL_COLUMN_KEYS));
    toast({ title: 'Export terminé', description: `${rows.length} dossier(s) exporté(s).` });
  }, [dossierList, selectedRows, selectedColumns, toast]);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows(new Set());
    setSelectedColumns(new Set(ALL_COLUMN_KEYS));
  }, []);

  const allVisibleSelected = dossierList.length > 0 && dossierList.every(d => selectedRows.has(d.id));

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
  };

  const handleDeleteDossier = async (dossierId: string) => {
    setDeletingId(dossierId);
    try {
      const dossier = allDossiers.find(d => d.id === dossierId);
      const userEmail = auth?.currentUser?.email || 'Admin';
      const userId = auth?.currentUser?.uid || 'unknown';
      const dossierRef = (dossier as any)?.refExpert || dossierId;
      await logWorkflow(db, dossierId, 'Suppression de dossier', userEmail, userId, 'done', { dossierRef, details: `Dossier "${dossierRef}" supprimé définitivement` });
      await deleteDossier(dossierId);
      toast({ title: 'Dossier supprimé', description: 'Le dossier et ses données ont été purgés.' });
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({ variant: 'destructive', title: 'Erreur', description: err?.message || 'Suppression impossible' });
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
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
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-grow max-sm:w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher..."
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
          />
        </div>
        
        <div className="flex items-center gap-1">
          <Select value={filters.nature} onValueChange={v => setFilters({ nature: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Nature du dossier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Toutes">Toutes les natures</SelectItem>
              {filterNatures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <OptionsManagerModal collectionName="options_natures" title="Natures" />
        </div>

        <div className="flex items-center gap-1">
          <Select value={filters.status} onValueChange={v => setFilters({ status: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="Tous">Tous les statuts</SelectItem>
              {filterStatuses.map(s => <SelectItem key={s.id} value={s.label}><span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDotColor(s.label))} />{s.label}</span></SelectItem>)}
            </SelectContent>
          </Select>
          <OptionsManagerModal collectionName="options_statuts" title="Statuts" />
        </div>

        <div className="flex items-center gap-1">
          <Select value={filters.compagnie} onValueChange={v => setFilters({ compagnie: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Compagnie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Toutes">Toutes les compagnies</SelectItem>
              {filterCompagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <OptionsManagerModal collectionName="compagnies" title="Compagnies" />
        </div>

        <div className="flex items-center gap-1">
          <Select value={filters.observation} onValueChange={v => setFilters({ observation: v })}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Type d'observation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Toutes">Toutes les observations</SelectItem>
              {filterObservations.map(o => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <OptionsManagerModal collectionName="options_observations" title="Observations" />
        </div>

        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={v => setFilters({ dateFrom: v })}
          onDateToChange={v => setFilters({ dateTo: v })}
        />
      </div>

      {/* Active filters strip */}
      {(filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.observation !== 'Toutes' || filters.dateFrom || filters.dateTo) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Filtres actifs</span>
          {filters.nature !== 'Toutes' && (
            <Badge variant="outline" className="gap-1 pr-1">
              Nature : {filters.nature}
              <button onClick={() => clearFilter('nature')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label="Retirer le filtre nature">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status !== 'Tous' && (
            <Badge variant="outline" className="gap-1 pr-1">
              Statut : {filters.status}
              <button onClick={() => clearFilter('status')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label="Retirer le filtre statut">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.compagnie !== 'Toutes' && (
            <Badge variant="outline" className="gap-1 pr-1">
              Compagnie : {filters.compagnie}
              <button onClick={() => clearFilter('compagnie')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label="Retirer le filtre compagnie">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.observation !== 'Toutes' && (
            <Badge variant="outline" className="gap-1 pr-1">
              Observation : {filters.observation}
              <button onClick={() => clearFilter('observation')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label="Retirer le filtre observation">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="outline" className="gap-1 pr-1">
              Du : {filters.dateFrom}
              <button onClick={() => clearFilter('dateFrom')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label="Retirer la date de début">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="outline" className="gap-1 pr-1">
              Au : {filters.dateTo}
              <button onClick={() => clearFilter('dateTo')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label="Retirer la date de fin">
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
              clearFilter('dateFrom');
              clearFilter('dateTo');
            }}
          >
            Tout réinitialiser
          </Button>
        </div>
      )}

      {/* Export toolbar */}
      {exportMode ? (
        <div className="flex items-center justify-between bg-muted/50 border rounded-lg px-4 py-2">
          <span className="text-sm font-medium">
            {selectedRows.size} / {dossierList.length} dossier(s) sélectionné(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={allVisibleSelected ? () => setSelectedRows(new Set()) : handleSelectAll}>
              {allVisibleSelected ? 'Tout désélectionner' : 'Sélectionner tout'}
            </Button>
            <Button size="sm" onClick={handleExport} disabled={selectedRows.size === 0 || selectedColumns.size === 0}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelExport}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          {canEditDossiers && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un dossier
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setExportMode(true)}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      )}

      <Card className="overflow-hidden border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {exportMode && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={() => allVisibleSelected ? setSelectedRows(new Set()) : handleSelectAll()}
                  />
                </TableHead>
              )}
              {EXPORT_COLUMNS.map(col => (
                <TableHead key={col.key}>
                  {exportMode ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedColumns.has(col.key)}
                        onCheckedChange={() => handleToggleColumn(col.key)}
                      />
                      <span>{col.label}</span>
                    </div>
                  ) : col.label}
                </TableHead>
              ))}
              {!exportMode && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={16} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : dossierList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} className="p-0">
                  <EmptyState
                    icon={<FolderOpen />}
                    title="Aucun dossier trouvé"
                    description={
                      (filters.search || filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.dateFrom || filters.dateTo)
                        ? "Essayez d'ajuster les filtres pour voir plus de résultats."
                        : 'Créez votre premier dossier pour commencer.'
                    }
                    action={canEditDossiers ? (
                      <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Nouveau dossier
                      </Button>
                    ) : null}
                    dashed={false}
                    className="border-0 bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              dossierList.slice(0, rowsPerPage).map(d => (
                <TableRow
                  key={d.id}
                  className={cn(
                    "group hover:bg-muted/50 transition-colors",
                    !exportMode && "cursor-pointer",
                    exportMode && selectedRows.has(d.id) && "bg-primary/5"
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
                  <TableCell>{d.compagnie || '-'}</TableCell>
                  <TableCell>{d.referenceCompagnie || ''}</TableCell>
                  <TableCell>{d.nature || '-'}</TableCell>
                  <TableCell>{d.typeDossier || '-'}</TableCell>
                  <TableCell
                    onClick={exportMode ? undefined : (e) => {
                      e.stopPropagation();
                      setStatusHistoryDossier(d);
                    }}
                    className={cn(!exportMode && "cursor-pointer hover:bg-muted/60 transition-colors")}
                    title={!exportMode ? "Voir l'historique des statuts" : undefined}
                  >
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'))}>
                        {d.statut || 'Nouveau'}
                      </Badge>
                      {!exportMode && d.lastStatusChange?.at && d.lastStatusChange?.status === d.statut && (
                        <span className="text-[10px] text-muted-foreground">
                          il y a {formatDistanceToNow(d.lastStatusChange.at.toDate ? d.lastStatusChange.at.toDate() : new Date(d.lastStatusChange.at), { locale: fr })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
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
                  <TableCell className="tabular-nums">{formatDate(d.dateMissionAgentTerrain)}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(d.dateChiffrage)}</TableCell>

                  {!exportMode && (
                    <TableCell
                      onClick={e => e.stopPropagation()}
                      className="text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Gérer"
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
                          title="Assignations"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignmentDossier(d);
                          }}
                        >
                          <Users className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Workflow"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWorkflowDossier(d);
                          }}
                        >
                          <History className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        </Button>
                        {canEditDossiers && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer"
                            className="text-destructive hover:text-destructive hover:bg-destructive/5"
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

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Afficher</span>
          <Select value={String(rowsPerPage)} onValueChange={v => setFilters({ rowsPerPage: Number(v) })}>
            <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-4">Total: {dossierList.length} dossiers</span>
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
            <AlertDialogTitle>Supprimer ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprime définitivement le dossier {deleteTarget?.refExpert ? <span className="font-semibold">{deleteTarget.refExpert}</span> : ''} ainsi que tous les documents, photos et l&apos;historique associés. Elle est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!deletingId}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDeleteDossier(deleteTarget.id);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}