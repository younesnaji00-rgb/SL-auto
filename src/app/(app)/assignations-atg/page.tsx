'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collectionGroup, onSnapshot, query, orderBy, limit, doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, Loader2, Calendar, MapPin, X, ChevronDown, Clock, CheckCircle2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateRangeFilter } from '@/components/date-range-filter';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format, startOfDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { SortableHeader, type SortDirection } from '@/components/ui/sortable-header';
import { agentTerrainStatuses } from '@/lib/dossiers-data';

type PhotoCategory = 'avant' | 'en_cours' | 'apres';

interface PlanificationItem {
  id: string;
  dossierId: string;
  dossierNom?: string;
  assureNom?: string;
  compagnie?: string;
  expertRank?: string;
  nature?: string;
  agentTerrain: string;
  typeMission: string;
  dateRDV: any;
  zone: string;
  adresse: string;
  observation: string;
  createdAt: any;
  modifiedByName?: string;
  active?: boolean;
  statut?: string;
  hasPhotosForMission?: boolean;
}

function missionToCategory(typeMission: string): PhotoCategory {
  const n = typeMission === 'Apres' ? 'Après' : typeMission;
  if (n === 'En cours') return 'en_cours';
  if (n === 'Après') return 'apres';
  return 'avant';
}

const AGENT_TERRAIN_STATUS_SET = new Set<string>(agentTerrainStatuses as readonly string[]);

const MISSION_TABS = [
  { id: 'Avant', label: 'Avant' },
  { id: 'En cours', label: 'En cours' },
  { id: 'Après', label: 'Après' },
];

const DEADLINE_HOURS = 24;

function isToday(ts: any): boolean {
  if (!ts) return false;
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

function getDeadlineInfo(dateRDV: any, createdAt: any): { percent: number; remaining: string; expired: boolean; pending: boolean } {
  // Use dateRDV at 8am as start time; fall back to createdAt if no dateRDV
  const refDate = dateRDV || createdAt;
  if (!refDate) return { percent: 0, remaining: '-', expired: false, pending: false };

  const rdvDate = refDate.toDate ? refDate.toDate() : new Date(refDate);
  const startTime = new Date(rdvDate);
  if (dateRDV) {
    startTime.setHours(8, 0, 0, 0);
  }

  const now = new Date();
  if (now < startTime) return { percent: 0, remaining: 'En attente', expired: false, pending: true };

  const elapsedMs = now.getTime() - startTime.getTime();
  const totalMs = DEADLINE_HOURS * 60 * 60 * 1000;
  const elapsed = Math.max(0, Math.min(elapsedMs / totalMs, 1));
  const percent = Math.round(elapsed * 100);

  if (elapsed >= 1) return { percent: 100, remaining: 'En retard', expired: true, pending: false };

  const remainMs = totalMs - elapsedMs;
  const remainH = Math.floor(remainMs / (60 * 60 * 1000));
  const remainM = Math.floor((remainMs % (60 * 60 * 1000)) / (60 * 1000));
  const remaining = remainH > 0 ? `${remainH}h ${remainM}m` : `${remainM}m`;

  return { percent, remaining, expired: false, pending: false };
}

function DeadlineBar({
  dateRDV,
  createdAt,
  completed = false,
  completedStatus,
}: {
  dateRDV: any;
  createdAt: any;
  completed?: boolean;
  completedStatus?: string;
}) {
  const { percent, remaining, expired, pending } = getDeadlineInfo(dateRDV, createdAt);

  // Completed: ATG uploaded photos + set a terrain status → hide progress bar,
  // show checkmark + the chosen status instead.
  if (completed) {
    return (
      <div className="flex items-center gap-1.5 min-w-[140px]">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        {completedStatus && (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold border-green-300 bg-green-50 text-green-700 dark:bg-green-950/30 dark:border-green-700 dark:text-green-400 whitespace-nowrap"
          >
            {completedStatus}
          </Badge>
        )}
      </div>
    );
  }

  // Color stops: blue (0%) > green (33%) > orange (66%) > red (100%)
  const getBarColor = (pct: number) => {
    if (pct <= 25) return 'from-blue-500 to-blue-400';
    if (pct <= 50) return 'from-blue-500 via-green-500 to-green-400';
    if (pct <= 75) return 'from-blue-500 via-green-500 to-orange-500';
    return 'from-blue-500 via-orange-500 to-red-500';
  };

  const getTextColor = (pct: number) => {
    if (pct <= 25) return 'text-blue-600';
    if (pct <= 50) return 'text-green-600';
    if (pct <= 75) return 'text-orange-600';
    return 'text-red-600';
  };

  if (pending) {
    return (
      <div className="flex items-center gap-1.5 min-w-[140px]">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">En attente</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all', getBarColor(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={cn('text-[10px] font-bold tabular-nums whitespace-nowrap', getTextColor(percent))}>
        {expired ? 'En retard' : `${percent}%`}
      </span>
    </div>
  );
}

export default function AssignationsATGPage() {
  const db = useFirestore();
  const router = useRouter();
  const { profile } = useCurrentUser();
  const [planifications, setPlanifications] = useState<PlanificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Realtime per-dossier state so status changes + photo uploads update the
  // "Délai" completion indicator even when no planification doc changes.
  type DossierLive = { statut: string; photos: Record<PhotoCategory, boolean> };
  const [dossierLive, setDossierLive] = useState<Record<string, DossierLive>>({});
  const filterDefaults = { activeTab: 'Avant', dateFrom: '', dateTo: '', compagnieFilter: 'Toutes', agentFilter: 'Tous' };
  const [filters, setFilters, clearFilter] = usePersistedFilters('assignations-atg', filterDefaults);
  const { activeTab, dateFrom, dateTo, compagnieFilter, agentFilter } = filters;

  useEffect(() => {
    if (!db) return;
    const q = query(
      collectionGroup(db, 'planifications'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const items: PlanificationItem[] = [];
      const uniqueDossierIds = new Set<string>();

      for (const d of snap.docs) {
        const data = d.data();
        const dossierId = d.ref.parent.parent?.id || '';
        const item: PlanificationItem = {
          id: d.id,
          dossierId,
          agentTerrain: data.agentTerrain || '-',
          typeMission: data.typeMission || '-',
          dateRDV: data.dateRDV,
          zone: data.zone || '',
          adresse: data.adresse || '',
          observation: data.observation || '',
          createdAt: data.createdAt,
          modifiedByName: data.modifiedByName || '',
          active: data.active,
          dossierNom: data.dossierNom || '',
          assureNom: data.assureNom || '',
          compagnie: data.compagnie || '',
          expertRank: data.expertRank || '',
          nature: data.nature || '',
        };
        if (dossierId) uniqueDossierIds.add(dossierId);
        items.push(item);
      }

      // Enrich: always fetch statut + photos (for completion state); fill in
      // denormalized fallbacks if missing.
      type Enriched = {
        refExpert: string; assureNom: string; compagnie: string; expertRank: string; nature: string;
        statut: string; photos: Record<PhotoCategory, boolean>;
      };
      const dossierData: Record<string, Enriched> = {};
      await Promise.all(
        Array.from(uniqueDossierIds).map(async (dId) => {
          try {
            const [dossierSnap, photosSnap] = await Promise.all([
              getDoc(doc(db, 'dossiers', dId)),
              getDocs(collection(db, 'dossiers', dId, 'photos')),
            ]);
            const photos: Record<PhotoCategory, boolean> = { avant: false, en_cours: false, apres: false };
            photosSnap.forEach(pDoc => {
              const cat = (pDoc.data().category as PhotoCategory) || 'avant';
              if (cat in photos) photos[cat] = true;
            });
            const d: any = dossierSnap.exists() ? dossierSnap.data() : {};
            dossierData[dId] = {
              refExpert: d.refExpert || dId,
              assureNom: `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim(),
              compagnie: d.compagnie || '',
              expertRank: d.expertRank || '',
              nature: d.nature || '',
              statut: d.statut || '',
              photos,
            };
          } catch { /* ignore */ }
        })
      );
      items.forEach(item => {
        const dd = dossierData[item.dossierId];
        if (!dd) return;
        if (!item.dossierNom) item.dossierNom = dd.refExpert;
        item.assureNom = item.assureNom || dd.assureNom;
        item.compagnie = item.compagnie || dd.compagnie;
        item.expertRank = item.expertRank || dd.expertRank;
        item.nature = item.nature || dd.nature;
        item.statut = dd.statut;
        item.hasPhotosForMission = dd.photos[missionToCategory(item.typeMission)];
      });

      // ATG users only see their own assignments
      if (profile?.role === 'Agent de Terrain' && profile?.nom) {
        const myName = profile.nom.toLowerCase().trim();
        setPlanifications(items.filter(p => p.agentTerrain.toLowerCase().trim() === myName));
      } else {
        setPlanifications(items);
      }
      setLoading(false);
    }, (error) => { console.error('Planifications query error:', error); setLoading(false); });
    return () => unsub();
  }, [db, profile?.role, profile?.nom]);

  // Keep a sorted, stable string key of unique dossierIds so the realtime-listener
  // effect only re-subscribes when the actual set of dossiers changes.
  const dossierIdsKey = useMemo(() => {
    const ids = Array.from(new Set(planifications.map(p => p.dossierId).filter(Boolean))).sort();
    return ids.join('|');
  }, [planifications]);

  // Realtime listeners: dossier doc (for statut) + photos subcollection (for
  // per-category upload state). Rebuilt whenever the set of dossierIds changes.
  useEffect(() => {
    if (!db || !dossierIdsKey) return;
    const ids = dossierIdsKey.split('|').filter(Boolean);
    const unsubs: (() => void)[] = [];
    ids.forEach(dId => {
      const u1 = onSnapshot(doc(db, 'dossiers', dId), (snap) => {
        const data: any = snap.exists() ? snap.data() : {};
        setDossierLive(prev => ({
          ...prev,
          [dId]: {
            statut: data.statut || '',
            photos: prev[dId]?.photos || { avant: false, en_cours: false, apres: false },
          },
        }));
      });
      const u2 = onSnapshot(collection(db, 'dossiers', dId, 'photos'), (snap) => {
        const photos: Record<PhotoCategory, boolean> = { avant: false, en_cours: false, apres: false };
        snap.forEach(pDoc => {
          const cat = (pDoc.data().category as PhotoCategory) || 'avant';
          if (cat in photos) photos[cat] = true;
        });
        setDossierLive(prev => ({
          ...prev,
          [dId]: {
            statut: prev[dId]?.statut || '',
            photos,
          },
        }));
      });
      unsubs.push(u1, u2);
    });
    return () => { unsubs.forEach(u => u()); };
  }, [db, dossierIdsKey]);

  const countByType = useMemo(() => {
    const counts: Record<string, number> = { 'Avant': 0, 'En cours': 0, 'Après': 0 };
    planifications.forEach(p => {
      const type = normalizeType(p.typeMission);
      if (counts[type] !== undefined) counts[type]++;
    });
    return counts;
  }, [planifications]);

  // Build filter options from loaded data
  // Base set for filter-option counts: planifications of the active mission tab
  // (Avant / En cours / Après). Counts reflect the current tab view so
  // switching tab updates the numbers in the dropdowns.
  const tabScopedPlans = useMemo(
    () => planifications.filter(p => normalizeType(p.typeMission) === activeTab),
    [planifications, activeTab]
  );

  const compagnieOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    tabScopedPlans.forEach(p => {
      const comp = (p.compagnie || '').trim();
      if (comp) counts[comp] = (counts[comp] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [tabScopedPlans]);

  const agentOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    tabScopedPlans.forEach(p => {
      const name = (p.agentTerrain || '').trim();
      if (name && name !== '-') counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [tabScopedPlans]);

  const filteredPlanifications = useMemo(() => {
    let results = planifications.filter(p => normalizeType(p.typeMission) === activeTab);
    if (compagnieFilter !== 'Toutes') {
      results = results.filter(p => (p.compagnie || '').trim() === compagnieFilter);
    }
    if (agentFilter !== 'Tous') {
      results = results.filter(p => (p.agentTerrain || '').trim() === agentFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      results = results.filter(p => {
        const raw = p.dateRDV || p.createdAt;
        if (!raw) return false;
        const date = raw.toDate ? raw.toDate() : new Date(raw);
        return date >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(p => {
        const raw = p.dateRDV || p.createdAt;
        if (!raw) return false;
        const date = raw.toDate ? raw.toDate() : new Date(raw);
        return date <= to;
      });
    }
    return results;
  }, [planifications, activeTab, compagnieFilter, agentFilter, dateFrom, dateTo]);

  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(addDays(new Date(), 1));

    const getRdvDate = (p: PlanificationItem) => {
      if (!p.dateRDV) return null;
      return p.dateRDV.toDate ? p.dateRDV.toDate() : new Date(p.dateRDV);
    };

    const todayGroup = filteredPlanifications.filter(p => {
      const rdv = getRdvDate(p);
      if (!rdv) return false;
      return rdv >= today && rdv < tomorrow;
    });
    const expiredGroup = filteredPlanifications.filter(p => {
      const rdv = getRdvDate(p);
      if (!rdv) return true;
      return rdv < today;
    });
    const futureGroup = filteredPlanifications.filter(p => {
      const rdv = getRdvDate(p);
      if (!rdv) return false;
      return rdv >= tomorrow;
    });

    return [
      { key: 'today' as const, label: "Aujourd'hui", items: todayGroup, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
      { key: 'expired' as const, label: 'En retard', items: expiredGroup, color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
      { key: 'future' as const, label: 'À venir', items: futureGroup, color: 'bg-muted text-muted-foreground' },
    ];
  }, [filteredPlanifications]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ today: true, expired: true, future: true });

  // Per-section deadline sort. Each group ("today" / "expired" / "future") has
  // its own independent sort direction, so sorting one section does not affect
  // the others. asc → furthest from 24h deadline first; desc → closest/most overdue first.
  type GroupKey = 'today' | 'expired' | 'future';
  const [deadlineSortByGroup, setDeadlineSortByGroup] = useState<Record<GroupKey, SortDirection>>({
    today: null,
    expired: null,
    future: null,
  });

  const urgencyRatio = (p: PlanificationItem, dir: SortDirection): number => {
    const ref: any = p.dateRDV || p.createdAt;
    if (!ref) return dir === 'asc' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    const rdv = ref.toDate ? ref.toDate() : new Date(ref);
    const start = new Date(rdv);
    if (p.dateRDV) start.setHours(8, 0, 0, 0);
    const totalMs = DEADLINE_HOURS * 60 * 60 * 1000;
    return (Date.now() - start.getTime()) / totalMs;
  };

  const sortGroupItems = (items: PlanificationItem[], dir: SortDirection): PlanificationItem[] => {
    if (!dir) return items;
    return [...items].sort((a, b) => {
      const diff = urgencyRatio(a, dir) - urgencyRatio(b, dir);
      return dir === 'asc' ? diff : -diff;
    });
  };

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy HH:mm", { locale: fr }); }
    catch { return '-'; }
  };

  const isATG = profile?.role === 'Agent de Terrain';
  const canSeeNameFilter = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const showAgentColumn = !isATG;
  const colCount = showAgentColumn ? 9 : 8;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <UserCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Assignations Agent de Terrain</h1>
          <Badge variant="secondary" className="ml-2">{filteredPlanifications.length}</Badge>
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
              <Select value={agentFilter} onValueChange={v => setFilters({ agentFilter: v })}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous les agents</SelectItem>
                  {agentOptions.map(([name, count]) => (
                    <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agentFilter !== 'Tous' && (
                <button onClick={() => clearFilter('agentFilter')} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 z-10">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )}
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
        </div>
      </div>

      {/* Mission type tabs */}
      <div className="bg-card border rounded-xl shadow-sm sticky top-0 z-20">
        <div className="flex overflow-x-auto no-scrollbar">
          {MISSION_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilters({ activeTab: tab.id })}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {tab.label}
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="text-[10px] font-mono ml-1 h-5 min-w-[20px] justify-center"
                >
                  {countByType[tab.id] || 0}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="text-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      ) : filteredPlanifications.length === 0 ? (
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="text-center py-12 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
            Aucune planification {activeTab.toLowerCase()} trouvée.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(() => {
            const renderTableHeader = (groupKey: GroupKey) => (
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold text-xs">Dossier</TableHead>
                  <TableHead className="font-bold text-xs">Assuré</TableHead>
                  <TableHead className="font-bold text-xs">Compagnie</TableHead>
                  {showAgentColumn && <TableHead className="font-bold text-xs">Agent</TableHead>}
                  <TableHead className="font-bold text-xs">Date RDV</TableHead>
                  <TableHead className="font-bold text-xs">Zone</TableHead>
                  <TableHead className="font-bold text-xs">
                    <SortableHeader
                      label="Délai"
                      sort={deadlineSortByGroup[groupKey]}
                      onChange={(next) => setDeadlineSortByGroup(prev => ({ ...prev, [groupKey]: next }))}
                    />
                  </TableHead>
                  <TableHead className="font-bold text-xs">Créé le</TableHead>
                  <TableHead className="font-bold text-xs">Assigné par</TableHead>
                </TableRow>
              </TableHeader>
            );
            const renderRow = (p: PlanificationItem) => (
              <TableRow
                key={`${p.dossierId}-${p.id}`}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/assignations-atg/${p.dossierId}`)}
              >
                <TableCell>
                  <span className="font-semibold text-sm text-primary">{p.dossierNom || p.dossierId}</span>
                </TableCell>
                <TableCell className="text-xs">{p.assureNom || '-'}</TableCell>
                <TableCell className="text-xs">{p.compagnie || '-'}</TableCell>
                {showAgentColumn && <TableCell className="font-medium text-sm">{p.agentTerrain}</TableCell>}
                <TableCell className="text-xs text-muted-foreground">{formatDate(p.dateRDV)}</TableCell>
                <TableCell>
                  {p.zone ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> {p.zone}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {(() => {
                    const live = dossierLive[p.dossierId];
                    const statut = live?.statut ?? p.statut ?? '';
                    // Completion is driven by the status set in "Décision de statut".
                    // Works uniformly across all deadline states (à venir, aujourd'hui, en retard).
                    const completed = !!statut && AGENT_TERRAIN_STATUS_SET.has(statut);
                    return (
                      <DeadlineBar
                        dateRDV={p.dateRDV}
                        createdAt={p.createdAt}
                        completed={completed}
                        completedStatus={statut}
                      />
                    );
                  })()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.modifiedByName || '-'}</TableCell>
              </TableRow>
            );

            return groups.filter(g => g.items.length > 0).map((group) => (
              <Collapsible
                key={group.key}
                open={openSections[group.key]}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [group.key]: open }))}
              >
                <Card className="shadow-sm overflow-hidden">
                  <CollapsibleTrigger className={cn(
                    'flex items-center justify-between w-full px-4 py-3 transition-colors hover:opacity-80',
                    group.color
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{group.label}</span>
                      <Badge variant="secondary" className="text-[10px] font-mono h-5 min-w-[20px] justify-center">
                        {group.items.length}
                      </Badge>
                    </div>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform',
                      openSections[group.key] ? 'rotate-0' : '-rotate-90'
                    )} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      <Table>
                        {renderTableHeader(group.key)}
                        <TableBody>
                          {sortGroupItems(group.items, deadlineSortByGroup[group.key]).map(renderRow)}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function normalizeType(type: string): string {
  if (type === 'Apres' || type === 'Après') return 'Après';
  if (type === 'En cours') return 'En cours';
  if (type === 'Avant') return 'Avant';
  return type;
}
