'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, AlertCircle, Eye, History, Loader2, Settings } from 'lucide-react';
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
import { logWorkflow } from './[id]/log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import WorkflowStatusSheet from './workflow-status-sheet';
import { useCurrentUser } from '@/hooks/use-current-user';

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
  
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ search: '', nature: 'Toutes', status: 'Tous', compagnie: 'Toutes' });
  const [workflowDossier, setWorkflowDossier] = useState<any>(null);

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
    return results;
  }, [allDossiers, filters]);

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
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        
        <div className="flex items-center gap-1">
          <Select value={filters.nature} onValueChange={v => setFilters(f => ({ ...f, nature: v }))}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Nature" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Toutes">Toutes les natures</SelectItem>
              {natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <OptionsManagerModal collectionName="options_natures" title="Natures" defaultValues={defaultNatures} />
        </div>

        <div className="flex items-center gap-1">
          <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="Tous">Tous les statuts</SelectItem>
              {statuses.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <OptionsManagerModal collectionName="options_statuts" title="Statuts" defaultValues={defaultStatuses} />
        </div>

        <div className="flex items-center gap-1">
          <Select value={filters.compagnie} onValueChange={v => setFilters(f => ({ ...f, compagnie: v }))}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Compagnie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Toutes">Toutes les compagnies</SelectItem>
              {compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <OptionsManagerModal collectionName="compagnies" title="Compagnies" />
        </div>
      </div>

      <Card className="overflow-hidden border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Réf Expert</TableHead>
              <TableHead>Assuré</TableHead>
              <TableHead>Nature</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Date Requête</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Chargement des dossiers...</TableCell></TableRow>
            ) : dossierList.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">Aucun dossier trouvé.</TableCell></TableRow>
            ) : (
              dossierList.slice(0, rowsPerPage).map(d => (
                <TableRow
                  key={d.id}
                  className="group cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/dossiers/${d.id}`)}
                >
                  <TableCell className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{d.refExpert}</TableCell>
                  <TableCell>{renderAssure(d.assure)}</TableCell>
                  <TableCell>{d.nature || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{d.statut || 'Nouveau'}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{d.matricule || '-'}</TableCell>
                  <TableCell>{formatDate(d.dateRequete)}</TableCell>

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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Afficher</span>
          <Select value={String(rowsPerPage)} onValueChange={v => setRowsPerPage(Number(v))}>
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
    </div>
  );
}