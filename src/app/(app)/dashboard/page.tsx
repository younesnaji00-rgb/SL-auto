'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Clock,
  AlertCircle,
  Loader2,
  User as UserIcon,
  Activity,
  ChevronDown,
  ChevronUp,
  Inbox,
  Filter,
  X,
  ArrowLeft,
  Search,
  FolderOpen,
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
  ChartLegend,
  ChartLegendContent,
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
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, orderBy, collectionGroup, limit as firestoreLimit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, differenceInDays, startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns';

// Lazy-load recharts (heavy bundle ~200KB)
const Bar = dynamic(() => import('recharts').then(m => ({ default: m.Bar })), { ssr: false }) as any;
const BarChart = dynamic(() => import('recharts').then(m => ({ default: m.BarChart })), { ssr: false }) as any;
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false }) as any;
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false }) as any;
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false }) as any;
const Pie = dynamic(() => import('recharts').then(m => ({ default: m.Pie })), { ssr: false }) as any;
const PieChart = dynamic(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false }) as any;
const Cell = dynamic(() => import('recharts').then(m => ({ default: m.Cell })), { ssr: false }) as any;
const Label = dynamic(() => import('recharts').then(m => ({ default: m.Label })), { ssr: false }) as any;
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function DashboardPage() {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Persistence for collapsible sections
  const [isDossiersOpen, setIsDossiersOpen] = useState(true);
  const [isChangementsOpen, setIsChangementsOpen] = useState(true);

  // Changements filters
  const [changementsDateFilter, setChangementsDateFilter] = useState('');
  const [changementsUserFilter, setChangementsUserFilter] = useState('all');
  const [changementsSearchField, setChangementsSearchField] = useState<string>('all');
  const [changementsSearchValue, setChangementsSearchValue] = useState('');

  // Deadline card drill-down
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<number | null>(null);

  useEffect(() => {
    const dossiersStored = localStorage.getItem('dashboard-dossiers-open');
    const changementsStored = localStorage.getItem('dashboard-changements-open');

    if (dossiersStored !== null) setIsDossiersOpen(dossiersStored === 'true');
    if (changementsStored !== null) setIsChangementsOpen(changementsStored === 'true');
  }, []);

  const toggleDossiers = () => {
    const newState = !isDossiersOpen;
    setIsDossiersOpen(newState);
    localStorage.setItem('dashboard-dossiers-open', String(newState));
  };

  const toggleChangements = () => {
    const newState = !isChangementsOpen;
    setIsChangementsOpen(newState);
    localStorage.setItem('dashboard-changements-open', String(newState));
  };

  useEffect(() => {
    if (!db) return;

    const userCompagnies = profile?.compagnies || [];
    const allowedLower = userCompagnies.map((c: string) => c.toLowerCase().trim());

    const qDossiers = query(collection(db, 'dossiers'), orderBy('createdAt', 'desc'));
    const unsubDossiers = onSnapshot(qDossiers, (snap) => {
      let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Filter by user's assigned companies
      if (allowedLower.length > 0) {
        data = data.filter((d: any) => allowedLower.includes((d.compagnie || '').toLowerCase().trim()));
      }
      setDossiers(data);
      setLoading(false);
    }, (error) => {
      console.error("Dashboard dossier sync error:", error);
      setLoading(false);
    });

    // Collection Group query — limit to 200 most recent for performance
    const qWorkflow = query(
      collectionGroup(db, 'workflow'),
      orderBy('date', 'desc'),
      firestoreLimit(200)
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

  // Derive Stats
  const total = dossiers.length;
  const CLOTURE_STATUSES = ['Cloture', 'Clôture', 'Dossier signé', 'Rapport Validé', 'Mission annulée'];
  const NOUVEAU_STATUSES = ['Nouveau', 'Création de mission'];
  const clotureCount = dossiers.filter((d) => CLOTURE_STATUSES.includes(d.statut)).length;
  const nouveauCount = dossiers.filter((d) => NOUVEAU_STATUSES.includes(d.statut)).length;
  const enCoursCount = total - clotureCount - nouveauCount;

  // Deadline tracking: count dossiers by age (days since creation)
  const now = new Date();
  const getAgeDays = (d: any) => {
    if (!d.createdAt) return -1;
    const created = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
    return differenceInDays(now, created);
  };
  const activeDossiers = dossiers.filter((d) => d.statut !== 'Cloture' && d.statut !== 'Clôture' && d.statut !== 'Dossier signé' && d.statut !== 'Rapport Validé');
  const jourZeroCount = activeDossiers.filter((d) => getAgeDays(d) === 0).length;
  const jourUnCount = activeDossiers.filter((d) => getAgeDays(d) === 1).length;
  const jourDeuxCount = activeDossiers.filter((d) => getAgeDays(d) === 2).length;
  const jourTroisCount = activeDossiers.filter((d) => getAgeDays(d) >= 3).length;

  // Dossiers filtered by selected age card
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
    workflowLogs.forEach((log) => {
      const user = log.user || 'Admin';
      users.add(user);
    });
    return Array.from(users).sort();
  }, [workflowLogs]);

  // Dossier lookup map for search filtering
  const dossierMap = useMemo(() => {
    const map: Record<string, any> = {};
    dossiers.forEach((d) => { map[d.id] = d; });
    return map;
  }, [dossiers]);

  // Filtered changements
  const filteredWorkflowLogs = useMemo(() => {
    let filtered = workflowLogs;

    if (changementsDateFilter) {
      const filterDate = new Date(changementsDateFilter);
      const dayStart = startOfDay(filterDate);
      const dayEnd = endOfDay(filterDate);
      filtered = filtered.filter((log) => {
        if (!log.date) return false;
        const logDate = log.date.toDate ? log.date.toDate() : new Date(log.date);
        return isWithinInterval(logDate, { start: dayStart, end: dayEnd });
      });
    }

    if (changementsUserFilter && changementsUserFilter !== 'all') {
      filtered = filtered.filter((log) => {
        const user = log.user || 'Admin';
        return user === changementsUserFilter;
      });
    }

    if (changementsSearchValue.trim()) {
      const q = changementsSearchValue.trim().toLowerCase();
      filtered = filtered.filter((log) => {
        const dossier = dossierMap[log._dossierId];
        if (!dossier) return false;
        const field = changementsSearchField;
        if (field === 'all' || field === 'reference') {
          if ((dossier.refExpert || '').toLowerCase().includes(q)) return true;
        }
        if (field === 'all' || field === 'assure') {
          const nom = `${dossier.assure?.nom || ''} ${dossier.assure?.prenom || ''}`.toLowerCase();
          if (nom.includes(q)) return true;
        }
        if (field === 'all' || field === 'compagnie') {
          if ((dossier.compagnie || '').toLowerCase().includes(q)) return true;
        }
        if (field === 'all' || field === 'statut') {
          if ((dossier.statut || '').toLowerCase().includes(q)) return true;
        }
        if (field === 'all' || field === 'matricule') {
          if ((dossier.vehicule?.immatriculation || '').toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    return filtered;
  }, [workflowLogs, changementsDateFilter, changementsUserFilter, changementsSearchField, changementsSearchValue, dossierMap]);

  // Chart data: Volume par Statut (Pie Chart with percentages)
  const pieStatusData = useMemo(() => {
    const data = [
      { name: 'Nouveau',  value: nouveauCount, fill: 'hsl(var(--chart-1))' },
      { name: 'En cours', value: enCoursCount, fill: 'hsl(var(--chart-2))' },
      { name: 'Cloture',  value: clotureCount, fill: 'hsl(var(--chart-3))' },
    ].filter(d => d.value > 0);
    return data;
  }, [nouveauCount, enCoursCount, clotureCount]);

  const pieStatusConfig = useMemo(() => {
    const config: any = { value: { label: 'Dossiers' } };
    pieStatusData.forEach(item => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [pieStatusData]);

  // Chart data: Repartition par Compagnie (Column Chart)
  const compagnieData = useMemo(() => {
    const byCompagnie: Record<string, number> = {};
    dossiers.forEach((d) => {
      const key = d.compagnie || 'Inconnue';
      byCompagnie[key] = (byCompagnie[key] || 0) + 1;
    });

    const chartColors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];

    return Object.entries(byCompagnie)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        fill: chartColors[index % chartColors.length]
      }));
  }, [dossiers]);

  const barChartConfig = useMemo(() => {
    const chartColors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];
    const config: any = { value: { label: 'Dossiers' } };
    compagnieData.forEach((item, index) => {
      config[item.name] = { label: item.name, color: chartColors[index % chartColors.length] };
    });
    return config;
  }, [compagnieData]);

  const getStatusBadgeStyles = (status: string) => {
    const s = status || '';
    if (s === 'Accord devis') {
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    }
    if (s === 'Expertise programmée en cours') {
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    }
    if (s === 'Assigné au chiffrage') {
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    }
    return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700";
  };

  const renderAssure = (assure: any) => {
    if (!assure) return '-';
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || '-';
  };

  const formatDate = (val: any) => {
    if (!val) return '-';
    const date = val.toDate ? val.toDate() : new Date(val);
    try {
      return format(date, 'dd/MM HH:mm', { locale: fr });
    } catch {
      return '-';
    }
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

  // Custom label for pie chart percentages
  const renderPieLabel = ({ name, value, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percent = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
    return (
      <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={600}>
        {name} ({percent}%)
      </text>
    );
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-full border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Mise a jour en direct
        </div>
      </div>


      {/* Deadline Tracking Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card
          className={cn(
            "border-l-4 border-blue-400 shadow-sm transition-all hover:shadow-md bg-blue-50/50 dark:bg-blue-950/20 cursor-pointer",
            selectedAgeFilter === 0 && "ring-2 ring-blue-400 shadow-md"
          )}
          onClick={() => handleCardClick(0)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Aujourd&apos;hui</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700 dark:text-blue-400">{jourZeroCount}</div>
            <p className="text-xs text-blue-600/70 dark:text-blue-500/70 mt-1">Delai restant : 3 jours</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-l-4 border-green-500 shadow-sm transition-all hover:shadow-md bg-green-50/50 dark:bg-green-950/20 cursor-pointer",
            selectedAgeFilter === 1 && "ring-2 ring-green-500 shadow-md"
          )}
          onClick={() => handleCardClick(1)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Il y a 1 jour</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700 dark:text-green-400">{jourUnCount}</div>
            <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-1">Delai restant : 2 jours</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-l-4 border-orange-500 shadow-sm transition-all hover:shadow-md bg-orange-50/50 dark:bg-orange-950/20 cursor-pointer",
            selectedAgeFilter === 2 && "ring-2 ring-orange-500 shadow-md"
          )}
          onClick={() => handleCardClick(2)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase">Il y a 2 jours</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700 dark:text-orange-400">{jourDeuxCount}</div>
            <p className="text-xs text-orange-600/70 dark:text-orange-500/70 mt-1">Delai restant : 1 jour</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-l-4 border-red-500 shadow-sm transition-all hover:shadow-md bg-red-50/50 dark:bg-red-950/20 cursor-pointer",
            selectedAgeFilter === 3 && "ring-2 ring-red-500 shadow-md"
          )}
          onClick={() => handleCardClick(3)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">Il y a 3 jours ou plus</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-700 dark:text-red-400">{jourTroisCount}</div>
            <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-1">Delai expire !</p>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down: dossiers for selected age card */}
      {selectedAgeFilter !== null && (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b py-3 flex flex-row items-center justify-between">
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
                <TableRow className="bg-muted/10">
                  <TableHead className="font-bold text-xs">Ref.</TableHead>
                  <TableHead className="font-bold text-xs">Assure</TableHead>
                  <TableHead className="font-bold text-xs">Compagnie</TableHead>
                  <TableHead className="font-bold text-xs">Statut</TableHead>
                  <TableHead className="text-right font-bold text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredByAgeDossiers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                      Aucun dossier dans cette categorie.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredByAgeDossiers.map((dossier) => (
                    <TableRow key={dossier.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-primary">{dossier.refExpert || 'N/A'}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs font-medium">{renderAssure(dossier.assure)}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{dossier.compagnie || '-'}</TableCell>
                      <TableCell>
                        <div className="inline-flex w-auto whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] py-0.5 px-2 rounded-full border font-semibold",
                              getStatusBadgeStyles(dossier.statut)
                            )}
                          >
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

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        {/* Recent Dossiers Table */}
        <Card className="lg:col-span-3 shadow-sm overflow-hidden h-fit">
          <CardHeader
            className="bg-muted/30 border-b flex flex-row items-center justify-between py-3 cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={toggleDossiers}
          >
            <CardTitle className="text-base flex items-center gap-2">
              Dossiers recents
              {isDossiersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <div className={cn("grid transition-all duration-300 ease-in-out", isDossiersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="font-bold text-xs">Ref.</TableHead>
                      <TableHead className="font-bold text-xs">Assure</TableHead>
                      <TableHead className="font-bold text-xs">Compagnie</TableHead>
                      <TableHead className="font-bold text-xs">Statut</TableHead>
                      <TableHead className="text-right font-bold text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossiers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                          Aucun dossier trouve.
                        </TableCell>
                      </TableRow>
                    ) : (
                      dossiers.slice(0, 10).map((dossier) => (
                        <TableRow key={dossier.id} className="group hover:bg-muted/50 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-primary">{dossier.refExpert || 'N/A'}</TableCell>
                          <TableCell className="max-w-[120px] truncate text-xs font-medium">{renderAssure(dossier.assure)}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{dossier.compagnie || '-'}</TableCell>
                          <TableCell>
                            <div className="inline-flex w-auto whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] py-0.5 px-2 rounded-full border font-semibold",
                                  getStatusBadgeStyles(dossier.statut)
                                )}
                              >
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
            </div>
          </div>
        </Card>

        {/* CHANGEMENTS RECENTS (Audit Feed) */}
        <Card className="lg:col-span-2 shadow-sm border-primary/10 h-fit">
          <CardHeader
            className="bg-primary/5 border-b py-3 cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={toggleChangements}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Changements recents
              <Badge variant="secondary" className="ml-1 text-[10px]">{filteredWorkflowLogs.length}</Badge>
              {isChangementsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
            </CardTitle>
          </CardHeader>
          <div className={cn("grid transition-all duration-300 ease-in-out", isChangementsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="overflow-hidden">
              {/* Filters */}
              <div className="px-4 pt-4 pb-2 flex flex-col gap-2 border-b">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={changementsDateFilter}
                      onChange={(e) => setChangementsDateFilter(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Filtrer par date"
                    />
                  </div>
                  <div className="flex-1">
                    <Select value={changementsUserFilter} onValueChange={setChangementsUserFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Tous les utilisateurs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les utilisateurs</SelectItem>
                        {uniqueUsers.map((user) => (
                          <SelectItem key={user} value={user}>{user}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(changementsDateFilter || changementsUserFilter !== 'all' || changementsSearchValue) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChangementsDateFilter('');
                        setChangementsUserFilter('all');
                        setChangementsSearchField('all');
                        setChangementsSearchValue('');
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="w-full sm:w-[180px]">
                    <Select value={changementsSearchField} onValueChange={setChangementsSearchField}>
                      <SelectTrigger className="h-8 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Search className="h-3 w-3 text-muted-foreground" />
                          <SelectValue placeholder="Filtrer par..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les champs</SelectItem>
                        <SelectItem value="reference">Référence</SelectItem>
                        <SelectItem value="assure">Nom assuré</SelectItem>
                        <SelectItem value="compagnie">Compagnie</SelectItem>
                        <SelectItem value="statut">Statut</SelectItem>
                        <SelectItem value="matricule">Matricule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={changementsSearchValue}
                      onChange={(e) => setChangementsSearchValue(e.target.value)}
                      className="h-8 text-xs"
                      placeholder={changementsSearchField === 'all' ? 'Rechercher...' : `Rechercher par ${changementsSearchField === 'reference' ? 'référence' : changementsSearchField === 'assure' ? 'nom assuré' : changementsSearchField === 'compagnie' ? 'compagnie' : changementsSearchField === 'statut' ? 'statut' : 'matricule'}...`}
                    />
                  </div>
                </div>
              </div>

              <CardContent className="pt-4">
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                  {filteredWorkflowLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Inbox className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs italic">Aucune activite recente.</p>
                    </div>
                  ) : (
                    filteredWorkflowLogs.map((log) => {
                      const dossier = dossierMap[log._dossierId];
                      const dossierLabel = log.dossierRef || dossier?.refExpert || '';
                      return (
                        <div key={log.id} className="relative pl-6 pb-6 last:pb-0 border-l border-muted ml-2">
                          <div className={cn(
                            "absolute -left-1.5 top-1 w-3 h-3 rounded-full ring-4 ring-background",
                            log.status === 'done' ? "bg-green-500" : "bg-orange-500"
                          )} />
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-bold leading-tight">{log.action}</p>
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
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 pb-10">
        {/* Pie Chart - Volume par Statut */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-base">Volume par Statut</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 min-h-[300px]">
            {pieStatusData.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucune donnee.</p>
            ) : (
              <ChartContainer config={pieStatusConfig} className="h-[280px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                  <Pie
                    data={pieStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {pieStatusData.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                    <Label
                      content={() => (
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold">
                          {total}
                        </text>
                      )}
                    />
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Column Chart - Repartition par Compagnie */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-base">Repartition par Compagnie</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {compagnieData.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-10">Aucune donnee.</p>
            ) : (
              <ChartContainer config={barChartConfig} className="h-[280px] w-full">
                <BarChart accessibilityLayer data={compagnieData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    fontSize={10}
                    fontWeight={600}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis axisLine={false} tickLine={false} fontSize={10} allowDecimals={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
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
