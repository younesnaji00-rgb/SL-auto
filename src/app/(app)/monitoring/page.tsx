'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  Activity,
  Gauge,
  Building2,
  Users,
  RotateCcw,
  Search,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, isSameDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCompagnies } from '@/hooks/use-compagnies';
import { useHolidays } from '@/hooks/use-holidays';
import { cn } from '@/lib/utils';
import { scrollBehavior } from '@/lib/motion';
import { assureName } from '@/lib/dossier-label';
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
import { SlidingThumb } from '@/components/ui/sliding-thumb';
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

import {
  STEP_KEYS,
  STEP_LABELS,
  STEP_LABELS_SHORT,
  computeStepCountsRealiseAllTime,
  dossiersForStep,
  dossiersNotForStep,
  type FunnelDossier,
  type StepKey,
  type WorkflowLog,
} from './funnel';
import {
  STAGE_HAS_SLA,
  agingItems,
  buildSlaItems,
  computeCycleTimes,
  computeHeadline,
  computeStepMeasures,
  dossiersForStepMeasure,
  computePerCompagnieMeasures,
  computePerUserMeasures,
  computeWeeklyTrend,
  formatBusinessHours,
  type AgingItem,
  type ChiffrageAssignment,
  type TerrainMission,
  type CycleTimeRow,
  type GroupMeasures,
  type Headline,
  type WeekPoint,
} from './metrics';

type DrawerMode = 'realise' | 'nonRealise' | 'horsDelai';
import { DossierDrawer } from './dossier-drawer';

const tabular = { fontVariantNumeric: 'tabular-nums' as const };

type Vue = 'global' | 'compagnie' | 'user';
const VUES: Vue[] = ['global', 'compagnie', 'user'];

/**
 * The selected period, printed in the captions ("· 1–7 sept.") so a number two
 * screens below the filters still says which period it counts (NN/g sticky
 * headers: persistence only pays when the element is needed constantly — a
 * self-describing caption costs no screen space).
 */
const formatPeriodLabel = (from: Date | null, to: Date | null): string => {
  const thisYear = new Date().getFullYear();
  const day = (d: Date, withMonth: boolean) => {
    const pattern = withMonth ? (d.getFullYear() === thisYear ? 'd MMM' : 'd MMM yyyy') : 'd';
    return format(d, pattern, { locale: fr });
  };
  if (!from && !to) return 'toute la période';
  if (from && to) {
    if (isSameDay(from, to)) return day(from, true);
    const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
    return sameMonth ? `${day(from, false)}–${day(to, true)}` : `${day(from, true)} – ${day(to, true)}`;
  }
  if (from) return `depuis le ${day(from, true)}`;
  return `jusqu'au ${day(to as Date, true)}`;
};

/** Funnel step → dossier timeline section (`#step-N` anchors in dossier-timeline/timeline.tsx). */
const STEP_SECTION: Partial<Record<StepKey, number>> = {
  photosAvant: 4,
  photosEnCours: 9,
  photosApres: 10,
  accord: 11,
};

/** Cap for the exception list — beyond this the list is a report, not a to-do. */
const AGING_LIST_CAP = 50;

/**
 * First column frozen while the 13-column tables pan sideways (NN/g data
 * tables: freeze the header column when the table is wider than the screen).
 * Solid card so rows slide under it; the hairline marks the frozen edge.
 */
const STICKY_HEAD = 'sticky left-0 z-[2] min-w-[12rem] border-r border-hairline bg-card';
const STICKY_CELL =
  'sticky left-0 z-[1] border-r border-hairline bg-card font-medium [tr:hover_&]:bg-surface-2';

const emptyStepCounts = (): Record<StepKey, number> =>
  STEP_KEYS.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as Record<StepKey, number>);

/** On-time share over SLA stages (mirrors metrics.ts, recomputed after row merges). */
const respectOf = (
  enDelai: Record<StepKey, number>,
  horsDelai: Record<StepKey, number>,
): number | null => {
  let onTime = 0;
  let late = 0;
  for (const k of STEP_KEYS) {
    if (!STAGE_HAS_SLA[k]) continue;
    onTime += enDelai[k];
    late += horsDelai[k];
  }
  const n = onTime + late;
  return n === 0 ? null : Math.round((onTime / n) * 100);
};

/** The dossier objects come straight from Firestore — they carry refExpert / assure at runtime. */
const dossierRef = (d: FunnelDossier): string => {
  const raw = (d as any).refExpert;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : d.id;
};
const dossierAssure = (d: FunnelDossier): string => assureName((d as any).assure);

interface UserLookup {
  byKey: Map<string, string>;
  roleByKey: Map<string, string>;
}

interface UserRow {
  user: string;
  role?: string;
  enDelai: Record<StepKey, number>;
  horsDelai: Record<StepKey, number>;
  ouverts: number;
  totalEnDelai: number;
  respectPct: number | null;
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
  // The SLA sources (user ruling): chiffrage assignments + terrain missions.
  const [chiffrages, setChiffrages] = useState<ChiffrageAssignment[]>([]);
  const [missions, setMissions] = useState<TerrainMission[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; nom?: string; email?: string; role?: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Default = ALL TIME (owner ruling 2026-09-02 — no silent one-day scope);
  // « Tout » in the preset group brings it back after picking a period.
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [selectedStep, setSelectedStep] = useState<StepKey | null>(null);
  const [selectedStepMode, setSelectedStepMode] = useState<DrawerMode>('realise');
  const [roleFilter, setRoleFilter] = useState<string>(ROLE_FILTER_ALL);
  const [userSearch, setUserSearch] = useState<string>('');
  // The tab lives in the URL (`?vue=compagnie`) so it survives reload / back and
  // can be linked from a notification (NN/g tabs: the selected tab is addressable).
  const [vue, setVue] = useState<Vue>('global');
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('vue');
    if (v && (VUES as string[]).includes(v)) setVue(v as Vue);
  }, []);
  const changeVue = (next: Vue) => {
    setVue(next);
    const url = new URL(window.location.href);
    if (next === 'global') url.searchParams.delete('vue');
    else url.searchParams.set('vue', next);
    window.history.replaceState(window.history.state, '', url);
  };
  // « En retard aujourd'hui » → the list, whichever tab is open.
  const jumpToAging = () => {
    changeVue('global');
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.getElementById('a-traiter')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }),
      ),
    );
  };

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

    // Chiffrage assignments — same collection as the Chiffrage queue.
    const unsubChiffrages = onSnapshot(
      collection(db, 'chiffrages'),
      (snap) => {
        setChiffrages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => {
        console.warn('Monitoring chiffrages sync error:', err);
      },
    );
    // Terrain missions — the planifications of every dossier (collection group,
    // read-only rule in firestore.rules).
    const unsubMissions = onSnapshot(
      collectionGroup(db, 'planifications'),
      (snap) => {
        setMissions(
          snap.docs.map((d) => ({
            id: d.id,
            dossierId: d.ref.parent.parent?.id || '',
            ...(d.data() as any),
          })),
        );
      },
      (err) => {
        console.warn('Monitoring planifications sync error:', err);
      },
    );

    return () => {
      unsubDossiers();
      unsubWorkflow();
      unsubUsers();
      unsubChiffrages();
      unsubMissions();
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

  const activePreset = useMemo<'tout' | 'jour' | 'semaine' | 'mois' | 'custom'>(() => {
    if (!dateFrom && !dateTo) return 'tout';
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

  const applyTout = () => {
    setDateFrom(null);
    setDateTo(null);
  };
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

  // One "now" per data/range change so every "à ce jour" measure agrees.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [dossiers, range]);

  const holidays = useHolidays();
  // Every deadline on this page is one of these clocks (chiffrage assignment,
  // terrain mission, création) — the Chiffrage/Terrain queues' own SLA rule.
  // A clock is late the moment 24 h ouvrées pass without completion — closing it
  // later never clears it (user ruling); a period counts the clocks ACTIVE in it
  // (open or closed inside it), the same set the queues show.
  const sla = useMemo(() => buildSlaItems(dossiers, chiffrages, missions, holidays, now), [dossiers, chiffrages, missions, holidays, now]);
  // One time base for the tiles: green and amber both count completions in the period.
  const stepMeasures = useMemo(() => computeStepMeasures(dossiers, range, sla), [dossiers, range, sla]);
  const globalCounts = stepMeasures.enDelai;
  const globalHorsDelaiCounts = stepMeasures.horsDelai;
  const globalRealiseAllTime = useMemo(
    () => computeStepCountsRealiseAllTime(dossiers),
    [dossiers],
  );
  const headline = useMemo(() => computeHeadline(dossiers, range, now, sla, holidays), [dossiers, range, now, sla, holidays]);
  const aging = useMemo(() => agingItems(sla, now, holidays), [sla, now, holidays]);
  const cycleTimes = useMemo(() => computeCycleTimes(dossiers, range, sla, holidays), [dossiers, range, sla, holidays]);
  const weeklyTrend = useMemo(() => computeWeeklyTrend(dossiers, range, now), [dossiers, range, now]);
  const scopedCompagnieNames = useMemo(() => {
    const allowed = (profile?.compagnies || []).map((c: string) => c.toLowerCase().trim());
    const names = allCompagnies.map((c) => c.nom).filter((n): n is string => !!n);
    if (allowed.length === 0) return names;
    return names.filter((n) => allowed.includes(n.toLowerCase().trim()));
  }, [allCompagnies, profile]);
  const perCompagnie = useMemo(
    () => computePerCompagnieMeasures(dossiers, range, sla, scopedCompagnieNames),
    [dossiers, range, sla, scopedCompagnieNames],
  );
  const perUser = useMemo(
    () => computePerUserMeasures(dossiers, workflowLogs, range, sla),
    [dossiers, workflowLogs, range, sla],
  );
  // Merge rows that resolve to the same display name (e.g. one row keyed by
  // Firebase UID for `createdBy` + another row keyed by email for
  // `lastStatusChange.by` are the same person).
  const dedupedPerUser = useMemo(() => {
    const merged = new Map<string, UserRow>();
    for (const r of perUser) {
      const name = resolveUserName(r.group, userLookup);
      const trimmed = (r.group || '').trim();
      const role =
        userLookup.roleByKey.get(trimmed) ??
        userLookup.roleByKey.get(trimmed.toLowerCase()) ??
        undefined;
      const existing = merged.get(name);
      if (existing) {
        for (const key of STEP_KEYS) {
          existing.enDelai[key] += r.enDelai[key];
          existing.horsDelai[key] += r.horsDelai[key];
        }
        existing.totalEnDelai += r.totalEnDelai;
        // Same person under two keys: the open sets may overlap, the sum is an upper bound.
        existing.ouverts += r.ouverts;
        existing.respectPct = respectOf(existing.enDelai, existing.horsDelai);
        if (!existing.role && role) existing.role = role;
      } else {
        merged.set(name, {
          user: name,
          role,
          enDelai: { ...r.enDelai },
          horsDelai: { ...r.horsDelai },
          ouverts: r.ouverts,
          totalEnDelai: r.totalEnDelai,
          respectPct: r.respectPct,
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
        enDelai: emptyStepCounts(),
        horsDelai: emptyStepCounts(),
        ouverts: 0,
        totalEnDelai: 0,
        respectPct: null,
      });
    }
    return Array.from(merged.values()).sort((a, b) => b.totalEnDelai - a.totalEnDelai);
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
      return dossiersForStepMeasure(dossiers, workflowLogs, sla, range, selectedStep, 'horsDelai');
    }
    if (selectedStepMode === 'nonRealise') {
      return dossiersNotForStep(dossiers, workflowLogs, selectedStep);
    }
    // Same rows as the green bar: SLA steps from the clocks, the rest from the funnel.
    if (STAGE_HAS_SLA[selectedStep]) {
      return dossiersForStepMeasure(dossiers, workflowLogs, sla, range, selectedStep, 'enDelai');
    }
    return dossiersForStep(dossiers, workflowLogs, range, selectedStep);
  }, [selectedStep, selectedStepMode, dossiers, workflowLogs, range, sla]);

  const totalDossiersInScope = dossiers.length;
  const periodLabel = useMemo(() => formatPeriodLabel(dateFrom, dateTo), [dateFrom, dateTo]);

  const resetRange = () => {
    // Reset = the default = all time (owner 2026-09-02).
    setDateFrom(null);
    setDateTo(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Suivi d'équipe"
        subtitle="Étapes franchies et délais tenus — les délais sont ceux des assignations chiffrage et terrain (24 h ouvrées)."
        filters={
        <div className="flex flex-wrap items-end gap-2">
          {/* Sliding thumb carries the selection (motion-spec addendum ter);
              the buttons stay ghost and only recolour. « Tout » = the all-time
              default (owner 2026-09-02). */}
          <div className="relative isolate flex h-10 items-center gap-1 self-end rounded-md bg-surface-2 p-0.5" role="group" aria-label="Période">
            <SlidingThumb className="rounded-md bg-primary shadow-rim-filled" deps={[activePreset]} />
            {(
              [
                ['tout', 'Tout', applyTout, false],
                ['jour', 'Jour', applyJour, false],
                ['semaine', 'Semaine', applySemaine, false],
                ['mois', 'Mois', applyMois, false],
                ['custom', 'Personnalisé', undefined, true],
              ] as const
            ).map(([key, label, onClick, disabled]) => {
              const active = activePreset === key;
              return (
                <Button
                  key={key}
                  size="sm"
                  variant="ghost"
                  className={cn(
                    'relative z-[1] h-8',
                    active && 'text-primary-foreground hover:bg-transparent hover:text-primary-foreground',
                  )}
                  data-seg-active={active || undefined}
                  aria-pressed={active}
                  onClick={onClick}
                  disabled={disabled && !active}
                >
                  {label}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1">
            <label className="t-label">Du</label>
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Date de début" className="w-44" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="t-label">Au</label>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="Date de fin" className="w-44" />
          </div>
          <Button variant="outline" size="sm" onClick={resetRange} className="h-10">
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
        }
      />

      {/* Page summary (Few: summary before detail) — above the tabs so the four
          numbers stay in view while a breakdown is compared against them
          (NN/g tabs: never make the reader switch tabs to compare). */}
      {loading ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="paper space-y-3 p-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : (
        totalDossiersInScope > 0 && (
          <HeadlineRow headline={headline} periodLabel={periodLabel} onJumpToAging={jumpToAging} />
        )
      )}

      <Tabs value={vue} onValueChange={(v) => changeVue(v as Vue)} className="space-y-6">
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

        <TabsContent value="global" className="space-y-6">
          {loading ? (
            <div aria-busy="true" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: STEP_KEYS.length }).map((_, i) => (
                  <div key={i} className="paper space-y-3 p-4">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
              <div className="paper p-5">
                <Skeleton className="mb-4 h-4 w-40" />
                <Skeleton className="h-64 w-full" />
              </div>
              {/* À traiter + Délais par étape */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="paper p-5 lg:col-span-2">
                  <Skeleton className="mb-4 h-4 w-44" />
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-14 rounded-lg" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="paper p-5">
                  <Skeleton className="mb-4 h-4 w-32" />
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <GlobalView
              counts={globalCounts}
              horsDelaiCounts={globalHorsDelaiCounts}
              realiseAllTimeCounts={globalRealiseAllTime}
              totalDossiers={totalDossiersInScope}
              periodLabel={periodLabel}
              aging={aging}
              cycleTimes={cycleTimes}
              trend={weeklyTrend}
              loading={loading}
              onSelectStep={openDrawer}
            />
          )}
        </TabsContent>

        <TabsContent value="compagnie" className="space-y-6">
          <CompagnieView rows={perCompagnie} loading={loading} periodLabel={periodLabel} />
        </TabsContent>

        <TabsContent value="user" className="space-y-6">
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
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur…"
                  className="h-10 w-64 pl-8"
                />
              </div>
            </div>
          </div>
          <UserView rows={filteredPerUser} loading={loading} userLookup={userLookup} periodLabel={periodLabel} />
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
  horsDelaiCounts,
  realiseAllTimeCounts,
  totalDossiers,
  periodLabel,
  aging,
  cycleTimes,
  trend,
  loading,
  onSelectStep,
}: {
  counts: Record<StepKey, number>;
  horsDelaiCounts: Record<StepKey, number>;
  realiseAllTimeCounts: Record<StepKey, number>;
  totalDossiers: number;
  periodLabel: string;
  aging: AgingItem[];
  cycleTimes: CycleTimeRow[];
  trend: WeekPoint[];
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
      {/* KPI tiles: one paper card per step in a 16 px gutter grid (Carbon KPI tiles,
          Material cards) — the card edge is the separation (user ruling: a clear
          separation on each card). Never the featured surface for a row of tiles.
          Ten steps → 5 × 2 from xl so the grid ends on a full row. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {STEP_KEYS.map((key, idx) => {
          const realiseEnDelai = counts[key];
          const horsDelai = horsDelaiCounts[key] ?? 0;
          const realiseAllTime = realiseAllTimeCounts[key] ?? 0;
          const nonRealise =
            key === 'creation' ? null : Math.max(totalDossiers - realiseAllTime, 0);
          return (
            <KpiCard
              key={key}
              index={idx + 1}
              label={STEP_LABELS[key]}
              hasSla={STAGE_HAS_SLA[key]}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Volume par étape</CardTitle>
          <p className="t-caption">Étapes franchies en délai · {periodLabel}</p>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--hairline))" />
                <XAxis dataKey="step" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--ink-3))' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--ink-3))' }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* NN/g dashboards: exceptions (what is late now) sit above trends. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <AgingCard items={aging} className="lg:col-span-2" />
        <CycleTimeCard rows={cycleTimes} periodLabel={periodLabel} />
      </div>

      <TrendCard points={trend} />
    </>
  );
}

/**
 * Headline row — Few: a dashboard is summary + exception on one screen; NN/g: the
 * top-left carries the few numbers that matter (≤ 5–7 headline KPIs). Kanban flow
 * metrics: throughput (période), SLA compliance (période), WIP (now), age (now).
 */
function HeadlineRow({
  headline,
  periodLabel,
  onJumpToAging,
}: {
  headline: Headline;
  periodLabel: string;
  onJumpToAging: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <HeadlineTile label="Dossiers traités" value={headline.traites} caption={`rapport déposé · ${periodLabel}`} />
      <HeadlineTile
        label="Respect des délais"
        value={headline.respectPct == null ? '—' : `${headline.respectPct} %`}
        title="Assignations chiffrage · terrain · création, 24 h ouvrées"
        caption={
          headline.respectPct == null
            ? `aucune assignation décidée${headline.respectPending > 0 ? ` · ${headline.respectPending} en attente` : ''} · ${periodLabel}`
            : `${headline.respectOnTime} en délai · ${headline.respectLate} hors délai${headline.respectPending > 0 ? ` · ${headline.respectPending} en attente` : ''} · ${periodLabel}`
        }
      />
      <HeadlineTile label="En attente" value={headline.enAttente} caption="sans rapport déposé · aujourd'hui" />
      {/* Exception tile — the status colour only when there IS an exception (Few:
          bright colour for highlighting only; no red/green pair), and a jump to the list. */}
      <Card className="min-w-0 p-0">
        <button
          type="button"
          onClick={onJumpToAging}
          className="block w-full rounded-xl p-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Voir la liste « À traiter aujourd'hui »"
        >
          <p className="t-label">En retard aujourd'hui</p>
          <p
            className={cn(
              'mt-2 text-[36px] font-semibold leading-none',
              headline.enRetard > 0 ? 'text-status-danger-fg' : 'text-ink',
            )}
          >
            {headline.enRetard}
          </p>
          <p className="t-caption mt-2">assignations au-delà de 24 h ouvrées · maintenant</p>
        </button>
      </Card>
    </div>
  );
}

/**
 * Headline stat tile — label · 36 px proportional figure (M3 display-small; the
 * summary tier above the 24 px step tiles) · caption. 16 px padding (Carbon
 * tile / M3 card); content cards keep 24.
 */
function HeadlineTile({
  label,
  value,
  caption,
  title,
}: {
  label: string;
  value: number | string;
  caption: string;
  title?: string;
}) {
  return (
    <Card className="min-w-0 p-4" title={title}>
      <p className="t-label">{label}</p>
      <p className="mt-2 text-[36px] font-semibold leading-none text-ink">{value}</p>
      <p className="t-caption mt-2">{caption}</p>
    </Card>
  );
}

function KpiCard({
  index,
  label,
  hasSla,
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
  hasSla: boolean;
  realiseEnDelai: number;
  horsDelai: number;
  nonRealise: number | null;
  total: number;
  onSelectRealise: () => void;
  onSelectHorsDelai: () => void;
  onSelectNonRealise: () => void;
}) {
  const denominator = total <= 0 ? 1 : total;
  const pctEnDelai = (realiseEnDelai / denominator) * 100;
  const pctHorsDelai = (horsDelai / denominator) * 100;
  const pctNonRealise = nonRealise != null ? (nonRealise / denominator) * 100 : 0;

  return (
    <Card className="min-w-0 p-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2 shadow-rim"
          style={tabular}
        >
          {index}
        </span>
        <p className="t-label truncate">{label}</p>
      </div>
      {/* Stat-tile value: 24 px (M3 headline-small — the detail tier under the 36 px
          headline row), sans semibold, proportional figures (tabular only in columns). */}
      <p className="mt-2 text-2xl font-semibold leading-none text-ink">
        {realiseEnDelai}
        <span className="t-caption ml-1.5 font-normal">en délai</span>
      </p>
      <div className="mt-3 space-y-1.5">
        {/* Magnitude in the accent hue, not a status green: ten green bars on one
            screen would leave nothing to highlight (Few). Amber is the page's one
            status colour — the exception. */}
        <KpiBarRow
          label="en délai"
          count={realiseEnDelai}
          pct={pctEnDelai}
          fillClass="bg-chart-1"
          onClick={onSelectRealise}
        />
        {hasSla ? (
          <KpiBarRow
            label="hors délai"
            title="Délai de 24 h ouvrées dépassé — assignation clôturée ou non"
            count={horsDelai}
            pct={pctHorsDelai}
            fillClass="bg-status-warning-fg"
            onClick={onSelectHorsDelai}
          />
        ) : (
          // No SLA on this stage: say so instead of a false amber zero (keeps tile height).
          <div className="flex items-center gap-2 text-[11px] text-ink-4">
            <span className="inline-block h-2 w-2 shrink-0 rounded-sm bg-surface-3" aria-hidden />
            <span className="t-caption text-ink-4">Pas de délai défini</span>
          </div>
        )}
        {nonRealise != null && (
          // Backlog measure (Kanban WIP): counted as of today, not over the period.
          <KpiBarRow
            label="en attente"
            title="Non réalisé à ce jour (hors période)"
            count={nonRealise}
            pct={pctNonRealise}
            fillClass="bg-ink-4"
            onClick={onSelectNonRealise}
          />
        )}
      </div>
    </Card>
  );
}

function KpiBarRow({
  label,
  title,
  count,
  pct,
  fillClass,
  onClick,
}: {
  label: string;
  title?: string;
  count: number;
  pct: number;
  fillClass: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-ink-3" title={title}>
      <span className="flex w-20 shrink-0 items-center gap-1.5">
        <span className={`inline-block h-2 w-2 shrink-0 rounded-sm ${fillClass}`} aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
        {pct > 0 && (
          <button
            type="button"
            onClick={onClick}
            className={`absolute inset-y-0 left-0 rounded-full ${fillClass} transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            style={{ width: `${pct}%` }}
            title={title ? `${title} : ${count}` : `${label} : ${count}`}
          />
        )}
      </div>
      <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-ink">
        {count}
      </span>
    </div>
  );
}

/**
 * « À traiter aujourd'hui » — Kanban work-item age (ProKanban): the LEADING
 * indicator, what is past the SLA right now and not done. Row anatomy follows
 * the planification date-block pattern (tinted block + rim as the row anchor).
 */
function AgingCard({ items, className }: { items: AgingItem[]; className?: string }) {
  const shown = items.slice(0, AGING_LIST_CAP);
  const rest = items.length - shown.length;
  return (
    <Card id="a-traiter" className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <span>À traiter aujourd'hui</span>
          <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums text-ink-2">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 />}
            title="Rien en retard"
            description="Aucune étape n'a dépassé 24 h ouvrées."
            dashed={false}
            className="border-0 bg-transparent py-8 [&>div:first-child]:bg-status-success-bg [&>div:first-child]:text-status-success-fg"
          />
        ) : (
          <>
            <ul className="divide-y divide-hairline">
              {shown.map((item) => {
                const danger = item.ageHours > 72;
                const section = STEP_SECTION[item.step];
                const href = section ? `/dossiers/${item.dossier.id}#step-${section}` : `/dossiers/${item.dossier.id}`;
                const assure = dossierAssure(item.dossier);
                return (
                  <li key={`${item.dossier.id}-${item.step}`}>
                    <Link
                      href={href}
                      className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <div
                        className={cn(
                          'flex w-16 shrink-0 flex-col items-center justify-center rounded-lg px-2 py-1.5 shadow-rim',
                          danger
                            ? 'bg-status-danger-bg text-status-danger-fg'
                            : 'bg-status-warning-bg text-status-warning-fg',
                        )}
                      >
                        <span className="text-base font-semibold leading-none tabular-nums">
                          {formatBusinessHours(item.ageHours)}
                        </span>
                        <span className="mt-1 text-[11px] leading-none">ouvrées</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="t-mono font-semibold">{dossierRef(item.dossier)}</span>
                          {assure && <span className="truncate text-sm text-ink-2">{assure}</span>}
                          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                            {item.kind === 'chiffrage' ? 'Chiffrage · ' : 'Terrain · '}
                            {STEP_LABELS_SHORT[item.step]}
                          </span>
                        </div>
                        <p className="t-caption mt-0.5 truncate">
                          {item.owner ? <>{item.kind === 'chiffrage' ? 'chiffreur' : 'agent'} <b className="font-medium text-ink-2">{item.owner}</b> · </> : null}
                          depuis {format(item.since, 'dd/MM HH:mm')}
                          {item.dossier.compagnie ? ` · ${item.dossier.compagnie}` : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {rest > 0 && (
              <p className="t-caption border-t border-hairline px-6 py-3 tabular-nums">+{rest} autres</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** « Délais par étape » — claims-operations KPI: cycle time by stage (median, business hours). */
function CycleTimeCard({ rows, periodLabel }: { rows: CycleTimeRow[]; periodLabel: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Délais par étape</CardTitle>
        <p className="t-caption">Heures ouvrées entre le déclencheur et la réalisation · {periodLabel}</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Étape</TableHead>
              <TableHead className="text-right">Médiane</TableHead>
              <TableHead className="text-right">Dossiers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className={cn(r.key === 'total' && 'font-medium')}>
                  {r.key === 'total' ? 'Total (création → rapport)' : STEP_LABELS[r.key]}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {r.medianHours == null ? (
                    <span className="font-normal text-ink-4">—</span>
                  ) : (
                    formatBusinessHours(r.medianHours)
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-ink-2">{r.n}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** « Créés vs déposés par semaine » — dataviz: trend over time → line; ≥ 2 series → legend. */
function TrendCard({ points }: { points: WeekPoint[] }) {
  if (points.length < 2) return null;
  const config = {
    crees: { label: 'Créés', color: 'hsl(var(--chart-1))' },
    deposes: { label: 'Rapports déposés', color: 'hsl(var(--chart-2))' },
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Créés vs déposés par semaine</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <LineChart data={points} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--hairline))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--ink-3))' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--ink-3))' }} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="crees" stroke="var(--color-crees)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="deposes" stroke="var(--color-deposes)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </LineChart>
        </ChartContainer>
        {/* Legend always present for ≥ 2 series (same pattern as the dashboard). */}
        <ul className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
          {(Object.keys(config) as Array<keyof typeof config>).map((k) => (
            <li key={k} className="t-caption flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: config[k].color }} aria-hidden />
              <span>{config[k].label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * Step cell shared by both tables: on-time count + late count on a second line.
 * Numbers right-aligned with their headers (Polaris / Carbon data tables); the
 * amber "+n" is the only colour in the cell — no heat-map competing with it.
 */
function StepCell({
  value,
  late,
  emphasis,
}: {
  value: number;
  late: number;
  emphasis?: boolean;
}) {
  return (
    <TableCell className={cn('text-right', emphasis && 'font-semibold')} style={tabular}>
      <div>{value || <span className="font-normal text-ink-4">—</span>}</div>
      {late > 0 && (
        <div className="text-[11px] font-normal text-status-warning-fg tabular-nums">+{late} hors délai</div>
      )}
    </TableCell>
  );
}

function CompagnieView({
  rows,
  loading,
  periodLabel,
}: {
  rows: GroupMeasures[];
  loading: boolean;
  periodLabel: string;
}) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition par compagnie</CardTitle>
        <p className="t-caption">Étapes franchies en délai · {periodLabel}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table regionLabel="Répartition par compagnie">
          <TableHeader>
            <TableRow>
              <TableHead className={STICKY_HEAD}>Compagnie</TableHead>
              {STEP_KEYS.map((key) => (
                <TableHead key={key} className="text-right">
                  {STEP_LABELS_SHORT[key]}
                </TableHead>
              ))}
              <TableHead className="text-right" title={`Part des assignations à temps · ${periodLabel}`}>
                Respect
              </TableHead>
              <TableHead className="text-right" title="Dossiers sans rapport déposé · à ce jour">
                En attente
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.group}>
                <TableCell className={STICKY_CELL}>{r.group}</TableCell>
                {STEP_KEYS.map((key) => (
                  <StepCell key={key} value={r.enDelai[key]} late={r.horsDelai[key]} emphasis />
                ))}
                <TableCell className="text-right font-semibold" style={tabular}>
                  {r.respectPct == null ? <span className="font-normal text-ink-4">—</span> : `${r.respectPct} %`}
                </TableCell>
                <TableCell className="text-right" style={tabular}>
                  {r.enAttente || <span className="text-ink-4">—</span>}
                </TableCell>
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
  periodLabel,
}: {
  rows: UserRow[];
  loading: boolean;
  userLookup: UserLookup;
  periodLabel: string;
}) {
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
    <Card>
      <CardHeader>
        <CardTitle>Activité par utilisateur</CardTitle>
        <p className="t-caption">Étapes franchies en délai · {periodLabel}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table regionLabel="Activité par utilisateur">
          <TableHeader>
            <TableRow>
              <TableHead className={cn(STICKY_HEAD, 'min-w-[14rem]')}>Utilisateur</TableHead>
              {STEP_KEYS.map((key) => (
                <TableHead key={key} className="text-right">
                  {STEP_LABELS_SHORT[key]}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right" title={`Part des assignations à temps · ${periodLabel}`}>
                Respect
              </TableHead>
              <TableHead
                className="text-right"
                title="Dossiers ouverts sur lesquels l'utilisateur a réalisé au moins une étape"
              >
                Ouverts (touchés)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const displayName = resolveUserName(r.user, userLookup);
              return (
                <TableRow key={r.user}>
                  <TableCell className={STICKY_CELL}>{displayName}</TableCell>
                  {STEP_KEYS.map((key) => (
                    <StepCell key={key} value={r.enDelai[key]} late={r.horsDelai[key]} />
                  ))}
                  <TableCell className="text-right font-semibold" style={tabular}>
                    {r.totalEnDelai}
                  </TableCell>
                  <TableCell className="text-right font-semibold" style={tabular}>
                    {r.respectPct == null ? <span className="font-normal text-ink-4">—</span> : `${r.respectPct} %`}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    style={tabular}
                    title="Dossiers ouverts sur lesquels l'utilisateur a réalisé au moins une étape"
                  >
                    {r.ouverts || <span className="text-ink-4">—</span>}
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

/** Paper-shaped table placeholder (tonal, no border) used while a tab loads. */
function TablePaperSkeleton() {
  return (
    <div className="paper p-5" aria-busy="true">
      <Skeleton className="mb-4 h-4 w-44" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
