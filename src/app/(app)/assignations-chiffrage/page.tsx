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
import { Calculator, Loader2, FileText, ChevronDown, ChevronRight, ImageIcon, Clock, X } from 'lucide-react';
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

interface ChiffrageItem {
  id: string;
  dossierId: string;
  dossierNom: string;
  assignedChiffreurNom: string;
  status: string;
  files: any[];
  createdAt: any;
  sentByNom?: string;
  sentByEmail?: string;
}

function computeFileCounts(files: any[]) {
  const photos: Record<string, number> = { avant: 0, en_cours: 0, apres: 0 };
  const docs: Record<string, number> = {};

  (files || []).forEach((f: any) => {
    if (f.type === 'photo') {
      const cat = f.category || 'avant';
      photos[cat] = (photos[cat] || 0) + 1;
    } else {
      const dt = f.docType || 'Autre';
      docs[dt] = (docs[dt] || 0) + 1;
    }
  });

  return { photos, docs };
}

const photoCatLabels: Record<string, string> = {
  avant: 'Photos Avant',
  en_cours: 'Photos En cours',
  apres: 'Photos Après',
};

function DeadlineBar({ percent, overdue, nature }: { percent: number; overdue: boolean; nature: string }) {
  const isContradictoire = nature.toLowerCase().startsWith('contradictoire');
  const label = isContradictoire ? '48h' : '24h';
  const rounded = Math.round(percent);

  // Color stops: blue (0%) > green (33%) > orange (66%) > red (100%)
  const getBarColor = (p: number) => {
    if (p <= 25) return 'from-blue-500 to-cyan-400';
    if (p <= 50) return 'from-cyan-400 to-green-400';
    if (p <= 75) return 'from-green-400 to-orange-400';
    return 'from-orange-400 to-red-500';
  };

  const getTextColor = (p: number) => {
    if (p <= 25) return 'text-blue-600 dark:text-blue-400';
    if (p <= 50) return 'text-green-600 dark:text-green-400';
    if (p <= 75) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] font-bold', getTextColor(rounded))}>
          {overdue ? 'En retard' : `${rounded}%`}
        </span>
        <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-500',
            overdue ? 'from-red-500 to-red-600' : getBarColor(rounded)
          )}
          style={{ width: `${Math.min(rounded, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function AssignationsChiffragePage() {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const [chiffrages, setChiffrages] = useState<ChiffrageItem[]>([]);
  const [dossierStatuts, setDossierStatuts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, Set<string>>>({});
  const [deadlineSort, setDeadlineSort] = useState<SortDirection>(null);
  const filterDefaults = { dateFrom: '', dateTo: '', compagnieFilter: 'Toutes', chiffreurFilter: 'Tous' };
  const [filters, setFilters, clearFilter] = usePersistedFilters('assignations-chiffrage', filterDefaults);
  const { dateFrom, dateTo, compagnieFilter, chiffreurFilter } = filters;

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

  const chiffreurOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    chiffrages.forEach(c => {
      const name = c.assignedChiffreurNom?.trim();
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [chiffrages]);

  const isToday = (ts: any) => {
    if (!ts) return false;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  };

  const getDeadlineInfo = (ts: any, nature: string) => {
    if (!ts) return { percent: 0, elapsed: 0, total: 0, overdue: false };
    const created = ts.toDate ? ts.toDate() : new Date(ts);
    const isContradictoire = nature.toLowerCase().startsWith('contradictoire');
    const totalMs = (isContradictoire ? 48 : 24) * 60 * 60 * 1000;
    const elapsed = Date.now() - created.getTime();
    const percent = Math.min(Math.max((elapsed / totalMs) * 100, 0), 100);
    return { percent, elapsed, total: totalMs, overdue: elapsed >= totalMs };
  };

  const filteredChiffrages = useMemo(() => {
    let results = [...chiffrages];
    if (compagnieFilter !== 'Toutes') {
      results = results.filter(c => (dossierCompagnies[c.dossierId] || '') === compagnieFilter);
    }
    if (chiffreurFilter !== 'Tous') {
      results = results.filter(c => c.assignedChiffreurNom?.trim() === chiffreurFilter);
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
      // Sort by deadline end time (createdAt + totalMs). Ascending = most urgent first.
      results.sort((a, b) => {
        const aNature = (a as any).nature || '';
        const bNature = (b as any).nature || '';
        const aCreated = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : null);
        const bCreated = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : null);
        const aTotal = aNature.toLowerCase().startsWith('contradictoire') ? 48 : 24;
        const bTotal = bNature.toLowerCase().startsWith('contradictoire') ? 48 : 24;
        const aEnd = aCreated === null ? (deadlineSort === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : aCreated + aTotal * 3600 * 1000;
        const bEnd = bCreated === null ? (deadlineSort === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : bCreated + bTotal * 3600 * 1000;
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
  }, [chiffrages, compagnieFilter, chiffreurFilter, dossierCompagnies, dateFrom, dateTo, deadlineSort]);

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr }); }
    catch { return '-'; }
  };

  const toggleRowSection = (chiffrageId: string, section: string) => {
    setExpandedRows(prev => {
      const current = prev[chiffrageId] || new Set<string>();
      const next = new Set(current);
      if (next.has(section)) next.delete(section); else next.add(section);
      return { ...prev, [chiffrageId]: next };
    });
  };

  const isChiffreur = profile?.role === 'Chiffreur';
  const isATG = profile?.role === 'Agent de Terrain';
  const canSeeNameFilter = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const showChiffreurColumn = !isChiffreur;
  const colCount = showChiffreurColumn ? 8 : 7;

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
                <TableHead className="font-bold text-xs">Fichiers</TableHead>
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
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredChiffrages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Aucune assignation au chiffrage.
                  </TableCell>
                </TableRow>
              ) : (
                filteredChiffrages.map((c) => {
                  const { photos, docs } = computeFileCounts(c.files);
                  const expanded = expandedRows[c.id] || new Set<string>();
                  const statut = dossierStatuts[c.dossierId] || 'Nouveau';
                  const nature = dossierNatures[c.dossierId] || '';
                  const today = isToday(c.createdAt);
                  const deadline = getDeadlineInfo(c.createdAt, nature);

                  return (
                    <TableRow key={c.id} className={cn('hover:bg-muted/50 transition-colors align-top', today && 'bg-blue-50/50 dark:bg-blue-950/20')}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/assignations-chiffrage/${c.id}`}
                            className="font-bold text-sm text-primary hover:underline"
                          >
                            {c.dossierNom || 'Sans ref.'}
                          </Link>
                          {today && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              aujourd&apos;hui
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {showChiffreurColumn && <TableCell className="text-sm">{c.assignedChiffreurNom || '-'}</TableCell>}
                      <TableCell className="text-xs">{nature || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {/* Photo counts by category */}
                          {Object.entries(photos).filter(([, count]) => count > 0).map(([cat, count]) => {
                            const key = `photo_${cat}`;
                            return (
                              <button
                                key={key}
                                onClick={() => toggleRowSection(c.id, key)}
                                className="flex items-center gap-1.5 text-xs w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                              >
                                {expanded.has(key) ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                <span className="flex-1 text-left">{photoCatLabels[cat] || cat}</span>
                                <Badge variant="secondary" className="text-[9px] py-0 h-4 font-mono">{count}</Badge>
                              </button>
                            );
                          })}
                          {/* Document counts by type */}
                          {Object.entries(docs).map(([docType, count]) => {
                            const key = `doc_${docType}`;
                            return (
                              <button
                                key={key}
                                onClick={() => toggleRowSection(c.id, key)}
                                className="flex items-center gap-1.5 text-xs w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                              >
                                {expanded.has(key) ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                <FileText className="h-3 w-3 text-muted-foreground" />
                                <span className="flex-1 text-left">{docType}</span>
                                <Badge variant="secondary" className="text-[9px] py-0 h-4 font-mono">{count}</Badge>
                              </button>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(statut))}>{statut}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.sentByNom || c.sentByEmail || '-'}</TableCell>
                      <TableCell>
                        <DeadlineBar percent={deadline.percent} overdue={deadline.overdue} nature={nature} />
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
