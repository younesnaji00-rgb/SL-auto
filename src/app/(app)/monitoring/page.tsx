'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { Activity, Gauge, Building2, Users, RotateCcw, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { startOfDay, endOfDay, subDays } from 'date-fns';

import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCompagnies } from '@/hooks/use-compagnies';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard, SkeletonChart } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roles } from '@/lib/dossiers-data';

import {
  STEP_KEYS,
  STEP_LABELS,
  STEP_LABELS_SHORT,
  computePerCompagnieCounts,
  computePerUserCounts,
  computeStepCounts,
  dossiersForStep,
  dossiersNotForStep,
  type FunnelDossier,
  type StepKey,
  type WorkflowLog,
} from './funnel';

type DrawerMode = 'realise' | 'nonRealise';
import { DossierDrawer } from './dossier-drawer';

const tabular = { fontVariantNumeric: 'tabular-nums' as const };

/**
 * Heat-map background for numeric cells. Higher value within a column = greener.
 */
const heatStyle = (value: number, max: number): React.CSSProperties | undefined => {
  if (!value || value <= 0 || max <= 0) return undefined;
  const intensity = Math.min(value / max, 1);
  const alpha = 0.08 + intensity * intensity * 0.42;
  return { backgroundColor: `hsla(150, 55%, 45%, ${alpha})` };
};

interface UserLookup {
  byKey: Map<string, string>;
  roleByKey: Map<string, string>;
}

const ROLE_FILTER_ALL = 'Tous';

const SYSTEM_LABELS: Record<string, string> = {
  system: 'Système',
  'admin-guest': 'Invité (admin)',
  unknown: 'Inconnu',
};

const resolveUserName = (raw: string, lookup: UserLookup): string => {
  if (!raw) return SYSTEM_LABELS.unknown;
  const trimmed = raw.trim();
  if (SYSTEM_LABELS[trimmed]) return SYSTEM_LABELS[trimmed];
  const direct = lookup.byKey.get(trimmed);
  if (direct) return direct;
  const lower = lookup.byKey.get(trimmed.toLowerCase());
  if (lower) return lower;
  if (trimmed.includes('@')) return trimmed.split('@')[0];
  if (trimmed.length > 16) return `${trimmed.slice(0, 6)}…`;
  return trimmed;
};

export default function MonitoringPage() {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const { compagnies: allCompagnies } = useCompagnies();

  const [dossiers, setDossiers] = useState<FunnelDossier[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; nom?: string; email?: string; role?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState<Date | null>(() => subDays(startOfDay(new Date()), 6));
  const [dateTo, setDateTo] = useState<Date | null>(() => endOfDay(new Date()));
  const [selectedStep, setSelectedStep] = useState<StepKey | null>(null);
  const [selectedStepMode, setSelectedStepMode] = useState<DrawerMode>('realise');
  const [roleFilter, setRoleFilter] = useState<string>(ROLE_FILTER_ALL);
  const [userSearch, setUserSearch] = useState<string>('');

  const openDrawer = (step: StepKey, mode: DrawerMode) => {
    setSelectedStep(step);
    setSelectedStepMode(mode);
  };

  useEffect(() => {
    if (!db) return;
    const allowedLower = (profile?.compagnies || []).map((c: string) => c.toLowerCase().trim());

    const qDossiers = query(collection(db, 'dossiers'), orderBy('createdAt', 'desc'));
    const unsubDossiers = onSnapshot(
      qDossiers,
      (snap) => {
        let data: FunnelDossier[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (allowedLower.length > 0) {
          data = data.filter((d) => allowedLower.includes((d.compagnie || '').toLowerCase().trim()));
        }
        setDossiers(data);
        setLoading(false);
      },
      (err) => {
        console.error('Monitoring dossier sync error:', err);
        setLoading(false);
      },
    );

    const qWorkflow = query(collectionGroup(db, 'workflow'), orderBy('date', 'desc'));
    const unsubWorkflow = onSnapshot(
      qWorkflow,
      (snap) => {
        const logs: WorkflowLog[] = snap.docs.map((d) => ({
          ...(d.data() as any),
          _dossierId: d.ref.parent.parent?.id || '',
        }));
        setWorkflowLogs(logs);
      },
      (err) => {
        console.warn('Monitoring workflow sync error:', err);
      },
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => {
        console.warn('Monitoring users sync error:', err);
      },
    );

    return () => {
      unsubDossiers();
      unsubWorkflow();
      unsubUsers();
    };
  }, [db, profile]);

  const userLookup = useMemo<UserLookup>(() => {
    const byKey = new Map<string, string>();
    const roleByKey = new Map<string, string>();
    for (const u of users) {
      const name = (u.nom || u.email || '').trim();
      const role = (u.role || '').trim();
      if (!name && !role) continue;
      if (u.id) {
        if (name) byKey.set(u.id, name);
        if (role) roleByKey.set(u.id, role);
      }
      if (u.email) {
        if (name) {
          byKey.set(u.email, name);
          byKey.set(u.email.toLowerCase(), name);
        }
        if (role) {
          roleByKey.set(u.email, role);
          roleByKey.set(u.email.toLowerCase(), role);
        }
      }
    }
    return { byKey, roleByKey };
  }, [users]);

  const range = useMemo(
    () => ({
      from: dateFrom ? startOfDay(dateFrom) : undefined,
      to: dateTo ? endOfDay(dateTo) : undefined,
    }),
    [dateFrom, dateTo],
  );

  const globalCounts = useMemo(() => computeStepCounts(dossiers, range), [dossiers, range]);
  const scopedCompagnieNames = useMemo(() => {
    const allowed = (profile?.compagnies || []).map((c: string) => c.toLowerCase().trim());
    const names = allCompagnies.map((c) => c.nom).filter((n): n is string => !!n);
    if (allowed.length === 0) return names;
    return names.filter((n) => allowed.includes(n.toLowerCase().trim()));
  }, [allCompagnies, profile]);
  const perCompagnie = useMemo(
    () => computePerCompagnieCounts(dossiers, range, scopedCompagnieNames),
    [dossiers, range, scopedCompagnieNames],
  );
  const perUser = useMemo(
    () => computePerUserCounts(dossiers, workflowLogs, range),
    [dossiers, workflowLogs, range],
  );
  // Merge rows that resolve to the same display name (e.g. one row keyed by
  // Firebase UID for `createdBy` + another row keyed by email for
  // `lastStatusChange.by` are the same person).
  const dedupedPerUser = useMemo(() => {
    const merged = new Map<string, {
      user: string;
      role?: string;
      realise: Record<StepKey, number>;
      totalRealise: number;
    }>();
    for (const r of perUser) {
      const name = resolveUserName(r.user, userLookup);
      const trimmed = (r.user || '').trim();
      const role =
        userLookup.roleByKey.get(trimmed) ??
        userLookup.roleByKey.get(trimmed.toLowerCase()) ??
        undefined;
      const existing = merged.get(name);
      if (existing) {
        for (const key of STEP_KEYS) {
          existing.realise[key] += r.realise[key];
        }
        existing.totalRealise += r.totalRealise;
        if (!existing.role && role) existing.role = role;
      } else {
        merged.set(name, {
          user: name,
          role,
          realise: { ...r.realise },
          totalRealise: r.totalRealise,
        });
      }
    }
    // Surface every user from the users collection — even those with no
    // activity in scope appear as a zero-count row.
    for (const u of users) {
      const name = (u.nom || u.email || '').trim();
      if (!name) continue;
      if (merged.has(name)) {
        if (!merged.get(name)!.role && u.role) {
          merged.get(name)!.role = u.role;
        }
        continue;
      }
      merged.set(name, {
        user: name,
        role: u.role,
        realise: STEP_KEYS.reduce((acc, k) => {
          acc[k] = 0;
          return acc;
        }, {} as Record<StepKey, number>),
        totalRealise: 0,
      });
    }
    return Array.from(merged.values()).sort((a, b) => b.totalRealise - a.totalRealise);
  }, [perUser, userLookup, users]);

  const filteredPerUser = useMemo(() => {
    let rows = dedupedPerUser;
    if (roleFilter !== ROLE_FILTER_ALL) {
      rows = rows.filter((r) => r.role === roleFilter);
    }
    const q = userSearch.toLowerCase().trim();
    if (q) {
      rows = rows.filter((r) => r.user.toLowerCase().includes(q));
    }
    return rows;
  }, [dedupedPerUser, roleFilter, userSearch]);
  const drawerRows = useMemo(() => {
    if (!selectedStep) return [];
    if (selectedStepMode === 'nonRealise') {
      return dossiersNotForStep(dossiers, workflowLogs, selectedStep);
    }
    return dossiersForStep(dossiers, workflowLogs, range, selectedStep);
  }, [selectedStep, selectedStepMode, dossiers, workflowLogs, range]);

  const totalDossiersInScope = dossiers.length;

  const resetRange = () => {
    setDateFrom(subDays(startOfDay(new Date()), 6));
    setDateTo(endOfDay(new Date()));
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight">Suivi d'équipe</h1>
          <p className="text-sm text-muted-foreground">
            Funnel des étapes — combien de dossiers ont franchi chaque étape.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Du</label>
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Date de début" className="w-44" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Au</label>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="Date de fin" className="w-44" />
          </div>
          <Button variant="outline" size="sm" onClick={resetRange} className="h-10">
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </header>

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global" className="gap-2">
            <Gauge className="h-4 w-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="compagnie" className="gap-2">
            <Building2 className="h-4 w-4" />
            Par compagnie
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-2">
            <Users className="h-4 w-4" />
            Par utilisateur
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: STEP_KEYS.length }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <GlobalView
              counts={globalCounts}
              totalDossiers={totalDossiersInScope}
              loading={loading}
              onSelectStep={openDrawer}
            />
          )}
        </TabsContent>

        <TabsContent value="compagnie" className="space-y-4">
          <CompagnieView rows={perCompagnie} loading={loading} />
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rôle</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-10 w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLE_FILTER_ALL}>Tous les rôles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Utilisateur</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur…"
                  className="h-10 w-64 pl-8"
                />
              </div>
            </div>
          </div>
          <UserView rows={filteredPerUser} loading={loading} userLookup={userLookup} />
        </TabsContent>
      </Tabs>

      <DossierDrawer
        open={selectedStep != null}
        onOpenChange={(v) => !v && setSelectedStep(null)}
        step={selectedStep}
        mode={selectedStepMode}
        rows={drawerRows}
        userLookup={userLookup}
      />
    </div>
  );
}

function GlobalView({
  counts,
  totalDossiers,
  loading,
  onSelectStep,
}: {
  counts: Record<StepKey, number>;
  totalDossiers: number;
  loading: boolean;
  onSelectStep: (step: StepKey, mode: DrawerMode) => void;
}) {
  const chartData = STEP_KEYS.map((key) => ({
    step: STEP_LABELS_SHORT[key],
    value: counts[key],
  }));

  const chartConfig = {
    value: { label: 'Dossiers', color: 'hsl(var(--chart-5))' },
  };

  if (totalDossiers === 0 && !loading) {
    return (
      <EmptyState
        icon={<Activity />}
        title="Aucun dossier dans votre périmètre"
        description="Aucune compagnie assignée n'a de dossiers à analyser."
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEP_KEYS.map((key, idx) => {
          const realise = counts[key];
          const nonRealise = key === 'creation' ? null : Math.max(totalDossiers - realise, 0);
          return (
            <KpiCard
              key={key}
              index={idx + 1}
              label={STEP_LABELS[key]}
              value={realise}
              nonRealise={nonRealise}
              onSelectRealise={() => onSelectStep(key, 'realise')}
              onSelectNonRealise={() => onSelectStep(key, 'nonRealise')}
            />
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume par étape</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.every((d) => d.value === 0) ? (
            <EmptyState
              title="Aucune activité dans cette plage"
              description="Aucun dossier n'a réalisé une étape dans la période sélectionnée."
            />
          ) : (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="step" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function KpiCard({
  index,
  label,
  value,
  nonRealise,
  onSelectRealise,
  onSelectNonRealise,
}: {
  index: number;
  label: string;
  value: number;
  nonRealise: number | null;
  onSelectRealise: () => void;
  onSelectNonRealise: () => void;
}) {
  return (
    <Card className="overflow-hidden transition hover:border-primary/40 hover:shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
            style={tabular}
          >
            {index}
          </span>
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <button
          type="button"
          onClick={onSelectRealise}
          className="block w-full rounded-md text-left transition hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Réalisé</div>
          <div className="text-3xl font-semibold text-foreground" style={tabular}>
            {value}
          </div>
        </button>
        {nonRealise != null && (
          <button
            type="button"
            onClick={onSelectNonRealise}
            className="block w-full rounded-md border border-amber-300/40 bg-amber-50/40 px-2 py-1 text-left transition hover:bg-amber-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-amber-700/30 dark:bg-amber-950/20 dark:hover:bg-amber-900/30"
          >
            <div className="text-[10px] uppercase tracking-wider text-amber-800/80 dark:text-amber-200/80">Non réalisé</div>
            <div className="text-lg font-semibold text-amber-900 dark:text-amber-100" style={tabular}>
              {nonRealise}
            </div>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function CompagnieView({
  rows,
  loading,
}: {
  rows: Array<{ compagnie: string; counts: Record<StepKey, number> }>;
  loading: boolean;
}) {
  const columnMax = useMemo(() => {
    const max: Record<StepKey, number> = STEP_KEYS.reduce((acc, k) => {
      acc[k] = 0;
      return acc;
    }, {} as Record<StepKey, number>);
    for (const r of rows) {
      for (const k of STEP_KEYS) {
        if (r.counts[k] > max[k]) max[k] = r.counts[k];
      }
    }
    return max;
  }, [rows]);

  if (loading) return <SkeletonChart />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Building2 />}
        title="Aucune compagnie à afficher"
        description="Aucun dossier n'est rattaché à une compagnie dans votre périmètre."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Répartition par compagnie</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[12rem]">Compagnie</TableHead>
              {STEP_KEYS.map((key) => (
                <TableHead key={key} className="text-center text-xs">
                  {STEP_LABELS_SHORT[key]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ compagnie, counts }) => (
              <TableRow key={compagnie} className="hover:bg-accent/30">
                <TableCell className="font-medium">{compagnie}</TableCell>
                {STEP_KEYS.map((key) => {
                  const v = counts[key];
                  return (
                    <TableCell
                      key={key}
                      className="text-center font-semibold"
                      style={{ ...tabular, ...heatStyle(v, columnMax[key]) }}
                    >
                      {v || <span className="font-normal text-muted-foreground/50">—</span>}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function UserView({
  rows,
  loading,
  userLookup,
}: {
  rows: Array<{
    user: string;
    realise: Record<StepKey, number>;
    totalRealise: number;
  }>;
  loading: boolean;
  userLookup: UserLookup;
}) {
  const columnMax = useMemo(() => {
    const realiseMax: Record<StepKey, number> = STEP_KEYS.reduce((acc, k) => {
      acc[k] = 0;
      return acc;
    }, {} as Record<StepKey, number>);
    let totalMax = 0;
    for (const r of rows) {
      for (const k of STEP_KEYS) {
        if (r.realise[k] > realiseMax[k]) realiseMax[k] = r.realise[k];
      }
      if (r.totalRealise > totalMax) totalMax = r.totalRealise;
    }
    return { realise: realiseMax, total: totalMax };
  }, [rows]);

  if (loading) return <SkeletonChart />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="Aucune activité utilisateur"
        description="Aucun utilisateur n'a réalisé d'étape dans la plage sélectionnée."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activité par utilisateur</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[14rem]">Utilisateur</TableHead>
              {STEP_KEYS.map((key) => (
                <TableHead key={key} className="text-center text-xs">
                  {STEP_LABELS_SHORT[key]}
                </TableHead>
              ))}
              <TableHead className="text-center text-xs">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const displayName = resolveUserName(r.user, userLookup);
              return (
                <TableRow key={r.user} className="hover:bg-accent/30">
                  <TableCell className="font-medium">{displayName}</TableCell>
                  {STEP_KEYS.map((key) => {
                    const v = r.realise[key];
                    return (
                      <TableCell
                        key={key}
                        className="text-center"
                        style={{ ...tabular, ...heatStyle(v, columnMax.realise[key]) }}
                      >
                        {v || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                    );
                  })}
                  <TableCell
                    className="text-center font-semibold"
                    style={{ ...tabular, ...heatStyle(r.totalRealise, columnMax.total) }}
                  >
                    {r.totalRealise}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
