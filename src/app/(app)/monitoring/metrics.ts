/**
 * Suivi d'équipe — operational metrics on top of the funnel model.
 *
 * Pure module (no React, no Firebase), unit-tested. Adds what the tiles alone
 * cannot say, following published operations-dashboard practice:
 *   • summary + exception (Few): a headline row above the stage tiles;
 *   • flow metrics (Kanban: WIP, cycle time, throughput, work-item AGE):
 *     "hors délai" in the tiles is a LAGGING measure (counted once the step is
 *     done); `agingDossiers` is the LEADING one — what is past the SLA right
 *     now and not done;
 *   • cycle time by stage (claims-operations KPI), in business hours;
 *   • one time base: every period measure here respects `range`.
 *
 * SLA = 24 business hours (weekends and Moroccan holidays excluded, see
 * `lib/business-days.ts`), same constant as the funnel.
 */

import { addDays, eachWeekOfInterval, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { businessHoursBetween } from '@/lib/business-days';
import { ACCORD_BUCKET_MEMBERS } from '@/lib/dossiers-data';
import {
  STEP_DEFS,
  STEP_KEYS,
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
  accord1er: false,
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

/**
 * The event that starts a stage's SLA clock, or null when the stage has no
 * clock (or it has not started for this dossier).
 */
export function stageTriggerAt(d: FunnelDossier, key: StepKey): Date | null {
  switch (key) {
    case 'creation':
      return toDate(d.dateRequete);
    case 'photosAvant':
      return toDate(d.dateDemandeExpertiseAvant);
    case 'photosEnCours':
      return toDate(d.dateDemandeExpertiseEnCours);
    case 'photosApres':
      return toDate(d.dateDemandeExpertiseApres);
    case 'accord': {
      // The clock runs only while a chiffrage is pending (status in the
      // chiffrage bucket, no later accord saved).
      const status = d.lastStatusChange?.status ?? d.statut ?? '';
      const done = STEP_DEFS.accord.doneAt(d);
      if (done) return toDate(d.dateChiffrage);
      if (/chiffrage/i.test(status) || ACCORD_BUCKET_MEMBERS.has(status)) return toDate(d.dateChiffrage);
      return null;
    }
    default:
      return null;
  }
}

/** Per-step count of dossiers that completed the step late AND in range. */
export function computeHorsDelaiInRange(dossiers: FunnelDossier[], range: FunnelRange): Record<StepKey, number> {
  const out = emptyCounts();
  for (const d of dossiers) {
    for (const key of STEP_KEYS) {
      const def = STEP_DEFS[key];
      const at = def.doneAt(d);
      if (!at || !inRange(at, range)) continue;
      if (def.horsDelaiAt(d) != null) out[key] += 1;
    }
  }
  return out;
}

export interface AgingItem {
  dossier: FunnelDossier;
  step: StepKey;
  /** When the SLA clock started. */
  since: Date;
  /** Business hours elapsed since `since`, as of `now`. */
  ageHours: number;
}

/**
 * Work-item age (leading indicator): SLA stages that have STARTED (trigger
 * present), are NOT done, and are already past the SLA as of `now`.
 * `creation` is skipped — a dossier that exists has been created.
 * Sorted oldest first.
 */
export function agingDossiers(dossiers: FunnelDossier[], now: Date, slaHours = SLA_BUSINESS_HOURS): AgingItem[] {
  const out: AgingItem[] = [];
  for (const d of dossiers) {
    for (const key of STEP_KEYS) {
      if (!STAGE_HAS_SLA[key] || key === 'creation') continue;
      if (STEP_DEFS[key].doneAt(d)) continue;
      const since = stageTriggerAt(d, key);
      if (!since || since > now) continue;
      const ageHours = businessHoursBetween(since, now);
      if (ageHours > slaHours) out.push({ dossier: d, step: key, since, ageHours });
    }
  }
  return out.sort((a, b) => b.ageHours - a.ageHours);
}

export interface Headline {
  /** Dossiers created in range (inflow). */
  crees: number;
  /** Dossiers whose rapport was deposited in range (end-to-end throughput). */
  traites: number;
  /** On-time share of SLA-stage completions in range; null when nothing completed. */
  respectPct: number | null;
  respectN: number;
  /** Open backlog: dossiers in scope with no rapport deposited (now, not period). */
  enAttente: number;
  /** Dossiers with at least one stage past SLA right now (leading). */
  enRetard: number;
}

export function computeHeadline(dossiers: FunnelDossier[], range: FunnelRange, now: Date): Headline {
  let crees = 0;
  let traites = 0;
  let onTime = 0;
  let late = 0;
  let enAttente = 0;
  for (const d of dossiers) {
    if (inRange(toDate(d.createdAt), range)) crees += 1;
    const deposed = STEP_DEFS.rapport.doneAt(d);
    if (inRange(deposed, range)) traites += 1;
    if (!deposed) enAttente += 1;
    for (const key of STEP_KEYS) {
      if (!STAGE_HAS_SLA[key]) continue;
      const def = STEP_DEFS[key];
      const at = def.doneAt(d);
      if (!at || !inRange(at, range)) continue;
      if (def.horsDelaiAt(d) != null) late += 1;
      else onTime += 1;
    }
  }
  const aging = new Set(agingDossiers(dossiers, now).map((a) => a.dossier.id));
  const respectN = onTime + late;
  return {
    crees,
    traites,
    respectPct: respectN === 0 ? null : Math.round((onTime / respectN) * 100),
    respectN,
    enAttente,
    enRetard: aging.size,
  };
}

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

/**
 * Median business hours per SLA stage (trigger → done, done in range) and
 * end-to-end (création → rapport déposé, deposited in range).
 */
export function computeCycleTimes(dossiers: FunnelDossier[], range: FunnelRange): CycleTimeRow[] {
  const rows: CycleTimeRow[] = [];
  for (const key of STEP_KEYS) {
    if (!STAGE_HAS_SLA[key]) continue;
    const values: number[] = [];
    for (const d of dossiers) {
      const done = STEP_DEFS[key].doneAt(d);
      if (!done || !inRange(done, range)) continue;
      const start = stageTriggerAt(d, key);
      if (!start) continue;
      const [a, b] = start <= done ? [start, done] : [done, start];
      values.push(businessHoursBetween(a, b));
    }
    rows.push({ key, medianHours: median(values), n: values.length });
  }
  const total: number[] = [];
  for (const d of dossiers) {
    const done = STEP_DEFS.rapport.doneAt(d);
    const start = toDate(d.createdAt);
    if (!done || !start || !inRange(done, range) || done < start) continue;
    total.push(businessHoursBetween(start, done));
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

export interface WeekPoint {
  weekStart: Date;
  label: string;
  crees: number;
  deposes: number;
}

/** Created vs rapport déposé per ISO-fr week across the range (inclusive). */
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

export interface GroupMeasures {
  group: string;
  enDelai: Record<StepKey, number>;
  horsDelai: Record<StepKey, number>;
  /** On-time share over SLA stages in range; null when none. */
  respectPct: number | null;
  /** Dossiers with no rapport deposited (open), now. */
  enAttente: number;
  totalEnDelai: number;
}

function measuresFor(group: string, arr: FunnelDossier[], range: FunnelRange): GroupMeasures {
  const enDelai = emptyCounts();
  const horsDelai = emptyCounts();
  let onTime = 0;
  let late = 0;
  let enAttente = 0;
  for (const d of arr) {
    if (!STEP_DEFS.rapport.doneAt(d)) enAttente += 1;
    for (const key of STEP_KEYS) {
      const def = STEP_DEFS[key];
      const at = def.doneAt(d);
      if (!at || !inRange(at, range)) continue;
      const isLate = def.horsDelaiAt(d) != null;
      if (isLate) horsDelai[key] += 1;
      else enDelai[key] += 1;
      if (STAGE_HAS_SLA[key]) {
        if (isLate) late += 1;
        else onTime += 1;
      }
    }
  }
  const n = onTime + late;
  return {
    group,
    enDelai,
    horsDelai,
    respectPct: n === 0 ? null : Math.round((onTime / n) * 100),
    enAttente,
    totalEnDelai: STEP_KEYS.reduce((acc, k) => acc + enDelai[k], 0),
  };
}

/** Per-compagnie measures, ALL respecting `range` (the old table ignored it). */
export function computePerCompagnieMeasures(dossiers: FunnelDossier[], range: FunnelRange, allCompagnies?: string[]): GroupMeasures[] {
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
    .map(([g, arr]) => measuresFor(g, arr, range));
}

export interface UserMeasures extends GroupMeasures {
  /** Open dossiers this user has touched (authored any completed stage). */
  ouverts: number;
}

/**
 * Per-user measures: a user "owns" a stage completion when the funnel's
 * `authorOf` names them. `ouverts` = distinct open dossiers they touched —
 * an approximation of workload, labelled as such in the UI.
 */
export function computePerUserMeasures(dossiers: FunnelDossier[], logs: WorkflowLog[], range: FunnelRange): UserMeasures[] {
  const rows = new Map<string, UserMeasures & { openIds: Set<string>; onTime: number; late: number }>();
  const ensure = (user: string) => {
    let r = rows.get(user);
    if (!r) {
      r = { group: user, enDelai: emptyCounts(), horsDelai: emptyCounts(), respectPct: null, enAttente: 0, totalEnDelai: 0, ouverts: 0, openIds: new Set(), onTime: 0, late: 0 };
      rows.set(user, r);
    }
    return r;
  };
  for (const d of dossiers) {
    const open = !STEP_DEFS.rapport.doneAt(d);
    for (const key of STEP_KEYS) {
      const def = STEP_DEFS[key];
      const at = def.doneAt(d);
      if (!at) continue;
      const author = def.authorOf(d, logs);
      if (!author) continue;
      const r = ensure(author);
      if (open) r.openIds.add(d.id);
      if (!inRange(at, range)) continue;
      const isLate = def.horsDelaiAt(d) != null;
      if (isLate) r.horsDelai[key] += 1;
      else r.enDelai[key] += 1;
      if (STAGE_HAS_SLA[key]) {
        if (isLate) r.late += 1;
        else r.onTime += 1;
      }
    }
  }
  return Array.from(rows.values())
    .map(({ openIds, onTime, late, ...r }) => ({
      ...r,
      ouverts: openIds.size,
      enAttente: openIds.size,
      respectPct: onTime + late === 0 ? null : Math.round((onTime / (onTime + late)) * 100),
      totalEnDelai: STEP_KEYS.reduce((acc, k) => acc + r.enDelai[k], 0),
    }))
    .sort((a, b) => b.totalEnDelai - a.totalEnDelai);
}
