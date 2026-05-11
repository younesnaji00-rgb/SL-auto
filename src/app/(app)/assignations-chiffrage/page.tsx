'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator, CheckCircle2, Clock, X } from 'lucide-react';
import { DeadlineBar } from '@/components/deadline-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { DateRangeFilter } from '@/components/date-range-filter';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { fr } from 'date-fns/locale';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { SortableHeader, type SortDirection } from '@/components/ui/sortable-header';
import { useChiffreurWorkload } from '@/hooks/use-workload-counts';
import { REFORME_TYPES, normalizeReformeType } from '@/components/chiffreurs/reforme-dialog';
import { businessHoursBetween } from '@/lib/business-days';
import { useHolidays } from '@/hooks/use-holidays';

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

export default function AssignationsChiffragePage() {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const chiffreurWorkload = useChiffreurWorkload();
  const [chiffrages, setChiffrages] = useState<ChiffrageItem[]>([]);
  const [dossierStatuts, setDossierStatuts] = useState<Record<string, string>>({});
  const [dossierReformeTypes, setDossierReformeTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [deadlineSort, setDeadlineSort] = useState<SortDirection>(null);
  const filterDefaults = { dateFrom: '', dateTo: '', compagnieFilter: 'Toutes', chiffreurFilter: 'Tous', typeReformeFilter: 'Tous' };
  const [filters, setFilters, clearFilter] = usePersistedFilters('assignations-chiffrage', filterDefaults);
  const { dateFrom, dateTo, compagnieFilter, chiffreurFilter, typeReformeFilter } = filters;

  // Listen to chiffrages
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'chiffrages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
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
        }
      })
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
  const getDeadlineInfo = (ts: any, _nature: string) => {
    if (!ts) return { percent: 0, elapsed: 0, total: 0, overdue: false };
    const created = ts.toDate ? ts.toDate() : new Date(ts);
    // Business-hours deadline: weekends + Moroccan holidays don't count.
    const totalHours = 24;
    const elapsedHours = businessHoursBetween(created, new Date(), holidays);
    const percent = Math.min(Math.max((elapsedHours / totalHours) * 100, 0), 100);
    const HOUR_MS = 3_600_000;
    return {
      percent,
      elapsed: elapsedHours * HOUR_MS,
      total: totalHours * HOUR_MS,
      overdue: elapsedHours >= totalHours,
    };
  };

  const filteredChiffrages = useMemo(() => {
    let results = [...chiffrages];
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
      const DEADLINE_MS = 24 * 3600 * 1000;
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
  }, [chiffrages, compagnieFilter, chiffreurFilter, typeReformeFilter, dossierCompagnies, dossierReformeTypes, dateFrom, dateTo, deadlineSort]);

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr }); }
    catch { return '-'; }
  };

  const isChiffreur = profile?.role === 'Chiffreur';
  const isATG = profile?.role === 'Agent de Terrain';
  const canSeeNameFilter = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const showChiffreurColumn = !isChiffreur;
  const colCount = showChiffreurColumn ? 7 : 6;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Assignations au Chiffrage</h1>
          <Badge variant="secondary" className="ml-2">{filteredChiffrages.length}</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Select value={compagnieFilter} onValueChange={v => setFilters({ compagnieFilter: v })}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Compagnie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Toutes">Toutes les compagnies</SelectItem>
                {compagnieOptions.map(([name, count]) => (
                  <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {compagnieFilter !== 'Toutes' && (
              <button onClick={() => clearFilter('compagnieFilter')} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 z-10">
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          {canSeeNameFilter && (
            <div className="relative">
              <Select value={chiffreurFilter} onValueChange={v => setFilters({ chiffreurFilter: v })}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Chiffreur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous les chiffreurs</SelectItem>
                  {chiffreurOptions.map(([name, count]) => (
                    <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {chiffreurFilter !== 'Tous' && (
                <button onClick={() => clearFilter('chiffreurFilter')} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 z-10">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )}
          <div className="relative">
            <Select value={typeReformeFilter} onValueChange={v => setFilters({ typeReformeFilter: v })}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue placeholder="Type réforme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous les types</SelectItem>
                {REFORME_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeReformeFilter !== 'Tous' && (
              <button onClick={() => clearFilter('typeReformeFilter')} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 z-10">
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-bold text-xs">Dossier</TableHead>
                {showChiffreurColumn && <TableHead className="font-bold text-xs">Chiffreur</TableHead>}
                <TableHead className="font-bold text-xs">Nature du dossier</TableHead>
                <TableHead className="font-bold text-xs">Statut</TableHead>
                <TableHead className="font-bold text-xs">Assigné par</TableHead>
                <TableHead className="font-bold text-xs w-[160px]">
                  <SortableHeader label="Délai" sort={deadlineSort} onChange={setDeadlineSort} />
                </TableHead>
                <TableHead className="font-bold text-xs text-right">Date</TableHead>
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
              ) : filteredChiffrages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="p-0">
                    <EmptyState
                      icon={<Calculator />}
                      title="Aucun chiffrage assigné"
                      description="Les nouvelles assignations de chiffrage apparaîtront ici."
                      dashed={false}
                      className="border-0 bg-transparent py-10"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredChiffrages.map((c) => {
                  const statut = dossierStatuts[c.dossierId] || 'Nouveau';
                  const nature = dossierNatures[c.dossierId] || '';
                  const today = isToday(c.createdAt);
                  const deadline = getDeadlineInfo(c.createdAt, nature);

                  return (
                    <TableRow key={c.id} className={cn('hover:bg-muted/50 transition-colors align-top', today && 'bg-[hsl(var(--primary)/0.06)]')}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/assignations-chiffrage/${c.id}`}
                            className="font-bold text-sm text-primary hover:underline"
                          >
                            {c.dossierNom || 'Sans ref.'}
                          </Link>
                          {today && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              aujourd&apos;hui
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {showChiffreurColumn && <TableCell className="text-sm">{c.assignedChiffreurNom || '-'}</TableCell>}
                      <TableCell className="text-xs">{nature || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(statut))}>{statut}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.sentByNom || c.sentByEmail || '-'}</TableCell>
                      <TableCell>
                        {c.completedAt ? (
                          <div className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              Chiffré le {format(c.completedAt?.toDate ? c.completedAt.toDate() : new Date(c.completedAt), "dd/MM/yyyy HH:mm")}
                            </span>
                          </div>
                        ) : (
                          <DeadlineBar percent={deadline.percent} overdue={deadline.overdue} />
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
