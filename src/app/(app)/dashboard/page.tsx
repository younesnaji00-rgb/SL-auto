'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  AlertCircle,
  User as UserIcon,
  Activity,
  Inbox,
  Filter,
  X,
  FolderOpen,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { collection, onSnapshot, query, orderBy, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, differenceInDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart } from 'recharts';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { statuses as ALL_STATUSES } from '@/lib/dossiers-data';
import { useCurrentUser } from '@/hooks/use-current-user';
import { DatePicker } from '@/components/ui/date-picker';

/** Animated number that counts from 0 to `end` over `duration` ms */
function CountUp({ end, duration = 600 }: { end: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (end === 0) { setValue(0); return; }
    startRef.current = performance.now();
    const step = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration]);

  return <>{value}</>;
}

export default function DashboardPage() {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Changements panel 1 filters
  const [changements1DateFilter, setChangements1DateFilter] = useState('');
  const [changements1UserFilter, setChangements1UserFilter] = useState('all');
  const [changements1ActionFilter, setChangements1ActionFilter] = useState<string>('all');

  // Changements panel 2 filters
  const [changements2DateFilter, setChangements2DateFilter] = useState('');
  const [changements2UserFilter, setChangements2UserFilter] = useState('all');
  const [changements2ActionFilter, setChangements2ActionFilter] = useState<string>('statut');

  // Deadline card drill-down
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<number | null>(null);

  // Volume par statut — selected status filter
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [dossierTableView, setDossierTableView] = useState<'statut' | 'recents'>('statut');

  // Track last visit for "new" entry indicators
  const lastVisitRef = useRef<Date | null>(null);
  const [lastVisitLoaded, setLastVisitLoaded] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    const key = `dashboard_last_visit_${profile.uid}`;
    const stored = localStorage.getItem(key);
    if (stored) lastVisitRef.current = new Date(stored);
    setLastVisitLoaded(true);
    return () => { localStorage.setItem(key, new Date().toISOString()); };
  }, [profile?.uid]);

  useEffect(() => {
    if (!db) return;

    const userCompagnies = profile?.compagnies || [];
    const allowedLower = userCompagnies.map((c: string) => c.toLowerCase().trim());

    const qDossiers = query(collection(db, 'dossiers'), orderBy('createdAt', 'desc'));
    const unsubDossiers = onSnapshot(qDossiers, (snap) => {
      let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (allowedLower.length > 0) {
        data = data.filter((d: any) => allowedLower.includes((d.compagnie || '').toLowerCase().trim()));
      }
      setDossiers(data);
      setLoading(false);
    }, (error) => {
      console.error("Dashboard dossier sync error:", error);
      setLoading(false);
    });

    const qWorkflow = query(
      collectionGroup(db, 'workflow'),
      orderBy('date', 'desc')
    );
    const unsubWorkflow = onSnapshot(qWorkflow, (snap) => {
      const logs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        _dossierId: d.ref.parent.parent?.id || '',
      }));
      setWorkflowLogs(logs);
    }, (error) => {
      console.warn("Workflow group sync error:", error);
    });

    return () => {
      unsubDossiers();
      unsubWorkflow();
    };
  }, [db, profile]);

  // Deadline tracking
  const now = new Date();
  const getAgeDays = (d: any) => {
    if (!d.createdAt) return -1;
    const created = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
    return differenceInDays(now, created);
  };
  const CLOTURE_STATUSES = ['Cloture', 'Clôture', 'Dossier signé', 'Rapport Validé', 'Mission annulée'];
  const activeDossiers = dossiers.filter((d) => !CLOTURE_STATUSES.includes(d.statut));
  const jourZeroCount = activeDossiers.filter((d) => getAgeDays(d) === 0).length;
  const jourUnCount = activeDossiers.filter((d) => getAgeDays(d) === 1).length;
  const jourDeuxCount = activeDossiers.filter((d) => getAgeDays(d) === 2).length;
  const jourTroisCount = activeDossiers.filter((d) => getAgeDays(d) >= 3).length;

  const filteredByAgeDossiers = useMemo(() => {
    if (selectedAgeFilter === null) return [];
    return activeDossiers.filter((d) => {
      const age = getAgeDays(d);
      if (selectedAgeFilter === 3) return age >= 3;
      return age === selectedAgeFilter;
    });
  }, [selectedAgeFilter, activeDossiers]);

  // Unique users for changements filter
  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    workflowLogs.forEach((log) => users.add(log.user || 'Admin'));
    return Array.from(users).sort();
  }, [workflowLogs]);

  // Dossier lookup map
  const dossierMap = useMemo(() => {
    const map: Record<string, any> = {};
    dossiers.forEach((d) => { map[d.id] = d; });
    return map;
  }, [dossiers]);

  // Shared filter helper for changements panels
  const filterChangements = (actionFilter: string, dateFilter: string, userFilter: string) => {
    let filtered = workflowLogs;

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => {
        const action = (log.action || '').toLowerCase();
        if (actionFilter === 'statut') return action.includes('statut') || action.includes('décision');
        if (actionFilter === 'creation') return action.includes('création') || action.includes('creation');
        if (actionFilter === 'planification') return action.includes('planification');
        if (actionFilter === 'chiffrage') return action.includes('chiffrage');
        if (actionFilter === 'document') return action.includes('document') || action.includes('photo') || action.includes('rapport');
        if (actionFilter === 'atg') return action.includes('atg');
        if (actionFilter === 'reclamation') return action.includes('réclamation') || action.includes('reclamation');
        return true;
      });
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const dayStart = startOfDay(filterDate);
      const dayEnd = endOfDay(filterDate);
      filtered = filtered.filter((log) => {
        if (!log.date) return false;
        const logDate = log.date.toDate ? log.date.toDate() : new Date(log.date);
        return isWithinInterval(logDate, { start: dayStart, end: dayEnd });
      });
    }

    if (userFilter && userFilter !== 'all') {
      filtered = filtered.filter((log) => (log.user || 'Admin') === userFilter);
    }

    return filtered;
  };

  const filteredLogs1 = useMemo(() => filterChangements(changements1ActionFilter, changements1DateFilter, changements1UserFilter), [workflowLogs, changements1ActionFilter, changements1DateFilter, changements1UserFilter]);
  const filteredLogs2 = useMemo(() => filterChangements(changements2ActionFilter, changements2DateFilter, changements2UserFilter), [workflowLogs, changements2ActionFilter, changements2DateFilter, changements2UserFilter]);

  const actionFilterLabels: Record<string, string> = {
    all: 'Tous',
    statut: 'Statut',
    creation: 'Création',
    planification: 'Planification',
    chiffrage: 'Chiffrage',
    document: 'Documents / Photos',
    atg: 'ATG',
    reclamation: 'Réclamations',
  };

  // Volume par Statut — per-status counts for bar chart
  const chartColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const statusBarData = useMemo(() => {
    const counts: Record<string, number> = {};
    dossiers.forEach((d) => {
      const s = d.statut || 'Nouveau';
      counts[s] = (counts[s] || 0) + 1;
    });
    // Build a complete list: all known statuses + any extra from dossiers
    const allNames = new Set([...ALL_STATUSES, 'Nouveau', 'Assigné au chiffrage', 'Rapport Validé']);
    Object.keys(counts).forEach((s) => allNames.add(s));
    return Array.from(allNames)
      .map((name) => ({ name, value: counts[name] || 0 }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .map((item, i) => ({
        ...item,
        fill: chartColors[i % chartColors.length],
      }));
  }, [dossiers]);

  // Only non-zero statuses for the pie chart
  const statusChartData = useMemo(() => {
    return statusBarData.filter((item) => item.value > 0);
  }, [statusBarData]);

  const statusBarConfig = useMemo(() => {
    const config: any = { value: { label: 'Dossiers' } };
    statusChartData.forEach((item, index) => {
      config[item.name] = { label: item.name, color: chartColors[index % chartColors.length] };
    });
    return config;
  }, [statusChartData]);

  // Default to first status when data loads
  useEffect(() => {
    if (statusBarData.length > 0 && selectedStatus === null) {
      setSelectedStatus(statusBarData[0].name);
    }
  }, [statusBarData]);

  // Dossiers filtered by selected status
  const dossiersByStatus = useMemo(() => {
    if (!selectedStatus) return [];
    return dossiers.filter((d) => (d.statut || 'Nouveau') === selectedStatus);
  }, [dossiers, selectedStatus]);

  // Repartition par Compagnie
  const compagnieData = useMemo(() => {
    const byCompagnie: Record<string, number> = {};
    dossiers.forEach((d) => {
      const key = d.compagnie || 'Inconnue';
      byCompagnie[key] = (byCompagnie[key] || 0) + 1;
    });
    return Object.entries(byCompagnie)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        fill: chartColors[index % chartColors.length],
      }));
  }, [dossiers]);

  const barChartConfig = useMemo(() => {
    const config: any = { value: { label: 'Dossiers' } };
    compagnieData.forEach((item, index) => {
      config[item.name] = { label: item.name, color: chartColors[index % chartColors.length] };
    });
    return config;
  }, [compagnieData]);

  // Status badge styles are imported from @/lib/status-colors

  const renderAssure = (assure: any) => {
    if (!assure) return '-';
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || '-';
  };

  const formatDate = (val: any) => {
    if (!val) return '-';
    const date = val.toDate ? val.toDate() : new Date(val);
    try { return format(date, 'dd/MM HH:mm', { locale: fr }); }
    catch { return '-'; }
  };

  const isNewLog = (log: any) => {
    if (!lastVisitRef.current || !log.date) return false;
    const logDate = log.date.toDate ? log.date.toDate() : new Date(log.date);
    return logDate > lastVisitRef.current;
  };

  const handleCardClick = (age: number) => {
    setSelectedAgeFilter(prev => prev === age ? null : age);
  };

  const ageFilterLabel = selectedAgeFilter === null ? '' :
    selectedAgeFilter === 0 ? "Aujourd'hui" :
    selectedAgeFilter === 1 ? "Il y a 1 jour" :
    selectedAgeFilter === 2 ? "Il y a 2 jours" :
    "Il y a 3 jours ou plus";

  if (loading) {
    return (
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />
          <div className="h-7 w-40 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 space-y-3 bg-card">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-6 bg-card space-y-4">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-[200px] w-full animate-pulse rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderChangementsPanel = (
    panelKey: string,
    logs: any[],
    actionFilter: string, setActionFilter: (v: string) => void,
    dateFilter: string, setDateFilter: (v: string) => void,
    userFilter: string, setUserFilter: (v: string) => void,
  ) => (
    <Card className="shadow-sm border-0 h-fit hover:shadow-md transition-shadow rounded-xl opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: panelKey === '1' ? '100ms' : '200ms' }}>
      <CardHeader className="bg-heading-bg py-3 rounded-t-xl">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span>Changements recents <span className="text-muted-foreground font-normal">/ {actionFilterLabels[actionFilter]}</span></span>
          <Badge variant="secondary" className="ml-1 text-[10px]">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <div className="px-3 pt-3 pb-2 bg-muted/10">
        <div className="grid grid-cols-3 gap-1.5">
          <DatePicker
            value={dateFilter ? new Date(dateFilter) : null}
            onChange={(date) => {
              if (date) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                setDateFilter(`${yyyy}-${mm}-${dd}`);
              } else {
                setDateFilter('');
              }
            }}
            placeholder="Filtrer par date"
            className="h-8 text-xs"
          />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Type de changement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les changements</SelectItem>
              <SelectItem value="statut">Changements de statut</SelectItem>
              <SelectItem value="creation">Création de dossier</SelectItem>
              <SelectItem value="planification">Planification</SelectItem>
              <SelectItem value="chiffrage">Chiffrage</SelectItem>
              <SelectItem value="document">Documents / Photos / Rapports</SelectItem>
              <SelectItem value="atg">ATG</SelectItem>
              <SelectItem value="reclamation">Réclamations</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tous les utilisateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={`${panelKey}-${user}`} value={user}>{user}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(dateFilter || userFilter !== 'all' || actionFilter !== 'all') && (
          <div className="flex justify-end mt-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => {
                setDateFilter('');
                setUserFilter('all');
                setActionFilter('all');
              }}
            >
              <X className="h-3 w-3 mr-1" /> Reinitialiser
            </Button>
          </div>
        )}
      </div>
      <CardContent className="pt-3">
        <div className="space-y-5 max-h-[500px] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-xs italic">Aucune activite recente.</p>
            </div>
          ) : (
            logs.map((log: any, logIndex: number) => {
              const dossier = dossierMap[log._dossierId];
              const dossierLabel = log.dossierRef || dossier?.refExpert || '';
              const isNew = isNewLog(log);
              return (
                <div key={`${panelKey}-${log.id}`} className={cn(
                  "relative pl-5 pb-5 last:pb-0 border-l border-muted ml-2 opacity-0 animate-slide-in-down [animation-fill-mode:forwards]",
                  isNew && "bg-green-50/50 dark:bg-green-950/10 rounded-lg p-2 -ml-0.5 border-l-green-300 dark:border-l-green-700"
                )} style={{ animationDelay: `${logIndex * 40}ms` }}>
                  <div className={cn(
                    "absolute top-1 w-3 h-3 rounded-full ring-4 ring-background",
                    isNew ? "-left-1" : "-left-1.5",
                    log.status === 'done' ? "bg-green-500" : "bg-orange-500"
                  )} />
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
                        {isNew && (
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-500 text-white shrink-0">
                            <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                          </span>
                        )}
                        {log.action}
                      </p>
                      <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap ml-2 bg-muted px-1.5 py-0.5 rounded">
                        {formatDate(log.date)}
                      </span>
                    </div>
                    {dossierLabel && (
                      <div className="flex items-center gap-1.5 text-[10px] text-primary">
                        <FolderOpen className="h-2.5 w-2.5" />
                        <span className="font-semibold">{dossierLabel}</span>
                      </div>
                    )}
                    {log.details && (
                      <p className="text-[10px] text-muted-foreground italic leading-snug">{log.details}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <UserIcon className="h-2.5 w-2.5" />
                      <span>par <span className="font-bold text-foreground">{log.user || 'Admin'}</span></span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-6">
      {/* Deadline Tracking Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card
          className={cn(
            "shadow-sm transition-all hover:shadow-md bg-blue-50 dark:bg-blue-950/30 cursor-pointer opacity-0 animate-fade-in-up [animation-fill-mode:forwards] rounded-xl",
            selectedAgeFilter === 0 && "ring-2 ring-blue-400 shadow-md"
          )}
          style={{ animationDelay: '0ms' }}
          onClick={() => handleCardClick(0)}
        >
          <CardHeader className="bg-transparent flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Aujourd&apos;hui</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700 dark:text-blue-400"><CountUp end={jourZeroCount} /></div>
            <p className="text-xs text-blue-600/70 dark:text-blue-500/70 mt-1">Delai restant : 3 jours</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "shadow-sm transition-all hover:shadow-md bg-green-50 dark:bg-green-950/30 cursor-pointer opacity-0 animate-fade-in-up [animation-fill-mode:forwards] rounded-xl",
            selectedAgeFilter === 1 && "ring-2 ring-green-500 shadow-md"
          )}
          style={{ animationDelay: '75ms' }}
          onClick={() => handleCardClick(1)}
        >
          <CardHeader className="bg-transparent flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Il y a 1 jour</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700 dark:text-green-400"><CountUp end={jourUnCount} /></div>
            <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-1">Delai restant : 2 jours</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "shadow-sm transition-all hover:shadow-md bg-orange-50 dark:bg-orange-950/30 cursor-pointer opacity-0 animate-fade-in-up [animation-fill-mode:forwards] rounded-xl",
            selectedAgeFilter === 2 && "ring-2 ring-orange-500 shadow-md"
          )}
          style={{ animationDelay: '150ms' }}
          onClick={() => handleCardClick(2)}
        >
          <CardHeader className="bg-transparent flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase">Il y a 2 jours</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700 dark:text-orange-400"><CountUp end={jourDeuxCount} /></div>
            <p className="text-xs text-orange-600/70 dark:text-orange-500/70 mt-1">Delai restant : 1 jour</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "shadow-sm transition-all hover:shadow-md bg-red-50 dark:bg-red-950/30 cursor-pointer opacity-0 animate-fade-in-up [animation-fill-mode:forwards] rounded-xl",
            selectedAgeFilter === 3 && "ring-2 ring-red-500 shadow-md"
          )}
          style={{ animationDelay: '225ms' }}
          onClick={() => handleCardClick(3)}
        >
          <CardHeader className="bg-transparent flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">Il y a 3 jours ou plus</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-700 dark:text-red-400"><CountUp end={jourTroisCount} /></div>
            <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-1">Delai expire !</p>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down: dossiers for selected age card */}
      {selectedAgeFilter !== null && (
        <Card className="shadow-sm overflow-hidden border-0 rounded-xl animate-scale-in">
          <CardHeader className="bg-heading-bg py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Dossiers : {ageFilterLabel}
              <Badge variant="secondary" className="ml-2">{filteredByAgeDossiers.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setSelectedAgeFilter(null)} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 border-0">
                  <TableHead className="font-bold text-xs">Ref.</TableHead>
                  <TableHead className="font-bold text-xs">Assure</TableHead>
                  <TableHead className="font-bold text-xs">Compagnie</TableHead>
                  <TableHead className="font-bold text-xs">Nature</TableHead>
                  <TableHead className="font-bold text-xs">Matricule</TableHead>
                  <TableHead className="font-bold text-xs">Statut</TableHead>
                  <TableHead className="text-right font-bold text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredByAgeDossiers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                      Aucun dossier dans cette categorie.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredByAgeDossiers.map((dossier, i) => (
                    <TableRow key={dossier.id} className="group hover:bg-muted/50 transition-colors opacity-0 animate-row-fade [animation-fill-mode:forwards]" style={{ animationDelay: `${i * 30}ms` }}>
                      <TableCell>
                        <Link href={`/dossiers/${dossier.id}`} className="font-mono text-xs font-bold text-primary hover:underline">
                          {dossier.refExpert || 'N/A'}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs font-medium">{renderAssure(dossier.assure)}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{dossier.compagnie || '-'}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{dossier.nature || '-'}</TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{dossier.matricule || '-'}</TableCell>
                      <TableCell>
                        <div className="inline-flex w-auto whitespace-nowrap">
                          <Badge variant="outline" className={cn("text-[10px] py-0.5 px-2 rounded-full border font-semibold", getStatusBadgeStyles(dossier.statut))}>
                            {dossier.statut || 'Nouveau'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-[10px] text-muted-foreground font-medium">
                        {formatDate(dossier.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pie Chart (Volume par Statut) + Dossiers Table */}
      <div className="grid gap-6 lg:grid-cols-5 items-start">
        {/* Pie Chart — Volume par Statut (left) */}
        <Card className="lg:col-span-2 shadow-sm h-fit hover:shadow-md transition-shadow border-0 rounded-xl opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: '100ms' }}>
          <CardHeader className="bg-heading-bg py-3 rounded-t-xl">
            <CardTitle className="text-base">Volume par Statut</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {statusChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-10">Aucune donnee.</p>
            ) : (
              <>
                <ChartContainer config={statusBarConfig} className="mx-auto aspect-square max-h-[280px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={0}
                      strokeWidth={0}
                      isAnimationActive={true}
                      animationBegin={100}
                      animationDuration={800}
                      animationEasing="ease-out"
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        const RADIAN = Math.PI / 180;
                        const total = statusChartData.reduce((sum, d) => sum + d.value, 0);
                        const pct = `${(percent * 100).toFixed(0)}%`;
                        // Place label outside slice with a line if many slices, inside otherwise
                        const radius = statusChartData.length > 4
                          ? outerRadius + 24
                          : outerRadius * 0.55;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill={statusChartData.length > 4 ? statusChartData[index].fill : '#fff'}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={12}
                            fontWeight={600}
                          >
                            {pct}
                          </text>
                        );
                      }}
                      labelLine={statusChartData.length > 4}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[10px]">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Combined dossiers table (right) */}
        <Card className="lg:col-span-3 shadow-sm overflow-hidden h-fit hover:shadow-md transition-shadow border-0 rounded-xl opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: '200ms' }}>
          <CardHeader className="bg-heading-bg py-3 rounded-t-xl flex flex-row items-center justify-between">
            <CardTitle className="text-base">Dossiers</CardTitle>
            <div className="flex items-center gap-2 bg-muted rounded-full p-0.5">
              <button
                onClick={() => setDossierTableView('statut')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-full transition-all",
                  dossierTableView === 'statut'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Par statut
              </button>
              <button
                onClick={() => setDossierTableView('recents')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-full transition-all",
                  dossierTableView === 'recents'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Recents
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {dossierTableView === 'statut' ? (
              <>
                <div className="overflow-x-auto scrollbar-thin pb-1">
                  <div className="grid grid-rows-2 grid-flow-col gap-1 w-max">
                    {statusBarData.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => setSelectedStatus(prev => prev === item.name ? null : item.name)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap",
                          selectedStatus === item.name
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {item.name} ({item.value})
                      </button>
                    ))}
                  </div>
                </div>
                {selectedStatus ? (
                  <div className="rounded-lg overflow-hidden max-h-[400px] overflow-y-auto bg-muted/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 border-0">
                          <TableHead className="font-bold text-xs">Ref.</TableHead>
                          <TableHead className="font-bold text-xs">Assure</TableHead>
                          <TableHead className="font-bold text-xs">Compagnie</TableHead>
                          <TableHead className="font-bold text-xs">Nature</TableHead>
                          <TableHead className="font-bold text-xs">Matricule</TableHead>
                          <TableHead className="font-bold text-xs">Statut</TableHead>
                          <TableHead className="text-right font-bold text-xs">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dossiersByStatus.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                              Aucun dossier avec ce statut.
                            </TableCell>
                          </TableRow>
                        ) : (
                          dossiersByStatus.map((dossier, i) => (
                            <TableRow key={dossier.id} className="group hover:bg-muted/50 transition-colors opacity-0 animate-row-fade [animation-fill-mode:forwards]" style={{ animationDelay: `${i * 30}ms` }}>
                              <TableCell>
                                <Link href={`/dossiers/${dossier.id}`} className="font-mono text-xs font-bold text-primary hover:underline">
                                  {dossier.refExpert || 'N/A'}
                                </Link>
                              </TableCell>
                              <TableCell className="max-w-[120px] truncate text-xs font-medium">{renderAssure(dossier.assure)}</TableCell>
                              <TableCell className="text-[10px] text-muted-foreground">{dossier.compagnie || '-'}</TableCell>
                              <TableCell className="text-[10px] text-muted-foreground">{dossier.nature || '-'}</TableCell>
                              <TableCell className="font-mono text-[10px] text-muted-foreground">{dossier.matricule || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("text-[10px] py-0.5 px-2 rounded-full border font-semibold", getStatusBadgeStyles(dossier.statut))}>
                                  {dossier.statut || 'Nouveau'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-[10px] text-muted-foreground font-medium">
                                {formatDate(dossier.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <p className="text-xs italic">Cliquez sur un statut pour voir les dossiers.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg overflow-hidden max-h-[400px] overflow-y-auto bg-muted/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-0">
                      <TableHead className="font-bold text-xs">Ref.</TableHead>
                      <TableHead className="font-bold text-xs">Assure</TableHead>
                      <TableHead className="font-bold text-xs">Compagnie</TableHead>
                      <TableHead className="font-bold text-xs">Nature</TableHead>
                      <TableHead className="font-bold text-xs">Matricule</TableHead>
                      <TableHead className="font-bold text-xs">Statut</TableHead>
                      <TableHead className="text-right font-bold text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossiers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                          Aucun dossier trouve.
                        </TableCell>
                      </TableRow>
                    ) : (
                      dossiers.slice(0, 15).map((dossier, i) => (
                        <TableRow key={dossier.id} className="group hover:bg-muted/50 transition-colors opacity-0 animate-row-fade [animation-fill-mode:forwards]" style={{ animationDelay: `${i * 30}ms` }}>
                          <TableCell>
                            <Link href={`/dossiers/${dossier.id}`} className="font-mono text-xs font-bold text-primary hover:underline">
                              {dossier.refExpert || 'N/A'}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate text-xs font-medium">{renderAssure(dossier.assure)}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{dossier.compagnie || '-'}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{dossier.nature || '-'}</TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground">{dossier.matricule || '-'}</TableCell>
                          <TableCell>
                            <div className="inline-flex w-auto whitespace-nowrap">
                              <Badge variant="outline" className={cn("text-[10px] py-0.5 px-2 rounded-full border font-semibold", getStatusBadgeStyles(dossier.statut))}>
                                {dossier.statut || 'Nouveau'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-[10px] text-muted-foreground font-medium">
                            {formatDate(dossier.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CHANGEMENTS RECENTS (2 panels) + Repartition par Compagnie */}
      <div className="grid gap-6 lg:grid-cols-3 items-start mb-10">
        {/* Panel 1 */}
        {renderChangementsPanel(
          '1', filteredLogs1,
          changements1ActionFilter, setChangements1ActionFilter,
          changements1DateFilter, setChangements1DateFilter,
          changements1UserFilter, setChangements1UserFilter,
        )}
        {/* Panel 2 */}
        {renderChangementsPanel(
          '2', filteredLogs2,
          changements2ActionFilter, setChangements2ActionFilter,
          changements2DateFilter, setChangements2DateFilter,
          changements2UserFilter, setChangements2UserFilter,
        )}
        {/* Repartition par Compagnie — horizontal bars */}
        <Card className="shadow-sm h-fit hover:shadow-md transition-shadow border-0 rounded-xl opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: '300ms' }}>
          <CardHeader className="bg-heading-bg py-3 rounded-t-xl">
            <CardTitle className="text-base">Repartition par Compagnie</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {compagnieData.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-10">Aucune donnee.</p>
            ) : (
              <ChartContainer config={barChartConfig} className="w-full" style={{ height: Math.max(compagnieData.length * 40, 150) }}>
                <BarChart
                  accessibilityLayer
                  data={compagnieData}
                  layout="vertical"
                  barCategoryGap={8}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    fontWeight={600}
                    width={100}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    fontSize={10}
                    allowDecimals={false}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} animationBegin={200} animationDuration={700} animationEasing="ease-out">
                    {compagnieData.map((entry, index) => (
                      <Cell key={`cell-comp-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
