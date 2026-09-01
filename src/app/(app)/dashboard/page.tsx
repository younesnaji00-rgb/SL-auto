'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  X,
  FolderOpen,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Building2,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { Button, type ButtonProps } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { collection, onSnapshot, query, orderBy, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, startOfDay, endOfDay, isWithinInterval, isSameDay, startOfToday, startOfWeek, startOfMonth } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart } from 'recharts';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { Input } from '@/components/ui/input';
import { statuses as ALL_STATUSES } from '@/lib/dossiers-data';
import { useCurrentUser } from '@/hooks/use-current-user';
import { DatePicker } from '@/components/ui/date-picker';
import { landingPathFor } from '@/lib/role-landing';
import { titleForRoute } from '@/lib/nav-groups';
import { DashboardSkeleton } from './loading';

const DASHBOARD_ALLOWED_ROLES = ['Admin', "Responsable d'équipe"];

// ── Local layout helpers (blueprint §3 / §6) ────────────────────────────

/**
 * Paper section with a hairline header row — same anatomy as `Section` in
 * dossiers/[id]/information-tab.tsx: `t-heading` title, optional count pill,
 * right-side controls; body padded 24 px unless `flush` (lists / tables).
 */
function Section({
  title,
  count,
  actions,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title: string;
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
}) {
  return (
    <Card role="region" aria-label={title} className={cn('min-w-0', className)}>
      <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-hairline px-6 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="t-heading truncate">{title}</h2>
          {count !== undefined && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-xs font-medium tabular-nums text-ink-2">
              {count}
            </span>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn(!flush && 'p-6', bodyClassName)}>{children}</div>
    </Card>
  );
}

/**
 * KPI tile (Material 3 tonal): value `t-title` tabular over a `t-caption`
 * label, optional tinted icon chip. `featured` = the page's ONE terracotta
 * surface, reserved for the hero number (`t-display`).
 */
function StatTile({
  label,
  value,
  caption,
  icon,
  featured = false,
}: {
  label: string;
  value: number | string;
  caption?: string;
  icon?: React.ReactNode;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <Card variant="featured" className="p-6">
        <p className="t-label text-tertiary-foreground/80">{label}</p>
        <p className="t-display mt-2 tabular-nums text-tertiary-foreground">{value}</p>
        {caption && <p className="t-caption mt-1 text-tertiary-foreground/80">{caption}</p>}
      </Card>
    );
  }
  return (
    <Card className="flex items-start gap-4 p-6">
      {icon && (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-rim [&>svg]:h-5 [&>svg]:w-5" aria-hidden>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="t-caption">{label}</p>
        <p className="t-title mt-1 tabular-nums">{value}</p>
        {caption && <p className="t-caption mt-1 truncate">{caption}</p>}
      </div>
    </Card>
  );
}

/** One segment of a segmented control (Apple HIG: the selected segment is the raised one). */
function Segment({ active, className, children, ...props }: ButtonProps & { active: boolean }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'outline' : 'ghost'}
      aria-pressed={active}
      className={cn('h-8', !active && 'shadow-none', className)}
      {...props}
    >
      {children}
    </Button>
  );
}

function toDate(val: any): Date | null {
  if (!val) return null;
  const d = val.toDate ? val.toDate() : new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/** Date block — the row's anchor (same tile as the planification rows). */
function DateBlock({ date }: { date: Date | null }) {
  return (
    <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-surface-3 py-1.5 text-center tabular-nums text-ink-2 shadow-rim">
      <span className="text-[11px] font-medium uppercase leading-none">{date ? format(date, 'MMM', { locale: fr }).replace('.', '') : '—'}</span>
      <span className="font-headline text-xl font-semibold leading-tight">{date ? format(date, 'd') : '—'}</span>
      <span className="text-[11px] leading-none">{date ? format(date, 'HH:mm') : ''}</span>
    </span>
  );
}

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
    return <DashboardSkeleton />;
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

  // Which preset the current range corresponds to (drives the segmented control only).
  const activePreset = useMemo<'today' | 'week' | 'month' | null>(() => {
    if (!dateFromFilter || !dateToFilter) return null;
    const today = startOfToday();
    if (!isSameDay(dateToFilter, today)) return null;
    if (isSameDay(dateFromFilter, today)) return 'today';
    if (isSameDay(dateFromFilter, startOfWeek(new Date(), { locale: fr }))) return 'week';
    if (isSameDay(dateFromFilter, startOfMonth(new Date()))) return 'month';
    return null;
  }, [dateFromFilter, dateToFilter]);

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
    return Object.entries(byCompagnie)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        fill: chartColors[index % chartColors.length],
      }));
  }, [filteredDossiers]);

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
    return <DashboardSkeleton />;
  }

  const renderChangementsPanel = (
    panelKey: string,
    logs: any[],
    actionFilter: string, setActionFilter: (v: string) => void,
    dateFilter: string, setDateFilter: (v: string) => void,
    userFilter: string, setUserFilter: (v: string) => void,
    natureFilter: string, setNatureFilter: (v: string) => void,
  ) => {
    const filtersActive = !!dateFilter || userFilter !== 'all' || actionFilter !== 'all' || natureFilter !== 'all';
    return (
      <Section
        title="Changements récents"
        count={logs.length}
        flush
        className="h-fit"
        actions={<span className="t-caption truncate">{actionFilterLabels[actionFilter]}</span>}
      >
        {/* Filter row: plain controls on a hairline, no well (Refactoring UI: fewer boxes). */}
        <div className="border-b border-hairline px-6 py-3">
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
              className="h-9"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9" aria-label="Type de changement">
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
              <SelectTrigger className="h-9" aria-label="Utilisateur">
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
              <SelectTrigger className="h-9" aria-label="Nature du dossier">
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
          {filtersActive && (
            <div className="mt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setDateFilter('');
                  setUserFilter('all');
                  setActionFilter('all');
                  setNatureFilter('all');
                }}
              >
                <X className="h-3.5 w-3.5" /> Réinitialiser
              </Button>
            </div>
          )}
        </div>

        {/* Event list: hairline rows with the date block as the row anchor
            (same convention as the planification rows). */}
        <div className="max-h-[520px] overflow-y-auto px-6">
          {logs.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="Aucune activité récente"
              description="Les changements apparaîtront ici au fil de l'activité."
              dashed={false}
              className="my-4 bg-transparent py-6"
            />
          ) : (
            <ol className="divide-y divide-hairline">
              {logs.map((log: any) => {
                const dossier = dossierMap[log._dossierId];
                const dossierLabel = log.dossierRef || dossier?.refExpert || '';
                const isNew = isNewLog(log);
                const done = log.status === 'done';
                return (
                  <li key={`${panelKey}-${log.id}`} className="flex items-start gap-4 py-4">
                    <DateBlock date={toDate(log.date)} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={cn('h-2 w-2 shrink-0 rounded-full', done ? 'bg-status-success-fg' : 'bg-status-warning-fg')}
                          title={done ? 'Terminé' : 'En cours'}
                          aria-hidden
                        />
                        <p className="min-w-0 text-sm font-semibold leading-snug text-ink">{log.action}</p>
                        {isNew && (
                          <span className="inline-flex h-5 items-center rounded-full bg-status-info-bg px-2 text-[11px] font-medium text-status-info-fg">
                            Nouveau
                          </span>
                        )}
                      </div>
                      {dossierLabel && (
                        <p className="t-mono flex items-center gap-1.5">
                          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                          {dossierLabel}
                        </p>
                      )}
                      {log.details && (
                        <p className="t-caption leading-snug">{log.details}</p>
                      )}
                      <p className="t-caption">
                        par <span className="font-medium text-ink-2">{log.user || 'Admin'}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </Section>
    );
  };

  // ── Sub-renders ─────────────────────────────────────────────────────
  const filteredStatusRows = statusBarData.filter((item) =>
    item.name.toLowerCase().includes(statusFilterSearch.toLowerCase().trim())
  );

  const filteredCount = filteredDossiers.length;
  const rangeLabel = (!dateFromFilter && !dateToFilter)
    ? 'au total'
    : `du ${dateFromFilter ? format(dateFromFilter, 'dd/MM/yyyy', { locale: fr }) : '—'} au ${dateToFilter ? format(dateToFilter, 'dd/MM/yyyy', { locale: fr }) : '—'}`;

  // Period filters live in the page header (Atlassian page-header anatomy),
  // not inside the featured card — the card is for the number, not controls.
  const periodFilters = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex h-10 items-center gap-1 self-end rounded-md bg-surface-2 p-0.5" role="group" aria-label="Période">
        <Segment
          active={activePreset === 'today'}
          onClick={() => {
            const today = startOfToday();
            setDateFromFilter(today);
            setDateToFilter(today);
          }}
        >
          Aujourd&apos;hui
        </Segment>
        <Segment
          active={activePreset === 'week'}
          onClick={() => {
            setDateFromFilter(startOfWeek(new Date(), { locale: fr }));
            setDateToFilter(startOfToday());
          }}
        >
          Semaine
        </Segment>
        <Segment
          active={activePreset === 'month'}
          onClick={() => {
            setDateFromFilter(startOfMonth(new Date()));
            setDateToFilter(startOfToday());
          }}
        >
          Mois
        </Segment>
      </div>
      <div className="flex flex-col gap-1">
        <label className="t-label">Du</label>
        <DatePicker
          value={dateFromFilter ?? null}
          onChange={(d) => setDateFromFilter(d ?? undefined)}
          placeholder="Date de début"
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="t-label">Au</label>
        <DatePicker
          value={dateToFilter ?? null}
          onChange={(d) => setDateToFilter(d ?? undefined)}
          placeholder="Date de fin"
          className="w-40"
        />
      </div>
      {(dateFromFilter || dateToFilter) && (
        <Button
          type="button"
          variant="ghost"
          className="h-10"
          onClick={() => {
            setDateFromFilter(undefined);
            setDateToFilter(undefined);
          }}
        >
          <X className="h-4 w-4" /> Effacer
        </Button>
      )}
    </div>
  );

  // KPI row: the ONE featured (terracotta) surface carries the hero number;
  // the two secondary figures are tonal tiles.
  const kpiRow = (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatTile featured label="Dossiers créés" value={filteredCount} caption={rangeLabel} />
      <StatTile
        icon={<Layers />}
        label="Statuts actifs"
        value={statusChartData.length}
        caption={`sur ${statusBarData.length} statuts`}
      />
      <StatTile
        icon={<Building2 />}
        label="Compagnies"
        value={compagnieData.length}
        caption={compagnieData[0] ? `${compagnieData[0].name} en tête` : 'aucune donnée'}
      />
    </div>
  );

  const filterCard = (
    <Section
      title="Dossiers par état"
      flush
      className="h-fit overflow-hidden"
      bodyClassName="max-h-[520px] overflow-y-auto"
      actions={
        <div className="relative w-44 max-w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input
            placeholder="Rechercher un statut"
            aria-label="Rechercher un statut"
            value={statusFilterSearch}
            onChange={(e) => setStatusFilterSearch(e.target.value)}
            className="h-8 pl-8"
          />
        </div>
      }
    >
      {filteredStatusRows.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="Aucun statut"
          description="Affinez votre recherche pour voir les statuts."
          dashed={false}
          className="m-6 bg-transparent py-8"
        />
      ) : (
        // Selectable rows (NN/g list selection): accent bar + surface step for
        // the selected row; counts as quiet neutral pills.
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
                    'flex min-h-[44px] w-full items-center justify-between gap-3 border-l-2 px-6 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    isSelected ? 'border-l-primary bg-surface-3' : 'border-l-transparent hover:bg-surface-2',
                  )}
                >
                  <span className={cn('truncate', isSelected ? 'font-semibold text-ink' : isEmpty ? 'text-ink-3' : 'text-ink-2')}>{item.name}</span>
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums',
                      isSelected ? 'bg-accent text-accent-foreground' : isEmpty ? 'bg-surface-2 text-ink-4' : 'bg-surface-3 text-ink-2',
                    )}
                  >
                    {item.value}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );

  const pieCard = (
    <Section title="Volume par statut" className="h-fit">
      {statusChartData.length === 0 ? (
        <EmptyState
          icon={<PieChartIcon />}
          title="Aucune donnée"
          description="Les statistiques apparaîtront dès qu'un dossier sera créé."
          dashed={false}
          className="bg-transparent py-10"
        />
      ) : (
        <>
          <ChartContainer config={statusBarConfig} className="mx-auto aspect-square max-h-[280px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent indicator="line" className="bg-popover" />} />
              <Pie
                data={statusChartData}
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
                  const RADIAN = Math.PI / 180;
                  const pct = `${(percent * 100).toFixed(0)}%`;
                  const outside = statusChartData.length > 4;
                  const radius = outside ? outerRadius + 24 : outerRadius * 0.55;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill={outside ? 'hsl(var(--ink-3))' : 'hsl(var(--card))'}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={12}
                      fontWeight={600}
                    >
                      {pct}
                    </text>
                  );
                }}
                labelLine={statusChartData.length > 4 ? { stroke: 'hsl(var(--hairline-strong))' } : false}
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-status-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {statusChartData.map((item) => (
              <li key={item.name} className="t-caption flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} aria-hidden />
                <span>{item.name}</span>
                <span className="font-semibold tabular-nums text-ink">{item.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );

  const filteredTableCard = (
    <Section
      title="Dossiers"
      count={dossiersByStatus.length}
      flush
      className="h-fit overflow-hidden"
      actions={
        <>
          {selectedStatus && (
            <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(selectedStatus))}>
              {selectedStatus}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedStatus(null)}>
            <X className="h-4 w-4" /> Fermer
          </Button>
        </>
      }
    >
      {/* The Table primitive owns the scroll region: cap ITS height so the
          sticky header sticks to the element that actually scrolls. */}
      <div className="[&>div]:max-h-[560px]">
        <Table regionLabel="Dossiers du statut sélectionné">
          <TableHeader className="sticky top-0 z-[1] bg-card">
            <TableRow className="hover:bg-transparent">
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-auto whitespace-normal p-0">
                  <EmptyState
                    icon={<FolderOpen />}
                    title="Aucun dossier avec ce statut"
                    dashed={false}
                    className="m-6 bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            ) : (
              dossiersByStatus.map((dossier) => (
                <TableRow key={dossier.id} className="group">
                  <TableCell>
                    <Link href={`/dossiers/${dossier.id}`} className="t-mono font-semibold hover:underline">
                      {dossier.refExpert || 'N/A'}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate font-semibold text-ink">{renderAssure(dossier.assure)}</TableCell>
                  <TableCell className="text-ink-2">{dossier.compagnie || <span className="text-ink-4">—</span>}</TableCell>
                  <TableCell className="text-ink-2">{dossier.nature || <span className="text-ink-4">—</span>}</TableCell>
                  <TableCell className="font-mono text-ink-2">{dossier.matricule || <span className="font-body text-ink-4">—</span>}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(dossier.statut))}>
                      {!dossier.statut || dossier.statut === 'Création dossier' ? 'Création de mission' : dossier.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-ink-3">
                    {formatDate(dossier.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Section>
  );

  return (
    <div className="flex-1 space-y-8 animate-fade-in motion-reduce:animate-none">
      <PageHeader title={titleForRoute('/dashboard') ?? 'Tableau de bord'} filters={periodFilters} />

      {/* 1 — KPI row: hero number on the featured tile + two tonal tiles */}
      {kpiRow}

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
          <Section title="Répartition par compagnie" className="h-fit">
            {compagnieData.length === 0 ? (
              <EmptyState
                icon={<BarChart3 />}
                title="Aucune donnée"
                description="La répartition apparaîtra dès qu'un dossier sera créé."
                dashed={false}
                className="bg-transparent py-10"
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
                  <CartesianGrid horizontal={false} stroke="hsl(var(--hairline))" strokeDasharray="3 3" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--ink-3))' }}
                    width={104}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--ink-3))' }}
                    allowDecimals={false}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" className="bg-popover" />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22} isAnimationActive={true} animationBegin={100} animationDuration={600} animationEasing="ease-out">
                    {compagnieData.map((entry, index) => (
                      <Cell key={`cell-comp-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </Section>
          {selectedStatus !== null && pieCard}
        </div>
      </div>
    </div>
  );
}
