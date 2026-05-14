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
import { UserCheck, Calendar, MapPin, X, ChevronDown, Clock, CheckCircle2, Users, List, SlidersHorizontal, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
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
import { useOptions } from '@/hooks/use-options';
import { useAgentTerrainWorkload } from '@/hooks/use-workload-counts';
import { isAtgCompletedStatus } from '@/lib/status-machine';
import { businessHoursBetween, formatBusinessLateness } from '@/lib/business-days';
import { useHolidays } from '@/hooks/use-holidays';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

type PhotoCategory = 'avant' | 'en_cours' | 'apres';

interface PlanificationItem {
  id: string;
  dossierId: string;
  dossierNom?: string;
  assureNom?: string;
  assureTelephone?: string;
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

// Normalize a Moroccan phone number for a `tel:` URI:
// keep leading `+` (international prefix) and strip everything but digits.
// Example: "+212 6 12 34 56 78" -> "+212612345678"; "(0612) 34-56-78" -> "0612345678".
function normalizePhoneForTel(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

// Numeric sort key for ordering missions chronologically when building a
// multi-stop route: prefer the scheduled RDV time, fall back to createdAt,
// push items with neither to the end (Number.POSITIVE_INFINITY).
function routeSortKey(p: PlanificationItem): number {
  const ref: any = p.dateRDV || p.createdAt;
  if (!ref) return Number.POSITIVE_INFINITY;
  const d = ref.toDate ? ref.toDate() : new Date(ref);
  return d.getTime();
}

// Build a Google Maps Directions URL for one or more addresses.
// - 1 address: origin=My+Location → destination.
// - 2+ addresses: last is destination, earlier ones become pipe-separated waypoints.
// Caller is responsible for capping the list at Google Maps' 10-stop limit
// (1 destination + up to 9 waypoints).
function buildMultiStopMapsUrl(addresses: string[]): string {
  const enc = (s: string) => encodeURIComponent(s.trim());
  if (addresses.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${enc(addresses[0])}&travelmode=driving`;
  }
  const dest = enc(addresses[addresses.length - 1]);
  const waypoints = addresses.slice(0, -1).map(enc).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${dest}&waypoints=${waypoints}&travelmode=driving`;
}

function AssurePhoneLink({ telephone, className }: { telephone?: string | null; className?: string }) {
  const display = (telephone || '').trim();
  if (!display) {
    return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;
  }
  const href = normalizePhoneForTel(display);
  return (
    <a
      href={`tel:${href}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center text-xs font-semibold text-primary hover:underline tabular-nums whitespace-nowrap',
        className,
      )}
    >
      {display}
    </a>
  );
}

/**
 * Compact deadline status badge for ATG cards. No bar; just text:
 *   • "En attente" while the RDV is in the future
 *   • "En retard 02j/14h" past the 24-business-hour deadline (red)
 *   • "Xh restants" while in progress
 * Re-renders every 30s like the original DeadlineBar.
 */
function DeadlineBadge({
  dateRDV,
  createdAt,
  completed = false,
}: {
  dateRDV: any;
  createdAt: any;
  completed?: boolean;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (completed) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [completed]);
  const holidays = useHolidays();
  if (completed) return null;
  const { remaining, expired, pending, elapsedHours } = getDeadlineInfo(dateRDV, createdAt, holidays);
  const lateness = expired ? formatBusinessLateness(elapsedHours - DEADLINE_HOURS) : '';
  if (pending) {
    return (
      <Badge variant="outline" className="text-[10px] font-medium whitespace-nowrap">
        En attente
      </Badge>
    );
  }
  if (expired) {
    return (
      <Badge variant="destructive" className="text-[10px] font-semibold whitespace-nowrap">
        {lateness ? `En retard ${lateness}` : 'En retard'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] font-medium whitespace-nowrap text-muted-foreground">
      {remaining}
    </Badge>
  );
}

function missionToCategory(typeMission: string): PhotoCategory {
  const n = typeMission === 'Apres' ? 'Après' : typeMission;
  if (n === 'En cours') return 'en_cours';
  if (n === 'Après') return 'apres';
  return 'avant';
}

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

function getDeadlineInfo(
  dateRDV: any,
  createdAt: any,
  holidays?: ReadonlySet<string>,
): { percent: number; remaining: string; expired: boolean; pending: boolean; elapsedHours: number } {
  // Use dateRDV at 8am as start time; fall back to createdAt if no dateRDV
  const refDate = dateRDV || createdAt;
  if (!refDate) return { percent: 0, remaining: '-', expired: false, pending: false, elapsedHours: 0 };

  const rdvDate = refDate.toDate ? refDate.toDate() : new Date(refDate);
  const startTime = new Date(rdvDate);
  if (dateRDV) {
    startTime.setHours(8, 0, 0, 0);
  }

  const now = new Date();
  if (now < startTime) return { percent: 0, remaining: 'En attente', expired: false, pending: true, elapsedHours: 0 };

  // Business-hours model: weekends + Moroccan holidays don't tick.
  const elapsedHours = businessHoursBetween(startTime, now, holidays);
  const elapsed = Math.max(0, Math.min(elapsedHours / DEADLINE_HOURS, 1));
  const percent = Math.round(elapsed * 100);

  if (elapsed >= 1) return { percent: 100, remaining: 'En retard', expired: true, pending: false, elapsedHours };

  const remainHours = DEADLINE_HOURS - elapsedHours;
  const remainH = Math.floor(remainHours);
  const remainM = Math.floor((remainHours - remainH) * 60);
  const remaining = remainH > 0 ? `${remainH}h ${remainM}m` : `${remainM}m`;

  return { percent, remaining, expired: false, pending: false, elapsedHours };
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
  const [, setTick] = useState(0);
  useEffect(() => {
    if (completed) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [completed]);

  const holidays = useHolidays();
  const { percent, remaining, expired, pending, elapsedHours } = getDeadlineInfo(dateRDV, createdAt, holidays);
  const lateness = expired ? formatBusinessLateness(elapsedHours - DEADLINE_HOURS) : '';

  // Completed: ATG uploaded photos + set a terrain status → hide progress bar,
  // show checkmark + the chosen status instead.
  if (completed) {
    return (
      <div className="flex items-center gap-1.5 min-w-[140px]">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        {completedStatus && (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800/60 dark:text-emerald-200 whitespace-nowrap"
          >
            {completedStatus}
          </Badge>
        )}
      </div>
    );
  }

  // Semantic three-band: ≤50% teal (plenty of time), ≤80% amber (attention), >80% red (urgent).
  const getBarColor = (pct: number) => {
    if (pct <= 50) return 'bg-primary';
    if (pct <= 80) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const getTextColor = (pct: number) => {
    if (pct <= 50) return 'text-primary';
    if (pct <= 80) return 'text-amber-600 dark:text-amber-400';
    return 'text-destructive';
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
          className={cn('h-full rounded-full transition-all', expired ? 'bg-destructive animate-pulse' : getBarColor(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={cn('text-[10px] font-semibold tabular-nums whitespace-nowrap', expired ? 'text-destructive' : getTextColor(percent))}>
        {expired ? (lateness ? `En retard ${lateness}` : 'En retard') : `${percent}%`}
      </span>
    </div>
  );
}

export default function AssignationsATGPage() {
  const db = useFirestore();
  const router = useRouter();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const [planifications, setPlanifications] = useState<PlanificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Realtime per-dossier state so status changes + photo uploads update the
  // "Délai" completion indicator even when no planification doc changes.
  type DossierLive = { statut: string; photos: Record<PhotoCategory, boolean>; assureTelephone: string };
  const [dossierLive, setDossierLive] = useState<Record<string, DossierLive>>({});
  const filterDefaults = { activeTab: 'Avant', dateFrom: '', dateTo: '', compagnieFilter: 'Toutes', agentFilter: 'Tous' };
  const [filters, setFilters, clearFilter] = usePersistedFilters('assignations-atg', filterDefaults);
  const { activeTab, dateFrom, dateTo, compagnieFilter, agentFilter } = filters;

  const [viewMode, setViewMode] = useState<'by-zone' | 'list'>('list');

  // Agent source-of-truth (same data as the planification modal dropdown) so
  // the zones reflect configured agents, not just agents that happen to be
  // assigned to a planification right now.
  const { options: agentOptionsRaw } = useOptions('options_agents', []);
  const agentWorkload = useAgentTerrainWorkload();

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
        refExpert: string; assureNom: string; assureTelephone: string; compagnie: string; expertRank: string; nature: string;
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
              assureTelephone: (d.assure?.telephone || d.assure?.telephone2 || '').trim(),
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
        item.assureTelephone = item.assureTelephone || dd.assureTelephone;
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
        const tel = (data.assure?.telephone || data.assure?.telephone2 || '').trim();
        setDossierLive(prev => ({
          ...prev,
          [dId]: {
            statut: data.statut || '',
            photos: prev[dId]?.photos || { avant: false, en_cours: false, apres: false },
            assureTelephone: tel,
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
            assureTelephone: prev[dId]?.assureTelephone || '',
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
      { key: 'today' as const, label: "Aujourd'hui", items: todayGroup, color: 'bg-[hsl(var(--primary)/0.12)] text-primary' },
      { key: 'expired' as const, label: 'En retard', items: expiredGroup, color: 'bg-destructive/10 text-destructive' },
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

  // Group "Start" handler: bundles every mission in the group that has an
  // address into a single Google Maps multi-stop route, ordered by earliest
  // RDV first so the agent's path follows time priority. Google Maps caps
  // routes at 10 stops (1 destination + up to 9 waypoints); extras are
  // dropped with a toast warning.
  const openRouteForItems = (items: PlanificationItem[]) => {
    const addrs = [...items]
      .filter(p => p.adresse?.trim())
      .sort((a, b) => routeSortKey(a) - routeSortKey(b))
      .map(p => p.adresse!.trim());
    if (addrs.length === 0) return;
    const MAX_STOPS = 10; // Google Maps URL cap (1 destination + up to 9 waypoints)
    let route = addrs;
    if (addrs.length > MAX_STOPS) {
      route = addrs.slice(0, MAX_STOPS);
      toast({
        title: `${addrs.length - MAX_STOPS} arrêt(s) ignoré(s)`,
        description: `Google Maps accepte au maximum ${MAX_STOPS} étapes par itinéraire. Les premières (par ordre chronologique) ont été conservées.`,
      });
    }
    const url = buildMultiStopMapsUrl(route);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Group agents by zone for the "Par zone" view. Agents without a zone go
  // into a "Zone non définie" bucket at the bottom. Respects the agentFilter
  // so zones without matching agents are hidden when a specific name filter is
  // active (per task constraint: zones with zero matches should be hidden).
  const UNASSIGNED_ZONE = 'Zone non définie';
  const zoneGroups = useMemo(() => {
    const filteredAgents = agentOptionsRaw.filter(a => {
      if (!a.active) return false;
      if (agentFilter !== 'Tous' && (a.label || '').trim() !== agentFilter) return false;
      return true;
    });
    const buckets: Record<string, typeof filteredAgents> = {};
    filteredAgents.forEach(a => {
      const z = a.zone?.trim() || UNASSIGNED_ZONE;
      if (!buckets[z]) buckets[z] = [];
      buckets[z].push(a);
    });
    const definedZones = Object.keys(buckets)
      .filter(z => z !== UNASSIGNED_ZONE)
      .sort((a, b) => a.localeCompare(b, 'fr'));
    const ordered = definedZones.map(z => ({ zone: z, agents: buckets[z] }));
    if (buckets[UNASSIGNED_ZONE]?.length) {
      ordered.push({ zone: UNASSIGNED_ZONE, agents: buckets[UNASSIGNED_ZONE] });
    }
    return ordered;
  }, [agentOptionsRaw, agentFilter]);

  const [openZoneSections, setOpenZoneSections] = useState<Record<string, boolean>>({});
  const zoneOpen = (key: string) => openZoneSections[key] ?? true;
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

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
  // ATG users only see their own assignments — the zone-grouping view (which
  // lists the whole team) is irrelevant for them. Force "list" for that role.
  // Par-zone toggle was removed for all roles — list view is the only path now.
  // `viewMode` / `setViewMode` are kept since some legacy callers still set them.
  // Cast keeps existing `=== 'by-zone'` branches type-checkable (they're dead code,
  // a follow-up will delete them).
  const effectiveViewMode = 'list' as 'by-zone' | 'list';
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div>
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b bg-card">
          <UserCheck className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold flex-1">Mes missions</h1>
          <Badge variant="secondary">
            {effectiveViewMode === 'by-zone'
              ? zoneGroups.reduce((acc, g) => acc + g.agents.length, 0)
              : filteredPlanifications.length}
          </Badge>
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2 relative" aria-label="Filtres">
                <SlidersHorizontal className="h-4 w-4" />
                {(compagnieFilter !== 'Toutes' || (canSeeNameFilter && agentFilter !== 'Tous') || dateFrom || dateTo) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] flex flex-col p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Compagnie
                  </label>
                  <Select value={compagnieFilter} onValueChange={v => setFilters({ compagnieFilter: v })}>
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue placeholder="Compagnie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Toutes">Toutes les compagnies</SelectItem>
                      {compagnieOptions.map(([name, count]) => (
                        <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canSeeNameFilter && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Agent
                    </label>
                    <Select value={agentFilter} onValueChange={v => setFilters({ agentFilter: v })}>
                      <SelectTrigger className="w-full h-10 text-sm">
                        <SelectValue placeholder="Agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tous">Tous les agents</SelectItem>
                        {agentOptions.map(([name, count]) => (
                          <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Période
                  </label>
                  <DateRangeFilter
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onDateFromChange={v => setFilters({ dateFrom: v })}
                    onDateToChange={v => setFilters({ dateTo: v })}
                  />
                </div>
              </div>
              <div className="border-t p-3 flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 h-10"
                  onClick={() => setFilters({ compagnieFilter: 'Toutes', agentFilter: 'Tous', dateFrom: '', dateTo: '' })}
                >
                  Réinitialiser
                </Button>
                <Button
                  className="flex-1 h-10"
                  onClick={() => setIsFilterSheetOpen(false)}
                >
                  Appliquer
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <div className="flex items-center justify-between h-10 px-4 border-b text-sm">
          <span className="text-muted-foreground">
            Bonjour <span className="font-semibold text-foreground">{profile?.prenom || profile?.nom || 'agent'}</span>
            {' · '}
            {format(new Date(), 'EEE d MMM', { locale: fr })}
          </span>
          <Badge variant="outline" className="text-xs">
            {(effectiveViewMode === 'by-zone'
              ? zoneGroups.reduce((acc, g) => acc + g.agents.length, 0)
              : filteredPlanifications.length)} mission{(effectiveViewMode === 'by-zone'
              ? zoneGroups.reduce((acc, g) => acc + g.agents.length, 0)
              : filteredPlanifications.length) > 1 ? 's' : ''}
          </Badge>
        </div>
        {effectiveViewMode === 'list' && (
          <div className="sticky top-14 z-20 grid grid-cols-3 gap-1 p-1 border-b bg-card">
            {MISSION_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = countByType[tab.id] || 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilters({ activeTab: tab.id })}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-11 rounded-md text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded text-[10px] font-mono',
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {effectiveViewMode === 'list' ? (
          loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[104px] rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filteredPlanifications.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Calendar />}
                title={`Aucune mission ${activeTab.toLowerCase()}`}
                description="Les nouvelles assignations apparaîtront ici."
                dashed={false}
                className="border-0 bg-transparent py-10"
              />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {groups.filter(g => g.items.length > 0).map((group) => {
                const addressableCount = group.items.filter(p => p.adresse?.trim()).length;
                return (
                <Collapsible
                  key={group.key}
                  open={openSections[group.key]}
                  onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [group.key]: open }))}
                >
                  <div className="flex items-center gap-2 w-full">
                    <CollapsibleTrigger className="flex-1 flex items-center justify-between h-9 px-1 text-xs font-bold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors">
                      <span>
                        {group.label} ({group.items.length})
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          openSections[group.key] ? 'rotate-0' : '-rotate-90',
                        )}
                      />
                    </CollapsibleTrigger>
                    {/* Start button — bundles every group item with an adresse into a
                        Google Maps multi-stop URL, ordered by earliest RDV first. */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs shrink-0"
                      disabled={addressableCount === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        openRouteForItems(group.items);
                      }}
                      title="Ouvrir l'itinéraire dans Google Maps"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Start
                    </Button>
                  </div>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {group.items.map((p) => {
                      const rdv = p.dateRDV?.toDate ? p.dateRDV.toDate() : (p.dateRDV ? new Date(p.dateRDV) : null);
                      return (
                        <div
                          key={`${p.dossierId}-${p.id}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/assignations-atg/${p.dossierId}?mission=${encodeURIComponent(activeTab)}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              router.push(`/assignations-atg/${p.dossierId}?mission=${encodeURIComponent(activeTab)}`);
                            }
                          }}
                          className="block w-full text-left bg-card border rounded-xl p-3 shadow-sm hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-primary truncate">{p.dossierNom || p.dossierId}</span>
                            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                              {rdv ? format(rdv, 'HH:mm') : '-'}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{p.assureNom || '-'}</span>
                            {p.compagnie && (
                              <Badge variant="outline" className="text-[10px] shrink-0">{p.compagnie}</Badge>
                            )}
                          </div>
                          {p.zone && (
                            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-foreground truncate">
                              <MapPin className="h-3 w-3 shrink-0 text-primary" />
                              <span className="truncate">{p.zone}</span>
                            </div>
                          )}
                          {p.adresse && (
                            <div className="mt-0.5 text-xs truncate pl-4">
                              {/* Anchor nested inside a role="button" card was being
                                  swallowed on some mobile browsers. Use an explicit
                                  click handler that stops bubbling, prevents default,
                                  and opens the maps URL via window.open — guaranteed
                                  user-initiated navigation. */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  window.open(
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.adresse)}`,
                                    '_blank',
                                    'noopener,noreferrer',
                                  );
                                }}
                                className="text-primary hover:underline truncate text-left w-full cursor-pointer"
                              >
                                {p.adresse}
                              </button>
                            </div>
                          )}
                          <div className="mt-2 flex items-center gap-2 flex-wrap min-w-[140px]">
                            <AssurePhoneLink telephone={dossierLive[p.dossierId]?.assureTelephone || p.assureTelephone} />
                            <DeadlineBadge dateRDV={p.dateRDV} createdAt={p.createdAt} />
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
                );
              })}
            </div>
          )
        ) : zoneGroups.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Users />}
              title={agentFilter !== 'Tous' ? `Aucun agent correspondant au filtre « ${agentFilter} »` : 'Aucun agent de terrain configuré'}
              description={agentFilter !== 'Tous' ? "Ajustez le filtre Agent pour voir d'autres zones." : 'Ajoutez des agents depuis la modale de planification pour les voir apparaître ici.'}
              dashed={false}
              className="border-0 bg-transparent py-10"
            />
          </div>
        ) : (
            <div className="p-4 space-y-3">
              {zoneGroups.map(({ zone, agents }) => {
                const totalWorkload = agents.reduce((acc, a) => acc + (agentWorkload[(a.label || '').trim()] || 0), 0);
                const isUnassigned = zone === UNASSIGNED_ZONE;
                return (
                  <Collapsible
                    key={zone}
                    open={zoneOpen(zone)}
                    onOpenChange={(open) => setOpenZoneSections(prev => ({ ...prev, [zone]: open }))}
                  >
                    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                      <CollapsibleTrigger className={cn(
                        'flex items-center justify-between w-full px-3 py-2.5 transition-colors hover:opacity-80',
                        isUnassigned
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-[hsl(var(--primary)/0.12)] text-primary'
                      )}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-bold truncate">{zone}</span>
                          <Badge variant="secondary" className="text-[10px] font-mono h-5 min-w-[20px] justify-center shrink-0">
                            {agents.length}
                          </Badge>
                          {totalWorkload > 0 && (
                            <Badge variant="outline" className="text-[10px] h-5 gap-1 border-amber-200/70 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800/60 dark:text-amber-200 shrink-0">
                              <Clock className="h-3 w-3" /> {totalWorkload}
                            </Badge>
                          )}
                        </div>
                        <ChevronDown className={cn(
                          'h-4 w-4 transition-transform shrink-0',
                          zoneOpen(zone) ? 'rotate-0' : '-rotate-90'
                        )} />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="divide-y">
                          {agents.map((agent) => {
                            const name = (agent.label || '').trim();
                            const active = agentWorkload[name] || 0;
                            return (
                              <button
                                key={agent.id}
                                type="button"
                                onClick={() => {
                                  setFilters({ agentFilter: name });
                                  setViewMode('list');
                                }}
                                className="flex items-center justify-between w-full h-14 px-3 hover:bg-muted/40 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-sm font-medium truncate">{name || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {active > 0 ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] gap-1 border-amber-200/70 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800/60 dark:text-amber-200"
                                    >
                                      <Clock className="h-3 w-3" /> {active}
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">0</span>
                                  )}
                                  <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <UserCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Assignations Agent de Terrain</h1>
          <Badge variant="secondary" className="ml-2">
            {effectiveViewMode === 'by-zone'
              ? zoneGroups.reduce((acc, g) => acc + g.agents.length, 0)
              : filteredPlanifications.length}
          </Badge>
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

      {/* Mission type tabs — only relevant for the flat list view; hidden
          in the zone-grouped view because that one pivots on agents. */}
      {effectiveViewMode === 'list' && (
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
      )}

      {effectiveViewMode === 'by-zone' ? (
        zoneGroups.length === 0 ? (
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <EmptyState
                icon={<Users />}
                title={agentFilter !== 'Tous' ? `Aucun agent correspondant au filtre « ${agentFilter} »` : 'Aucun agent de terrain configuré'}
                description={agentFilter !== 'Tous' ? 'Ajustez le filtre Agent pour voir d\'autres zones.' : 'Ajoutez des agents depuis la modale de planification pour les voir apparaître ici.'}
                dashed={false}
                className="border-0 bg-transparent py-10"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {zoneGroups.map(({ zone, agents }) => {
              const totalWorkload = agents.reduce((acc, a) => acc + (agentWorkload[(a.label || '').trim()] || 0), 0);
              const isUnassigned = zone === UNASSIGNED_ZONE;
              return (
                <Collapsible
                  key={zone}
                  open={zoneOpen(zone)}
                  onOpenChange={(open) => setOpenZoneSections(prev => ({ ...prev, [zone]: open }))}
                >
                  <Card className="shadow-sm overflow-hidden">
                    <CollapsibleTrigger className={cn(
                      'flex items-center justify-between w-full px-4 py-3 transition-colors hover:opacity-80',
                      isUnassigned
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-[hsl(var(--primary)/0.12)] text-primary'
                    )}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-bold">{zone}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono h-5 min-w-[20px] justify-center">
                          {agents.length}
                        </Badge>
                        {totalWorkload > 0 && (
                          <Badge variant="outline" className="text-[10px] h-5 gap-1 border-amber-200/70 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800/60 dark:text-amber-200">
                            <Clock className="h-3 w-3" /> {totalWorkload} actif{totalWorkload > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className={cn(
                        'h-4 w-4 transition-transform',
                        zoneOpen(zone) ? 'rotate-0' : '-rotate-90'
                      )} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="font-bold text-xs">Agent</TableHead>
                              <TableHead className="font-bold text-xs">Zone</TableHead>
                              <TableHead className="font-bold text-xs">Planifications actives</TableHead>
                              <TableHead className="font-bold text-xs text-right pr-4">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {agents.map((agent) => {
                              const name = (agent.label || '').trim();
                              const active = agentWorkload[name] || 0;
                              return (
                                <TableRow
                                  key={agent.id}
                                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                                  onClick={() => {
                                    setFilters({ agentFilter: name });
                                    setViewMode('list');
                                  }}
                                >
                                  <TableCell className="font-medium text-sm">{name || '-'}</TableCell>
                                  <TableCell>
                                    {/* Subtle zone badge — redundant within the group but useful
                                        when skimming a single row out of context. */}
                                    {agent.zone?.trim() ? (
                                      <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                                        <MapPin className="h-3 w-3" /> {agent.zone.trim()}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] font-normal italic text-muted-foreground">
                                        Non définie
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {active > 0 ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] gap-1 border-amber-200/70 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800/60 dark:text-amber-200"
                                      >
                                        <Clock className="h-3 w-3" /> {active}
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right pr-4">
                                    <span className="text-[11px] text-primary underline-offset-2 hover:underline">
                                      Voir assignations
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )
      ) : loading ? (
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </CardContent>
        </Card>
      ) : filteredPlanifications.length === 0 ? (
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <EmptyState
              icon={<Calendar />}
              title={`Aucune mission ${activeTab.toLowerCase()}`}
              description="Les nouvelles assignations apparaîtront ici."
              dashed={false}
              className="border-0 bg-transparent py-10"
            />
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
                  <TableHead className="font-bold text-xs">Téléphone</TableHead>
                  <TableHead className="font-bold text-xs">Créé le</TableHead>
                  <TableHead className="font-bold text-xs">Assigné par</TableHead>
                </TableRow>
              </TableHeader>
            );
            const renderRow = (p: PlanificationItem) => (
              <TableRow
                key={`${p.dossierId}-${p.id}`}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/assignations-atg/${p.dossierId}?mission=${encodeURIComponent(activeTab)}`)}
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
                  <div className="flex flex-col gap-1">
                    <AssurePhoneLink telephone={dossierLive[p.dossierId]?.assureTelephone || p.assureTelephone} />
                    <DeadlineBadge dateRDV={p.dateRDV} createdAt={p.createdAt} />
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.modifiedByName || '-'}</TableCell>
              </TableRow>
            );

            return groups.filter(g => g.items.length > 0).map((group) => {
              const addressableCount = group.items.filter(p => p.adresse?.trim()).length;
              return (
              <Collapsible
                key={group.key}
                open={openSections[group.key]}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [group.key]: open }))}
              >
                <Card className="shadow-sm overflow-hidden">
                  <div className={cn('flex items-center w-full transition-colors hover:opacity-80', group.color)}>
                    <CollapsibleTrigger className="flex-1 flex items-center justify-between px-4 py-3">
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
                    {/* Start button — bundles every group item with an adresse into a
                        Google Maps multi-stop URL, ordered by earliest RDV first. */}
                    <div className="px-3 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1.5 text-xs"
                        disabled={addressableCount === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          openRouteForItems(group.items);
                        }}
                        title="Ouvrir l'itinéraire dans Google Maps"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Start
                      </Button>
                    </div>
                  </div>
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
              );
            });
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
