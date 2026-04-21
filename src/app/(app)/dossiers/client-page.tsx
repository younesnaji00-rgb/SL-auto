'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, AlertCircle, Eye, History, Loader2, Settings, Users, X, Download, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { natures as defaultNatures, statuses as defaultStatuses, compagnies as defaultCompagnies } from '@/lib/dossiers-data';
import { useToast } from '@/hooks/use-toast';
import { useDossiers } from '@/hooks/use-dossiers';
import { useAuth, useFirestore } from '@/firebase';
import { logHistorique, logWorkflow } from './[id]/log-historique';
import { createEmptyDossier } from '@/lib/create-empty-dossier';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import WorkflowStatusSheet from './workflow-status-sheet';
import { DateRangeFilter } from '@/components/date-range-filter';
import AssignmentHistorySheet from './assignment-history-sheet';
import StatusHistorySheet from './status-history-sheet';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { getStatusBadgeStyles, getStatusDotColor, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { exportToExcel, type ExportColumn } from '@/lib/export-excel';

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'refExpert', label: 'Réf Expert' },
  { key: 'assure', label: 'Assuré' },
  { key: 'compagnie', label: 'Compagnie' },
  { key: 'nature', label: 'Nature du dossier' },
  { key: 'typeDossier', label: 'Type Dossier' },
  { key: 'statut', label: 'Statut' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'dateRequete', label: 'Date Requête' },
];
const ALL_COLUMN_KEYS = new Set(EXPORT_COLUMNS.map(c => c.key));

export default function DossiersClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const { profile, canWrite } = useCurrentUser();
  const canEditDossiers = canWrite('dossiers');

  const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);
  const { options: dbNatures } = useOptions('options_natures', defaultNatures);
  const { options: dbStatuses } = useOptions('options_statuts', defaultStatuses);

  const allCompagnies = useMemo(() => dbCompagnies.length > 0 ? dbCompagnies : defaultCompagnies.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbCompagnies]);
  const natures = useMemo(() => dbNatures.length > 0 ? dbNatures : defaultNatures.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbNatures]);
  const statuses = useMemo(() => dbStatuses.length > 0 ? dbStatuses : defaultStatuses.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbStatuses]);

  const userCompagnies = profile?.compagnies || [];

  // Filter company dropdown to only show user's assigned companies
  const compagnies = useMemo(() => {
    if (userCompagnies.length === 0) return allCompagnies;
    const allowed = userCompagnies.map(c => c.toLowerCase().trim());
    return allCompagnies.filter(c => allowed.includes(c.label.toLowerCase().trim()));
  }, [allCompagnies, userCompagnies]);

  const { dossiers: allDossiers, loading, error: fetchError, deleteDossier } = useDossiers(userCompagnies.length > 0 ? userCompagnies : undefined);
  
  const filterDefaults = { search: '', nature: 'Toutes', status: 'Tous', compagnie: 'Toutes', dateFrom: '', dateTo: '', rowsPerPage: 25 };
  const [filters, setFilters, clearFilter] = usePersistedFilters('dossiers', filterDefaults);
  const rowsPerPage = filters.rowsPerPage;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
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

  const handleCreate = async () => {
    const fbUser = auth?.currentUser;
    if (!fbUser || !db) return;
    try {
      setIsCreating(true);
      const userName = profile ? `${profile.prenom} ${profile.nom}`.trim() || profile.email || fbUser.email || 'Utilisateur' : (fbUser.displayName || fbUser.email || 'Utilisateur');
      const id = await createEmptyDossier({
        db,
        user: { uid: fbUser.uid, displayName: fbUser.displayName, email: fbUser.email },
      });
      await logHistorique(db, id, 'Création de dossier', userName, 'Dossier vide créé depuis la liste', 'statut');
      router.push(`/dossiers/${id}`);
    } catch (e: any) {
      console.error('Create empty dossier error:', e);
      toast({ variant: 'destructive', title: 'Erreur', description: e?.message || 'Impossible de créer le dossier' });
      setIsCreating(false);
    }
  };

  const handleDeleteDossier = async (dossierId: string) => {
    if (!window.confirm('SUPPRIMER CE DOSSIER DÉFINITIVEMENT ?\nCette action supprimera également tous les documents, photos et l\'historique associés.')) return;
    
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
          <div className="relative">
            <Select value={filters.nature} onValueChange={v => setFilters({ nature: v })}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Nature du dossier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Toutes">Toutes les natures</SelectItem>
                {natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {filters.nature !== 'Toutes' && (
              <button onClick={() => clearFilter('nature')} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 z-10">
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          <OptionsManagerModal collectionName="options_natures" title="Natures" defaultValues={defaultNatures} />
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <Select value={filters.status} onValueChange={v => setFilters({ status: v })}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="Tous">Tous les statuts</SelectItem>
                {statuses.map(s => <SelectItem key={s.id} value={s.label}><span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDotColor(s.label))} />{s.label}</span></SelectItem>)}
              </SelectContent>
            </Select>
            {filters.status !== 'Tous' && (
              <button onClick={() => clearFilter('status')} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 z-10">
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          <OptionsManagerModal collectionName="options_statuts" title="Statuts" defaultValues={defaultStatuses} />
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <Select value={filters.compagnie} onValueChange={v => setFilters({ compagnie: v })}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Compagnie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Toutes">Toutes les compagnies</SelectItem>
                {compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {filters.compagnie !== 'Toutes' && (
              <button onClick={() => clearFilter('compagnie')} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 z-10">
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          <OptionsManagerModal collectionName="compagnies" title="Compagnies" />
        </div>

        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={v => setFilters({ dateFrom: v })}
          onDateToChange={v => setFilters({ dateTo: v })}
        />
      </div>

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
            <Button size="sm" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
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
              <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">Chargement des dossiers...</TableCell></TableRow>
            ) : dossierList.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground italic">Aucun dossier trouvé.</TableCell></TableRow>
            ) : (
              dossierList.slice(0, rowsPerPage).map(d => (
                <TableRow
                  key={d.id}
                  className={cn(
                    "group hover:bg-muted/50 transition-colors",
                    !exportMode && "cursor-pointer",
                    exportMode && selectedRows.has(d.id) && "bg-primary/5"
                  )}
                  onClick={() => exportMode ? handleToggleRow(d.id) : router.push(`/dossiers/${d.id}`)}
                >
                  {exportMode && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.has(d.id)}
                        onCheckedChange={() => handleToggleRow(d.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{d.refExpert}</TableCell>
                  <TableCell>{renderAssure(d.assure)}</TableCell>
                  <TableCell>{d.compagnie || '-'}</TableCell>
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
                  <TableCell className="font-mono text-xs">{d.matricule || '-'}</TableCell>
                  <TableCell>{formatDate(d.dateRequete)}</TableCell>

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
                            router.push(`/dossiers/${d.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                          <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                        {canEditDossiers && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer"
                            className="text-destructive hover:text-destructive hover:bg-destructive/5"
                            disabled={deletingId === d.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDossier(d.id);
                            }}
                          >
                            {deletingId === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
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
    </div>
  );
}