'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collectionGroup, onSnapshot, query, orderBy, limit, doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Calendar, ChevronDown, Navigation, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { IconChip } from '@/components/ui/icon-chip';
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
import { businessHoursBetween, formatBusinessLateness } from '@/lib/business-days';
import { useHolidays } from '@/hooks/use-holidays';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { titleForRoute } from '@/lib/nav-groups';
import AtScanPlaqueFlow from './at-scan-plaque-flow';

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
  createdByName?: string;
  createdByRole?: string;
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
// - 1 address: origin=<originParam> → destination.
// - 2+ addresses: last is destination, earlier ones become pipe-separated waypoints.
// `origin` defaults to "My+Location" (Maps' magic string) but Maps often
// fails to pick up the agent's real position from that — supplying a literal
// "<lat>,<lng>" from the browser's geolocation API is much more reliable.
// Caller is responsible for capping the list at Google Maps' 10-stop limit
// (1 destination + up to 9 waypoints).
function buildMultiStopMapsUrl(addresses: string[], origin?: string): string {
  const enc = (s: string) => encodeURIComponent(s.trim());
  const originParam = origin && origin.trim() ? encodeURIComponent(origin.trim()) : 'My+Location';
  if (addresses.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${enc(addresses[0])}&travelmode=driving`;
  }
  const dest = enc(addresses[addresses.length - 1]);
  const waypoints = addresses.slice(0, -1).map(enc).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${dest}&waypoints=${waypoints}&travelmode=driving`;
}

// Best-effort current-position read for the Start button. Resolves to a
// "lat,lng" string when geolocation succeeds within 4s; null otherwise
// (caller falls back to Maps' "My+Location" magic string).
function readCurrentPositionString(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const { latitude, longitude } = pos.coords;
        resolve(`${latitude.toFixed(6)},${longitude.toFixed(6)}`);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 }
    );
  });
}

/** Phone as a `link` (element-specs §8 `link` variant is the only coloured text; teal = links). */
function AssurePhoneLink({ telephone, className }: { telephone?: string | null; className?: string }) {
  const display = (telephone || '').trim();
  if (!display) {
    return <span className={cn('text-ink-4', className)}>—</span>;
  }
  const href = normalizePhoneForTel(display);
  return (
    <a
      href={`tel:${href}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex min-h-[24px] items-center whitespace-nowrap text-sm font-semibold tabular-nums text-primary underline-offset-4 hover:underline',
        className,
      )}
    >
      {display}
    </a>
  );
}

// Badge status pairs only (element-specs §11) — never hand-picked amber/red classes.
type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'time';

/**
 * Deadline chip (element-specs §11: status pair + text label, never colour
 * alone; Few — colour only where there IS an exception):
 *   • "En attente" (neutral) while the RDV is in the future
 *   • "Xh Ym" (neutral → warning past 50 % → danger past 80 %) while the clock runs
 *   • "En retard 02j/14h" (danger) past the 24-business-hour deadline
 * Re-renders every 30 s like the original DeadlineBar.
 */
function DeadlineChip({
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
  const { remaining, expired, pending, elapsedHours, percent } = getDeadlineInfo(dateRDV, createdAt, holidays);
  const lateness = expired ? formatBusinessLateness(elapsedHours - DEADLINE_HOURS) : '';
  if (pending) {
    return <Badge variant="neutral">En attente</Badge>;
  }
  if (expired) {
    return <Badge variant="danger">{lateness ? `En retard ${lateness}` : 'En retard'}</Badge>;
  }
  const tone: ChipTone = percent > 80 ? 'danger' : percent > 50 ? 'warning' : 'neutral';
  return <Badge variant={tone}>{remaining}</Badge>;
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

function toDate(ts: any): Date | null {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts);
}

function getDeadlineInfo(
  dateRDV: any,
  createdAt: any,
  holidays?: ReadonlySet<string>,
): { percent: number; remaining: string; expired: boolean; pending: boolean; elapsedHours: number } {
  // Start the 24-business-hour countdown from when the planification was created.
  // Fall back to dateRDV only for legacy planifications missing createdAt.
  const refDate = createdAt || dateRDV;
  if (!refDate) return { percent: 0, remaining: '-', expired: false, pending: false, elapsedHours: 0 };

  const rdvDate = refDate.toDate ? refDate.toDate() : new Date(refDate);
  const startTime = new Date(rdvDate);

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

/**
 * Raised tab on a visible track (addendum 2026-09-02, supersedes the underline
 * idiom: NN/g "Flat design" ✓ text-only controls get skipped by new users —
 * backgrounds, borders and shadows restore clickability; NN/g Tabs Used Right ✓
 * "at least two selection indicators"). Same anatomy as `components/ui/tabs.tsx`:
 * recessed `surface-2` track (hairline, 8 px side padding so the outward
 * feet fit), active tab = raised `bg-card` card with the light rim + a 2 px
 * accent bar under the label, inactive tabs drawn grey `surface-4` with a
 * `surface-3` hover (owner ruling ter); counts stay neutral pills (§11).
 */
function MissionTabs({ active, counts, onChange, className }: { active: string; counts: Record<string, number>; onChange: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" aria-label="Type de mission" className={cn('inline-flex h-10 items-end gap-1 rounded-lg border border-hairline bg-surface-2 px-2 pt-1', className)}>
      {MISSION_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              // Browser-tab shape (owner rulings 2026-09-02 + ter): `.tab-slope`
              // draws the sloped grey body + outward feet; aria-selected
              // drives the active card fill.
              'tab-slope relative inline-flex h-[34px] items-center justify-center gap-2 whitespace-nowrap px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {tab.label}
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
              {counts[tab.id] || 0}
            </span>
            {/* Accent bar (second indicator) — a real element because ::after
                now draws the tab feet. */}
            <span
              aria-hidden
              className={cn('pointer-events-none absolute inset-x-3 bottom-[3px] h-0.5 rounded-full bg-primary transition-opacity', isActive ? 'opacity-100' : 'opacity-0')}
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sloped tab strip for phones (owner ruling 2026-09-02 ter: every tablist
 * that switches a VIEW draws the browser-tab shape — this one included).
 * The equal-width 3-col grid stays from the segmented layout (Apple HIG:
 * closely related, mutually exclusive choices, ≤ 5 all-text segments,
 * labels ≤ 2 words); `.tab-slope` (globals.css) supplies the fills —
 * recessed surface-2 track, grey surface-4 inactive tabs, active raised
 * card. Counts stay tabular text, not icons.
 */
function MissionSegments({ active, counts, onChange, className }: { active: string; counts: Record<string, number>; onChange: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" aria-label="Type de mission" className={cn('grid grid-cols-3 items-end gap-1 rounded-lg border border-hairline bg-surface-2 px-2 pt-1', className)}>
      {MISSION_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'tab-slope relative flex h-9 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {tab.label}
            <span className={cn('text-[11px] tabular-nums', isActive ? 'text-ink-2' : 'text-ink-3')}>{counts[tab.id] || 0}</span>
          </button>
        );
      })}
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
  type DossierLive = { statut: string; photos: Record<PhotoCategory, boolean>; assureTelephone: string; matricule?: string };
  const [dossierLive, setDossierLive] = useState<Record<string, DossierLive>>({});
  const filterDefaults = { activeTab: 'Avant', dateFrom: '', dateTo: '', compagnieFilter: 'Toutes', agentFilter: 'Tous', keyword: '' };
  const [filters, setFilters, clearFilter] = usePersistedFilters('assignations-atg', filterDefaults);
  const { activeTab, dateFrom, dateTo, compagnieFilter, agentFilter, keyword } = filters;

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
          createdByName: data.createdByName || '',
          createdByRole: data.createdByRole || '',
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

      // Seed dossierLive with what we just fetched so the first render has
      // the freshest phone immediately — the per-dossier onSnapshot below
      // continues to provide realtime updates, but this avoids a brief
      // window where the display would have to fall back to a stale value.
      setDossierLive(prev => {
        const next = { ...prev };
        for (const [dId, dd] of Object.entries(dossierData)) {
          next[dId] = {
            statut: dd.statut,
            photos: dd.photos,
            assureTelephone: dd.assureTelephone,
          };
        }
        return next;
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
        const matricule = (data.vehicule?.immatriculation || data.matricule || '').toString().trim();
        setDossierLive(prev => ({
          ...prev,
          [dId]: {
            statut: data.statut || '',
            photos: prev[dId]?.photos || { avant: false, en_cours: false, apres: false },
            assureTelephone: tel,
            matricule,
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
            matricule: prev[dId]?.matricule || '',
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

  // Agent options derive from the planifications themselves (the two unused
  // options/workload subscriptions were removed with the dead by-zone view).
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
    if (keyword && keyword.trim()) {
      const needle = keyword.trim().toLowerCase();
      results = results.filter(p => {
        const matricule = dossierLive[p.dossierId]?.matricule || '';
        return [
          p.dossierNom,
          p.assureNom,
          p.assureTelephone,
          p.adresse,
          p.zone,
          p.observation,
          p.compagnie,
          p.agentTerrain,
          p.typeMission,
          matricule,
        ]
          .some((f) => typeof f === 'string' && f.toLowerCase().includes(needle));
      });
    }
    return results;
  }, [planifications, activeTab, compagnieFilter, agentFilter, dateFrom, dateTo, keyword, dossierLive]);

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

    // Group count chip tones (element-specs §11 / Few): danger for the
    // exception (late), the warm TIME chip for today (terracotta = temporal
    // salience, 2026-09-02), neutral for the rest — on the COUNT chip only.
    return [
      { key: 'today' as const, label: "Aujourd'hui", items: todayGroup, tone: 'time' as ChipTone },
      { key: 'expired' as const, label: 'En retard', items: expiredGroup, tone: 'danger' as ChipTone },
      { key: 'future' as const, label: 'À venir', items: futureGroup, tone: 'neutral' as ChipTone },
    ];
  }, [filteredPlanifications]);

  // The single NEXT upcoming RDV across the filtered list — its date block is
  // the one SOLID terracotta anchor of the mobile list (addendum 1a: the tint
  // may repeat, the solid block stays unique).
  const nextMissionKey = useMemo(() => {
    const now = Date.now();
    let best: { key: string; t: number } | null = null;
    for (const p of filteredPlanifications) {
      const rdv = toDate(p.dateRDV);
      if (!rdv || rdv.getTime() < now) continue;
      if (!best || rdv.getTime() < best.t) best = { key: `${p.dossierId}-${p.id}`, t: rdv.getTime() };
    }
    return best?.key ?? null;
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
  const openRouteForItems = async (items: PlanificationItem[]) => {
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
    // Read the agent's live coords FIRST so we can pass them as the explicit
    // `origin` — "My+Location" is unreliable; an explicit lat,lng always works.
    const origin = await readCurrentPositionString();
    const url = buildMultiStopMapsUrl(route, origin ?? undefined);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const formatDate = (ts: any) => {
    if (!ts) return null;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy HH:mm", { locale: fr }); }
    catch { return null; }
  };

  const isATG = profile?.role === 'Agent de Terrain';
  const canUseAtFlows = isATG || profile?.role === 'Admin';
  const canSeeNameFilter = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const showAgentColumn = !isATG;
  const colCount = showAgentColumn ? 12 : 11;
  const isMobile = useIsMobile();

  const activeFilterCount =
    (compagnieFilter !== 'Toutes' ? 1 : 0) +
    (canSeeNameFilter && agentFilter !== 'Tous' ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (keyword ? 1 : 0);

  const resetFilters = () => setFilters({ compagnieFilter: 'Toutes', agentFilter: 'Tous', dateFrom: '', dateTo: '', keyword: '' });

  const openMission = (p: PlanificationItem) =>
    router.push(`/assignations-atg/${p.dossierId}?mission=${encodeURIComponent(activeTab)}`);

  const visibleGroups = groups.filter(g => g.items.length > 0);

  // Empty table cells read « — » in ink-4 (blueprint §9: empty = — muted).
  const emptyCell = <span className="text-ink-4">—</span>;

  const openMapsFor = (adresse: string) =>
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`, '_blank', 'noopener,noreferrer');

  // Empty state (element-specs §12: NN/g ✓ state + reason + pathway; Polaris ✓
  // one action). The filtered variant names the fix as its ONE `tonal` action.
  const emptyState = (
    <EmptyState
      icon={<Calendar />}
      title={activeFilterCount > 0 ? 'Aucune mission pour ces filtres' : `Aucune mission ${activeTab.toLowerCase()}`}
      description={activeFilterCount > 0
        ? 'Élargissez la période ou réinitialisez les filtres pour revoir vos missions.'
        : 'Les nouvelles assignations apparaîtront ici.'}
      action={activeFilterCount > 0 ? (
        <Button variant="tonal" onClick={() => { clearFilter('keyword'); resetFilters(); }}>Réinitialiser les filtres</Button>
      ) : undefined}
      dashed={false}
      className="border-0 bg-transparent py-10"
    />
  );

  // Group header row — Material 3 list item ✓ (container + label text, trailing
  // text/controls at the end) + NN/g accordions ✓ ("ensure that both the
  // heading and icon are clickable and they both expand or collapse"; caret
  // signifier). A `surface-2` header band (addendum 5 — table group headers
  // may take bg-surface-2 so the group reads as a control, not a gray line):
  // chevron · t-heading · count chip (§11 — tone on the COUNT chip only) ·
  // sort · "Start" as `secondary` (§8 — not the page primary). The page's ONE
  // neutral IconChip sits beside « Aujourd'hui » (addendum 1b — the section that
  // anchors the agent's day; never beside the En retard group).
  const renderGroupHeader = (group: (typeof groups)[number], dense: boolean) => {
    const addressableCount = group.items.filter(p => p.adresse?.trim()).length;
    const open = openSections[group.key];
    return (
      <div className={cn('flex min-h-[48px] items-center gap-3 bg-surface-2 py-2', dense ? 'rounded-lg border border-hairline px-4' : 'border-b border-hairline px-6')}>
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform', open ? 'rotate-0' : '-rotate-90')} aria-hidden />
          {group.key === 'today' && (
            <IconChip>
              <Calendar />
            </IconChip>
          )}
          <h2 className="t-heading truncate">{group.label}</h2>
          <Badge variant={group.tone}>{group.items.length}</Badge>
        </CollapsibleTrigger>
        {!dense && (
          <SortableHeader
            label="Délai"
            sort={deadlineSortByGroup[group.key]}
            onChange={(next) => setDeadlineSortByGroup(prev => ({ ...prev, [group.key]: next }))}
            className="text-xs"
          />
        )}
        {/* Start — bundles every group item with an adresse into a Google Maps
            multi-stop URL, ordered by earliest RDV first. */}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0"
          disabled={addressableCount === 0}
          onClick={(e) => {
            e.stopPropagation();
            openRouteForItems(group.items);
          }}
          title="Ouvrir l'itinéraire dans Google Maps"
        >
          <Navigation />
          Itinéraire
        </Button>
      </div>
    );
  };

  // Table head (element-specs §3: `t-label` heads from the primitive, text
  // columns left, first column frozen because 12 columns WILL overflow).
  const renderTableHeader = () => (
    <TableHeader>
      <TableRow>
        <TableHead className="sticky left-0 z-[2] border-r border-hairline">Dossier</TableHead>
        <TableHead>Assuré</TableHead>
        <TableHead>Immat.</TableHead>
        <TableHead>Compagnie</TableHead>
        {showAgentColumn && <TableHead>Agent</TableHead>}
        <TableHead>Date RDV</TableHead>
        <TableHead>Zone</TableHead>
        <TableHead>Adresse</TableHead>
        <TableHead>Téléphone</TableHead>
        <TableHead>Créé le</TableHead>
        <TableHead>Créé par</TableHead>
        <TableHead>Assigné par</TableHead>
      </TableRow>
    </TableHeader>
  );

  // Table row (§3: row = link, hover `surface-2` from the primitive, refs/plates
  // `t-mono`, dates tabular via the primitive, status as a chip, empty = —).
  const renderRow = (p: PlanificationItem) => (
    <TableRow
      key={`${p.dossierId}-${p.id}`}
      className="group cursor-pointer"
      tabIndex={0}
      onClick={() => openMission(p)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          openMission(p);
        }
      }}
    >
      {/* Frozen identifier column: sticky left, solid card, hairline on its right edge. */}
      <TableCell className="sticky left-0 z-[1] border-r border-hairline bg-card group-hover:bg-surface-2">
        <span className="t-mono font-semibold">{p.dossierNom || p.dossierId}</span>
      </TableCell>
      <TableCell className="max-w-[200px] truncate font-medium text-ink">{p.assureNom || emptyCell}</TableCell>
      <TableCell className="t-mono text-ink">{dossierLive[p.dossierId]?.matricule || emptyCell}</TableCell>
      <TableCell className="text-ink">{p.compagnie || emptyCell}</TableCell>
      {showAgentColumn && <TableCell className="text-ink">{p.agentTerrain || emptyCell}</TableCell>}
      <TableCell className="text-ink">
        {/* Date RDV is text → left; the figure is Inter 600 tabular (addendum 3).
            The deadline chip (§11) sits inline after it — no warm anchor here. */}
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-semibold tabular-nums">{formatDate(p.dateRDV) ?? emptyCell}</span>
          <DeadlineChip dateRDV={p.dateRDV} createdAt={p.createdAt} />
        </span>
      </TableCell>
      <TableCell className="text-ink">{p.zone || emptyCell}</TableCell>
      <TableCell className="max-w-[240px] text-ink-2">
        {p.adresse ? <span className="block truncate" title={p.adresse}>{p.adresse}</span> : emptyCell}
      </TableCell>
      <TableCell>
        <AssurePhoneLink telephone={dossierLive[p.dossierId]?.assureTelephone ?? p.assureTelephone} />
      </TableCell>
      <TableCell className="text-ink-3">{formatDate(p.createdAt) ?? emptyCell}</TableCell>
      <TableCell className="text-ink-2">
        {p.createdByName ? (
          <>
            <span>{p.createdByName}</span>
            {p.createdByRole && <span className="t-caption ml-1">({p.createdByRole})</span>}
          </>
        ) : emptyCell}
      </TableCell>
      <TableCell className="text-ink-2">{p.modifiedByName || emptyCell}</TableCell>
    </TableRow>
  );

  // Mobile mission card (element-specs §4 rows as tiles: Material 3 lists ✓
  // container + label text, supporting text, trailing meta; NN/g cards ✓ whole
  // card clickable). Padding 16, rim, everything the agent needs IN the tile:
  // ref + time / assuré + compagnie / zone · plate / address `link` / phone
  // `link` + deadline chip (§11). Cards stack with 12 px gaps — no dividers
  // AND gaps. The HH:mm figure is the warm date-block anchor (addendum 1a —
  // tint for every scheduled card, solid ONCE for the next upcoming RDV);
  // the En retard group keeps the plain figure so terracotta never sits
  // beside the lateness signals.
  const renderMissionCard = (p: PlanificationItem, groupKey: GroupKey) => {
    const rdv = toDate(p.dateRDV);
    const matricule = dossierLive[p.dossierId]?.matricule;
    const isNext = groupKey !== 'expired' && `${p.dossierId}-${p.id}` === nextMissionKey;
    const warmTime = groupKey !== 'expired' && !!rdv;
    return (
      <li key={`${p.dossierId}-${p.id}`}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => openMission(p)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openMission(p);
            }
          }}
          className="rounded-lg bg-card p-4 shadow-rim transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="t-mono truncate font-semibold">{p.dossierNom || p.dossierId}</span>
            {warmTime ? (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums',
                  isNext
                    ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled'
                    : 'bg-tertiary-bg text-tertiary-deep shadow-rim',
                )}
              >
                {format(rdv!, 'HH:mm')}
              </span>
            ) : (
              <span className="t-caption shrink-0 tabular-nums">{rdv ? format(rdv, 'HH:mm') : '—'}</span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-ink">{p.assureNom || '—'}</span>
            {p.compagnie && <Badge variant="neutral" className="shrink-0">{p.compagnie}</Badge>}
          </div>
          {/* Facts as a compact definition list (§10: quiet labels, bold values). */}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="min-w-0">
              <dt className="t-label">Zone</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{p.zone || <span className="font-normal text-ink-4">—</span>}</dd>
            </div>
            <div className="min-w-0">
              <dt className="t-label">Immatriculation</dt>
              <dd className="t-mono mt-0.5 truncate font-semibold">{matricule || <span className="font-normal text-ink-4">—</span>}</dd>
            </div>
            <div className="col-span-2 min-w-0">
              <dt className="t-label">Adresse</dt>
              <dd className="mt-0.5 text-sm">
                {p.adresse ? (
                  // Anchor nested inside a role="button" card was being swallowed on
                  // some mobile browsers. Explicit click handler that stops bubbling,
                  // prevents default, and opens the maps URL via window.open.
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); openMapsFor(p.adresse); }}
                    title={p.adresse}
                    className="block max-w-full truncate text-left font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {p.adresse}
                  </button>
                ) : (
                  <span className="text-ink-4">—</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <AssurePhoneLink telephone={dossierLive[p.dossierId]?.assureTelephone ?? p.assureTelephone} />
            <DeadlineChip dateRDV={p.dateRDV} createdAt={p.createdAt} />
          </div>
        </div>
      </li>
    );
  };

  if (isMobile) {
    return (
      <div>
        {/* Mobile sticky header (element-specs §23 / NN/g sticky headers ✓:
            small, high-contrast, ≤ 48 px, `.glass-bar` + hairline) — inside
            the page padding, no negative-margin bleed. */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 glass-bar border-b border-hairline">
          <h1 className="t-heading flex-1 truncate">Mes missions</h1>
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
            {filteredPlanifications.length}
          </span>
          {/* Filters in a bottom sheet (§2 Polaris filters ✓ clear-all; §13
              bottom sheet below lg): Réinitialiser `ghost` + Appliquer `default`. */}
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative h-9 w-9 shrink-0" aria-label={activeFilterCount > 0 ? `Filtres (${activeFilterCount} actifs)` : 'Filtres'}>
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-surface-3 px-1 text-[11px] font-medium tabular-nums text-ink-2 shadow-rim">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="flex h-[calc(70vh/var(--app-zoom))] flex-col p-0">
              <SheetHeader className="border-b border-hairline px-4 py-3">
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <div className="space-y-1">
                  <label className="t-label" htmlFor="atg-search">Recherche</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
                    <Input
                      id="atg-search"
                      value={keyword}
                      onChange={(e) => setFilters({ keyword: e.target.value })}
                      placeholder="Réf., assuré, adresse, plaque…"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="t-label">Compagnie</span>
                  <Select value={compagnieFilter} onValueChange={v => setFilters({ compagnieFilter: v })}>
                    <SelectTrigger className="w-full" aria-label="Compagnie">
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
                  <div className="space-y-1">
                    <span className="t-label">Agent</span>
                    <Select value={agentFilter} onValueChange={v => setFilters({ agentFilter: v })}>
                      <SelectTrigger className="w-full" aria-label="Agent">
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
                <div className="space-y-1">
                  <span className="t-label">Période</span>
                  <DateRangeFilter
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onDateFromChange={v => setFilters({ dateFrom: v })}
                    onDateToChange={v => setFilters({ dateTo: v })}
                  />
                </div>
              </div>
              <div className="flex gap-2 border-t border-hairline p-3">
                <Button variant="ghost" className="flex-1" onClick={resetFilters}>
                  Réinitialiser
                </Button>
                <Button className="flex-1" onClick={() => setIsFilterSheetOpen(false)}>
                  Appliquer
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Greeting bar — caption row with the real date (blueprint: every
            period-bound caption prints the real range). */}
        <div className="flex h-10 items-center justify-between border-b border-hairline text-sm">
          <span className="truncate text-ink-3">
            Bonjour <span className="font-semibold text-ink">{profile?.prenom || profile?.nom || 'agent'}</span>
            {' · '}
            {format(new Date(), 'EEE d MMM', { locale: fr })}
          </span>
          <span className="shrink-0 tabular-nums text-ink-2">
            {filteredPlanifications.length} mission{filteredPlanifications.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* AT self-service (scan plaque → planifier / importer photos): the ONE
            filled button on the page (§8), full width and thumb-sized on phones. */}
        {canUseAtFlows && (
          <div className="py-3">
            <AtScanPlaqueFlow buttonClassName="w-full" buttonSize="lg" />
          </div>
        )}

        {/* Segmented mission type (§7) — sticky under the header. */}
        <div className="sticky top-12 z-20 glass-bar border-b border-hairline py-2">
          <MissionSegments active={activeTab} counts={countByType} onChange={(id) => setFilters({ activeTab: id })} />
        </div>

        {loading ? (
          // Card-shaped skeleton (§15: mirror the final layout).
          <ul className="space-y-3 pt-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="space-y-3 rounded-lg bg-card p-4 shadow-rim">
                <div className="flex justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-3.5 w-10" /></div>
                <Skeleton className="h-4 w-48 max-w-full" />
                <div className="grid grid-cols-2 gap-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
                <Skeleton className="h-5 w-24 rounded-full" />
              </li>
            ))}
          </ul>
        ) : filteredPlanifications.length === 0 ? (
          <div className="pt-4">{emptyState}</div>
        ) : (
          <div className="space-y-4 pt-4">
            {visibleGroups.map((group) => (
              <Collapsible
                key={group.key}
                open={openSections[group.key]}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [group.key]: open }))}
              >
                {renderGroupHeader(group, true)}
                <CollapsibleContent>
                  <ol className="space-y-3 pt-3">
                    {sortGroupItems(group.items, deadlineSortByGroup[group.key]).map((p) => renderMissionCard(p, group.key))}
                  </ol>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header (element-specs §1: Polaris Page ✓ — plural object title,
          count pill, ONE filled button — the scan — at the right end, tabs row
          under the title, filters row under the tabs). */}
      <PageHeader
        title={titleForRoute('/assignations-atg') ?? 'Missions terrain'}
        count={filteredPlanifications.length}
        actions={canUseAtFlows ? <AtScanPlaqueFlow /> : undefined}
        tabs={<MissionTabs active={activeTab} counts={countByType} onChange={(id) => setFilters({ activeTab: id })} />}
        filters={
          // Filter toolbar (element-specs §2: Polaris filters ✓ search first,
          // clearly labelled, placeholder = format cue, ≤ 3 promoted filters,
          // clear-all; NN/g filter categories ✓ general → specific). Labels
          // `t-label` above each control; ONE ghost "Réinitialiser" at the end.
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="flex flex-col gap-1">
              <label className="t-label" htmlFor="atg-search-desktop">Recherche</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
                <Input
                  id="atg-search-desktop"
                  value={keyword}
                  onChange={(e) => setFilters({ keyword: e.target.value })}
                  placeholder="Réf., assuré, adresse, plaque…"
                  className="h-9 w-[260px] pl-8"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="t-label">Compagnie</span>
              <Select value={compagnieFilter} onValueChange={v => setFilters({ compagnieFilter: v })}>
                <SelectTrigger className="h-9 w-[180px]" aria-label="Compagnie">
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
              <div className="flex flex-col gap-1">
                <span className="t-label">Agent</span>
                <Select value={agentFilter} onValueChange={v => setFilters({ agentFilter: v })}>
                  <SelectTrigger className="h-9 w-[180px]" aria-label="Agent">
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
            <div className="flex flex-col gap-1">
              <span className="t-label">Période</span>
              <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { clearFilter('keyword'); resetFilters(); }}>
                Réinitialiser
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        // Table-shaped skeleton (§15: header row + 44 px rows; Carbon ✓ no spinner).
        <Card className="overflow-hidden">
          <Table regionLabel="Chargement des missions">
            {renderTableHeader()}
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={colCount} className="p-0">
                    <SkeletonRow />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : filteredPlanifications.length === 0 ? (
        <Card className="overflow-hidden">{emptyState}</Card>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <Collapsible
              key={group.key}
              open={openSections[group.key]}
              onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [group.key]: open }))}
            >
              {/* One paper per group (element-specs §5): hairline header row,
                  then the table without a second frame (§3/§5). */}
              <Card className="overflow-hidden">
                {renderGroupHeader(group, false)}
                <CollapsibleContent>
                  {/* Data table (§3: Polaris ✓ text left, headers aligned with data,
                      first column fixed when many columns; NN/g ✓ freeze header +
                      first column when wider than the screen, hover highlight;
                      Carbon ✓ only the sorted column shows its icon). */}
                  <Table regionLabel={`Missions ${group.label}`}>
                    {renderTableHeader()}
                    <TableBody>
                      {sortGroupItems(group.items, deadlineSortByGroup[group.key]).map(renderRow)}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
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
