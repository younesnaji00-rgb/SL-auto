'use client';

import React, { useState, useMemo } from 'react';
import { Search, AlertCircle, X, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, getStatusDotColor, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDossiers } from '@/hooks/use-dossiers';
import { DateRangeFilter } from '@/components/date-range-filter';
import { useOptions } from '@/hooks/use-options';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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
    if (!val) return '-';
    const date = val.toDate ? val.toDate() : new Date(val);
    return format(date, 'dd/MM/yyyy');
  };

  const renderAssure = (assure: any) => {
    if (!assure) return 'N/A';
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || 'N/A';
  };

  const hasActiveFilters = filters.search || filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.dateFrom || filters.dateTo;

  return (
    <div className="space-y-6">
      {fetchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-grow max-sm:w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
          <Input
            className="pl-9"
            placeholder="Rechercher..."
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
          />
        </div>

        <Select value={filters.nature} onValueChange={v => setFilters({ nature: v })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Nature du dossier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">Toutes les natures</SelectItem>
            {filterNatures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={v => setFilters({ status: v })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="Tous">Tous les statuts</SelectItem>
            {filterStatuses.map(s => <SelectItem key={s.id} value={s.label}><span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDotColor(s.label))} />{s.label}</span></SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.compagnie} onValueChange={v => setFilters({ compagnie: v })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Compagnie" /></SelectTrigger>
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

      {(filters.nature !== 'Toutes' || filters.status !== 'Tous' || filters.compagnie !== 'Toutes' || filters.dateFrom || filters.dateTo) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-label">Filtres actifs</span>
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
              clearFilter('dateFrom');
              clearFilter('dateTo');
            }}
          >
            Tout réinitialiser
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Réf. expert</TableHead>
              <TableHead>Assuré</TableHead>
              <TableHead>Compagnie</TableHead>
              <TableHead>Nature du dossier</TableHead>
              <TableHead>Type Dossier</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Date Requête</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={8} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))
            ) : dossierList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={<FolderOpen />}
                    title="Aucun dossier trouvé"
                    description={hasActiveFilters ? "Essayez d'ajuster les filtres pour voir plus de résultats." : 'Aucun dossier dans le système.'}
                    dashed={false}
                    className="border-0 bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              dossierList.slice(0, rowsPerPage).map(d => (
                <TableRow key={d.id}>
                  <TableCell className="t-mono font-semibold">{d.refExpert}</TableCell>
                  <TableCell>{renderAssure(d.assure)}</TableCell>
                  <TableCell className="text-ink-2">{d.compagnie || '-'}</TableCell>
                  <TableCell>{d.nature || '-'}</TableCell>
                  <TableCell>{d.typeDossier || '-'}</TableCell>
                  <TableCell><Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'))}>{d.statut || 'Nouveau'}</Badge></TableCell>
                  <TableCell className="t-mono">{d.matricule || '-'}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(d.dateRequete)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-3">Afficher</span>
          <Select value={String(rowsPerPage)} onValueChange={v => setFilters({ rowsPerPage: Number(v) })}>
            <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-ink-3 ml-4 tabular-nums">Total: {dossierList.length} dossiers</span>
        </div>
      </div>
    </div>
  );
}
