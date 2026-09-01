'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collectionGroup, onSnapshot, query, orderBy, limit, doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card } from '@/components/ui/card';
import { Calendar, ChevronDown, ChevronRight, Navigation, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
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

function AssurePhoneLink({ telephone, className }: { telephone?: string | null; className?: string }) {
  const display = (telephone || '').trim();
  if (!display) {
    return <span className={cn('text-sm text-ink-3', className)}>—</span>;
  }
  const href = normalizePhoneForTel(display);
  return (
    <a
      href={`tel:${href}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'relative z-10 inline-flex min-h-[24px] items-center whitespace-nowrap text-sm font-semibold tabular-nums text-primary hover:underline',
        className,
      )}
    >
      {display}
    </a>
  );
}

// Status pairs only (DESIGN.md §10) — never hand-picked amber/red classes.
type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
const CHIP_TONE: Record<ChipTone, string> = {
  neutral: 'bg-surface-3 text-ink-2',
  success: 'bg-status-success-bg text-status-success-fg',
  warning: 'bg-status-warning-bg text-status-warning-fg',
  danger: 'bg-status-danger-bg text-status-danger-fg',
  info: 'bg-status-info-bg text-status-info-fg',
};
function StatusChip({ tone, className, children }: { tone: ChipTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-medium tabular-nums', CHIP_TONE[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Deadline status chip for mission rows. No bar; just a status pair:
 *   • "En attente" while the RDV is in the future
 *   • "En retard 02j/14h" past the 24-business-hour deadline (danger)
 *   • "Xh restants" while in progress (neutral → warning → danger)
 * Re-renders every 30s like the original DeadlineBar.
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
    return <StatusChip tone="neutral">En attente</StatusChip>;
  }
  if (expired) {
    return <StatusChip tone="danger">{lateness ? `En retard ${lateness}` : 'En retard'}</StatusChip>;
  }
  const tone: ChipTone = percent > 80 ? 'danger' : percent > 50 ? 'warning' : 'neutral';
  return <StatusChip tone={tone}>{remaining}</StatusChip>;
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

/** Underline tabs (M3 primary tabs / DESIGN.md step facets) for Avant · En cours · Après. */
function MissionTabs({ active, counts, onChange, className }: { active: string; counts: Record<string, number>; onChange: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" aria-label="Type de mission" className={cn('flex w-full', className)}>
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
              'flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:flex-none',
              isActive ? 'border-primary text-ink' : 'border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
            )}
          >
            {tab.label}
            <span className={cn('inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums', isActive ? 'bg-accent text-accent-foreground' : 'bg-surface-3 text-ink-3')}>
              {counts[tab.id] || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * One mission row — planification-tab convention: hairline-separated, the
 * date block is the anchor (next upcoming RDV wears the third colour), labels
 * quiet, values bold, every detail in the row. The ref is a stretched button
 * covering the row; phone / address controls sit above it (z-10).
 */
function MissionRow({
  p,
  matricule,
  telephone,
  showAgent,
  dense,
  upcoming,
  onOpen,
  formatDate,
}: {
  p: PlanificationItem;
  matricule?: string;
  telephone?: string;
  showAgent: boolean;
  dense: boolean;
  upcoming: boolean;
  onOpen: () => void;
  formatDate: (ts: any) => string;
}) {
  const rdv = toDate(p.dateRDV);
  return (
    <li className="relative flex min-h-[56px] items-start gap-4 px-4 py-4 transition-colors hover:bg-surface-2 sm:px-6">
      <div
        className={cn(
          'flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1.5 text-center tabular-nums',
          upcoming ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled' : 'bg-surface-3 text-ink-2 shadow-rim',
        )}
      >
        <span className="text-[11px] font-medium leading-none">{rdv ? format(rdv, 'MMM', { locale: fr }).replace('.', '') : '—'}</span>
        <span className="font-headline text-xl font-semibold leading-tight">{rdv ? format(rdv, 'd') : '—'}</span>
        <span className="text-[11px] leading-none">{rdv ? format(rdv, 'HH:mm') : ''}</span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={onOpen}
            className="t-mono truncate font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {p.dossierNom || p.dossierId}
          </button>
          <span className="min-w-0 truncate text-sm font-semibold text-ink">{p.assureNom || '—'}</span>
          <DeadlineChip dateRDV={p.dateRDV} createdAt={p.createdAt} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
          <span className="truncate">{p.compagnie || '—'}</span>
          <span className="t-mono text-ink-3">{matricule || '—'}</span>
          {p.expertRank && <span className="truncate">{p.expertRank}</span>}
        </div>
        <dl className={cn('grid grid-cols-2 gap-x-6 gap-y-2', dense ? '' : 'sm:grid-cols-3 xl:grid-cols-4')}>
          <div className="min-w-0">
            <dt className="t-label">Zone</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{p.zone || <span className="font-normal text-ink-3">—</span>}</dd>
          </div>
          <div className="min-w-0">
            <dt className="t-label">Téléphone</dt>
            <dd className="mt-0.5"><AssurePhoneLink telephone={telephone} /></dd>
          </div>
          <div className={cn('min-w-0', dense ? 'col-span-2' : 'col-span-2 sm:col-span-1 xl:col-span-2')}>
            <dt className="t-label">Adresse</dt>
            <dd className="mt-0.5 text-sm text-ink">
              {p.adresse ? (
                // Anchor nested inside a role="button" card was being swallowed on
                // some mobile browsers. Explicit click handler that stops bubbling,
                // prevents default, and opens the maps URL via window.open.
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
                  title={p.adresse}
                  className="relative z-10 block max-w-full truncate text-left font-semibold text-primary hover:underline"
                >
                  {p.adresse}
                </button>
              ) : (
                <span className="text-ink-3">—</span>
              )}
            </dd>
          </div>
          {showAgent && (
            <div className="min-w-0">
              <dt className="t-label">Agent</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{p.agentTerrain || <span className="font-normal text-ink-3">—</span>}</dd>
            </div>
          )}
          {!dense && (
            <>
              <div className="min-w-0">
                <dt className="t-label">Créé le</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-ink">{formatDate(p.createdAt)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="t-label">Créé par</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-ink">
                  {p.createdByName ? (
                    <>
                      {p.createdByName}
                      {p.createdByRole && <span className="ml-1 font-normal text-ink-3">({p.createdByRole})</span>}
                    </>
                  ) : (
                    <span className="font-normal text-ink-3">—</span>
                  )}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="t-label">Assigné par</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{p.modifiedByName || <span className="font-normal text-ink-3">—</span>}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      <ChevronRight className="mt-4 h-4 w-4 shrink-0 text-ink-4" aria-hidden />
    </li>
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

    return [
      { key: 'today' as const, label: "Aujourd'hui", items: todayGroup, tone: 'info' as ChipTone },
      { key: 'expired' as const, label: 'En retard', items: expiredGroup, tone: 'danger' as ChipTone },
      { key: 'future' as const, label: 'À venir', items: futureGroup, tone: 'neutral' as ChipTone },
    ];
  }, [filteredPlanifications]);

  // The next upcoming RDV (nearest in the future) wears the third colour on
  // its date block — planification-tab "next visit" convention.
  const upcomingKey = useMemo(() => {
    const now = Date.now();
    let best: { key: string; t: number } | null = null;
    for (const p of filteredPlanifications) {
      const rdv = toDate(p.dateRDV);
      if (!rdv) continue;
      const t = rdv.getTime();
      if (t < now) continue;
      if (!best || t < best.t) best = { key: `${p.dossierId}-${p.id}`, t };
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
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy HH:mm", { locale: fr }); }
    catch { return '-'; }
  };

  const isATG = profile?.role === 'Agent de Terrain';
  const canUseAtFlows = isATG || profile?.role === 'Admin';
  const canSeeNameFilter = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const showAgentColumn = !isATG;
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

  const renderGroupRows = (items: PlanificationItem[], dense: boolean) => (
    <ol className="divide-y divide-hairline">
      {items.map((p) => (
        <MissionRow
          key={`${p.dossierId}-${p.id}`}
          p={p}
          matricule={dossierLive[p.dossierId]?.matricule}
          telephone={dossierLive[p.dossierId]?.assureTelephone ?? p.assureTelephone}
          showAgent={showAgentColumn}
          dense={dense}
          upcoming={upcomingKey === `${p.dossierId}-${p.id}`}
          onOpen={() => openMission(p)}
          formatDate={formatDate}
        />
      ))}
    </ol>
  );

  if (isMobile) {
    return (
      // Bleeds the layout gutter (p-4) so the sticky bars run edge to edge.
      <div className="-mx-4 -mt-4">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 glass-bar border-b border-hairline px-4">
          <h1 className="t-heading flex-1 truncate">Mes missions</h1>
          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-surface-3 px-2 text-xs font-medium tabular-nums text-ink-2">
            {filteredPlanifications.length}
          </span>
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative h-10 w-10 shrink-0" aria-label="Filtres">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold tabular-nums text-accent-foreground">
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
                <div className="space-y-1.5">
                  <label className="t-label" htmlFor="atg-search">Recherche</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                    <Input
                      id="atg-search"
                      value={keyword}
                      onChange={(e) => setFilters({ keyword: e.target.value })}
                      placeholder="Réf, assuré, adresse, immat..."
                      className="h-11 pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="t-label">Compagnie</span>
                  <Select value={compagnieFilter} onValueChange={v => setFilters({ compagnieFilter: v })}>
                    <SelectTrigger className="h-11 w-full" aria-label="Compagnie">
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
                    <span className="t-label">Agent</span>
                    <Select value={agentFilter} onValueChange={v => setFilters({ agentFilter: v })}>
                      <SelectTrigger className="h-11 w-full" aria-label="Agent">
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
                <Button variant="ghost" className="h-11 flex-1" onClick={resetFilters}>
                  Réinitialiser
                </Button>
                <Button className="h-11 flex-1" onClick={() => setIsFilterSheetOpen(false)}>
                  Appliquer
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex h-10 items-center justify-between border-b border-hairline px-4 text-sm">
          <span className="truncate text-ink-3">
            Bonjour <span className="font-semibold text-ink">{profile?.prenom || profile?.nom || 'agent'}</span>
            {' · '}
            {format(new Date(), 'EEE d MMM', { locale: fr })}
          </span>
          <span className="shrink-0 text-ink-2 tabular-nums">
            {filteredPlanifications.length} mission{filteredPlanifications.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* AT self-service (scan plaque → planifier / importer photos): the ONE
            solid primary, full width and thumb-sized on phones. */}
        {canUseAtFlows && (
          <div className="px-4 py-3">
            <AtScanPlaqueFlow buttonClassName="h-12 w-full" />
          </div>
        )}

        <div className="sticky top-14 z-20 glass-bar border-b border-hairline">
          <MissionTabs active={activeTab} counts={countByType} onChange={(id) => setFilters({ activeTab: id })} />
        </div>

        {loading ? (
          <ul className="divide-y divide-hairline" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-start gap-4 px-4 py-4">
                <Skeleton className="h-14 w-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : filteredPlanifications.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Calendar />}
              title={`Aucune mission ${activeTab.toLowerCase()}`}
              description="Les nouvelles assignations apparaîtront ici."
            />
          </div>
        ) : (
          <div>
            {visibleGroups.map((group) => {
              const addressableCount = group.items.filter(p => p.adresse?.trim()).length;
              return (
                <Collapsible
                  key={group.key}
                  open={openSections[group.key]}
                  onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [group.key]: open }))}
                >
                  <div className="flex min-h-[56px] items-center gap-2 border-b border-hairline bg-surface-2 px-4">
                    <CollapsibleTrigger className="flex h-11 min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform', openSections[group.key] ? 'rotate-0' : '-rotate-90')} />
                      <span className="t-heading truncate">{group.label}</span>
                      <StatusChip tone={group.tone}>{group.items.length}</StatusChip>
                    </CollapsibleTrigger>
                    {/* Start button — bundles every group item with an adresse into a
                        Google Maps multi-stop URL, ordered by earliest RDV first. */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 shrink-0 gap-1.5"
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
                  <CollapsibleContent>
                    {renderGroupRows(sortGroupItems(group.items, deadlineSortByGroup[group.key]), true)}
                  </CollapsibleContent>
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
      <PageHeader
        title={titleForRoute('/assignations-atg') ?? 'Missions terrain'}
        count={filteredPlanifications.length}
        actions={canUseAtFlows ? <AtScanPlaqueFlow /> : undefined}
        tabs={<MissionTabs active={activeTab} counts={countByType} onChange={(id) => setFilters({ activeTab: id })} className="border-b border-hairline" />}
        filters={
          // Quiet toolbar: solid input/selects under `t-label` labels, one ghost reset.
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="flex flex-col gap-1">
              <label className="t-label" htmlFor="atg-search-desktop">Recherche</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                <Input
                  id="atg-search-desktop"
                  value={keyword}
                  onChange={(e) => setFilters({ keyword: e.target.value })}
                  placeholder="Rechercher (réf, assuré, adresse, immat...)"
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
        <Card className="overflow-hidden">
          <ul className="divide-y divide-hairline" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-start gap-4 px-6 py-4">
                <Skeleton className="h-14 w-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3.5 w-72 max-w-full" />
                  <Skeleton className="h-3.5 w-56 max-w-full" />
                </div>
                <Skeleton className="h-5 w-24 rounded-full" />
              </li>
            ))}
          </ul>
        </Card>
      ) : filteredPlanifications.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={<Calendar />}
            title={`Aucune mission ${activeTab.toLowerCase()}`}
            description="Les nouvelles assignations apparaîtront ici."
            dashed={false}
            className="rounded-none bg-transparent py-12"
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map((group) => {
            const addressableCount = group.items.filter(p => p.adresse?.trim()).length;
            return (
              <Collapsible
                key={group.key}
                open={openSections[group.key]}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [group.key]: open }))}
              >
                {/* One paper per group: hairline header row (title · count · sort · Start), rows below. */}
                <Card className="overflow-hidden">
                  <div className="flex min-h-[48px] items-center gap-3 border-b border-hairline px-6 py-2">
                    <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform', openSections[group.key] ? 'rotate-0' : '-rotate-90')} />
                      <h2 className="t-heading truncate">{group.label}</h2>
                      <StatusChip tone={group.tone}>{group.items.length}</StatusChip>
                    </CollapsibleTrigger>
                    <SortableHeader
                      label="Délai"
                      sort={deadlineSortByGroup[group.key]}
                      onChange={(next) => setDeadlineSortByGroup(prev => ({ ...prev, [group.key]: next }))}
                      className="text-xs"
                    />
                    {/* Start button — bundles every group item with an adresse into a
                        Google Maps multi-stop URL, ordered by earliest RDV first. */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-1.5"
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
                  <CollapsibleContent>
                    {renderGroupRows(sortGroupItems(group.items, deadlineSortByGroup[group.key]), false)}
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
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
