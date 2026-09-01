'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { collection, onSnapshot, query, orderBy, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, startOfDay, endOfDay, isWithinInterval, isSameDay, startOfToday, startOfWeek, startOfMonth } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList, Pie, PieChart } from 'recharts';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { statuses as ALL_STATUSES } from '@/lib/dossiers-data';
import { useCurrentUser } from '@/hooks/use-current-user';
import { DatePicker } from '@/components/ui/date-picker';
import { landingPathFor } from '@/lib/role-landing';

const DASHBOARD_ALLOWED_ROLES = ['Admin', "Responsable d'équipe"];

export default function DashboardPage() {
  const { profile, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const role = profile?.role;
  const isAllowed = !!role && DASHBOARD_ALLOWED_ROLES.includes(role);

  useEffect(() => {
    if (userLoading) return;
    if (!role) return;
    if (isAllowed) return;
    router.replace(landingPathFor(role));
  }, [userLoading, role, isAllowed, router]);

  if (userLoading || (role && !isAllowed)) {
    return <div className="py-12 text-sm text-muted-foreground">Chargement...</div>;
  }

  return <DashboardPageInner />;
}

function DashboardPageInner() {
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

  // Flight-style date range filter for dossier list (defaults to all time)
  const [dateFromFilter, setDateFromFilter] = useState<Date | undefined>(undefined);
  const [dateToFilter, setDateToFilter] = useState<Date | undefined>(undefined);

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

  // Apply the flight-style date range to the dossier list BEFORE computing
  // any dashboard counts/widgets (status bar, pie, compagnie chart, table).
  // When either bound is undefined, that side of the comparison is skipped.
  const filteredDossiers = useMemo(() => {
    const from = dateFromFilter ? startOfDay(dateFromFilter) : undefined;
    const to = dateToFilter ? endOfDay(dateToFilter) : undefined;
    return dossiers.filter((d) => {
      if (!d.createdAt) return false;
      const created = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [dossiers, dateFromFilter, dateToFilter]);

  const statusBarData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredDossiers.forEach((d) => {
      // "Création de mission" is the dashboard's display label for the
      // earliest dossier state. It buckets BOTH the canonical
      // `Création dossier` status AND dossiers with empty/missing statut.
      const isCreation = !d.statut || d.statut === 'Création dossier';
      const key = isCreation ? 'Création de mission' : d.statut!;
      counts[key] = (counts[key] || 0) + 1;
    });
    // Build a complete list of filter rows. Every canonical status surfaces
    // as its own row (no more bucketing the 8 accord/proposition/réforme
    // members under a single label — the dossiers list shows them
    // individually and the dashboard now matches).
    const allNames = new Set<string>();
    for (const name of ALL_STATUSES) {
      if (name === 'Création dossier') continue;
      allNames.add(name);
    }
    allNames.add('Création de mission');
    // Intentionally do NOT add non-canonical dossier.statut values — legacy/migration artifacts should not appear as filter rows.
    return Array.from(allNames)
      .map((name) => ({ name, value: counts[name] || 0 }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .map((item, i) => ({
        ...item,
        fill: chartColors[i % chartColors.length],
      }));
  }, [filteredDossiers]);

  // Only non-zero statuses for the pie chart
  const statusChartData = useMemo(() => {
    return statusBarData.filter((item) => item.value > 0);
  }, [statusBarData]);

  // dataviz anti-patterns: a pie reads part-to-whole only up to ~6 segments;
  // beyond that the 6th+ series fold into one neutral « Autres » segment
  // (the fold is not a series, so it wears the neutral ink-4, not a chart hue).
  const pieData = useMemo(() => {
    if (statusChartData.length <= 6) return statusChartData;
    const top = statusChartData.slice(0, 5);
    const rest = statusChartData.slice(5);
    return [
      ...top,
      {
        name: 'Autres',
        value: rest.reduce((sum, item) => sum + item.value, 0),
        fill: 'hsl(var(--ink-4))',
      },
    ];
  }, [statusChartData]);

  const statusBarConfig = useMemo(() => {
    const config: any = { value: { label: 'Dossiers' } };
    pieData.forEach((item) => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [pieData]);

  // Default to first status when data loads
  useEffect(() => {
    if (statusBarData.length > 0 && selectedStatus === null) {
      setSelectedStatus(statusBarData[0].name);
    }
  }, [statusBarData]);

  // Dossiers filtered by selected status. When the accord/proposition/réforme
  // bucket is selected, match any of its 8 member statuses.
  const dossiersByStatus = useMemo(() => {
    if (!selectedStatus) return [];
    if (selectedStatus === 'Création de mission') {
      // Mirror the bucket used in statusBarData: empty OR canonical Création dossier.
      return filteredDossiers.filter((d) => !d.statut || d.statut === 'Création dossier');
    }
    return filteredDossiers.filter((d) => d.statut === selectedStatus);
  }, [filteredDossiers, selectedStatus]);

  // Repartition par Compagnie
  const compagnieData = useMemo(() => {
    const byCompagnie: Record<string, number> = {};
    filteredDossiers.forEach((d) => {
      const key = d.compagnie || 'Inconnue';
      byCompagnie[key] = (byCompagnie[key] || 0) + 1;
    });
    // dataviz "compare magnitude → bar, ONE hue": identity is on the axis,
    // so colour has no job here — every bar is the same series colour.
    return Object.entries(byCompagnie)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        fill: 'hsl(var(--chart-1))',
      }));
  }, [filteredDossiers]);

  const barChartConfig = useMemo(() => {
    const config: any = { value: { label: 'Dossiers', color: 'hsl(var(--chart-1))' } };
    compagnieData.forEach((item) => {
      config[item.name] = { label: item.name, color: 'hsl(var(--chart-1))' };
    });
    return config;
  }, [compagnieData]);

  // Status badge styles are imported from @/lib/status-colors

  // Empty table cells read « — » in ink-4 (blueprint §9: empty = — muted).
  const emptyCell = <span className="text-ink-4">—</span>;

  const renderAssure = (assure: any): string | null => {
    if (!assure) return null;
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || null;
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
      <div className="flex-1 space-y-8" aria-busy="true">
        <PageHeader title="Tableau de bord" size="compact" />
        <div className="paper-featured p-5">
          <div className="grid gap-6 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-3 w-24 bg-on-ink/15" />
                <Skeleton className={cn('w-20 bg-on-ink/15', i === 0 ? 'h-12' : 'h-7')} />
                <Skeleton className="h-3 w-32 bg-on-ink/15" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="paper space-y-4 p-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mx-auto h-[240px] w-[240px] rounded-full" />
          </div>
          <div className="paper space-y-3 p-6">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
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
    <Card className="h-fit">
      <CardHeader>
        {/* Activity feed header (Atlassian activity feed / Material list header):
            t-heading title, filter label quiet, count as a NEUTRAL pill (no status colour). */}
        <CardTitle className="t-heading flex items-center gap-2">
          <Activity className="h-4 w-4 text-ink-3" aria-hidden />
          <span>Changements récents <span className="font-normal text-ink-3">/ {actionFilterLabels[actionFilter]}</span></span>
          <span className="ml-1 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-2">{logs.length}</span>
        </CardTitle>
      </CardHeader>
      {/* Nested-solid rule (blueprint §3): a flat surface-2 well inside paper, solid h-8 controls. */}
      <div className="mx-6 rounded-lg bg-surface-2 p-3">
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
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
          <div className="mt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                setDateFilter('');
                setUserFilter('all');
                setActionFilter('all');
                setNatureFilter('all');
              }}
            >
              <X className="mr-1 h-3 w-3" /> Réinitialiser
            </Button>
          </div>
        )}
      </div>
      <CardContent className="pt-4">
        <div className="max-h-[500px] space-y-5 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="Aucune activité récente"
              description="Les changements apparaîtront ici au fil de l'activité."
              dashed={false}
              className="border-0 bg-transparent py-6"
            />
          ) : (
            logs.map((log: any) => {
              const dossier = dossierMap[log._dossierId];
              const dossierLabel = log.dossierRef || dossier?.refExpert || '';
              const isNew = isNewLog(log);
              return (
                // GOV.UK / MOJ "timeline" pattern: vertical rule, marker, title,
                // byline "par X · date", details. "New" = the one accent use here.
                <div key={`${panelKey}-${log.id}`} className={cn(
                  "relative ml-2 border-l border-hairline pl-5 pb-5 last:pb-0",
                  isNew && "-ml-0.5 rounded-lg border-l-primary bg-accent/40 p-2 pl-5"
                )}>
                  {/* Marker 12 px, ring-4 ring-card; status colours carry meaning (done / pending). */}
                  <div className={cn(
                    "absolute top-1 h-3 w-3 rounded-full ring-4 ring-card",
                    isNew ? "-left-1" : "-left-1.5",
                    log.status === 'done' ? "bg-status-success-fg" : "bg-status-warning-fg"
                  )} />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between">
                      <p className="t-body-sm flex items-center gap-1.5 font-semibold leading-tight text-ink">
                        {isNew && (
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                          </span>
                        )}
                        {log.action}
                      </p>
                      <span className="t-caption ml-2 whitespace-nowrap rounded bg-surface-2 px-1.5 py-0.5 font-medium tabular-nums text-ink-3">
                        {formatDate(log.date)}
                      </span>
                    </div>
                    {dossierLabel && (
                      <div className="flex items-center gap-1.5 text-xs text-ink-2">
                        <FolderOpen className="h-3 w-3 text-ink-3" />
                        <span className="t-mono text-xs font-semibold">{dossierLabel}</span>
                      </div>
                    )}
                    {/* Refactoring UI: de-emphasise with tone (ink-3), not italics. */}
                    {log.details && (
                      <p className="t-caption leading-snug">{log.details}</p>
                    )}
                    <div className="t-caption flex items-center gap-1.5">
                      <UserIcon className="h-3 w-3" />
                      <span>par <b className="font-semibold text-ink-2">{log.user || 'Admin'}</b></span>
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

  const filteredCount = filteredDossiers.length;
  const rangeLabel = (!dateFromFilter && !dateToFilter)
    ? 'au total'
    : `du ${dateFromFilter ? format(dateFromFilter, 'dd/MM/yyyy', { locale: fr }) : '—'} au ${dateToFilter ? format(dateToFilter, 'dd/MM/yyyy', { locale: fr }) : '—'}`;

  // Period presets — which one (if any) matches the current range exactly.
  // Apple HIG segmented control / Material 3 segmented buttons: exactly one
  // segment reads as selected when the range equals a preset.
  const today = startOfToday();
  const activePreset: 'jour' | 'semaine' | 'mois' | null = (() => {
    if (!dateFromFilter || !dateToFilter) return null;
    if (!isSameDay(dateToFilter, today)) return null;
    if (isSameDay(dateFromFilter, today)) return 'jour';
    if (isSameDay(dateFromFilter, startOfWeek(today, { locale: fr }))) return 'semaine';
    if (isSameDay(dateFromFilter, startOfMonth(today))) return 'mois';
    return null;
  })();
  const periodSegments: { key: 'jour' | 'semaine' | 'mois'; label: string; apply: () => void }[] = [
    { key: 'jour', label: "Aujourd'hui", apply: () => { setDateFromFilter(today); setDateToFilter(today); } },
    { key: 'semaine', label: 'Semaine', apply: () => { setDateFromFilter(startOfWeek(today, { locale: fr })); setDateToFilter(today); } },
    { key: 'mois', label: 'Mois', apply: () => { setDateFromFilter(startOfMonth(today)); setDateToFilter(today); } },
  ];

  // The ONE featured (terracotta) surface on this page: the headline figures
  // for the selected period. Everything below reads against it.
  const headlineCard = (
    <Card variant="featured">
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          {/* Stat tile contract (dataviz "stat tile" / Carbon KPI tiles / Refactoring UI):
              label light, sentence case, no colon · value heavy, PROPORTIONAL figures
              (never tabular on a standalone number) · caption. Exactly one hero per view,
              ≥ 48 px in the UI sans (Inter), never the display face. */}
          <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-3 sm:divide-x sm:divide-on-ink/15">
            <div className="sm:pr-6">
              <p className="t-label text-on-ink/70">Dossiers créés</p>
              <p className="mt-1 font-body text-[48px] font-semibold leading-none text-on-ink">{filteredCount}</p>
              <p className="t-caption mt-1 text-on-ink/70">{rangeLabel}</p>
            </div>
            <div className="sm:px-6">
              <p className="t-label text-on-ink/70">Statuts actifs</p>
              <p className="mt-1 text-[28px] font-semibold leading-none text-on-ink">{statusChartData.length}</p>
              <p className="t-caption mt-1 text-on-ink/70">sur {statusBarData.length} statuts</p>
            </div>
            <div className="sm:pl-6">
              <p className="t-label text-on-ink/70">Compagnies</p>
              <p className="mt-1 text-[28px] font-semibold leading-none text-on-ink">{compagnieData.length}</p>
              <p className="t-caption mt-1 text-on-ink/70">
                {compagnieData[0] ? `${compagnieData[0].name} en tête` : 'aucune donnée'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-end gap-2">
            {/* Segmented control (Apple HIG / Material 3 segmented buttons): equal
                segments in one track, the selected one is the raised light pane. */}
            <div className="grid grid-cols-3 items-center gap-0.5 rounded-md bg-on-ink/10 p-0.5" role="group" aria-label="Période">
              {periodSegments.map((segment) => {
                const isActive = activePreset === segment.key;
                return (
                  <button
                    key={segment.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={segment.apply}
                    className={cn(
                      'h-8 whitespace-nowrap rounded-[5px] px-3 text-sm font-medium transition-[color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-tertiary',
                      isActive
                        ? 'bg-card text-ink shadow-rim'
                        : 'text-on-ink hover:bg-on-ink/15',
                    )}
                  >
                    {segment.label}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1">
              <label className="t-label text-on-ink/70">Du</label>
              <DatePicker
                value={dateFromFilter ?? null}
                onChange={(d) => setDateFromFilter(d ?? undefined)}
                placeholder="Date de début"
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="t-label text-on-ink/70">Au</label>
              <DatePicker
                value={dateToFilter ?? null}
                onChange={(d) => setDateToFilter(d ?? undefined)}
                placeholder="Date de fin"
                className="h-8 w-36 text-xs"
              />
            </div>
            {(dateFromFilter || dateToFilter) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-on-ink/80 hover:bg-on-ink/15 hover:text-on-ink"
                onClick={() => {
                  setDateFromFilter(undefined);
                  setDateToFilter(undefined);
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Effacer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const filterCard = (
    <Card className="h-fit overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Dossiers par état</CardTitle>
        {/* Blueprint §6: inputs are solid fields, never underline / transparent. */}
        <div className="relative w-[180px] max-w-full">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input
            placeholder="Rechercher..."
            aria-label="Rechercher un statut"
            value={statusFilterSearch}
            onChange={(e) => setStatusFilterSearch(e.target.value)}
            className="h-8 rounded-md border border-input bg-card pl-7 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="max-h-[520px] overflow-y-auto p-0">
        {filteredStatusRows.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title="Aucun statut"
            description="Affinez votre recherche pour voir les statuts."
            dashed={false}
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {filteredStatusRows.map((item) => {
              const isSelected = selectedStatus === item.name;
              const isEmpty = item.value === 0;
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus((prev) => (prev === item.name ? null : item.name))}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex w-full items-center justify-between px-5 py-2.5 text-left text-sm transition-colors',
                      isSelected ? 'border-l-2 border-l-primary bg-accent/50' : 'border-l-2 border-l-transparent hover:bg-surface-2',
                    )}
                  >
                    <span className={cn('truncate', isSelected ? 'font-semibold text-ink' : isEmpty ? 'text-ink-3' : 'text-ink-2')}>{item.name}</span>
                    {/* Material 3 list trailing supporting text / NN/g faceted filter counts:
                        the count is a status-pair chip (blueprint status pairs), neutral when empty. */}
                    <span className={cn(
                      STATUS_BADGE_CLASS,
                      'shrink-0',
                      isEmpty ? 'border-transparent bg-surface-2 text-ink-3' : getStatusBadgeStyles(item.name),
                    )}>
                      {item.value}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  const pieCard = (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Volume par statut</CardTitle>
      </CardHeader>
      <CardContent>
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
            {/* dataviz: pie for part-to-whole at a glance, ≤ 6 segments (top 5 + « Autres »);
                2 px surface gap between fills; selective direct labels (≥ 8 % only);
                text wears text tokens (ink-2 outside, card-on-slice inside), never the series hue. */}
            <ChartContainer config={statusBarConfig} className="mx-auto aspect-square max-h-[280px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  paddingAngle={1}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                  isAnimationActive={true}
                  animationBegin={100}
                  animationDuration={600}
                  animationEasing="ease-out"
                  label={({ cx, cy, midAngle, outerRadius, percent }) => {
                    if (percent < 0.08) return null;
                    const RADIAN = Math.PI / 180;
                    const pct = `${(percent * 100).toFixed(0)}%`;
                    const outside = pieData.length > 4;
                    const radius = outside ? outerRadius + 24 : outerRadius * 0.55;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text
                        x={x}
                        y={y}
                        fill={outside ? 'hsl(var(--ink-2))' : 'hsl(var(--card))'}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={11}
                        fontWeight={600}
                      >
                        {pct}
                      </text>
                    );
                  }}
                  labelLine={pieData.length > 4 ? { stroke: 'hsl(var(--hairline-strong))' } : false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-status-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* Legend always present for ≥ 2 series; a column of counts → tabular figures. */}
            <ul className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
              {pieData.map((item) => (
                <li key={item.name} className="t-caption flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} aria-hidden />
                  <span>{item.name}</span>
                  <span className="font-semibold tabular-nums text-ink">{item.value}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );

  const filteredTableCard = (
    <Card className="h-fit overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        {/* NN/g data tables: the title names the table once; status as a chip; count quiet. */}
        <CardTitle className="t-heading flex items-center gap-2">
          <span>Dossiers</span>
          {selectedStatus && (
            <span className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(selectedStatus))}>
              {selectedStatus}
            </span>
          )}
          <span className="t-caption tabular-nums">{dossiersByStatus.length}</span>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setSelectedStatus(null)}>
          <X className="mr-1 h-4 w-4" /> Fermer
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Sticky bg-card header comes from the Table primitive; px max-h needs no zoom division. */}
        <div className="max-h-[560px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Réf.</TableHead>
                <TableHead>Assuré</TableHead>
                <TableHead>Compagnie</TableHead>
                <TableHead>Nature du dossier</TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Date</TableHead>
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
                // NN/g data tables / Carbon: quiet header (primitive), alignment by type
                // (text left, dates right + tabular), status as a chip, empty = « — » in ink-4.
                dossiersByStatus.map((dossier) => (
                  <TableRow key={dossier.id} className="group">
                    <TableCell>
                      <Link href={`/dossiers/${dossier.id}`} className="t-mono font-semibold hover:underline">
                        {dossier.refExpert || emptyCell}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate font-medium text-ink">{renderAssure(dossier.assure) ?? emptyCell}</TableCell>
                    <TableCell className="text-ink-2">{dossier.compagnie || emptyCell}</TableCell>
                    <TableCell className="text-ink-2">{dossier.nature || emptyCell}</TableCell>
                    <TableCell className="t-mono text-ink-2">{dossier.matricule || emptyCell}</TableCell>
                    <TableCell>
                      <span className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(dossier.statut))}>
                        {!dossier.statut || dossier.statut === 'Création dossier' ? 'Création de mission' : dossier.statut}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-ink-3">
                      {dossier.createdAt ? formatDate(dossier.createdAt) : emptyCell}
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
    <div className="flex-1 space-y-8 animate-fade-in motion-reduce:animate-none">
      <PageHeader title="Tableau de bord" size="compact" />

      {/* 1 — the featured surface: headline figures + period */}
      {headlineCard}

      {/* 2 — primary block: status list + (pie | dossiers for the selected status) */}
      {selectedStatus === null ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {pieCard}
          {filterCard}
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">{filterCard}</div>
          <div className="lg:col-span-2">{filteredTableCard}</div>
        </div>
      )}

      {/* 3 — secondary: activity feeds + compagnie split (+ pie when it left the top row) */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {renderChangementsPanel(
          '1', filteredLogs1,
          changements1ActionFilter, setChangements1ActionFilter,
          changements1DateFilter, setChangements1DateFilter,
          changements1UserFilter, setChangements1UserFilter,
          changements1NatureFilter, setChangements1NatureFilter,
        )}
        {renderChangementsPanel(
          '2', filteredLogs2,
          changements2ActionFilter, setChangements2ActionFilter,
          changements2DateFilter, setChangements2DateFilter,
          changements2UserFilter, setChangements2UserFilter,
          changements2NatureFilter, setChangements2NatureFilter,
        )}
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Répartition par compagnie</CardTitle>
            </CardHeader>
            <CardContent>
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
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    {/* dataviz marks: thin bars, 4 px rounded data-ends, recessive dashed
                        hairline grid, ONE hue (identity lives on the axis), selective
                        direct value labels in ink — values are text, not series colour. */}
                    <CartesianGrid horizontal={false} stroke="hsl(var(--hairline))" strokeDasharray="3 3" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--ink-2))' }}
                      width={104}
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--ink-3))' }}
                      allowDecimals={false}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={true} animationBegin={100} animationDuration={600} animationEasing="ease-out">
                      <LabelList dataKey="value" position="right" fill="hsl(var(--ink-2))" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
          {selectedStatus !== null && pieCard}
        </div>
      </div>
    </div>
  );
}
