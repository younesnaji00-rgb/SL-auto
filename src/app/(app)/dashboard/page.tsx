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
  Inbox
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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { collection, onSnapshot, query, orderBy, collectionGroup, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const db = useFirestore();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Persistence for collapsible sections
  const [isDossiersOpen, setIsDossiersOpen] = useState(true);
  const [isChangementsOpen, setIsChangementsOpen] = useState(true);

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

    const qDossiers = query(collection(db, 'dossiers'), orderBy('createdAt', 'desc'));
    const unsubDossiers = onSnapshot(qDossiers, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDossiers(data);
      setLoading(false);
    }, (error) => {
      console.error("Dashboard dossier sync error:", error);
      setLoading(false);
    });

    // Collection Group query to fetch all workflow logs across all dossiers
    const qWorkflow = query(
      collectionGroup(db, 'workflow'), 
      orderBy('date', 'desc'), 
      limit(15)
    );
    const unsubWorkflow = onSnapshot(qWorkflow, (snap) => {
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkflowLogs(logs);
    }, (error) => {
      console.warn("Workflow group sync error:", error);
    });

    return () => {
      unsubDossiers();
      unsubWorkflow();
    };
  }, [db]);

  // Derive Stats
  const total = dossiers.length;
  const nouveauCount = dossiers.filter((d) => d.statut === 'Nouveau' || d.statut === 'Création de mission').length;
  const enCoursCount = dossiers.filter((d) => d.statut?.toLowerCase().includes('cours') || d.statut === 'En cours').length;
  const clotureCount = dossiers.filter((d) => d.statut === 'Cloture' || d.statut === 'Clôture' || d.statut === 'Dossier signé' || d.statut === 'Rapport Validé').length;

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

  const chartData = useMemo(() => [
    { name: 'Nouveau',  value: nouveauCount, fill: 'hsl(var(--chart-1))' },
    { name: 'En cours', value: enCoursCount, fill: 'hsl(var(--chart-2))' },
    { name: 'Clôturé',  value: clotureCount, fill: 'hsl(var(--chart-3))' },
  ], [nouveauCount, enCoursCount, clotureCount]);

  const statsOverviewData = useMemo(() => [
    { name: 'Total',    value: total,         fill: '#3b82f6' },
    { name: 'Nouveaux', value: nouveauCount,  fill: '#eab308' },
    { name: 'En cours', value: enCoursCount,  fill: '#22c55e' },
    { name: 'Terminés', value: clotureCount,  fill: '#64748b' },
  ], [total, nouveauCount, enCoursCount, clotureCount]);

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

    return Object.entries(byCompagnie).map(([name, value], index) => ({ 
      name, 
      value,
      fill: chartColors[index % chartColors.length]
    }));
  }, [dossiers]);

  const barChartConfig = {
    value: { label: 'Dossiers', color: 'hsl(var(--primary))' },
  };

  const pieChartConfig = useMemo(() => {
    const config: any = { value: { label: 'Dossiers' } };
    compagnieData.forEach(item => {
      config[item.name] = { label: item.name, color: item.fill };
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Synchronisation des données...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-full border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Mise à jour en direct
        </div>
      </div>
      

      {/* Deadline Tracking Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-l-4 border-blue-400 shadow-sm transition-all hover:shadow-md bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Aujourd'hui</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700 dark:text-blue-400">{jourZeroCount}</div>
            <p className="text-xs text-blue-600/70 dark:text-blue-500/70 mt-1">Délai restant : 3 jours</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-green-500 shadow-sm transition-all hover:shadow-md bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Il y a 1 jour</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700 dark:text-green-400">{jourUnCount}</div>
            <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-1">Délai restant : 2 jours</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-orange-500 shadow-sm transition-all hover:shadow-md bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase">Il y a 2 jours</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700 dark:text-orange-400">{jourDeuxCount}</div>
            <p className="text-xs text-orange-600/70 dark:text-orange-500/70 mt-1">Délai restant : 1 jour</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500 shadow-sm transition-all hover:shadow-md bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">Il y a 3 jours ou plus</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-700 dark:text-red-400">{jourTroisCount}</div>
            <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-1">Délai expiré !</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        {/* Recent Dossiers Table */}
        <Card className="lg:col-span-3 shadow-sm overflow-hidden h-fit">
          <CardHeader 
            className="bg-muted/30 border-b flex flex-row items-center justify-between py-3 cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={toggleDossiers}
          >
            <CardTitle className="text-base flex items-center gap-2">
              Dossiers récents
              {isDossiersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <div className={cn("grid transition-all duration-300 ease-in-out", isDossiersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="font-bold text-xs">Réf.</TableHead>
                      <TableHead className="font-bold text-xs">Assuré</TableHead>
                      <TableHead className="font-bold text-xs">Compagnie</TableHead>
                      <TableHead className="font-bold text-xs">Statut</TableHead>
                      <TableHead className="text-right font-bold text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossiers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                          Aucun dossier trouvé.
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
              Changements récents
              {isChangementsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
            </CardTitle>
          </CardHeader>
          <div className={cn("grid transition-all duration-300 ease-in-out", isChangementsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {workflowLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Inbox className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs italic">Aucune activité récente.</p>
                    </div>
                  ) : (
                    workflowLogs.map((log, idx) => (
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
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <UserIcon className="h-2.5 w-2.5" />
                            <span>par <span className="font-bold text-foreground">{log.user || 'Admin'}</span></span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 pb-10">
        {/* Stats Overview Column Chart */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-base">Vue d'ensemble des Dossiers</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={barChartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={statsOverviewData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  fontSize={11}
                  fontWeight={600}
                />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {statsOverviewData.map((entry, index) => (
                    <Cell key={`cell-overview-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Volume par Statut */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-base">Volume par Statut</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={barChartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  fontSize={11}
                  fontWeight={600}
                />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={45}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-base">Répartition par Compagnie</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 min-h-[250px]">
             <ChartContainer config={pieChartConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                  <Pie
                    data={compagnieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={50}
                    paddingAngle={4}
                    labelLine={false}
                  >
                    {compagnieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
