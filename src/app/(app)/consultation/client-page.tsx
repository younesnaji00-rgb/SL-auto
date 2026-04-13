'use client';

import React, { useState, useMemo } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, getStatusDotColor, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { natures as defaultNatures, statuses as defaultStatuses, compagnies as defaultCompagnies } from '@/lib/dossiers-data';
import { useDossiers } from '@/hooks/use-dossiers';
import { DateRangeFilter } from '@/components/date-range-filter';
import { useOptions } from '@/hooks/use-options';

export default function ConsultationClientPage() {
  const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);
  const { options: dbNatures } = useOptions('options_natures', defaultNatures);
  const { options: dbStatuses } = useOptions('options_statuts', defaultStatuses);

  const compagnies = useMemo(() => dbCompagnies.length > 0 ? dbCompagnies : defaultCompagnies.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbCompagnies]);
  const natures = useMemo(() => dbNatures.length > 0 ? dbNatures : defaultNatures.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbNatures]);
  const statuses = useMemo(() => dbStatuses.length > 0 ? dbStatuses : defaultStatuses.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbStatuses]);

  // Fetch ALL dossiers — no company restriction
  const { dossiers: allDossiers, loading, error: fetchError } = useDossiers();

  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({ search: '', nature: 'Toutes', status: 'Tous', compagnie: 'Toutes', dateFrom: '', dateTo: '' });

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

        <Select value={filters.nature} onValueChange={v => setFilters(f => ({ ...f, nature: v }))}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Nature" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">Toutes les natures</SelectItem>
            {natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="Tous">Tous les statuts</SelectItem>
            {statuses.map(s => <SelectItem key={s.id} value={s.label}><span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDotColor(s.label))} />{s.label}</span></SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.compagnie} onValueChange={v => setFilters(f => ({ ...f, compagnie: v }))}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Compagnie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">Toutes les compagnies</SelectItem>
            {compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={v => setFilters(f => ({ ...f, dateFrom: v }))}
          onDateToChange={v => setFilters(f => ({ ...f, dateTo: v }))}
        />
      </div>

      <Card className="overflow-hidden border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Ref Expert</TableHead>
              <TableHead>Assure</TableHead>
              <TableHead>Compagnie</TableHead>
              <TableHead>Nature</TableHead>
              <TableHead>Type Dossier</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Date Requete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Chargement des dossiers...</TableCell></TableRow>
            ) : dossierList.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic">Aucun dossier trouve.</TableCell></TableRow>
            ) : (
              dossierList.slice(0, rowsPerPage).map(d => (
                <TableRow key={d.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{d.refExpert}</TableCell>
                  <TableCell>{renderAssure(d.assure)}</TableCell>
                  <TableCell className="text-xs">{d.compagnie || '-'}</TableCell>
                  <TableCell>{d.nature || '-'}</TableCell>
                  <TableCell>{d.typeDossier || '-'}</TableCell>
                  <TableCell><Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut || 'Nouveau'))}>{d.statut || 'Nouveau'}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{d.matricule || '-'}</TableCell>
                  <TableCell>{formatDate(d.dateRequete)}</TableCell>
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
    </div>
  );
}
