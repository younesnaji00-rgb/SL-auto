'use client';

/**
 * Missions terrain — triage queue (rebuilt 2026-09-03 per the terrain research
 * dossier, docs/research/terrain-*.md; owner: "do everything except C and D").
 * Structure = Option A + B: two-line triage rows (~7 slots, audit metadata in
 * the peek panel), En retard group FIRST (triage order), click-to-filter
 * triage strip, list ⇄ carte lens, Ctrl+K palette, in-row quick actions
 * (appeler / WhatsApp / itinéraire / réassigner), bulk reassign with undo,
 * photo-progress chips, per-user density. Deadline chips ramp by LIGHTNESS
 * (outline → warning tint → danger tint → the page's only solid fill).
 */

import { PageHeader } from '@/components/layout/page-header';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collectionGroup, onSnapshot, query, orderBy, limit, doc, getDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, STICKY_HEAD, STICKY_CELL, EmptyCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  Calendar, ChevronDown, Clock, Columns3, List, Map as MapIcon, Monitor, Navigation, Search, SlidersHorizontal, Smartphone, TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Kbd } from '@/components/ui/kbd';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { IconChip } from '@/components/ui/icon-chip';
import { DateRangeFilter } from '@/components/date-range-filter';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format, startOfDay, addDays } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { SlidingThumb } from '@/components/ui/sliding-thumb';
import { isAtgCompletedStatus } from '@/lib/status-machine';
import { BRAND } from '@/lib/brand';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { SortableHeader, type SortDirection } from '@/components/ui/sortable-header';
import { businessHoursBetween, formatBusinessLateness } from '@/lib/business-days';
import { useHolidays } from '@/hooks/use-holidays';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAgentsLivePositions } from '@/hooks/use-agents-live-positions';
import { useToast } from '@/hooks/use-toast';
import { titleForRoute } from '@/lib/nav-groups';
import AtScanPlaqueFlow from './at-scan-plaque-flow';
import MissionMapView, { type MapMission } from './mission-map-view';
import MissionCommandPalette, { type PaletteAction } from './mission-command-palette';
import MissionPeekPanel from './mission-peek-panel';
import {
  CheckinButton, EnRouteButton, MissionRowActions, ReassignPopover, mapsSearchUrl, telHref, waHref,
} from './mission-quick-actions';
import { GeofenceCheckinBanner } from './mission-geofence-checkin';
import { MessageCircle } from 'lucide-react';

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
  agentTerrainUid?: string | null;
  typeMission: string;
  dateRDV: any;
  zone: string;
  adresse: string;
  observation: string;
  createdAt: any;
  checkinAt?: any;
  modifiedByName?: string;
  createdByName?: string;
  createdByRole?: string;
  active?: boolean;
  statut?: string;
  hasPhotosForMission?: boolean;
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
  const href = telHref(display);
  if (!display || !href) {
    return <span className={cn('text-ink-4', className)}>—</span>;
  }
  return (
    <a
      href={href}
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
 * Deadline chip — the urgency ramp is a LIGHTNESS staircase that survives
 * grayscale (terrain-color.md §5: Stone "only value determines legibility",
 * Muth "get it right in black & white"):
 *   • quiet OUTLINE while waiting or under 50 % ("En attente" / "Xh Ym")
 *   • warning tint past 50 %, danger tint past 80 %
 *   • « En retard » = the page's ONLY solid status fill + alert glyph —
 *     except inside the En retard GROUP (`calm`), where position already
 *     encodes lateness and the group header carries the alarm
 *     (alarm-fatigue evidence, terrain-color.md §6).
 * Re-renders every 30 s like the original DeadlineBar.
 */
function DeadlineChip({
  dateRDV,
  createdAt,
  completed = false,
  calm = false,
}: {
  dateRDV: any;
  createdAt: any;
  completed?: boolean;
  calm?: boolean;
}) {
  const t = useT();
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
    return <Badge variant="outline" className="text-ink-2">{t('En attente')}</Badge>;
  }
  if (expired) {
    return (
      <Badge variant={calm ? 'danger' : 'dangerSolid'}>
        <TriangleAlert aria-hidden />
        {lateness ? `${t('En retard')} ${lateness}` : t('En retard')}
      </Badge>
    );
  }
  if (percent > 80) return <Badge variant="danger">{remaining}</Badge>;
  if (percent > 50) return <Badge variant="warning">{remaining}</Badge>;
  return <Badge variant="outline" className="text-ink-2">{remaining}</Badge>;
}

/**
 * Photo progress for the mission's stage — the differentiating fact surfaced
 * in the list itself (NN/g pogo-sticking remedy; GOV.UK task-list status
 * tags; ServiceM8 "job highlights"). Zero photos = the normal pending state,
 * so it stays QUIET (colour is for the done state only).
 */
function PhotosChip({ count }: { count: number }) {
  const t = useT();
  if (count > 0) {
    return <Badge variant="success">{count} {count > 1 ? t('photos') : t('photo')}</Badge>;
  }
  return <Badge variant="outline" className="text-ink-3">0 {t('photo')}</Badge>;
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
 * Mission view-switcher on the shared `Tabs` primitive (raised tab on a
 * visible track — addendum 2026-09-02; NN/g Tabs Used Right ✓ "at least two
 * selection indicators"). Counts stay neutral pills (§11).
 */
function MissionTabs({ active, counts, onChange, className }: { active: string; counts: Record<string, number>; onChange: (id: string) => void; className?: string }) {
  const t = useT();
  return (
    <Tabs value={active} onValueChange={onChange}>
      <TabsList aria-label={t('Type de mission')} className={className}>
        {MISSION_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {t(tab.label)}
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
              {counts[tab.id] || 0}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/**
 * Sloped tab strip for phones (owner ruling 2026-09-02 ter: every tablist
 * that switches a VIEW draws the browser-tab shape — this one included).
 */
function MissionSegments({ active, counts, onChange, className }: { active: string; counts: Record<string, number>; onChange: (id: string) => void; className?: string }) {
  const t = useT();
  return (
    <Tabs value={active} onValueChange={onChange}>
      <TabsList aria-label={t('Type de mission')} className={cn('grid w-full grid-cols-3', className)}>
        {MISSION_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="h-9 gap-1.5 px-2 text-sm">
            {t(tab.label)}
            <span className="text-[11px] tabular-nums text-ink-3 group-data-[state=active]:text-ink-2">{counts[tab.id] || 0}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

type ScopeValue = 'a_traiter' | 'tous';

/**
 * « À traiter / Tous » — a VALUE picker (it changes the data, not the view),
 * so per element-specs §7 + the queue-rules ruling (« À traiter (n) / Traités »
 * = segmented control + SlidingThumb, NOT tabs — tabs draw the browser-tab
 * shape and are reserved for view switchers) it reuses the Mes Rappels
 * segmented pattern. Counts = neutral surface-3 pills (§11).
 */
function ScopeSegments({
  value,
  counts,
  onChange,
  fullWidth = false,
  className,
}: {
  value: ScopeValue;
  counts: Record<ScopeValue, number>;
  onChange: (v: ScopeValue) => void;
  fullWidth?: boolean;
  className?: string;
}) {
  const t = useT();
  const pill = (n: number) => (
    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
      {n}
    </span>
  );
  const seg = (v: ScopeValue, label: string) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-seg-active={value === v}
      aria-pressed={value === v}
      onClick={() => onChange(v)}
      className={cn('relative z-[1] h-8 gap-1.5 px-3 shadow-none', fullWidth && 'flex-1')}
    >
      {label}
      {pill(counts[v])}
    </Button>
  );
  return (
    <div
      role="group"
      aria-label={t('Missions à afficher')}
      className={cn(
        'relative isolate flex h-9 items-center gap-0.5 rounded-md bg-surface-2 p-0.5',
        fullWidth ? 'w-full' : 'w-fit',
        className,
      )}
    >
      <SlidingThumb className="rounded-md bg-accent shadow-rim" deps={[value, counts.a_traiter, counts.tous]} />
      {seg('a_traiter', t('À traiter'))}
      {seg('tous', t('Tous'))}
    </div>
  );
}

type GroupKey = 'today' | 'expired' | 'future';

/**
 * Triage strip — 3–4 ACTIONABLE click-to-jump counts, modeled on Salesforce's
 * dispatcher KPI bar ("appointments in jeopardy") and Pencil & Paper's
 * "operational dashboards exist to alert people to problems"
 * (terrain-navigation-tools.md §D). Chips reuse the badge grammar; danger
 * only when the En retard count is nonzero.
 */
function TriageStrip({
  lateCount,
  todayCount,
  futureCount,
  nextTime,
  unassignedCount,
  onJumpGroup,
  onJumpNext,
  className,
}: {
  lateCount: number;
  todayCount: number;
  futureCount: number;
  nextTime: string | null;
  unassignedCount: number;
  onJumpGroup: (g: GroupKey) => void;
  onJumpNext: (() => void) | null;
  className?: string;
}) {
  const t = useT();
  const chip = 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} role="group" aria-label={t('Résumé des missions')} data-tour="atg-triage">
      <button
        type="button"
        onClick={() => onJumpGroup('expired')}
        className={cn(chip, lateCount > 0
          ? 'bg-status-danger-bg font-semibold text-status-danger-fg hover:brightness-[0.97]'
          : 'border-hairline-strong bg-transparent text-ink-3 hover:bg-surface-2')}
        title={t('Voir les missions en retard')}
      >
        {lateCount > 0 && <TriangleAlert className="h-3.5 w-3.5" aria-hidden />}
        {t('En retard')} {lateCount}
      </button>
      <button
        type="button"
        onClick={() => onJumpGroup('today')}
        className={cn(chip, 'bg-tertiary-bg text-tertiary-deep hover:brightness-[0.97]')}
        title={t("Voir les missions d'aujourd'hui")}
      >
        {t("Aujourd'hui")} {todayCount}
      </button>
      <button
        type="button"
        onClick={() => onJumpGroup('future')}
        className={cn(chip, 'bg-surface-3 text-ink-2 hover:bg-surface-4')}
        title={t('Voir les missions à venir')}
      >
        {t('À venir')} {futureCount}
      </button>
      {nextTime && (
        <button
          type="button"
          onClick={onJumpNext ?? undefined}
          disabled={!onJumpNext}
          className={cn(chip, 'bg-tertiary-bg text-tertiary-deep hover:brightness-[0.97] disabled:pointer-events-none')}
          title={t('Prochaine mission planifiée')}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {t('Prochaine')} {nextTime}
        </button>
      )}
      {unassignedCount > 0 && (
        <span className={cn(chip, 'bg-status-warning-bg text-status-warning-fg')} title={t('Missions sans agent assigné')}>
          {t('Sans agent')} {unassignedCount}
        </span>
      )}
    </div>
  );
}

export default function AssignationsATGPage() {
  const t = useT();
  const db = useFirestore();
  const router = useRouter();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const [planifications, setPlanifications] = useState<PlanificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Realtime per-dossier state so status changes + photo uploads update the
  // progress chips even when no planification doc changes. Photo COUNTS per
  // category feed the progress chip; a capped url list feeds the peek panel.
  type DossierLive = {
    statut: string;
    photos: Record<PhotoCategory, number>;
    photoItems: Array<{ url: string; category: PhotoCategory }>;
    assureTelephone: string;
    matricule?: string;
  };
  const [dossierLive, setDossierLive] = useState<Record<string, DossierLive>>({});
  const filterDefaults = {
    activeTab: 'Avant', dateFrom: '', dateTo: '', compagnieFilter: 'Toutes', agentFilter: 'Tous', keyword: '',
    density: 'normale' as 'normale' | 'compacte',
    lens: 'liste' as 'liste' | 'carte',
    scope: 'a_traiter' as ScopeValue,
  };
  const [filters, setFilters, clearFilter] = usePersistedFilters('assignations-atg', filterDefaults);
  const { activeTab, dateFrom, dateTo, compagnieFilter, agentFilter, keyword, density, lens, scope } = filters;

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
          agentTerrainUid: data.agentTerrainUid ?? null,
          typeMission: data.typeMission || '-',
          dateRDV: data.dateRDV,
          zone: data.zone || '',
          adresse: data.adresse || '',
          observation: data.observation || '',
          createdAt: data.createdAt,
          checkinAt: data.checkinAt,
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
        statut: string; photos: Record<PhotoCategory, number>; photoItems: Array<{ url: string; category: PhotoCategory }>;
      };
      const dossierData: Record<string, Enriched> = {};
      await Promise.all(
        Array.from(uniqueDossierIds).map(async (dId) => {
          try {
            const [dossierSnap, photosSnap] = await Promise.all([
              getDoc(doc(db, 'dossiers', dId)),
              getDocs(collection(db, 'dossiers', dId, 'photos')),
            ]);
            const photos: Record<PhotoCategory, number> = { avant: 0, en_cours: 0, apres: 0 };
            const photoItems: Array<{ url: string; category: PhotoCategory }> = [];
            photosSnap.forEach(pDoc => {
              const pData: any = pDoc.data();
              const cat = (pData.category as PhotoCategory) || 'avant';
              if (cat in photos) {
                photos[cat]++;
                if (pData.url && photoItems.length < 12) photoItems.push({ url: pData.url, category: cat });
              }
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
              photoItems,
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
        item.hasPhotosForMission = dd.photos[missionToCategory(item.typeMission)] > 0;
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
            photoItems: dd.photoItems,
            assureTelephone: dd.assureTelephone,
            matricule: prev[dId]?.matricule,
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
  // per-category counts/thumbnails). Rebuilt whenever the set of dossierIds changes.
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
            photos: prev[dId]?.photos || { avant: 0, en_cours: 0, apres: 0 },
            photoItems: prev[dId]?.photoItems || [],
            assureTelephone: tel,
            matricule,
          },
        }));
      });
      const u2 = onSnapshot(collection(db, 'dossiers', dId, 'photos'), (snap) => {
        const photos: Record<PhotoCategory, number> = { avant: 0, en_cours: 0, apres: 0 };
        const photoItems: Array<{ url: string; category: PhotoCategory }> = [];
        snap.forEach(pDoc => {
          const pData: any = pDoc.data();
          const cat = (pData.category as PhotoCategory) || 'avant';
          if (cat in photos) {
            photos[cat]++;
            if (pData.url && photoItems.length < 12) photoItems.push({ url: pData.url, category: cat });
          }
        });
        setDossierLive(prev => ({
          ...prev,
          [dId]: {
            statut: prev[dId]?.statut || '',
            photos,
            photoItems,
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

  // Base set for filter-option counts: planifications of the active mission tab.
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

  // Groups in TRIAGE order (terrain-attention-hierarchy.md §1: highest acuity
  // first — StatPearls ED triage; the mere-urgency effect means whatever sits
  // on top gets worked). En retard is usually small or empty, so a good day
  // still opens on Aujourd'hui at the cost of one header row.
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
    // exception (late), the warm TIME chip for today, neutral for the rest —
    // on the COUNT chip only.
    return [
      { key: 'expired' as const, label: 'En retard', items: expiredGroup, tone: 'danger' as ChipTone },
      { key: 'today' as const, label: "Aujourd'hui", items: todayGroup, tone: 'time' as ChipTone },
      { key: 'future' as const, label: 'À venir', items: futureGroup, tone: 'neutral' as ChipTone },
    ];
  }, [filteredPlanifications]);

  const groupOfItem = useMemo(() => {
    const m = new Map<string, GroupKey>();
    groups.forEach(g => g.items.forEach(p => m.set(`${p.dossierId}-${p.id}`, g.key)));
    return m;
  }, [groups]);

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

  const nextMission = useMemo(
    () => (nextMissionKey ? filteredPlanifications.find(p => `${p.dossierId}-${p.id}` === nextMissionKey) ?? null : null),
    [filteredPlanifications, nextMissionKey]
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ today: true, expired: true, future: true });

  // Per-section deadline sort (asc → furthest from the 24 h deadline first).
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

  // Group "Itinéraire" handler: bundles every mission in the group that has an
  // address into a single Google Maps multi-stop route, earliest RDV first.
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
        title: `${addrs.length - MAX_STOPS} ${t('arrêt(s) ignoré(s)')}`,
        description: `${t('Google Maps accepte au maximum')} ${MAX_STOPS} ${t('étapes par itinéraire. Les premières (par ordre chronologique) ont été conservées.')}`,
      });
    }
    // Open the tab SYNCHRONOUSLY (window.open after an await is no longer a
    // user gesture — popup blockers kill it), and navigate it to a working
    // Maps URL IMMEDIATELY: parking it on about:blank while geolocation
    // resolves left users staring at a blank tab whenever the later
    // handle-write failed (COOP/permission-prompt cases).
    const win = window.open(buildMultiStopMapsUrl(route), '_blank');
    // Then read the agent's live coords and upgrade the tab to an explicit
    // `origin` — "My+Location" is unreliable; a literal lat,lng always works.
    const origin = await readCurrentPositionString();
    if (origin) {
      const url = buildMultiStopMapsUrl(route, origin);
      try {
        if (win && !win.closed) win.location.href = url;
      } catch {
        // Handle severed (COOP) — the tab already shows the My+Location route.
      }
    }
  };

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Full absolute date for En retard / À venir; the Aujourd'hui group prints
  // HH:mm only — the group header already says the day, so the repeated date
  // is redundant ink (terrain-typography-spacing.md §6, option A).
  const formatRdv = (ts: any, group: GroupKey) => {
    const date = toDate(ts);
    if (!date) return null;
    try {
      return group === 'today' ? format(date, 'HH:mm') : format(date, 'd MMM HH:mm', { locale: dateFnsLocale() });
    } catch { return null; }
  };
  const formatFullDate = (ts: any) => {
    const date = toDate(ts);
    if (!date) return null;
    try { return format(date, 'd MMM yyyy HH:mm', { locale: dateFnsLocale() }); } catch { return null; }
  };

  const isATG = profile?.role === 'Agent de Terrain';
  const canUseAtFlows = isATG || profile?.role === 'Admin';
  const canSeeNameFilter = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const canReassign = profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const showAgentColumn = !isATG;
  const colCount = showAgentColumn ? 8 : 7;
  const isMobile = useIsMobile();

  // Demo: prospects sit at a PC but should still SEE the agent's phone UI —
  // a header button flips this page into the mobile layout (framed like a
  // phone) and back. Persisted so the choice survives navigation.
  const [phoneView, setPhoneView] = useState(false);
  useEffect(() => {
    try {
      setPhoneView(window.localStorage.getItem(`${BRAND.storagePrefix}.atgPhoneView`) === '1');
    } catch { /* non-fatal */ }
  }, []);
  const togglePhoneView = () => {
    setPhoneView((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(`${BRAND.storagePrefix}.atgPhoneView`, next ? '1' : '');
      } catch { /* non-fatal */ }
      return next;
    });
  };
  const effectiveMobile = isMobile || (BRAND.id === 'demo' && phoneView);

  const activeFilterCount =
    (compagnieFilter !== 'Toutes' ? 1 : 0) +
    (canSeeNameFilter && agentFilter !== 'Tous' ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (keyword ? 1 : 0);

  const resetFilters = () => setFilters({ compagnieFilter: 'Toutes', agentFilter: 'Tous', dateFrom: '', dateTo: '', keyword: '' });

  // ── Peek panel (Option A): on desktop a row opens the side panel; the full
  // page stays one click away. On mobile the row keeps navigating (the
  // stacked master-detail phone pattern).
  const [peekKey, setPeekKey] = useState<string | null>(null);
  const peekMission = useMemo(
    () => (peekKey ? planifications.find(p => `${p.dossierId}-${p.id}` === peekKey) ?? null : null),
    [planifications, peekKey]
  );

  const navigateToMission = (p: PlanificationItem) =>
    router.push(`/assignations-atg/${p.dossierId}?mission=${encodeURIComponent(activeTab)}`);

  const openMission = (p: PlanificationItem) => {
    if (isMobile) navigateToMission(p);
    else setPeekKey(`${p.dossierId}-${p.id}`);
  };
  const openMissionByKey = (key: string) => {
    const p = planifications.find(x => `${x.dossierId}-${x.id}` === key);
    if (!p) return;
    openMission(p);
  };

  // ── Bulk selection (dispatchers): checkbox in the identifier cell, floating
  // action bar, reassign N with undo toast (Eleken; Salesforce "perform
  // actions on selected appointments").
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const toggleSelected = (key: string, checked: boolean) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (checked) next.add(key); else next.delete(key);
      return next;
    });
  };
  const selectedTargets = useMemo(
    () => planifications
      .filter(p => selectedKeys.has(`${p.dossierId}-${p.id}`))
      .map(p => ({ dossierId: p.dossierId, planifId: p.id, agentTerrain: p.agentTerrain, zone: p.zone, agentTerrainUid: p.agentTerrainUid ?? null })),
    [planifications, selectedKeys]
  );

  const visibleGroups = groups.filter(g => g.items.length > 0);

  // Jump targets for the triage strip + palette.
  const jumpToGroup = (g: GroupKey) => {
    if (lens !== 'liste') setFilters({ lens: 'liste' });
    setOpenSections(prev => ({ ...prev, [g]: true }));
    window.setTimeout(() => {
      document.getElementById(`atg-group-${g}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const emptyCell = <EmptyCell />;

  const openMapsFor = (adresse: string) =>
    window.open(mapsSearchUrl(adresse), '_blank', 'noopener,noreferrer');

  // Empty state (element-specs §12 + NN/g empty states: status + reason +
  // direct pathway; the true-empty variant TEACHES the plate-scan entry
  // point instead of a tour overlay — terrain-navigation-tools.md §E).
  const emptyState = (
    <EmptyState
      icon={<Calendar />}
      title={activeFilterCount > 0 ? t('Aucune mission pour ces filtres') : `${t('Aucune mission')} ${t(activeTab).toLowerCase()}`}
      description={activeFilterCount > 0
        ? t('Élargissez la période ou réinitialisez les filtres pour revoir vos missions.')
        : canUseAtFlows
          ? t('Scannez une plaque pour lancer le flux terrain — les nouvelles assignations apparaîtront ici en temps réel.')
          : t('Les nouvelles assignations apparaîtront ici en temps réel.')}
      action={activeFilterCount > 0 ? (
        <Button variant="tonal" onClick={() => { clearFilter('keyword'); resetFilters(); }}>{t('Réinitialiser les filtres')}</Button>
      ) : undefined}
      dashed={false}
      className="border-0 bg-transparent py-10"
    />
  );

  // Group header row (element-specs: surface-2 band, chevron + heading +
  // count chip; the page's ONE neutral IconChip beside « Aujourd'hui » —
  // never beside En retard).
  const renderGroupHeader = (group: (typeof groups)[number], dense: boolean) => {
    const addressableCount = group.items.filter(p => p.adresse?.trim()).length;
    const open = openSections[group.key];
    return (
      <div data-tour={`atg-group-${group.key}`} className={cn('flex min-h-[48px] items-center gap-3 bg-surface-2 py-2', dense ? 'rounded-lg border border-hairline px-4' : 'border-b border-hairline px-6')}>
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform', open ? 'rotate-0' : '-rotate-90')} aria-hidden />
          {group.key === 'today' && (
            <IconChip>
              <Calendar />
            </IconChip>
          )}
          <h2 className="t-heading truncate">{t(group.label)}</h2>
          <Badge variant={group.tone}>{group.items.length}</Badge>
        </CollapsibleTrigger>
        {!dense && (
          <SortableHeader
            label={t('Délai')}
            sort={deadlineSortByGroup[group.key]}
            onChange={(next) => setDeadlineSortByGroup(prev => ({ ...prev, [group.key]: next }))}
            className="text-xs"
          />
        )}
        <Button
          type="button"
          data-tour="atg-route"
          size="sm"
          variant="secondary"
          className="shrink-0"
          disabled={addressableCount === 0}
          onClick={(e) => {
            e.stopPropagation();
            openRouteForItems(group.items);
          }}
          title={t("Ouvrir l'itinéraire dans Google Maps")}
        >
          <Navigation />
          {t('Itinéraire')}
        </Button>
      </div>
    );
  };

  // Table head — 7–8 slots instead of 12 columns (terrain research: 80 % of
  // gaze stays left of centre; audit metadata lives in the peek panel; the
  // deadline sits in position 3, inside the attended zone).
  const renderTableHeader = () => (
    <TableHeader>
      <TableRow>
        <TableHead className={STICKY_HEAD}>{t('Dossier')}</TableHead>
        <TableHead>{t('Assuré')}</TableHead>
        <TableHead>{t('Date RDV')}</TableHead>
        <TableHead>{t('Photos')}</TableHead>
        <TableHead>{t('Compagnie')}</TableHead>
        {showAgentColumn && <TableHead>{t('Agent')}</TableHead>}
        <TableHead>{t('Lieu')}</TableHead>
        <TableHead className="w-[1%]"><span className="sr-only">{t('Actions')}</span></TableHead>
      </TableRow>
    </TableHeader>
  );

  // Row keyboard: Enter opens, ↑/↓ move focus between rows (palette teaches
  // the rest — no vim layer for a mixed-skill user base).
  const onRowKeyDown = (p: PlanificationItem) => (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openMission(p);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const tr = e.currentTarget;
      const target = e.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling;
      (target as HTMLElement | null)?.focus?.();
    }
  };

  // Emphasis budget (terrain-attention-hierarchy.md §3): TWO bold cells per
  // row — the identifier and the RDV figure. Everything else steps down the
  // ink ladder; audit columns are gone (peek panel).
  const renderRow = (p: PlanificationItem, groupKey: GroupKey) => {
    const key = `${p.dossierId}-${p.id}`;
    const live = dossierLive[p.dossierId];
    const matricule = live?.matricule;
    const photoCount = live?.photos?.[missionToCategory(p.typeMission)] ?? 0;
    const selected = selectedKeys.has(key);
    return (
      <TableRow
        key={key}
        id={`atg-row-${key}`}
        data-tour="atg-row"
        className="group cursor-pointer"
        tabIndex={0}
        data-state={selected ? 'selected' : undefined}
        onClick={() => openMission(p)}
        onKeyDown={onRowKeyDown(p)}
      >
        {/* Frozen identifier cell: checkbox (dispatchers, hover-revealed until
            a selection exists) + the row's ONLY bold mono ref. */}
        <TableCell className={STICKY_CELL}>
          <span className="flex items-center gap-2">
            {canReassign && (
              <Checkbox
                checked={selected}
                onCheckedChange={(c) => toggleSelected(key, c === true)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${t('Sélectionner')} ${p.dossierNom || p.dossierId}`}
                className={cn(
                  'transition-opacity',
                  selectedKeys.size > 0 || selected ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
                )}
              />
            )}
            <span className="t-mono font-semibold">{p.dossierNom || p.dossierId}</span>
          </span>
        </TableCell>
        {/* Assuré ⏎ plaque — related pair stacked into one slot. */}
        <TableCell className="max-w-[200px]">
          <span className="block truncate font-medium text-ink">{p.assureNom || emptyCell}</span>
          {matricule ? <span className="t-mono block text-xs text-ink-2">{matricule}</span> : null}
        </TableCell>
        <TableCell>
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-semibold tabular-nums text-ink">{formatRdv(p.dateRDV, groupKey) ?? emptyCell}</span>
            <DeadlineChip dateRDV={p.dateRDV} createdAt={p.createdAt} calm={groupKey === 'expired'} />
          </span>
        </TableCell>
        <TableCell><PhotosChip count={photoCount} /></TableCell>
        <TableCell className="text-ink-2">{p.compagnie || emptyCell}</TableCell>
        {showAgentColumn && <TableCell className="text-ink-2">{p.agentTerrain !== '-' ? p.agentTerrain : emptyCell}</TableCell>}
        {/* Zone ⏎ adresse — subdued location slot; single-line ellipsis +
            title (PatternFly truncate: tooltip on hover, ≥ 4 visible chars). */}
        <TableCell className="min-w-[160px] max-w-[240px]">
          <span className="block truncate text-ink-2">{p.zone || emptyCell}</span>
          {p.adresse ? <span className="block truncate text-xs text-ink-3" title={p.adresse}>{p.adresse}</span> : null}
        </TableCell>
        <TableCell className="text-right">
          <MissionRowActions
            telephone={live?.assureTelephone ?? p.assureTelephone}
            adresse={p.adresse}
            canReassign={canReassign}
            reassignTarget={{ dossierId: p.dossierId, planifId: p.id, agentTerrain: p.agentTerrain, zone: p.zone, agentTerrainUid: p.agentTerrainUid ?? null }}
          />
        </TableCell>
      </TableRow>
    );
  };

  // Mobile mission card — labels pruned (Refactoring UI "labels are a last
  // resort": plate and phone are self-evident formats), ≥ 44 px touch
  // targets, actions in the card's bottom half (NN/g in-motion oversizing;
  // Corvus bottom-40 % rule).
  const renderMissionCard = (p: PlanificationItem, groupKey: GroupKey) => {
    const key = `${p.dossierId}-${p.id}`;
    const rdv = toDate(p.dateRDV);
    const live = dossierLive[p.dossierId];
    const matricule = live?.matricule;
    const telephone = live?.assureTelephone ?? p.assureTelephone;
    const photoCount = live?.photos?.[missionToCategory(p.typeMission)] ?? 0;
    const wa = waHref(telephone);
    const isNext = groupKey !== 'expired' && key === nextMissionKey;
    const warmTime = groupKey !== 'expired' && !!rdv;
    const checkinTime = p.checkinAt ? toDate(p.checkinAt) : null;
    return (
      <li key={key} id={`atg-row-${key}`} data-tour="atg-row">
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
          {/* Plate is self-evident in mono — no label; the photo chip rides
              the same line as the mission's progress fact. */}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {matricule ? <span className="t-mono truncate text-sm text-ink-2">{matricule}</span> : <span />}
            <PhotosChip count={photoCount} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="min-w-0">
              <dt className="t-label">{t('Zone')}</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{p.zone || <span className="font-normal text-ink-4">—</span>}</dd>
            </div>
            <div className="min-w-0">
              <dt className="t-label">{t('Adresse')}</dt>
              <dd className="mt-0.5 text-sm">
                {p.adresse ? (
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AssurePhoneLink telephone={telephone} className="min-h-[44px]" />
            {wa && (
              <Button asChild variant="ghost" size="icon" className="h-11 w-11 text-ink-3" title={t('Écrire sur WhatsApp')}>
                <a href={wa} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label={t('Écrire sur WhatsApp')}>
                  <MessageCircle className="h-5 w-5" />
                </a>
              </Button>
            )}
            <span className="ml-auto">
              <DeadlineChip dateRDV={p.dateRDV} createdAt={p.createdAt} calm={groupKey === 'expired'} />
            </span>
          </div>
          {/* Field-agent actions: on-the-way WhatsApp + GPS check-in
              (ServiceM8's on-the-way + check-in pattern; 44 px targets). */}
          {isATG && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EnRouteButton telephone={telephone} rdvTime={rdv ? format(rdv, 'HH:mm') : null} className="h-11" />
              <CheckinButton dossierId={p.dossierId} planifId={p.id} checkedIn={!!p.checkinAt} className="h-11" />
              {checkinTime && (
                <Badge variant="success">{t('Arrivé')} · {format(checkinTime, 'HH:mm')}</Badge>
              )}
            </div>
          )}
        </div>
      </li>
    );
  };

  // ── Triage strip + palette + map data ──────────────────────────────────
  const lateCount = groups.find(g => g.key === 'expired')?.items.length ?? 0;
  const todayCount = groups.find(g => g.key === 'today')?.items.length ?? 0;
  const futureCount = groups.find(g => g.key === 'future')?.items.length ?? 0;
  const unassignedCount = useMemo(
    () => (canSeeNameFilter ? filteredPlanifications.filter(p => !p.agentTerrain || p.agentTerrain === '-').length : 0),
    [filteredPlanifications, canSeeNameFilter]
  );
  const nextTime = nextMission?.dateRDV ? format(toDate(nextMission.dateRDV)!, 'HH:mm') : null;

  const triageStrip = (
    <TriageStrip
      lateCount={lateCount}
      todayCount={todayCount}
      futureCount={futureCount}
      nextTime={nextTime}
      unassignedCount={unassignedCount}
      onJumpGroup={jumpToGroup}
      onJumpNext={nextMission ? () => openMission(nextMission) : null}
    />
  );

  const paletteMissions = useMemo(
    () => filteredPlanifications.map((p) => {
      const g = groupOfItem.get(`${p.dossierId}-${p.id}`);
      return {
        key: `${p.dossierId}-${p.id}`,
        refLabel: p.dossierNom || p.dossierId,
        assureNom: p.assureNom,
        matricule: dossierLive[p.dossierId]?.matricule,
        agentTerrain: p.agentTerrain,
        adresse: p.adresse,
        compagnie: p.compagnie,
        groupLabel: (g === 'expired' ? 'En retard' : g === 'future' ? 'À venir' : "Aujourd'hui") as 'En retard' | "Aujourd'hui" | 'À venir',
      };
    }),
    [filteredPlanifications, groupOfItem, dossierLive]
  );

  const paletteActions = useMemo<PaletteAction[]>(() => [
    { id: 'late', label: t('Voir les missions en retard'), hint: `${lateCount}`, run: () => jumpToGroup('expired') },
    { id: 'today', label: t("Voir les missions d'aujourd'hui"), hint: `${todayCount}`, run: () => jumpToGroup('today') },
    { id: 'lens', label: lens === 'carte' ? t('Afficher la liste') : t('Afficher la carte'), run: () => setFilters({ lens: lens === 'carte' ? 'liste' : 'carte' }) },
    { id: 'tab-avant', label: `${t('Onglet')} ${t('Avant')}`, hint: `${countByType['Avant'] || 0}`, run: () => setFilters({ activeTab: 'Avant' }) },
    { id: 'tab-encours', label: `${t('Onglet')} ${t('En cours')}`, hint: `${countByType['En cours'] || 0}`, run: () => setFilters({ activeTab: 'En cours' }) },
    { id: 'tab-apres', label: `${t('Onglet')} ${t('Après')}`, hint: `${countByType['Après'] || 0}`, run: () => setFilters({ activeTab: 'Après' }) },
    { id: 'reset', label: t('Réinitialiser les filtres'), run: () => { clearFilter('keyword'); resetFilters(); } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lateCount, todayCount, lens, countByType]);

  const mapMissions = useMemo<MapMission[]>(
    () => filteredPlanifications
      .filter(p => p.adresse?.trim())
      .map((p) => ({
        key: `${p.dossierId}-${p.id}`,
        dossierId: p.dossierId,
        refLabel: p.dossierNom || p.dossierId,
        assureNom: p.assureNom,
        adresse: p.adresse.trim(),
        group: groupOfItem.get(`${p.dossierId}-${p.id}`) ?? 'future',
        rdvLabel: formatFullDate(p.dateRDV) ?? undefined,
      })),
    [filteredPlanifications, groupOfItem]
  );

  // Geofence candidates: the agent's today's + overdue missions with an
  // address and no check-in yet — the banner suggests « Confirmer l'arrivée »
  // when the live position lands within ~150 m of the geocoded address.
  const geofenceCandidates = useMemo(
    () => (isATG
      ? groups
          .filter(g => g.key !== 'future')
          .flatMap(g => g.items)
          .filter(p => p.adresse?.trim() && !p.checkinAt)
          .map(p => ({
            key: `${p.dossierId}-${p.id}`,
            dossierId: p.dossierId,
            planifId: p.id,
            refLabel: p.dossierNom || p.dossierId,
            adresse: p.adresse.trim(),
          }))
      : []),
    [groups, isATG]
  );

  // Live agent positions on the map lens (ServiceM8 staff map / ServiceTitan
  // GPS tracking — the fleet view every fetched dispatch product ships).
  // Dispatchers see all agents; an ATG sees only their own marker.
  const agentPositions = useAgentsLivePositions(
    lens === 'carte' && !isMobile,
    isATG ? profile?.uid ?? null : null,
  );

  // Ping an agent's device for a fresh position via the existing
  // location_requests pipeline (rules: create requires canAssign).
  const requestAgentPosition = canReassign
    ? async (uid: string) => {
        if (!db) return;
        try {
          await addDoc(collection(db, 'location_requests'), { agentUid: uid, requestedAt: serverTimestamp() });
          toast({ title: t('Demande envoyée'), description: t("La position s'actualisera dès que l'appareil de l'agent répond.") });
        } catch (e) {
          console.error('[map] location request failed:', e);
          toast({ title: t('Demande impossible'), description: t('Réessayez dans un instant.'), variant: 'destructive' });
        }
      }
    : undefined;

  const peekLive = peekMission ? dossierLive[peekMission.dossierId] : undefined;

  const peekPanel = (
    <MissionPeekPanel
      mission={peekMission}
      onOpenChange={(open) => { if (!open) setPeekKey(null); }}
      telephone={peekLive?.assureTelephone ?? peekMission?.assureTelephone}
      matricule={peekLive?.matricule}
      statut={peekLive?.statut ?? peekMission?.statut}
      photoCounts={peekLive?.photos}
      photoItems={peekLive?.photoItems}
      deadlineChip={peekMission ? <DeadlineChip dateRDV={peekMission.dateRDV} createdAt={peekMission.createdAt} /> : null}
      canReassign={canReassign}
      isATG={isATG}
      onOpenDossier={(m) => {
        setPeekKey(null);
        router.push(`/assignations-atg/${m.dossierId}?mission=${encodeURIComponent(activeTab)}`);
      }}
    />
  );

  if (effectiveMobile) {
    return (
      <div className={cn(!isMobile && 'mx-auto min-h-screen w-full max-w-[430px] border-x border-hairline bg-background shadow-xl')}>
        {/* Mobile sticky header (element-specs §23) */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 glass-bar border-b border-hairline">
          {!isMobile && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={togglePhoneView}
              data-tour="atg-desktop-toggle"
            >
              <Monitor className="h-3.5 w-3.5" aria-hidden />
              {t('Vue bureau')}
            </Button>
          )}
          <h1 className="t-heading flex-1 truncate">{t('Mes missions')}</h1>
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
            {filteredPlanifications.length}
          </span>
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button data-tour="atg-filters" variant="outline" size="icon" className="relative h-9 w-9 shrink-0" aria-label={activeFilterCount > 0 ? `${t('Filtres')} (${activeFilterCount} ${t('actifs')})` : t('Filtres')}>
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
                <SheetTitle>{t('Filtres')}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <div className="space-y-1">
                  <label className="t-label" htmlFor="atg-search">{t('Recherche')}</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
                    <Input
                      id="atg-search"
                      value={keyword}
                      onChange={(e) => setFilters({ keyword: e.target.value })}
                      placeholder={t('Réf., assuré, adresse, plaque…')}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="t-label">{t('Compagnie')}</span>
                  <Select value={compagnieFilter} onValueChange={v => setFilters({ compagnieFilter: v })}>
                    <SelectTrigger className="w-full" aria-label={t('Compagnie')}>
                      <SelectValue placeholder={t('Compagnie')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Toutes">{t('Toutes les compagnies')}</SelectItem>
                      {compagnieOptions.map(([name, count]) => (
                        <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canSeeNameFilter && (
                  <div className="space-y-1">
                    <span className="t-label">{t('Agent')}</span>
                    <Select value={agentFilter} onValueChange={v => setFilters({ agentFilter: v })}>
                      <SelectTrigger className="w-full" aria-label={t('Agent')}>
                        <SelectValue placeholder={t('Agent')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tous">{t('Tous les agents')}</SelectItem>
                        {agentOptions.map(([name, count]) => (
                          <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="t-label">{t('Période')}</span>
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
                  {t('Réinitialiser')}
                </Button>
                <Button className="flex-1" onClick={() => setIsFilterSheetOpen(false)}>
                  {t('Appliquer')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Greeting bar — caption row with the real date. */}
        <div className="flex h-10 items-center justify-between border-b border-hairline text-sm">
          <span className="truncate text-ink-3">
            {t('Bonjour')} <span className="font-semibold text-ink">{profile?.prenom || profile?.nom || t('agent')}</span>
            {' · '}
            {format(new Date(), 'EEE d MMM', { locale: dateFnsLocale() })}
          </span>
          <span className="shrink-0 tabular-nums text-ink-2">
            {filteredPlanifications.length} {filteredPlanifications.length > 1 ? t('missions') : t('mission')}
          </span>
        </div>

        {/* AT self-service — the ONE filled button on the page.
            Hidden on the demo brand: the showcase drops the plate-scan flow. */}
        {canUseAtFlows && BRAND.id !== 'demo' && (
          <div data-tour="atg-scan" className="py-3">
            <AtScanPlaqueFlow buttonClassName="w-full" buttonSize="lg" />
          </div>
        )}

        {/* Mission-type segments — sticky under the header. */}
        <div data-tour="atg-tabs" className="sticky top-12 z-20 glass-bar border-b border-hairline py-2">
          <MissionSegments active={activeTab} counts={countByType} onChange={(id) => setFilters({ activeTab: id })} />
        </div>

        {/* Triage strip — the agent's day at a glance. */}
        {!loading && filteredPlanifications.length > 0 && (
          <div className="overflow-x-auto py-2">
            <TriageStrip
              lateCount={lateCount}
              todayCount={todayCount}
              futureCount={futureCount}
              nextTime={nextTime}
              unassignedCount={0}
              onJumpGroup={(g) => {
                setOpenSections(prev => ({ ...prev, [g]: true }));
                window.setTimeout(() => document.getElementById(`atg-group-${g}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
              onJumpNext={nextMissionKey ? () => document.getElementById(`atg-row-${nextMissionKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : null}
              className="flex-nowrap"
            />
          </div>
        )}

        {loading ? (
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
          <div data-tour="atg-groups" className="space-y-4 pt-2">
            {visibleGroups.map((group) => (
              <div key={group.key} id={`atg-group-${group.key}`}>
                <Collapsible
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
              </div>
            ))}
          </div>
        )}

        {/* Geofenced arrival suggestion — thumb-zone banner (ATG only). */}
        {isATG && <GeofenceCheckinBanner candidates={geofenceCandidates} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header (element-specs §1): plural title, count pill, ONE filled
          button (the scan), tabs row + lens switch, filters row. */}
      <PageHeader
        title={titleForRoute('/assignations-atg') ?? t('Missions terrain')}
        count={filteredPlanifications.length}
        actions={(BRAND.id === 'demo' || canUseAtFlows) ? (
          <>
            {/* Demo: flip the page into the agent's phone layout. */}
            {BRAND.id === 'demo' && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={togglePhoneView}
                data-tour="atg-phone-toggle"
              >
                <Smartphone className="h-3.5 w-3.5" aria-hidden />
                {t('Vue téléphone')}
              </Button>
            )}
            {canUseAtFlows && BRAND.id !== 'demo' && (
              <div data-tour="atg-scan" className="flex items-center">
                <AtScanPlaqueFlow />
              </div>
            )}
          </>
        ) : undefined}
        tabs={
          <>
            <div data-tour="atg-tabs">
              <MissionTabs active={activeTab} counts={countByType} onChange={(id) => setFilters({ activeTab: id })} />
            </div>
            {/* List ⇄ map lens (Option B): a VIEW switch, so it draws the
                browser-tab shape like every other view switcher (§4). */}
            <div className="ml-auto">
              <Tabs value={lens} onValueChange={(v) => setFilters({ lens: v as 'liste' | 'carte' })}>
                <TabsList aria-label={t('Affichage des missions')} data-tour="atg-lens">
                  <TabsTrigger value="liste" className="gap-1.5">
                    <List className="h-4 w-4 text-ink-3" aria-hidden />
                    {t('Liste')}
                  </TabsTrigger>
                  <TabsTrigger value="carte" className="gap-1.5">
                    <MapIcon className="h-4 w-4 text-ink-3" aria-hidden />
                    {t('Carte')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </>
        }
        filters={
          <div data-tour="atg-filters" className="flex w-full flex-wrap items-end gap-x-4 gap-y-3">
            <div className="flex flex-col gap-1">
              <label className="t-label" htmlFor="atg-search-desktop">{t('Recherche')}</label>
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
              <span className="t-label">{t('Compagnie')}</span>
              <Select value={compagnieFilter} onValueChange={v => setFilters({ compagnieFilter: v })}>
                <SelectTrigger className="h-9 w-[180px]" aria-label={t('Compagnie')}>
                  <SelectValue placeholder={t('Compagnie')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Toutes">{t('Toutes les compagnies')}</SelectItem>
                  {compagnieOptions.map(([name, count]) => (
                    <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canSeeNameFilter && (
              <div className="flex flex-col gap-1">
                <span className="t-label">{t('Agent')}</span>
                <Select value={agentFilter} onValueChange={v => setFilters({ agentFilter: v })}>
                  <SelectTrigger className="h-9 w-[180px]" aria-label={t('Agent')}>
                    <SelectValue placeholder={t('Agent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tous">{t('Tous les agents')}</SelectItem>
                    {agentOptions.map(([name, count]) => (
                      <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="t-label">{t('Période')}</span>
              <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={v => setFilters({ dateFrom: v })} onDateToChange={v => setFilters({ dateTo: v })} />
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { clearFilter('keyword'); resetFilters(); }}>
                {t('Réinitialiser')}
              </Button>
            )}
            <div className="ml-auto flex items-center gap-3">
              {/* Density is a persisted user setting (Pencil & Paper /
                  Setproduct: "the right row height is the one each user
                  picked") — same « Affichage » control as the dossiers list. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-ink-3" title={t("Densité d'affichage")}>
                    <Columns3 className="h-4 w-4" aria-hidden />
                    {t('Affichage')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="t-label font-normal">{t('Densité des lignes')}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={density}
                    onValueChange={(v) => setFilters({ density: v as 'normale' | 'compacte' })}
                  >
                    {([['compacte', 'Compacte'], ['normale', 'Normale']] as const).map(([value, label]) => (
                      <DropdownMenuRadioItem key={value} value={value} onSelect={(e) => e.preventDefault()}>
                        {t(label)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="hidden items-center gap-1 text-xs text-ink-3 xl:inline-flex" aria-hidden>
                <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
                {t('rechercher')}
              </span>
            </div>
          </div>
        }
      />

      {/* Triage strip — first scan anchor under the header (layer-cake
          scanning: operators read the summary band before any row). */}
      {!loading && (lateCount + todayCount + futureCount > 0) && triageStrip}

      {lens === 'carte' ? (
        mapMissions.length === 0 ? (
          <Card className="overflow-hidden">{emptyState}</Card>
        ) : (
          <MissionMapView
            missions={mapMissions}
            onSelect={openMissionByKey}
            agents={agentPositions}
            onRequestPosition={requestAgentPosition}
            className="h-[560px]"
          />
        )
      ) : loading ? (
        <Card className="overflow-hidden">
          <Table regionLabel={t('Chargement des missions')}>
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
        <div data-tour="atg-groups" className="space-y-6">
          {visibleGroups.map((group) => (
            <div key={group.key} id={`atg-group-${group.key}`} className="scroll-mt-16">
              <Collapsible
                open={openSections[group.key]}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [group.key]: open }))}
              >
                {/* One paper per group; per-user density on the table wrapper. */}
                <Card className="overflow-hidden" data-table-density={density === 'compacte' ? 'compacte' : undefined}>
                  {renderGroupHeader(group, false)}
                  <CollapsibleContent>
                    <Table regionLabel={`${t('Missions')} ${t(group.label)}`}>
                      {renderTableHeader()}
                      <TableBody>
                        {sortGroupItems(group.items, deadlineSortByGroup[group.key]).map((p) => renderRow(p, group.key))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          ))}
        </div>
      )}

      {/* Floating bulk-action bar (sadmann7 pattern; undo toast, no confirm). */}
      {canReassign && selectedKeys.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-hairline bg-card px-4 py-2 shadow-rim">
          <span className="text-sm font-medium tabular-nums text-ink">
            {selectedKeys.size} {selectedKeys.size > 1 ? t('sélectionnées') : t('sélectionnée')}
          </span>
          <ReassignPopover targets={selectedTargets} onDone={() => setSelectedKeys(new Set())}>
            <Button variant="secondary" size="sm">{t('Réassigner')}</Button>
          </ReassignPopover>
          <Button variant="ghost" size="sm" onClick={() => setSelectedKeys(new Set())}>
            {t('Effacer')}
          </Button>
        </div>
      )}

      {peekPanel}

      <MissionCommandPalette
        missions={paletteMissions}
        actions={paletteActions}
        onOpenMission={openMissionByKey}
      />
    </div>
  );
}

function normalizeType(type: string): string {
  if (type === 'Apres' || type === 'Après') return 'Après';
  if (type === 'En cours') return 'En cours';
  if (type === 'Avant') return 'Avant';
  return type;
}
