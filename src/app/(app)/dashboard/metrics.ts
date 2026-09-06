/**
 * Role dashboards — pure metric layer (no React, no Firebase; unit-tested).
 *
 * Research synthesis (docs/research/dashboard-*.md, 2026-09-06):
 *   • the daily view is WORK-ITEM AGE against the SLA and WIP, not cycle time
 *     (Kanban Guide / Vacanti; theory B-part) — cycle time, funnel and trends
 *     stay on Suivi d'équipe;
 *   • the first block is the smallest actionable set, ordered oldest-first,
 *     with an explicit "waiting on a third party" split (Front/Intercom/GTD);
 *   • time-in-status ("sans mouvement") is the stuck signal, not total age;
 *   • every personal figure is self-referenced (7 j vs semaine précédente);
 *     the admin compares a person to the TEAM MEDIAN and its interquartile
 *     band, never to a rank (Deming, Muller, leaderboard studies);
 *   • speed always travels with its quality twin (revision rate).
 *
 * Every clock is the queues' own 24 h ouvrées model (`buildSlaItems`), so a
 * dashboard number never disagrees with the queue it summarises.
 */

import { addDays, format, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { businessHoursBetween, addBusinessHours } from '@/lib/business-days';
import { DOSSIER_STEP_DEFS, getStepStatuses, type StepState } from '@/lib/dossier-steps';
import { actionableStep, getDossierTodos, type DossierTodo } from '@/lib/dossier-todos';
import type { Rappel } from '@/hooks/use-rappels';
import { STEP_DEFS, type FunnelDossier } from '../monitoring/funnel';
import { buildSlaItems, normalizeMissionType, SLA_BUSINESS_HOURS, type SlaItem } from '../monitoring/metrics';
import type { DashboardChiffrage, DashboardMission, DashboardUser } from './use-dashboard-data';

export { SLA_BUSINESS_HOURS };

// ── Shared helpers ──────────────────────────────────────────────────────────

export const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  return null;
};

const norm = (s: unknown): string => (typeof s === 'string' ? s.trim().toLowerCase() : '');

/** Who a dashboard is about — the signed-in user, or the person an admin picked. */
export interface PersonRef {
  uid: string;
  nom?: string;
  email?: string;
}

/** A dossier belongs to the gestionnaire who created it (`createdBy` = uid; legacy `createdByName` = nom or email). */
export function dossierOwnedBy(d: FunnelDossier & { createdByName?: string }, p: PersonRef): boolean {
  if (p.uid && d.createdBy === p.uid) return true;
  const by = norm(d.createdByName);
  if (!by) return false;
  return (!!p.nom && by === norm(p.nom)) || (!!p.email && by === norm(p.email));
}

/** Same rule as the Chiffrage queue: by id when present, else by name. */
export function chiffrageOwnedBy(c: DashboardChiffrage, p: PersonRef): boolean {
  if (p.uid && c.assignedChiffreurId && c.assignedChiffreurId === p.uid) return true;
  return !!p.nom && norm(c.assignedChiffreurNom) === norm(p.nom);
}

/** Same rule as the Terrain queue: by uid when present, else by name. */
export function missionOwnedBy(m: DashboardMission, p: PersonRef): boolean {
  if (p.uid && m.agentTerrainUid && m.agentTerrainUid === p.uid) return true;
  return !!p.nom && norm(m.agentTerrain) === norm(p.nom);
}

/** Open = no rapport déposé (the same "en attente" definition as Suivi d'équipe). */
export const isOpenDossier = (d: FunnelDossier): boolean => !STEP_DEFS.rapport.doneAt(d);

/** The Chiffrage queue ignores assignments without files; so does the dashboard. */
export const isQueueChiffrage = (c: DashboardChiffrage): boolean => Array.isArray(c.files) && c.files.length > 0;

const DATED_FIELDS = [
  'createdAt',
  'dateDemandeExpertiseAvant',
  'datePhotosAvant',
  'dateChiffrage',
  'firstAccordReachedAt',
  'dateDemandeExpertiseEnCours',
  'datePhotosEnCours',
  'dateDemandeExpertiseApres',
  'datePhotosApres',
  'dateFactureValide',
  'dateRapportDepose',
  'dateNoteHonoraire',
  'noteHonoraireAt',
] as const;

/**
 * Last dated movement on the dossier document itself (milestones, status
 * change, observation) — no workflow-log listener needed. "Sans mouvement
 * depuis" = now − this.
 */
export function lastMovementAt(d: any): Date | null {
  let best: Date | null = null;
  const consider = (v: any) => {
    const dt = toDate(v);
    if (dt && (!best || dt > best)) best = dt;
  };
  for (const key of DATED_FIELDS) consider(d?.[key]);
  consider(d?.lastStatusChange?.at);
  consider(d?.lastObservation?.at);
  consider(d?.directorValidated?.at);
  return best;
}

const inWindow = (d: Date | null, from: Date, to: Date): boolean => !!d && d >= from && d <= to;

/** Business-day window [now − 7 j, now] and the one before it. */
export function weekWindows(now: Date): { cur: [Date, Date]; prev: [Date, Date] } {
  const d7 = addDays(now, -7);
  const d14 = addDays(now, -14);
  return { cur: [d7, now], prev: [d14, new Date(d7.getTime() - 1)] };
}

/** The real window printed in captions: « 30 août – 6 sept. » for the last `days` days. */
export function fmtWindow(now: Date, days: number): string {
  const from = addDays(now, -days);
  const pattern = from.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy';
  return `${format(from, pattern, { locale: fr })} – ${format(now, pattern, { locale: fr })}`;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Quartiles by the median-of-halves rule (small teams: n ≥ 4 for a band). */
export function quartiles(values: number[]): { q1: number; med: number; q3: number } | null {
  if (values.length < 4) {
    const med = median(values);
    return med == null ? null : { q1: med, med, q3: med };
  }
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const lower = s.slice(0, mid);
  const upper = s.length % 2 ? s.slice(mid + 1) : s.slice(mid);
  return { q1: median(lower)!, med: median(s)!, q3: median(upper)! };
}

/** Open SLA clocks past 24 h ouvrées right now, keyed by dossier id (leading signal). */
export function lateDossierIds(sla: SlaItem[]): Set<string> {
  const out = new Set<string>();
  for (const it of sla) {
    if (!it.doneAt && it.late && it.kind !== 'creation') out.add(it.dossier.id);
  }
  return out;
}

// ── Gestionnaire ────────────────────────────────────────────────────────────

export type WaitingParty = 'chiffreur' | 'agent' | 'direction';

export interface WorkItem {
  id: string;
  dossier: FunnelDossier;
  todo: DossierTodo;
  /** Time since the dossier last moved. */
  since: Date | null;
  ageHours: number;
  /** An SLA clock on this dossier is breached right now. */
  late: boolean;
  waiting: boolean;
  party?: WaitingParty;
}

export interface WaitingGroup {
  party: WaitingParty;
  count: number;
  oldest: WorkItem | null;
}

export interface StepLoad {
  stepId: number;
  label: string;
  count: number;
  late: number;
}

export interface AgeBucket {
  key: string;
  label: string;
  /** Inclusive lower bound in calendar days since requête. */
  from: number;
  /** Exclusive upper bound (null = open-ended). */
  to: number | null;
  count: number;
}

export interface GestionnaireTiles {
  enCours: number;
  crees7: number;
  enRetard: number;
  rappelsNonLus: number;
  rappelOldest: Rappel | null;
  termines7: number;
  termines7Prev: number;
}

export interface GestionnaireView {
  aTraiter: WorkItem[];
  enAttente: WaitingGroup[];
  sansMouvement: WorkItem[];
  tiles: GestionnaireTiles;
  parEtape: StepLoad[];
  ageBuckets: AgeBucket[];
  openCount: number;
}

/** Practical Moroccan expectation: expertise 8–15 j after declaration; payment 30–60 j (industry report B16). */
export const AGE_BUCKET_DEFS: Array<{ key: string; label: string; from: number; to: number | null }> = [
  { key: '0-7', label: '0–7 j', from: 0, to: 8 },
  { key: '8-15', label: '8–15 j', from: 8, to: 16 },
  { key: '16-30', label: '16–30 j', from: 16, to: 31 },
  { key: '31-60', label: '31–60 j', from: 31, to: 61 },
  { key: '60+', label: '> 60 j', from: 61, to: null },
];

/** No movement for longer than this = stuck (2 business days; role-based B4). */
export const STALE_BUSINESS_HOURS = 48;

const partyOf = (todo: DossierTodo): WaitingParty => {
  if (todo.id.startsWith('accord')) return 'chiffreur';
  if (todo.id.startsWith('photos')) return 'agent';
  return 'direction';
};

const stepLabelOf = (stepId: number): string =>
  DOSSIER_STEP_DEFS.find((s) => s.id === stepId)?.longLabel ?? '';

export function computeGestionnaireView(
  dossiers: FunnelDossier[],
  sla: SlaItem[],
  rappelsRecus: Rappel[],
  holidays: ReadonlySet<string> | undefined,
  now: Date,
  person: PersonRef | null,
): GestionnaireView {
  const mine = person ? dossiers.filter((d) => dossierOwnedBy(d as any, person)) : dossiers;
  const open = mine.filter(isOpenDossier);
  const lateIds = lateDossierIds(sla);

  const aTraiter: WorkItem[] = [];
  const waiting: WorkItem[] = [];
  const stale: WorkItem[] = [];
  const stepCounts = new Map<number, StepLoad>();
  for (const def of DOSSIER_STEP_DEFS) stepCounts.set(def.id, { stepId: def.id, label: def.longLabel, count: 0, late: 0 });
  const buckets = AGE_BUCKET_DEFS.map((b) => ({ ...b, count: 0 }));

  for (const d of open) {
    const steps: StepState[] = getStepStatuses(d);
    const todos = getDossierTodos(d, steps, null);
    const since = lastMovementAt(d);
    const ageHours = since ? businessHoursBetween(since, now, holidays) : 0;
    const late = lateIds.has(d.id);
    for (const todo of todos) {
      const item: WorkItem = { id: `${d.id}:${todo.id}`, dossier: d, todo, since, ageHours, late, waiting: !!todo.waiting };
      if (todo.waiting) {
        item.party = partyOf(todo);
        waiting.push(item);
      } else {
        aTraiter.push(item);
      }
    }
    if (ageHours > STALE_BUSINESS_HOURS) {
      const next = actionableStep(steps);
      stale.push({
        id: `${d.id}:stale`,
        dossier: d,
        todo: {
          id: 'stale',
          label: next ? next.longLabel : stepLabelOf(7),
          target: '',
          action: { kind: 'goto', stepId: next?.id ?? 7 },
        },
        since,
        ageHours,
        late,
        waiting: false,
      });
    }
    const next = actionableStep(steps);
    if (next) {
      const row = stepCounts.get(next.id)!;
      row.count += 1;
      if (late) row.late += 1;
    }
    const requete = toDate(d.dateRequete) ?? toDate(d.createdAt);
    if (requete) {
      const days = Math.floor((startOfDay(now).getTime() - startOfDay(requete).getTime()) / 86_400_000);
      const b = buckets.find((x) => days >= x.from && (x.to == null || days < x.to));
      if (b) b.count += 1;
    }
  }

  const byAgeDesc = (a: WorkItem, b: WorkItem) => b.ageHours - a.ageHours;
  aTraiter.sort((a, b) => Number(b.late) - Number(a.late) || byAgeDesc(a, b));
  stale.sort(byAgeDesc);

  const enAttente: WaitingGroup[] = (['chiffreur', 'agent', 'direction'] as WaitingParty[]).map((party) => {
    const items = waiting.filter((w) => w.party === party).sort(byAgeDesc);
    return { party, count: items.length, oldest: items[0] ?? null };
  });

  const { cur, prev } = weekWindows(now);
  const termines7 = mine.filter((d) => inWindow(STEP_DEFS.rapport.doneAt(d), cur[0], cur[1])).length;
  const termines7Prev = mine.filter((d) => inWindow(STEP_DEFS.rapport.doneAt(d), prev[0], prev[1])).length;
  const crees7 = mine.filter((d) => inWindow(toDate(d.createdAt), cur[0], cur[1])).length;
  const unread = rappelsRecus.filter((r) => !r.read && !r.resolvedAt);
  const rappelOldest = unread
    .slice()
    .sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0))[0] ?? null;

  return {
    aTraiter,
    enAttente,
    sansMouvement: stale,
    tiles: {
      enCours: open.length,
      crees7,
      enRetard: open.filter((d) => lateIds.has(d.id)).length,
      rappelsNonLus: unread.length,
      rappelOldest,
      termines7,
      termines7Prev,
    },
    parEtape: Array.from(stepCounts.values()),
    ageBuckets: buckets,
    openCount: open.length,
  };
}

// ── Chiffreur ───────────────────────────────────────────────────────────────

export type QueueBand = 'En retard' | 'Moins de 6 h' | "Aujourd'hui" | 'À venir';
export const QUEUE_BANDS: QueueBand[] = ['En retard', 'Moins de 6 h', "Aujourd'hui", 'À venir'];
/** Same threshold as the Chiffrage queue's warning chip. */
export const WARNING_HOURS = 6;

export interface QueueEntry {
  chiffrage: DashboardChiffrage;
  dossier: FunnelDossier | null;
  start: Date | null;
  end: Date | null;
  elapsedHours: number;
  remainingHours: number;
  late: boolean;
  band: QueueBand;
  /** Not the dossier's first assignment → 2ème / 3ème accord (re-edit). */
  revision: boolean;
  /** 1 = first assignment of the dossier, 2 = second… */
  round: number;
}

export interface ChiffreurTiles {
  enAttente: number;
  revisionsEnAttente: number;
  horsDelai: number;
  termines7: number;
  termines7Prev: number;
  dansDelais30: { pct: number | null; onTime: number; n: number };
}

export interface ChiffreurView {
  queue: QueueEntry[];
  bands: Array<{ band: QueueBand; count: number }>;
  tiles: ChiffreurTiles;
  /** Revision share over the assignments received in the last 30 days. */
  revisions30: { revisions: number; total: number };
}

/** Round number of every queue assignment (1 = first for its dossier), whoever the chiffreur is. */
export function assignmentRounds(all: DashboardChiffrage[]): Map<string, number> {
  const byDossier = new Map<string, DashboardChiffrage[]>();
  for (const c of all) {
    if (!c.dossierId || !toDate(c.createdAt) || !isQueueChiffrage(c)) continue;
    const arr = byDossier.get(c.dossierId) || [];
    arr.push(c);
    byDossier.set(c.dossierId, arr);
  }
  const rounds = new Map<string, number>();
  for (const arr of byDossier.values()) {
    arr.sort((a, b) => toDate(a.createdAt)!.getTime() - toDate(b.createdAt)!.getTime());
    arr.forEach((c, i) => rounds.set(c.id, i + 1));
  }
  return rounds;
}

export function computeChiffreurView(
  allChiffrages: DashboardChiffrage[],
  dossiers: FunnelDossier[],
  holidays: ReadonlySet<string> | undefined,
  now: Date,
  person: PersonRef | null,
): ChiffreurView {
  const byId = new Map(dossiers.map((d) => [d.id, d]));
  const rounds = assignmentRounds(allChiffrages);
  const mine = allChiffrages.filter((c) => isQueueChiffrage(c) && (!person || chiffrageOwnedBy(c, person)));

  const entries: QueueEntry[] = mine.map((c) => {
    const start = toDate(c.createdAt);
    const completed = toDate(c.completedAt);
    const elapsedHours = start ? businessHoursBetween(start, completed ?? now, holidays) : 0;
    const late = !!start && elapsedHours >= SLA_BUSINESS_HOURS;
    const remainingHours = Math.max(0, SLA_BUSINESS_HOURS - elapsedHours);
    const end = start ? addBusinessHours(start, SLA_BUSINESS_HOURS, holidays) : null;
    let band: QueueBand;
    if (late) band = 'En retard';
    else if (remainingHours <= WARNING_HOURS) band = 'Moins de 6 h';
    else if (end && isSameDay(end, now)) band = "Aujourd'hui";
    else band = 'À venir';
    const round = rounds.get(c.id) ?? 1;
    return {
      chiffrage: c,
      dossier: byId.get(c.dossierId) ?? null,
      start,
      end,
      elapsedHours,
      remainingHours,
      late,
      band,
      revision: round > 1,
      round,
    };
  });

  const open = entries.filter((e) => !toDate(e.chiffrage.completedAt));
  // Most urgent first: breached oldest first, then the least remaining time.
  open.sort((a, b) => {
    if (a.late !== b.late) return a.late ? -1 : 1;
    if (a.late && b.late) return b.elapsedHours - a.elapsedHours;
    return a.remainingHours - b.remainingHours;
  });

  const bands = QUEUE_BANDS.map((band) => ({ band, count: open.filter((e) => e.band === band).length }));

  const { cur, prev } = weekWindows(now);
  const done = entries.filter((e) => !!toDate(e.chiffrage.completedAt));
  const termines7 = done.filter((e) => inWindow(toDate(e.chiffrage.completedAt), cur[0], cur[1])).length;
  const termines7Prev = done.filter((e) => inWindow(toDate(e.chiffrage.completedAt), prev[0], prev[1])).length;
  const d30 = addDays(now, -30);
  const done30 = done.filter((e) => inWindow(toDate(e.chiffrage.completedAt), d30, now));
  const onTime = done30.filter((e) => !e.late).length;
  const received30 = entries.filter((e) => inWindow(e.start, d30, now));

  return {
    queue: open,
    bands,
    tiles: {
      enAttente: open.length,
      revisionsEnAttente: open.filter((e) => e.revision).length,
      horsDelai: open.filter((e) => e.late).length,
      termines7,
      termines7Prev,
      dansDelais30: { pct: done30.length ? Math.round((onTime / done30.length) * 100) : null, onTime, n: done30.length },
    },
    revisions30: { revisions: received30.filter((e) => e.revision).length, total: received30.length },
  };
}

// ── Agent de Terrain ────────────────────────────────────────────────────────

export type MissionType = 'Avant' | 'En cours' | 'Après';

export interface MissionView {
  mission: DashboardMission;
  dossier: FunnelDossier | null;
  type: MissionType | null;
  rdv: Date | null;
  start: Date | null;
  /** The phase's photos are on the dossier (the queue's own completion rule). */
  done: boolean;
  doneAt: Date | null;
  checkedIn: boolean;
  /** RDV day is past without photos, or the 24 h ouvrées clock is breached. */
  late: boolean;
  lateReason: 'rdv' | 'sla' | null;
  ageHours: number;
}

export interface TerrainTiles {
  semaineFaites: number;
  semainePlanifiees: number;
  photosAEnvoyer: number;
  enRetard: number;
}

export interface TerrainView {
  next: MissionView | null;
  today: MissionView[];
  late: MissionView[];
  tomorrow: MissionView[];
  /** Open missions after tomorrow. */
  laterCount: number;
  photosAEnvoyer: MissionView[];
  tiles: TerrainTiles;
}

const PHOTO_FIELD: Record<MissionType, keyof FunnelDossier> = {
  Avant: 'datePhotosAvant',
  'En cours': 'datePhotosEnCours',
  Après: 'datePhotosApres',
};

export function missionViews(
  missions: DashboardMission[],
  dossiers: FunnelDossier[],
  holidays: ReadonlySet<string> | undefined,
  now: Date,
): MissionView[] {
  const byId = new Map(dossiers.map((d) => [d.id, d]));
  const today = startOfDay(now);
  const out: MissionView[] = [];
  for (const m of missions) {
    if (m.active === false) continue;
    const dossier = byId.get(m.dossierId) ?? null;
    const type = normalizeMissionType(m.typeMission) as MissionType | null;
    const rdv = toDate(m.dateRDV);
    const start = toDate(m.createdAt) ?? rdv;
    const photos = type && dossier ? toDate((dossier as any)[PHOTO_FIELD[type]]) : null;
    const doneAt = photos && start && photos >= start ? photos : null;
    const done = !!doneAt;
    const ageHours = start && !done ? businessHoursBetween(start, now, holidays) : 0;
    const rdvPast = !!rdv && rdv < today;
    const slaLate = !done && ageHours > SLA_BUSINESS_HOURS;
    const late = !done && (rdvPast || slaLate);
    out.push({
      mission: m,
      dossier,
      type,
      rdv,
      start,
      done,
      doneAt,
      checkedIn: !!toDate(m.checkinAt),
      late,
      lateReason: late ? (rdvPast ? 'rdv' : 'sla') : null,
      ageHours,
    });
  }
  return out;
}

export function computeTerrainView(
  allMissions: DashboardMission[],
  dossiers: FunnelDossier[],
  holidays: ReadonlySet<string> | undefined,
  now: Date,
  person: PersonRef | null,
): TerrainView {
  const mine = person ? allMissions.filter((m) => missionOwnedBy(m, person)) : allMissions;
  const views = missionViews(mine, dossiers, holidays, now);
  const open = views.filter((v) => !v.done);
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);
  const byRdv = (a: MissionView, b: MissionView) =>
    (a.rdv?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.rdv?.getTime() ?? Number.MAX_SAFE_INTEGER);

  const todayList = open.filter((v) => v.rdv && v.rdv >= today && v.rdv < tomorrow).sort(byRdv);
  const tomorrowList = open.filter((v) => v.rdv && v.rdv >= tomorrow && v.rdv < dayAfter).sort(byRdv);
  const laterCount = open.filter((v) => v.rdv && v.rdv >= dayAfter).length;
  const late = open.filter((v) => v.late).sort((a, b) => b.ageHours - a.ageHours);
  // Next = the earliest mission from today onwards that is not done (a past
  // RDV of today still counts: it is the place to go now).
  const next = open.filter((v) => v.rdv && v.rdv >= today).sort(byRdv)[0] ?? null;
  const photosAEnvoyer = open.filter((v) => v.checkedIn).sort(byRdv);

  const weekStart = startOfWeek(now, { locale: fr });
  const weekEnd = addDays(weekStart, 7);
  const semaineFaites = views.filter((v) => v.doneAt && v.doneAt >= weekStart && v.doneAt < weekEnd).length;
  const semainePlanifiees = views.filter((v) => v.rdv && v.rdv >= weekStart && v.rdv < weekEnd).length;

  return {
    next,
    today: todayList,
    late,
    tomorrow: tomorrowList,
    laterCount,
    photosAEnvoyer,
    tiles: { semaineFaites, semainePlanifiees, photosAEnvoyer: photosAEnvoyer.length, enRetard: late.length },
  };
}

// ── Admin: team rollups ─────────────────────────────────────────────────────

export type DashboardRole = 'Gestionnaire' | 'Chiffreur' | 'Agent de Terrain';
export const DASHBOARD_ROLES: DashboardRole[] = ['Gestionnaire', 'Chiffreur', 'Agent de Terrain'];

export interface TeamTiles {
  enCours: number;
  enRetard: number;
  /** Chiffreur: assignments without a chiffreur · Terrain: missions without an agent · Gestionnaire: open dossiers stuck > 2 j ouvrés. */
  third: number;
  thirdLabel: 'Non assignés' | 'Sans mouvement';
  termines7: number;
  termines7Prev: number;
}

export interface ExceptionRow {
  id: string;
  owner: string;
  dossier: FunnelDossier | null;
  dossierId: string;
  label: string;
  ageHours: number;
  href: string;
}

export interface PersonRow {
  user: DashboardUser;
  enCours: number;
  plusAncienHours: number | null;
  enRetard: number;
  termines7: number;
  dansDelais30: number | null;
  /** Assigned / created in the last 30 days (the denominator every rate is read against). */
  recus30: number;
  /** Revisions (chiffreur) · phases mix (agent) · natures mix (gestionnaire). */
  mix: Array<{ label: string; count: number }>;
}

export interface TeamStats {
  enCours: ReturnType<typeof quartiles>;
  enRetard: ReturnType<typeof quartiles>;
  termines7: ReturnType<typeof quartiles>;
  dansDelais30: ReturnType<typeof quartiles>;
}

export interface TeamView {
  role: DashboardRole;
  tiles: TeamTiles;
  exceptions: ExceptionRow[];
  perPerson: PersonRow[];
  stats: TeamStats;
}

const activeUsersOfRole = (users: DashboardUser[], role: DashboardRole): DashboardUser[] =>
  users.filter((u) => u.role === role && u.statut !== 'Inactif');

const personOf = (u: DashboardUser): PersonRef => ({ uid: u.id, nom: u.nom, email: u.email });

const displayName = (u: DashboardUser): string => (u.nom || u.email || u.id).trim();

const hrefDossier = (id: string) => `/dossiers/${id}`;
const hrefChiffrage = (id: string) => `/assignations-chiffrage/${id}`;
const hrefMission = (dossierId: string, type: MissionType | null) =>
  `/assignations-atg/${dossierId}${type ? `?mission=${encodeURIComponent(type)}` : ''}`;

export function computeTeamView(
  role: DashboardRole,
  users: DashboardUser[],
  data: {
    dossiers: FunnelDossier[];
    chiffrages: DashboardChiffrage[];
    missions: DashboardMission[];
    sla: SlaItem[];
    holidays?: ReadonlySet<string>;
  },
  now: Date,
): TeamView {
  const team = activeUsersOfRole(users, role);
  const { cur, prev } = weekWindows(now);
  const d30 = addDays(now, -30);
  const perPerson: PersonRow[] = [];
  const exceptions: ExceptionRow[] = [];

  if (role === 'Gestionnaire') {
    const lateIds = lateDossierIds(data.sla);
    const openAll = data.dossiers.filter(isOpenDossier);
    for (const u of team) {
      const p = personOf(u);
      const v = computeGestionnaireView(data.dossiers, data.sla, [], data.holidays, now, p);
      const mine = data.dossiers.filter((d) => dossierOwnedBy(d as any, p));
      const created30 = mine.filter((d) => inWindow(toDate(d.createdAt), d30, now));
      // The gestionnaire's own clock: requête → création within 24 h ouvrées.
      const opened = created30.filter((d) => toDate(d.dateRequete));
      const onTime = opened.filter((d) => {
        const it = data.sla.find((s) => s.kind === 'creation' && s.dossier.id === d.id);
        return it ? !it.late : true;
      }).length;
      const natures = new Map<string, number>();
      for (const d of created30) {
        const n = ((d as any).nature || '—') as string;
        natures.set(n, (natures.get(n) || 0) + 1);
      }
      const openMine = mine.filter(isOpenDossier);
      const ages = openMine.map((d) => {
        const s = lastMovementAt(d);
        return s ? businessHoursBetween(s, now, data.holidays) : 0;
      });
      perPerson.push({
        user: u,
        enCours: v.tiles.enCours,
        plusAncienHours: ages.length ? Math.max(...ages) : null,
        enRetard: v.tiles.enRetard,
        termines7: v.tiles.termines7,
        dansDelais30: opened.length ? Math.round((onTime / opened.length) * 100) : null,
        recus30: created30.length,
        mix: Array.from(natures.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      });
      for (const w of [...v.aTraiter.filter((x) => x.late), ...v.sansMouvement]) {
        exceptions.push({
          id: `${u.id}:${w.id}`,
          owner: displayName(u),
          dossier: w.dossier,
          dossierId: w.dossier.id,
          label: w.todo.id === 'stale' ? `Sans mouvement · ${w.todo.label}` : w.todo.label,
          ageHours: w.ageHours,
          href: hrefDossier(w.dossier.id),
        });
      }
    }
    const stale = openAll.filter((d) => {
      const s = lastMovementAt(d);
      return s ? businessHoursBetween(s, now, data.holidays) > STALE_BUSINESS_HOURS : false;
    }).length;
    const tiles: TeamTiles = {
      enCours: openAll.length,
      enRetard: openAll.filter((d) => lateIds.has(d.id)).length,
      third: stale,
      thirdLabel: 'Sans mouvement',
      termines7: data.dossiers.filter((d) => inWindow(STEP_DEFS.rapport.doneAt(d), cur[0], cur[1])).length,
      termines7Prev: data.dossiers.filter((d) => inWindow(STEP_DEFS.rapport.doneAt(d), prev[0], prev[1])).length,
    };
    return finishTeam(role, tiles, exceptions, perPerson);
  }

  if (role === 'Chiffreur') {
    const all = computeChiffreurView(data.chiffrages, data.dossiers, data.holidays, now, null);
    for (const u of team) {
      const p = personOf(u);
      const v = computeChiffreurView(data.chiffrages, data.dossiers, data.holidays, now, p);
      const received30 = v.revisions30.total;
      perPerson.push({
        user: u,
        enCours: v.tiles.enAttente,
        plusAncienHours: v.queue.length ? Math.max(...v.queue.map((e) => e.elapsedHours)) : null,
        enRetard: v.tiles.horsDelai,
        termines7: v.tiles.termines7,
        dansDelais30: v.tiles.dansDelais30.pct,
        recus30: received30,
        mix: [
          { label: 'Nouveaux', count: received30 - v.revisions30.revisions },
          { label: 'Révisions', count: v.revisions30.revisions },
        ],
      });
      for (const e of v.queue.filter((x) => x.late)) {
        exceptions.push({
          id: `${u.id}:${e.chiffrage.id}`,
          owner: displayName(u),
          dossier: e.dossier,
          dossierId: e.chiffrage.dossierId,
          label: e.revision ? `Chiffrage en retard · ${e.round}ᵉ accord` : 'Chiffrage en retard',
          ageHours: e.elapsedHours,
          href: hrefChiffrage(e.chiffrage.id),
        });
      }
    }
    const unassigned = all.queue.filter((e) => !e.chiffrage.assignedChiffreurId && !norm(e.chiffrage.assignedChiffreurNom)).length;
    const tiles: TeamTiles = {
      enCours: all.tiles.enAttente,
      enRetard: all.tiles.horsDelai,
      third: unassigned,
      thirdLabel: 'Non assignés',
      termines7: all.tiles.termines7,
      termines7Prev: all.tiles.termines7Prev,
    };
    return finishTeam(role, tiles, exceptions, perPerson);
  }

  // Agent de Terrain
  const allViews = missionViews(data.missions, data.dossiers, data.holidays, now);
  const openAll = allViews.filter((v) => !v.done);
  for (const u of team) {
    const p = personOf(u);
    const v = computeTerrainView(data.missions, data.dossiers, data.holidays, now, p);
    const mineViews = missionViews(data.missions.filter((m) => missionOwnedBy(m, p)), data.dossiers, data.holidays, now);
    const open = mineViews.filter((x) => !x.done);
    const done30 = mineViews.filter((x) => x.doneAt && inWindow(x.doneAt, d30, now));
    const onTime = done30.filter((x) => x.start && businessHoursBetween(x.start, x.doneAt!, data.holidays) <= SLA_BUSINESS_HOURS).length;
    const received30 = mineViews.filter((x) => inWindow(x.start, d30, now));
    const mix = new Map<string, number>();
    for (const x of received30) mix.set(x.type ?? '—', (mix.get(x.type ?? '—') || 0) + 1);
    perPerson.push({
      user: u,
      enCours: open.length,
      plusAncienHours: open.length ? Math.max(...open.map((x) => x.ageHours)) : null,
      enRetard: v.tiles.enRetard,
      termines7: mineViews.filter((x) => x.doneAt && inWindow(x.doneAt, cur[0], cur[1])).length,
      dansDelais30: done30.length ? Math.round((onTime / done30.length) * 100) : null,
      recus30: received30.length,
      mix: Array.from(mix.entries()).map(([label, count]) => ({ label, count })),
    });
    for (const x of v.late) {
      exceptions.push({
        id: `${u.id}:${x.mission.dossierId}:${x.mission.id}`,
        owner: displayName(u),
        dossier: x.dossier,
        dossierId: x.mission.dossierId,
        label: x.lateReason === 'rdv' ? `RDV passé sans photos · ${x.type ?? ''}`.trim() : `Mission hors délai · ${x.type ?? ''}`.trim(),
        ageHours: x.ageHours,
        href: hrefMission(x.mission.dossierId, x.type),
      });
    }
  }
  const unassigned = openAll.filter((x) => !x.mission.agentTerrainUid && (!norm(x.mission.agentTerrain) || norm(x.mission.agentTerrain) === '-')).length;
  const tiles: TeamTiles = {
    enCours: openAll.length,
    enRetard: openAll.filter((x) => x.late).length,
    third: unassigned,
    thirdLabel: 'Non assignés',
    termines7: allViews.filter((x) => x.doneAt && inWindow(x.doneAt, cur[0], cur[1])).length,
    termines7Prev: allViews.filter((x) => x.doneAt && inWindow(x.doneAt, prev[0], prev[1])).length,
  };
  return finishTeam(role, tiles, exceptions, perPerson);
}

function finishTeam(role: DashboardRole, tiles: TeamTiles, exceptions: ExceptionRow[], perPerson: PersonRow[]): TeamView {
  exceptions.sort((a, b) => b.ageHours - a.ageHours);
  perPerson.sort((a, b) => b.enRetard - a.enRetard || (b.plusAncienHours ?? -1) - (a.plusAncienHours ?? -1) || a.user.nom?.localeCompare(b.user.nom ?? '', 'fr') || 0);
  const pick = (f: (r: PersonRow) => number | null) => perPerson.map(f).filter((x): x is number => x != null);
  return {
    role,
    tiles,
    exceptions,
    perPerson,
    stats: {
      enCours: quartiles(pick((r) => r.enCours)),
      enRetard: quartiles(pick((r) => r.enRetard)),
      termines7: quartiles(pick((r) => r.termines7)),
      dansDelais30: quartiles(pick((r) => r.dansDelais30)),
    },
  };
}

/** Build the SLA clocks once for every role view (same function as Suivi d'équipe). */
export function buildDashboardSla(
  dossiers: FunnelDossier[],
  chiffrages: DashboardChiffrage[],
  missions: DashboardMission[],
  holidays: ReadonlySet<string> | undefined,
  now: Date,
): SlaItem[] {
  return buildSlaItems(dossiers, chiffrages, missions, holidays, now);
}
