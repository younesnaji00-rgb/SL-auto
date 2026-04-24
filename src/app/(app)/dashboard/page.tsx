'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  User as UserIcon,
  Activity,
  Inbox,
  X,
  FolderOpen,
  Plus,
  PieChart as PieChartIcon,
  BarChart3,
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
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard, SkeletonChart } from '@/components/ui/skeleton';
import { collection, onSnapshot, query, orderBy, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart } from 'recharts';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, getStatusHeaderStyles } from '@/lib/status-colors';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { statuses as ALL_STATUSES } from '@/lib/dossiers-data';
import { useCurrentUser } from '@/hooks/use-current-user';
import { DatePicker } from '@/components/ui/date-picker';

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
  const [changements1NatureFilter, setChangements1NatureFilter] = useState<string>('all');

  // Changements panel 2 filters
  const [changements2DateFilter, setChangements2DateFilter] = useState('');
  const [changements2UserFilter, setChangements2UserFilter] = useState('all');
  const [changements2ActionFilter, setChangements2ActionFilter] = useState<string>('statut');
  const [changements2NatureFilter, setChangements2NatureFilter] = useState<string>('all');

  // Volume par statut — selected status filter + search within the filter list
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusFilterSearch, setStatusFilterSearch] = useState('');

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

  // Unique natures for changements filter
  const uniqueNatures = useMemo(() => {
    const natures = new Set<string>();
    dossiers.forEach((d) => { if (d.nature) natures.add(d.nature); });
    return Array.from(natures).sort();
  }, [dossiers]);

  // Shared filter helper for changements panels
  const filterChangements = (actionFilter: string, dateFilter: string, userFilter: string, natureFilter: string) => {
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

    if (natureFilter && natureFilter !== 'all') {
      filtered = filtered.filter((log) => {
        const dossier = dossierMap[log._dossierId];
        return dossier?.nature === natureFilter;
      });
    }

    return filtered;
  };

  const filteredLogs1 = useMemo(() => filterChangements(changements1ActionFilter, changements1DateFilter, changements1UserFilter, changements1NatureFilter), [workflowLogs, changements1ActionFilter, changements1DateFilter, changements1UserFilter, changements1NatureFilter, dossierMap]);
  const filteredLogs2 = useMemo(() => filterChangements(changements2ActionFilter, changements2DateFilter, changements2UserFilter, changements2NatureFilter), [workflowLogs, changements2ActionFilter, changements2DateFilter, changements2UserFilter, changements2NatureFilter, dossierMap]);

  const actionFilterLabels: Record<string, string> = {
    all: 'Tous',
    statut: 'Statut',
    creation: 'Création',
    planification: 'Planification',
    chiffrage: 'Chiffrage',
    document: 'Documents / Photos',
    atg: 'Agent de Terrain',
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
    const allNames = new Set([...ALL_STATUSES, 'Nouveau']);
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

  if (loading) {
    return (
      <div className="flex-1 space-y-6">
        <div className="grid gap-6 lg:grid-cols-5">
          <SkeletonChart className="lg:col-span-2" />
          <SkeletonChart className="lg:col-span-3" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
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
    natureFilter: string, setNatureFilter: (v: string) => void,
  ) => (
    <Card className="shadow-sm border h-fit hover:shadow-md transition-shadow rounded-lg opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: panelKey === '1' ? '100ms' : '200ms' }}>
      <CardHeader className="py-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span>Changements récents <span className="text-muted-foreground font-normal">/ {actionFilterLabels[actionFilter]}</span></span>
          <Badge variant="secondary" className="ml-1 text-[10px] tabular-nums">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <div className="px-3 pt-0 pb-2 bg-muted/10">
        <div className="grid grid-cols-4 gap-1.5">
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
              <SelectItem value="creation">Création dossier</SelectItem>
              <SelectItem value="planification">Planification</SelectItem>
              <SelectItem value="chiffrage">Chiffrage</SelectItem>
              <SelectItem value="document">Documents / Photos / Rapports</SelectItem>
              <SelectItem value="atg">Agent de Terrain</SelectItem>
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
          <Select value={natureFilter} onValueChange={setNatureFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Toutes les natures" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les natures</SelectItem>
              {uniqueNatures.map((nature) => (
                <SelectItem key={`${panelKey}-nature-${nature}`} value={nature}>{nature}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(dateFilter || userFilter !== 'all' || actionFilter !== 'all' || natureFilter !== 'all') && (
          <div className="flex justify-end mt-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => {
                setDateFilter('');
                setUserFilter('all');
                setActionFilter('all');
                setNatureFilter('all');
              }}
            >
              <X className="h-3 w-3 mr-1" /> Réinitialiser
            </Button>
          </div>
        )}
      </div>
      <CardContent className="pt-3">
        <div className="space-y-5 max-h-[500px] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="Aucune activité récente"
              description="Les changements apparaîtront ici au fil de l'activité."
              dashed={false}
              className="border-0 bg-transparent py-6"
            />
          ) : (
            logs.map((log: any, logIndex: number) => {
              const dossier = dossierMap[log._dossierId];
              const dossierLabel = log.dossierRef || dossier?.refExpert || '';
              const isNew = isNewLog(log);
              return (
                <div key={`${panelKey}-${log.id}`} className={cn(
                  "relative pl-5 pb-5 last:pb-0 border-l border-muted ml-2 opacity-0 animate-slide-in-down [animation-fill-mode:forwards]",
                  isNew && "bg-[hsl(var(--primary)/0.05)] rounded-lg p-2 -ml-0.5 border-l-[hsl(var(--primary))]"
                )} style={{ animationDelay: `${logIndex * 40}ms` }}>
                  <div className={cn(
                    "absolute top-1 w-3 h-3 rounded-full ring-4 ring-background",
                    isNew ? "-left-1" : "-left-1.5",
                    log.status === 'done' ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                        {isNew && (
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground shrink-0">
                            <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                          </span>
                        )}
                        {log.action}
                      </p>
                      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap ml-2 bg-muted px-1.5 py-0.5 rounded tabular-nums">
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
                      <span>par <span className="font-semibold text-foreground">{log.user || 'Admin'}</span></span>
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

  // ── Sub-renders ─────────────────────────────────────────────────────
  const filteredStatusRows = statusBarData.filter((item) =>
    item.name.toLowerCase().includes(statusFilterSearch.toLowerCase().trim())
  );

  const filterCard = (
    <Card className="shadow-sm h-fit hover:shadow-md transition-shadow border rounded-lg overflow-hidden">
      <CardHeader className="py-4 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base text-primary">Dossier Par État</CardTitle>
        <div className="relative w-[180px] max-w-full">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={statusFilterSearch}
            onChange={(e) => setStatusFilterSearch(e.target.value)}
            className="h-8 pl-7 text-xs border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 max-h-[520px] overflow-y-auto">
        {filteredStatusRows.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title="Aucun statut"
            description="Affinez votre recherche pour voir les statuts."
            dashed={false}
            className="border-0 bg-transparent py-8"
          />
        ) : (
          filteredStatusRows.map((item, idx) => {
            const isSelected = selectedStatus === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setSelectedStatus((prev) => (prev === item.name ? null : item.name))}
                className={cn(
                  'flex items-center justify-between w-full px-4 py-3 text-sm transition-colors text-left',
                  idx !== filteredStatusRows.length - 1 && 'border-b',
                  isSelected ? 'bg-accent border-l-2 border-l-primary' : 'hover:bg-accent/50',
                  item.value === 0 && 'opacity-60',
                )}
              >
                <span className={cn('truncate', isSelected && 'font-semibold text-primary')}>{item.name}</span>
                <span className={cn('text-xs font-bold rounded-full px-2.5 py-0.5 shrink-0 tabular-nums', getStatusHeaderStyles(item.name))}>
                  {item.value}
                </span>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );

  const pieCard = (
    <Card className="shadow-sm h-fit hover:shadow-md transition-shadow border rounded-lg">
      <CardHeader className="py-4">
        <CardTitle className="text-base">Volume par Statut</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {statusChartData.length === 0 ? (
          <EmptyState
            icon={<PieChartIcon />}
            title="Aucune donnée"
            description="Les statistiques apparaîtront dès qu'un dossier sera créé."
            dashed={false}
            className="border-0 bg-transparent py-10"
          />
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
                    const pct = `${(percent * 100).toFixed(0)}%`;
                    const radius = statusChartData.length > 4 ? outerRadius + 24 : outerRadius * 0.55;
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
                  <span className="font-semibold tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const filteredTableCard = (
    <Card className="shadow-sm overflow-hidden h-fit hover:shadow-md transition-shadow border rounded-lg">
      <CardHeader className="py-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Dossiers — <span className="text-primary">{selectedStatus}</span>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setSelectedStatus(null)}>
          <X className="h-4 w-4 mr-1" /> Fermer
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="rounded-lg overflow-hidden max-h-[560px] overflow-y-auto bg-muted/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-0">
                <TableHead className="font-semibold text-xs">Ref.</TableHead>
                <TableHead className="font-semibold text-xs">Assuré</TableHead>
                <TableHead className="font-semibold text-xs">Compagnie</TableHead>
                <TableHead className="font-semibold text-xs">Nature du dossier</TableHead>
                <TableHead className="font-semibold text-xs">Matricule</TableHead>
                <TableHead className="font-semibold text-xs">Statut</TableHead>
                <TableHead className="text-right font-semibold text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dossiersByStatus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={<FolderOpen />}
                      title="Aucun dossier avec ce statut"
                      dashed={false}
                      className="border-0 bg-transparent py-10"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                dossiersByStatus.map((dossier, i) => (
                  <TableRow key={dossier.id} className="group hover:bg-muted/50 transition-colors opacity-0 animate-row-fade [animation-fill-mode:forwards]" style={{ animationDelay: `${i * 30}ms` }}>
                    <TableCell>
                      <Link href={`/dossiers/${dossier.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {dossier.refExpert || 'N/A'}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs font-medium">{renderAssure(dossier.assure)}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{dossier.compagnie || '-'}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{dossier.nature || '-'}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground tabular-nums">{dossier.matricule || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] py-0.5 px-2 rounded-full border font-semibold', getStatusBadgeStyles(dossier.statut))}>
                        {dossier.statut || 'Nouveau'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[10px] text-muted-foreground font-medium tabular-nums">
                      {formatDate(dossier.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-6">
      {/* Top row: conditional layout — depends on whether a status is selected */}
      {selectedStatus === null ? (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <div className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: '100ms' }}>{pieCard}</div>
          <div className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: '200ms' }}>{filterCard}</div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="lg:col-span-1 opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: '100ms' }}>{filterCard}</div>
          <div className="lg:col-span-2 opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: '200ms' }}>{filteredTableCard}</div>
        </div>
      )}

      {/* CHANGEMENTS RECENTS (2 panels) + Repartition par Compagnie (+ Volume par Statut stacked when a status is selected) */}
      <div className="grid gap-6 lg:grid-cols-3 items-start mb-10">
        {/* Panel 1 */}
        {renderChangementsPanel(
          '1', filteredLogs1,
          changements1ActionFilter, setChangements1ActionFilter,
          changements1DateFilter, setChangements1DateFilter,
          changements1UserFilter, setChangements1UserFilter,
          changements1NatureFilter, setChangements1NatureFilter,
        )}
        {/* Panel 2 */}
        {renderChangementsPanel(
          '2', filteredLogs2,
          changements2ActionFilter, setChangements2ActionFilter,
          changements2DateFilter, setChangements2DateFilter,
          changements2UserFilter, setChangements2UserFilter,
          changements2NatureFilter, setChangements2NatureFilter,
        )}
        {/* Right column: Répartition par Compagnie (always) + Volume par Statut (only when a status is selected, i.e. the pie had to leave its top-row slot) */}
        <div className="space-y-6">
          <Card className="shadow-sm h-fit hover:shadow-md transition-shadow border rounded-lg opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: '300ms' }}>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Répartition par Compagnie</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {compagnieData.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 />}
                  title="Aucune donnée"
                  description="La répartition apparaîtra dès qu'un dossier sera créé."
                  dashed={false}
                  className="border-0 bg-transparent py-10"
                />
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
          {selectedStatus !== null && (
            <div className="opacity-0 animate-fade-in-up [animation-fill-mode:forwards]" style={{ animationDelay: '350ms' }}>
              {pieCard}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
