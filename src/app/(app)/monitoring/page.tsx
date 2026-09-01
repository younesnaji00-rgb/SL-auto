'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { Activity, Gauge, Building2, Users, RotateCcw, Search, Clock, FolderOpen } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCompagnies } from '@/hooks/use-compagnies';
import { Card } from '@/components/ui/card';
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
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roles } from '@/lib/dossiers-data';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, titleForRoute } from '@/lib/nav-groups';

import {
  STEP_KEYS,
  STEP_LABELS,
  STEP_LABELS_SHORT,
  computePerCompagnieCounts,
  computePerUserCounts,
  computeStepCounts,
  computeStepCountsHorsDelai,
  computeStepCountsRealiseAllTime,
  dossiersForStep,
  dossiersHorsDelai,
  dossiersNotForStep,
  type FunnelDossier,
  type StepKey,
  type WorkflowLog,
} from './funnel';

type DrawerMode = 'realise' | 'nonRealise' | 'horsDelai';
import { DossierDrawer } from './dossier-drawer';

const tabular = { fontVariantNumeric: 'tabular-nums' as const };

/**
 * Heat-map background for numeric cells. Higher value within a column = deeper
 * ink tint (chart-1, the navy of the ink family — no hand-picked hue).
 */
const heatStyle = (value: number, max: number): React.CSSProperties | undefined => {
  if (!value || value <= 0 || max <= 0) return undefined;
  const intensity = Math.min(value / max, 1);
  const alpha = 0.06 + intensity * intensity * 0.3;
  return { backgroundColor: `hsl(var(--chart-1) / ${alpha})` };
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

const NAV_ITEM = NAV_ITEMS.find((i) => i.href === '/monitoring');

export default function MonitoringPage() {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const { compagnies: allCompagnies } = useCompagnies();

  const [dossiers, setDossiers] = useState<FunnelDossier[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; nom?: string; email?: string; role?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState<Date | null>(() => startOfDay(new Date()));
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

  const activePreset = useMemo<'jour' | 'semaine' | 'mois' | 'custom'>(() => {
    if (!dateFrom || !dateTo) return 'custom';
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    if (isSameDay(dateFrom, today) && isSameDay(dateTo, todayEnd)) return 'jour';
    const weekStart = startOfWeek(now, { locale: fr });
    if (isSameDay(dateFrom, weekStart) && isSameDay(dateTo, todayEnd)) return 'semaine';
    const monthStart = startOfMonth(now);
    if (isSameDay(dateFrom, monthStart) && isSameDay(dateTo, todayEnd)) return 'mois';
    return 'custom';
  }, [dateFrom, dateTo]);

  const applyJour = () => {
    setDateFrom(startOfDay(new Date()));
    setDateTo(endOfDay(new Date()));
  };
  const applySemaine = () => {
    setDateFrom(startOfWeek(new Date(), { locale: fr }));
    setDateTo(endOfDay(new Date()));
  };
  const applyMois = () => {
    setDateFrom(startOfMonth(new Date()));
    setDateTo(endOfDay(new Date()));
  };

  const globalCounts = useMemo(() => computeStepCounts(dossiers, range), [dossiers, range]);
  const globalHorsDelaiCounts = useMemo(
    () => computeStepCountsHorsDelai(dossiers),
    [dossiers],
  );
  const globalRealiseAllTime = useMemo(
    () => computeStepCountsRealiseAllTime(dossiers),
    [dossiers],
  );
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
    if (selectedStepMode === 'horsDelai') {
      return dossiersHorsDelai(dossiers, workflowLogs, selectedStep);
    }
    if (selectedStepMode === 'nonRealise') {
      return dossiersNotForStep(dossiers, workflowLogs, selectedStep);
    }
    return dossiersForStep(dossiers, workflowLogs, range, selectedStep);
  }, [selectedStep, selectedStepMode, dossiers, workflowLogs, range]);

  const totalDossiersInScope = dossiers.length;

  const resetRange = () => {
    setDateFrom(startOfDay(new Date()));
    setDateTo(endOfDay(new Date()));
  };

  const rangeFilters = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex h-10 items-center gap-1 self-end rounded-md bg-surface-2 p-0.5" role="group" aria-label="Période">
        <Segment active={activePreset === 'jour'} onClick={applyJour}>Jour</Segment>
        <Segment active={activePreset === 'semaine'} onClick={applySemaine}>Semaine</Segment>
        <Segment active={activePreset === 'mois'} onClick={applyMois}>Mois</Segment>
        <Segment active={activePreset === 'custom'} disabled>Personnalisé</Segment>
      </div>
      <div className="flex flex-col gap-1">
        <label className="t-label">Du</label>
        <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Date de début" className="w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="t-label">Au</label>
        <DatePicker value={dateTo} onChange={setDateTo} placeholder="Date de fin" className="w-40" />
      </div>
      <Button variant="outline" onClick={resetRange} className="h-10">
        <RotateCcw className="h-4 w-4" />
        Réinitialiser
      </Button>
    </div>
  );

  return (
    // The Tabs root wraps the header so the tab strip can live in the
    // PageHeader `tabs` slot (DESIGN.md §2: title → tabs → filters).
    <Tabs defaultValue="global" className="space-y-8">
      <PageHeader
        title={titleForRoute('/monitoring') ?? "Suivi d'équipe"}
        subtitle={NAV_ITEM?.subtitle}
        tabs={
          <TabsList>
            <TabsTrigger value="global" className="gap-2">
              <Gauge className="h-4 w-4" aria-hidden />
              Global
            </TabsTrigger>
            <TabsTrigger value="compagnie" className="gap-2">
              <Building2 className="h-4 w-4" aria-hidden />
              Par compagnie
            </TabsTrigger>
            <TabsTrigger value="user" className="gap-2">
              <Users className="h-4 w-4" aria-hidden />
              Par utilisateur
            </TabsTrigger>
          </TabsList>
        }
        filters={rangeFilters}
      />

      <TabsContent value="global" className="mt-0 space-y-6">
        {loading ? (
          <GlobalSkeleton />
        ) : (
          <GlobalView
            counts={globalCounts}
            horsDelaiCounts={globalHorsDelaiCounts}
            realiseAllTimeCounts={globalRealiseAllTime}
            totalDossiers={totalDossiersInScope}
            loading={loading}
            onSelectStep={openDrawer}
          />
        )}
      </TabsContent>

      <TabsContent value="compagnie" className="mt-0 space-y-6">
        <CompagnieView rows={perCompagnie} loading={loading} />
      </TabsContent>

      <TabsContent value="user" className="mt-0 space-y-6">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="t-label">Rôle</label>
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
            <label className="t-label">Utilisateur</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
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

      <DossierDrawer
        open={selectedStep != null}
        onOpenChange={(v) => !v && setSelectedStep(null)}
        step={selectedStep}
        mode={selectedStepMode}
        rows={drawerRows}
        userLookup={userLookup}
      />
    </Tabs>
  );
}

function GlobalView({
  counts,
  horsDelaiCounts,
  realiseAllTimeCounts,
  totalDossiers,
  loading,
  onSelectStep,
}: {
  counts: Record<StepKey, number>;
  horsDelaiCounts: Record<StepKey, number>;
  realiseAllTimeCounts: Record<StepKey, number>;
  totalDossiers: number;
  loading: boolean;
  onSelectStep: (step: StepKey, mode: DrawerMode) => void;
}) {
  const chartData = STEP_KEYS.map((key) => ({
    step: STEP_LABELS_SHORT[key],
    value: counts[key],
  }));

  const chartConfig = {
    value: { label: 'Dossiers', color: 'hsl(var(--chart-1))' },
  };

  // Headline figures derived from the same counts the rows show.
  const totalEnDelai = STEP_KEYS.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
  const totalHorsDelai = STEP_KEYS.reduce((sum, k) => sum + (horsDelaiCounts[k] ?? 0), 0);

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
      {/* KPI row: the ONE featured (terracotta) surface carries the hero
          number; the two secondary figures are tonal tiles. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile featured label="Étapes franchies en délai" value={totalEnDelai} caption="sur la période sélectionnée" />
        <StatTile icon={<Clock />} label="Hors délai" value={totalHorsDelai} caption="toutes périodes confondues" />
        <StatTile icon={<FolderOpen />} label="Dossiers en périmètre" value={totalDossiers} caption="compagnies assignées" />
      </div>

      {/* Funnel as a step list (GOV.UK step-by-step): ordinal medallion as
          the row anchor, the step's figure as the value, a stacked bar whose
          segments open the matching drawer. */}
      <Section title="Avancement par étape" flush>
        <ol className="divide-y divide-hairline">
          {STEP_KEYS.map((key, idx) => {
            const realiseEnDelai = counts[key];
            const horsDelai = horsDelaiCounts[key] ?? 0;
            const realiseAllTime = realiseAllTimeCounts[key] ?? 0;
            const nonRealise =
              key === 'creation' ? null : Math.max(totalDossiers - realiseAllTime, 0);
            return (
              <FunnelRow
                key={key}
                index={idx + 1}
                label={STEP_LABELS[key]}
                realiseEnDelai={realiseEnDelai}
                horsDelai={horsDelai}
                nonRealise={nonRealise}
                total={totalDossiers}
                onSelectRealise={() => onSelectStep(key, 'realise')}
                onSelectHorsDelai={() => onSelectStep(key, 'horsDelai')}
                onSelectNonRealise={() => onSelectStep(key, 'nonRealise')}
              />
            );
          })}
        </ol>
      </Section>

      <Section title="Volume par étape">
        {chartData.every((d) => d.value === 0) ? (
          <EmptyState
            title="Aucune activité dans cette plage"
            description="Aucun dossier n'a réalisé une étape dans la période sélectionnée."
            dashed={false}
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--hairline))" />
              <XAxis dataKey="step" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--ink-3))' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--ink-3))' }} allowDecimals={false} />
              <ChartTooltip cursor={{ fill: 'hsl(var(--surface-2))' }} content={<ChartTooltipContent className="bg-popover" />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </Section>
    </>
  );
}

type FunnelSegment = {
  key: DrawerMode;
  label: string;
  count: number;
  pct: number;
  fillClass: string;
  onClick: () => void;
};

function FunnelRow({
  index,
  label,
  realiseEnDelai,
  horsDelai,
  nonRealise,
  total,
  onSelectRealise,
  onSelectHorsDelai,
  onSelectNonRealise,
}: {
  index: number;
  label: string;
  realiseEnDelai: number;
  horsDelai: number;
  nonRealise: number | null;
  total: number;
  onSelectRealise: () => void;
  onSelectHorsDelai: () => void;
  onSelectNonRealise: () => void;
}) {
  const denominator = total <= 0 ? 1 : total;
  const segments: FunnelSegment[] = [
    {
      key: 'realise',
      label: 'en délai',
      count: realiseEnDelai,
      pct: (realiseEnDelai / denominator) * 100,
      fillClass: 'bg-status-success-fg',
      onClick: onSelectRealise,
    },
    {
      key: 'horsDelai',
      label: 'hors délai',
      count: horsDelai,
      pct: (horsDelai / denominator) * 100,
      fillClass: 'bg-status-warning-fg',
      onClick: onSelectHorsDelai,
    },
  ];
  if (nonRealise != null) {
    segments.push({
      key: 'nonRealise',
      label: 'non réalisé',
      count: nonRealise,
      pct: (nonRealise / denominator) * 100,
      fillClass: 'bg-ink-4',
      onClick: onSelectNonRealise,
    });
  }

  return (
    <li className="flex items-start gap-4 px-6 py-4">
      {/* Ordinal medallion — the row's anchor (tinted + light contour). */}
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-3 font-headline text-base font-semibold text-ink-2 shadow-rim"
        style={tabular}
        aria-hidden
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="min-w-0 text-sm font-semibold text-ink">{label}</p>
          <p className="t-title tabular-nums">
            {realiseEnDelai}
            <span className="t-caption ml-1.5 font-body">en délai</span>
          </p>
        </div>
        {/* Stacked share of the scope; each segment is a drawer target. */}
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-surface-3" aria-hidden>
          {segments.map((s) =>
            s.pct > 0 ? (
              <button
                key={s.key}
                type="button"
                tabIndex={-1}
                onClick={s.onClick}
                className={cn('h-full transition-opacity hover:opacity-80', s.fillClass)}
                style={{ width: `${s.pct}%` }}
                title={`${s.label} : ${s.count}`}
              />
            ) : null,
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {segments.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={s.onClick}
              className="t-caption inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={cn('h-2 w-2 shrink-0 rounded-sm', s.fillClass)} aria-hidden />
              <span>{s.label}</span>
              <span className="font-semibold tabular-nums text-ink">{s.count}</span>
            </button>
          ))}
        </div>
      </div>
    </li>
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

  if (loading) return <TablePaperSkeleton />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Building2 />}
        title="Aucune compagnie à afficher"
        description="Aucun dossier n'est rattaché à une compagnie dans votre périmètre."
      />
    );
  }

  // The tab label already names this table (blueprint §4: no repeated
  // titles) — the paper holds the table alone.
  return (
    <Card className="overflow-hidden">
      <Table regionLabel="Répartition par compagnie">
        <TableHeader className="sticky top-0 z-[1] bg-card">
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[12rem] pl-6">Compagnie</TableHead>
            {STEP_KEYS.map((key) => (
              <TableHead key={key} className="text-center">
                {STEP_LABELS_SHORT[key]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ compagnie, counts }) => (
            <TableRow key={compagnie}>
              <TableCell className="pl-6 font-semibold">{compagnie}</TableCell>
              {STEP_KEYS.map((key) => {
                const v = counts[key];
                return (
                  <TableCell
                    key={key}
                    className="text-center font-semibold"
                    style={{ ...tabular, ...heatStyle(v, columnMax[key]) }}
                  >
                    {v || <span className="font-normal text-ink-4">—</span>}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

  if (loading) return <TablePaperSkeleton />;
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
    <Card className="overflow-hidden">
      <Table regionLabel="Activité par utilisateur">
        <TableHeader className="sticky top-0 z-[1] bg-card">
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[14rem] pl-6">Utilisateur</TableHead>
            {STEP_KEYS.map((key) => (
              <TableHead key={key} className="text-center">
                {STEP_LABELS_SHORT[key]}
              </TableHead>
            ))}
            <TableHead className="text-center">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const displayName = resolveUserName(r.user, userLookup);
            return (
              <TableRow key={r.user}>
                <TableCell className="pl-6 font-semibold">{displayName}</TableCell>
                {STEP_KEYS.map((key) => {
                  const v = r.realise[key];
                  return (
                    <TableCell
                      key={key}
                      className="text-center"
                      style={{ ...tabular, ...heatStyle(v, columnMax.realise[key]) }}
                    >
                      {v || <span className="text-ink-4">—</span>}
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
    </Card>
  );
}

/** Global tab placeholder shaped like the final layout: KPI row + step rows. */
function GlobalSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="paper-featured space-y-2 p-6">
          <Skeleton className="h-3 w-32 bg-tertiary-foreground/15" />
          <Skeleton className="h-8 w-16 bg-tertiary-foreground/15" />
          <Skeleton className="h-3 w-40 bg-tertiary-foreground/15" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="paper flex items-start gap-4 p-6">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="paper">
        <div className="flex h-12 items-center border-b border-hairline px-6">
          <Skeleton className="h-4 w-44" />
        </div>
        <ul className="divide-y divide-hairline">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-start gap-4 px-6 py-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-56" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Paper-shaped table placeholder (header row + hairline rows) used while a tab loads. */
function TablePaperSkeleton() {
  return (
    <div className="paper overflow-hidden" aria-busy="true" aria-live="polite">
      <div className="flex h-10 items-center gap-6 border-b border-hairline bg-surface-2 px-6">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-12" />
        ))}
      </div>
      <ul className="divide-y divide-hairline">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex h-11 items-center gap-6 px-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
          </li>
        ))}
      </ul>
    </div>
  );
}
