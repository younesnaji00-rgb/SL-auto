/**
 * Suivi d'équipe — operational metrics on top of the funnel model.
 *
 * Pure module (no React, no Firebase), unit-tested. Adds what the tiles alone
 * cannot say, following published operations-dashboard practice:
 *   • summary + exception (Few): a headline row above the stage tiles;
 *   • flow metrics (Kanban: WIP, cycle time, throughput, work-item AGE):
 *     "hors délai" in the tiles is a LAGGING measure (counted once the step is
 *     done); `agingItems` is the LEADING one — what is past the SLA right now
 *     and not done;
 *   • cycle time by stage (claims-operations KPI), in business hours;
 *   • one time base: every period measure here respects `range`.
 *
 * WHERE THE DEADLINES COME FROM (user ruling 2026-09-01): the real SLA
 * clocks are the ASSIGNMENTS, not the dossier's photo dates —
 *   • a chiffrage assignment (`chiffrages` doc): 24 business hours from its
 *     `createdAt` to `completedAt`; the first assignment of a dossier is the
 *     « 1er accord » step, the following ones « 2ème accord et + »;
 *   • a terrain mission (`dossiers/{id}/planifications` doc): 24 business
 *     hours from its `createdAt` (legacy: `dateRDV`) to the photos of that
 *     mission type (`datePhotosAvant|EnCours|Apres` on the dossier);
 *   • creation: 24 business hours between `dateRequete` and `createdAt`.
 * Same rules as the Chiffrage and Terrain queues (`DEADLINE_HOURS`), same
 * business-hours model (weekends + Moroccan holidays paused).
 *
 * LATENESS (user ruling 2026-09-01): a clock is « hors délai » the moment 24
 * business hours pass without completion — closing it later does not clear
 * it. « En délai » = closed within the window; open and inside the window =
 * pending (counted nowhere yet). Every clock belongs to the PERIOD OF ITS
 * START (the assignment date), so a period reads "of the assignments made
 * then, how many were late".
 */

import { addDays, eachWeekOfInterval, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { businessHoursBetween } from '@/lib/business-days';
import {
  STEP_DEFS,
  STEP_KEYS,
  type DossierForStep,
  type FunnelDossier,
  type FunnelRange,
  type StepKey,
  type WorkflowLog,
} from './funnel';

export const SLA_BUSINESS_HOURS = 24;

/** Stages that carry an SLA — the only ones where "hors délai" can be true. */
export const STAGE_HAS_SLA: Record<StepKey, boolean> = {
  creation: true,
  photosAvant: true,
  accord1er: true,
  photosEnCours: true,
  accord: true,
  photosApres: true,
  facture: false,
  rapportValide: false,
  rapport: false,
  noteHonoraire: false,
};

const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  return null;
};

const inRange = (d: Date | null, range?: FunnelRange) => {
  if (!d) return false;
  if (!range) return true;
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
};

const emptyCounts = (): Record<StepKey, number> =>
  STEP_KEYS.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as Record<StepKey, number>);

// ── Assignment records (the SLA sources) ────────────────────────────────────

/** `chiffrages/{id}` as read by the Chiffrage queue. */
export interface ChiffrageAssignment {
  id: string;
  dossierId: string;
  createdAt?: any;
  completedAt?: any;
  assignedChiffreurNom?: string;
  assignedChiffreurId?: string;
}

/** `dossiers/{id}/planifications/{pid}` as read by the Terrain queue. */
export interface TerrainMission {
  id: string;
  dossierId: string;
  typeMission?: string;
  createdAt?: any;
  dateRDV?: any;
  agentTerrain?: string;
  active?: boolean;
}

export type SlaKind = 'creation' | 'chiffrage' | 'terrain';

/** One SLA clock: a stage of one dossier owned by one person. */
export interface SlaItem {
  id: string;
  kind: SlaKind;
  step: StepKey;
  dossier: FunnelDossier;
  /** Who the clock belongs to (chiffreur, agent de terrain, créateur). */
  owner: string | null;
  start: Date;
  doneAt: Date | null;
  /** Business hours from start to done — or to `now` while open. */
  hours: number;
  /** Over the SLA, closed or not. Never clears once true. */
  late: boolean;
  /** Open and still inside the window (not yet decided). */
  pending: boolean;
}

type MissionType = 'Avant' | 'En cours' | 'Après';
const MISSION_STEP: Record<MissionType, StepKey> = { Avant: 'photosAvant', 'En cours': 'photosEnCours', Après: 'photosApres' };
const MISSION_PHOTO_FIELD: Record<MissionType, keyof FunnelDossier> = {
  Avant: 'datePhotosAvant',
  'En cours': 'datePhotosEnCours',
  Après: 'datePhotosApres',
};

export function normalizeMissionType(raw: string | undefined | null): MissionType | null {
  const t = (raw || '').trim().toLowerCase();
  if (!t) return null;
  if (t.startsWith('avant')) return 'Avant';
  if (t.startsWith('en cours') || t.startsWith('en_cours') || t.startsWith('encours')) return 'En cours';
  if (t.startsWith('apr')) return 'Après';
  return null;
}

/**
 * Turn dossiers + assignment records into SLA items. Dossiers not in `dossiers`
 * (out of the reader's compagnie scope) are ignored.
 */
export function buildSlaItems(
  dossiers: FunnelDossier[],
  chiffrages: ChiffrageAssignment[],
  missions: TerrainMission[],
  holidays?: ReadonlySet<string>,
  now: Date = new Date(),
): SlaItem[] {
  const byId = new Map(dossiers.map((d) => [d.id, d]));
  const out: SlaItem[] = [];
  const push = (id: string, kind: SlaKind, step: StepKey, dossier: FunnelDossier, owner: string | null, start: Date, doneAt: Date | null) => {
    const hours = businessHoursBetween(start, doneAt ?? now, holidays);
    const late = hours > SLA_BUSINESS_HOURS;
    out.push({ id, kind, step, dossier, owner, start, doneAt, hours, late, pending: !doneAt && !late });
  };

  // Creation: requête → création (ordering-tolerant, like the funnel).
  for (const d of dossiers) {
    const created = toDate(d.createdAt);
    const requete = toDate(d.dateRequete);
    if (!created || !requete) continue;
    const [start, done] = created < requete ? [created, requete] : [requete, created];
    push(`creation:${d.id}`, 'creation', 'creation', d, d.createdBy ?? null, start, done);
  }

  // Chiffrage assignments: first per dossier = 1er accord, next ones = 2ème accord et +.
  const byDossier = new Map<string, ChiffrageAssignment[]>();
  for (const c of chiffrages) {
    if (!c.dossierId || !byId.has(c.dossierId) || !toDate(c.createdAt)) continue;
    const arr = byDossier.get(c.dossierId) || [];
    arr.push(c);
    byDossier.set(c.dossierId, arr);
  }
  for (const [dossierId, arr] of byDossier) {
    const dossier = byId.get(dossierId)!;
    arr.sort((a, b) => toDate(a.createdAt)!.getTime() - toDate(b.createdAt)!.getTime());
    arr.forEach((c, idx) => {
      push(
        `chiffrage:${c.id}`,
        'chiffrage',
        idx === 0 ? 'accord1er' : 'accord',
        dossier,
        c.assignedChiffreurNom?.trim() || c.assignedChiffreurId || null,
        toDate(c.createdAt)!,
        toDate(c.completedAt),
      );
    });
  }

  // Terrain missions: planification → photos of that mission type.
  for (const m of missions) {
    if (m.active === false) continue;
    const dossier = byId.get(m.dossierId);
    const type = normalizeMissionType(m.typeMission);
    if (!dossier || !type) continue;
    const start = toDate(m.createdAt) ?? toDate(m.dateRDV);
    if (!start) continue;
    const photos = toDate((dossier as any)[MISSION_PHOTO_FIELD[type]]);
    const doneAt = photos && photos >= start ? photos : null;
    push(`terrain:${m.dossierId}:${m.id}`, 'terrain', MISSION_STEP[type], dossier, m.agentTerrain?.trim() || null, start, doneAt);
  }

  return out;
}

// ── Tiles: one time base for green and amber ────────────────────────────────

export interface StepMeasures {
  enDelai: Record<StepKey, number>;
  horsDelai: Record<StepKey, number>;
}

/**
 * Per-step measures. SLA steps: the clocks STARTED in range — « en délai »
 * when closed inside the window, « hors délai » when breached (closed or
 * not), pending ones counted nowhere. A completion with no clock (legacy
 * dossiers) still counts as en délai by its completion date; steps without
 * an SLA count every completion in range as en délai.
 */
export function computeStepMeasures(dossiers: FunnelDossier[], range: FunnelRange, sla: SlaItem[]): StepMeasures {
  const enDelai = emptyCounts();
  const horsDelai = emptyCounts();
  const covered = new Map<StepKey, Set<string>>();
  for (const key of STEP_KEYS) covered.set(key, new Set());
  for (const it of sla) {
    if (!inRange(it.start, range)) continue;
    covered.get(it.step)!.add(it.dossier.id);
    if (it.late) horsDelai[it.step] += 1;
    else if (it.doneAt) enDelai[it.step] += 1;
  }
  for (const d of dossiers) {
    for (const key of STEP_KEYS) {
      if (covered.get(key)!.has(d.id)) continue;
      const at = STEP_DEFS[key].doneAt(d);
      if (at && inRange(at, range)) enDelai[key] += 1;
    }
  }
  return { enDelai, horsDelai };
}

/** Drawer rows matching `computeStepMeasures` for one step and one bar. */
export function dossiersForStepMeasure(
  dossiers: FunnelDossier[],
  logs: WorkflowLog[],
  sla: SlaItem[],
  range: FunnelRange,
  step: StepKey,
  mode: 'enDelai' | 'horsDelai',
): DossierForStep[] {
  const out: DossierForStep[] = [];
  const covered = new Set<string>();
  for (const it of sla) {
    if (it.step !== step || !inRange(it.start, range)) continue;
    covered.add(it.dossier.id);
    if (it.pending) continue;
    if ((mode === 'horsDelai') === it.late) out.push({ dossier: it.dossier, doneAt: it.doneAt, author: it.owner });
  }
  if (mode === 'enDelai') {
    for (const d of dossiers) {
      if (covered.has(d.id)) continue;
      const at = STEP_DEFS[step].doneAt(d);
      if (at && inRange(at, range)) out.push({ dossier: d, doneAt: at, author: STEP_DEFS[step].authorOf(d, logs) });
    }
  }
  // Open (late) rows first, then most recent completions.
  return out.sort((a, b) => (b.doneAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (a.doneAt?.getTime() ?? Number.MAX_SAFE_INTEGER));
}

// ── Ageing (leading) ────────────────────────────────────────────────────────

export interface AgingItem {
  dossier: FunnelDossier;
  step: StepKey;
  kind: SlaKind;
  owner: string | null;
  /** When the SLA clock started. */
  since: Date;
  /** Business hours elapsed since `since`, as of `now`. */
  ageHours: number;
}

/**
 * Work-item age: open SLA items (chiffrage assignments not chiffrés, missions
 * without their photos) already past the SLA as of `now`. Oldest first.
 */
export function agingItems(sla: SlaItem[], now: Date, holidays?: ReadonlySet<string>, slaHours = SLA_BUSINESS_HOURS): AgingItem[] {
  const out: AgingItem[] = [];
  for (const it of sla) {
    if (it.doneAt || it.kind === 'creation' || it.start > now) continue;
    const ageHours = businessHoursBetween(it.start, now, holidays);
    if (ageHours > slaHours) out.push({ dossier: it.dossier, step: it.step, kind: it.kind, owner: it.owner, since: it.start, ageHours });
  }
  return out.sort((a, b) => b.ageHours - a.ageHours);
}

// ── Headline ────────────────────────────────────────────────────────────────

export interface Headline {
  /** Dossiers created in range (inflow). */
  crees: number;
  /** Dossiers whose rapport was deposited in range (end-to-end throughput). */
  traites: number;
  /** On-time share of the clocks STARTED in range (pending excluded); null when none decided. */
  respectPct: number | null;
  respectN: number;
  /** Open backlog: dossiers in scope with no rapport deposited (now, not period). */
  enAttente: number;
  /** Dossiers with at least one clock past SLA right now (leading). */
  enRetard: number;
}

export function computeHeadline(dossiers: FunnelDossier[], range: FunnelRange, now: Date, sla: SlaItem[], holidays?: ReadonlySet<string>): Headline {
  let crees = 0;
  let traites = 0;
  let enAttente = 0;
  for (const d of dossiers) {
    if (inRange(toDate(d.createdAt), range)) crees += 1;
    const deposed = STEP_DEFS.rapport.doneAt(d);
    if (inRange(deposed, range)) traites += 1;
    if (!deposed) enAttente += 1;
  }
  let onTime = 0;
  let late = 0;
  for (const it of sla) {
    if (!inRange(it.start, range) || it.pending) continue;
    if (it.late) late += 1;
    else onTime += 1;
  }
  const respectN = onTime + late;
  const aging = new Set(agingItems(sla, now, holidays).map((a) => a.dossier.id));
  return {
    crees,
    traites,
    respectPct: respectN === 0 ? null : Math.round((onTime / respectN) * 100),
    respectN,
    enAttente,
    enRetard: aging.size,
  };
}

// ── Cycle time ──────────────────────────────────────────────────────────────

export interface CycleTimeRow {
  key: StepKey | 'total';
  /** Median business hours, null when n === 0. */
  medianHours: number | null;
  n: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Median business hours per SLA stage (closed clocks started in range) and création → rapport déposé (deposited in range). */
export function computeCycleTimes(dossiers: FunnelDossier[], range: FunnelRange, sla: SlaItem[], holidays?: ReadonlySet<string>): CycleTimeRow[] {
  const perStep = new Map<StepKey, number[]>();
  for (const key of STEP_KEYS) if (STAGE_HAS_SLA[key]) perStep.set(key, []);
  for (const it of sla) {
    if (!it.doneAt || !inRange(it.start, range)) continue;
    perStep.get(it.step)?.push(it.hours);
  }
  const rows: CycleTimeRow[] = [];
  for (const [key, values] of perStep) rows.push({ key, medianHours: median(values), n: values.length });
  const total: number[] = [];
  for (const d of dossiers) {
    const done = STEP_DEFS.rapport.doneAt(d);
    const start = toDate(d.createdAt);
    if (!done || !start || !inRange(done, range) || done < start) continue;
    total.push(businessHoursBetween(start, done, holidays));
  }
  rows.push({ key: 'total', medianHours: median(total), n: total.length });
  return rows;
}

/** "18 h" under a day, else "2,5 j" (business days of 24 h, matching the SLA model). */
export function formatBusinessHours(h: number | null): string {
  if (h == null) return '—';
  if (h < 24) return `${Math.round(h)} h`;
  const days = h / 24;
  return `${(Math.round(days * 10) / 10).toString().replace('.', ',')} j`;
}

// ── Weekly trend ────────────────────────────────────────────────────────────

export interface WeekPoint {
  weekStart: Date;
  label: string;
  crees: number;
  deposes: number;
}

/** Created vs rapport déposé per fr-locale week across the range (inclusive). */
export function computeWeeklyTrend(dossiers: FunnelDossier[], range: FunnelRange, now: Date): WeekPoint[] {
  const to = range.to ?? now;
  const from = range.from ?? addDays(to, -7 * 12);
  if (from > to) return [];
  const weeks = eachWeekOfInterval({ start: from, end: to }, { locale: fr });
  const points: WeekPoint[] = weeks.map((w) => {
    const start = startOfWeek(w, { locale: fr });
    return { weekStart: start, label: `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`, crees: 0, deposes: 0 };
  });
  const index = (d: Date | null): number => {
    if (!d) return -1;
    const s = startOfWeek(d, { locale: fr }).getTime();
    return points.findIndex((p) => p.weekStart.getTime() === s);
  };
  for (const d of dossiers) {
    const c = index(toDate(d.createdAt));
    if (c >= 0 && inRange(toDate(d.createdAt), range)) points[c].crees += 1;
    const r = index(STEP_DEFS.rapport.doneAt(d));
    if (r >= 0 && inRange(STEP_DEFS.rapport.doneAt(d), range)) points[r].deposes += 1;
  }
  return points;
}

// ── Per compagnie / per user ────────────────────────────────────────────────

export interface GroupMeasures {
  group: string;
  enDelai: Record<StepKey, number>;
  horsDelai: Record<StepKey, number>;
  /** On-time share of the clocks started in range (pending excluded); null when none. */
  respectPct: number | null;
  /** Dossiers with no rapport deposited (open), now. */
  enAttente: number;
  totalEnDelai: number;
}

const respectFrom = (enDelai: Record<StepKey, number>, horsDelai: Record<StepKey, number>): number | null => {
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

/** Per-compagnie measures, ALL respecting `range` (the old table ignored it). */
export function computePerCompagnieMeasures(dossiers: FunnelDossier[], range: FunnelRange, sla: SlaItem[], allCompagnies?: string[]): GroupMeasures[] {
  const groups = new Map<string, FunnelDossier[]>();
  for (const d of dossiers) {
    const key = (d.compagnie || '').trim() || '— non précisé —';
    const arr = groups.get(key) || [];
    arr.push(d);
    groups.set(key, arr);
  }
  if (allCompagnies) {
    for (const raw of allCompagnies) {
      const key = (raw || '').trim();
      if (key && !groups.has(key)) groups.set(key, []);
    }
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([group, arr]) => {
      const ids = new Set(arr.map((d) => d.id));
      const { enDelai, horsDelai } = computeStepMeasures(arr, range, sla.filter((it) => ids.has(it.dossier.id)));
      return {
        group,
        enDelai,
        horsDelai,
        respectPct: respectFrom(enDelai, horsDelai),
        enAttente: arr.filter((d) => !STEP_DEFS.rapport.doneAt(d)).length,
        totalEnDelai: STEP_KEYS.reduce((acc, k) => acc + enDelai[k], 0),
      };
    });
}

export interface UserMeasures extends GroupMeasures {
  /** Open dossiers this user has a clock or a completed step on. */
  ouverts: number;
}

/**
 * Per-user measures. SLA steps are credited to the clock's OWNER (the
 * chiffreur of the assignment, the agent of the mission, the creator);
 * steps without a clock to the funnel's author. `ouverts` = distinct open
 * dossiers the user touched — a workload approximation, labelled as such.
 */
export function computePerUserMeasures(dossiers: FunnelDossier[], logs: WorkflowLog[], range: FunnelRange, sla: SlaItem[]): UserMeasures[] {
  type Row = UserMeasures & { openIds: Set<string> };
  const rows = new Map<string, Row>();
  const ensure = (user: string): Row => {
    let r = rows.get(user);
    if (!r) {
      r = { group: user, enDelai: emptyCounts(), horsDelai: emptyCounts(), respectPct: null, enAttente: 0, totalEnDelai: 0, ouverts: 0, openIds: new Set() };
      rows.set(user, r);
    }
    return r;
  };
  const isOpen = (d: FunnelDossier) => !STEP_DEFS.rapport.doneAt(d);
  const covered = new Map<StepKey, Set<string>>();
  for (const key of STEP_KEYS) covered.set(key, new Set());

  for (const it of sla) {
    if (!it.owner) continue;
    const r = ensure(it.owner);
    if (isOpen(it.dossier)) r.openIds.add(it.dossier.id);
    if (!inRange(it.start, range)) continue;
    covered.get(it.step)!.add(it.dossier.id);
    if (it.late) r.horsDelai[it.step] += 1;
    else if (it.doneAt) r.enDelai[it.step] += 1;
  }
  for (const d of dossiers) {
    for (const key of STEP_KEYS) {
      if (covered.get(key)!.has(d.id)) continue;
      const at = STEP_DEFS[key].doneAt(d);
      if (!at) continue;
      const author = STEP_DEFS[key].authorOf(d, logs);
      if (!author) continue;
      const r = ensure(author);
      if (isOpen(d)) r.openIds.add(d.id);
      if (inRange(at, range)) r.enDelai[key] += 1;
    }
  }
  return Array.from(rows.values())
    .map(({ openIds, ...r }) => ({
      ...r,
      ouverts: openIds.size,
      enAttente: openIds.size,
      respectPct: respectFrom(r.enDelai, r.horsDelai),
      totalEnDelai: STEP_KEYS.reduce((acc, k) => acc + r.enDelai[k], 0),
    }))
    .sort((a, b) => b.totalEnDelai - a.totalEnDelai);
}
