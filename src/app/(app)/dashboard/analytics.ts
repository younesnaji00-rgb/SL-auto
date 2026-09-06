/**
 * Direction / executive analytics — pure metric layer (no React, no Firebase;
 * unit-tested in `__tests__/analytics.test.ts`).
 *
 * Formulas follow docs/research/dashboard-kpi-expansion.md §2 (data model) and
 * §3 (catalogue). Conventions shared by every function:
 *   • `now` is always passed in; a window is `[now − days, now]`;
 *   • the "closed cohort" is the set of dossiers whose `dateRapportDepose`
 *     falls in the window;
 *   • every rate is `{ pct, num, den }` (pct rounded to an integer, null when
 *     den === 0);
 *   • durations are CALENDAR DAYS as floats unless the name says `Hours`, in
 *     which case they are business hours (`businessHoursBetween`, holidays
 *     paused);
 *   • a record with a missing or garbage field is skipped, never thrown on.
 */

import { addDays, addWeeks, format, isSameDay, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { businessHoursBetween } from '@/lib/business-days';
import {
  normalizeExtraColumns,
  parseFr,
  rowTotalHT,
  type DevisExtraColumn,
  type DevisRow,
  type StructuredDevis,
} from '@/lib/devis-schema';
import { parseAccordDocType, parseGarageSlot } from '@/lib/docType-accorde';
import type { FunnelDossier, WorkflowLog } from '../monitoring/funnel';
import { normalizeMissionType, type SlaItem } from '../monitoring/metrics';
import { dossierOwnedBy, isOpenDossier, isQueueChiffrage, toDate, type PersonRef } from './metrics';
import type { DashboardChiffrage, DashboardMission } from './use-dashboard-data';

// ── Primitives ──────────────────────────────────────────────────────────────

export interface Rate {
  pct: number | null;
  num: number;
  den: number;
}

export interface Dist {
  p50: number | null;
  p90: number | null;
  n: number;
  /** Sorted ascending. */
  values: number[];
}

export const rate = (num: number, den: number): Rate => ({
  pct: den > 0 ? Math.round((num / den) * 100) : null,
  num,
  den,
});

/** Linear-interpolation percentile over an ascending-sorted array; `q` in [0, 1]. */
export function percentile(sorted: number[], q: number): number | null {
  const n = sorted.length;
  if (n === 0 || !Number.isFinite(q)) return null;
  const qq = Math.min(1, Math.max(0, q));
  const idx = qq * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function dist(values: number[]): Dist {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  return { p50: percentile(sorted, 0.5), p90: percentile(sorted, 0.9), n: sorted.length, values: sorted };
}

export function inWindow(d: Date | null, from: Date, to: Date): boolean {
  return !!d && d >= from && d <= to;
}

export function windowOf(now: Date, days: number): { from: Date; to: Date } {
  return { from: addDays(now, -days), to: now };
}

/** `(b − a)` in calendar days, null when either end is missing or `b < a`. */
/**
 * Calendar days between two instants, read on the WALL CLOCK.
 *
 * Morocco moves its clock twice a year (out of GMT+1 for Ramadan and back),
 * so two dossiers a month apart can straddle a one-hour shift. Subtracting
 * raw timestamps would make « 40,25 j » print as « 40,29 j » for no reason a
 * reader could explain, and the same dossier would change value depending on
 * when it is looked at. Removing the offset difference keeps a day a day.
 */
export function calDays(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  if (b.getTime() < a.getTime()) return null;
  const offsetShift = (b.getTimezoneOffset() - a.getTimezoneOffset()) * 60_000;
  return (b.getTime() - a.getTime() - offsetShift) / 86_400_000;
}

const NOT_USERS = new Set(['', 'system', 'admin-guest']);

/** A human account, as opposed to the automation / guest identities that write logs. */
export const REAL_USER = (u: string | undefined): boolean =>
  typeof u === 'string' && !NOT_USERS.has(u.trim().toLowerCase());

const norm = (s: unknown): string => (typeof s === 'string' ? s.trim().toLowerCase() : '');
const str = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');
const round2 = (n: number) => Math.round(n * 100) / 100;

export const NON_RENSEIGNE = 'Non renseigné';

const bizHours = (a: Date, b: Date, holidays: ReadonlySet<string>): number => businessHoursBetween(a, b, holidays);

// ── Cohorts and indexes ─────────────────────────────────────────────────────

export const depositAt = (d: FunnelDossier): Date | null => toDate(d.dateRapportDepose);
export const noteAt = (d: FunnelDossier): Date | null => toDate(d.dateNoteHonoraire) ?? toDate(d.noteHonoraireAt);

/** Dossiers whose rapport was déposé in the window. */
export function closedCohort(dossiers: FunnelDossier[], now: Date, days: number): FunnelDossier[] {
  const { from, to } = windowOf(now, days);
  return dossiers.filter((d) => inWindow(depositAt(d), from, to));
}

/** Dossiers created in the window. */
export function createdCohort(dossiers: FunnelDossier[], now: Date, days: number): FunnelDossier[] {
  const { from, to } = windowOf(now, days);
  return dossiers.filter((d) => inWindow(toDate(d.createdAt), from, to));
}

/** Queue chiffrages (with files, dated) per dossier, oldest first — round n = index n − 1. */
export function queueRoundsByDossier(chiffrages: DashboardChiffrage[]): Map<string, DashboardChiffrage[]> {
  const out = new Map<string, DashboardChiffrage[]>();
  for (const c of chiffrages) {
    if (!c || !c.dossierId || !isQueueChiffrage(c) || !toDate(c.createdAt)) continue;
    const arr = out.get(c.dossierId) || [];
    arr.push(c);
    out.set(c.dossierId, arr);
  }
  for (const arr of out.values()) {
    arr.sort((a, b) => toDate(a.createdAt)!.getTime() - toDate(b.createdAt)!.getTime());
  }
  return out;
}

export function missionsByDossier(missions: DashboardMission[]): Map<string, DashboardMission[]> {
  const out = new Map<string, DashboardMission[]>();
  for (const m of missions) {
    if (!m || !m.dossierId) continue;
    const arr = out.get(m.dossierId) || [];
    arr.push(m);
    out.set(m.dossierId, arr);
  }
  return out;
}

/** First planification of a dossier: the earliest `Avant` mission, else the earliest mission of any type. */
export function firstPlanifAt(missions: DashboardMission[] | undefined): Date | null {
  if (!missions || missions.length === 0) return null;
  let avant: Date | null = null;
  let any: Date | null = null;
  for (const m of missions) {
    const at = toDate(m.createdAt);
    if (!at) continue;
    if (!any || at < any) any = at;
    if (normalizeMissionType(m.typeMission) === 'Avant' && (!avant || at < avant)) avant = at;
  }
  return avant ?? any;
}

const PHOTO_FIELD: Record<'Avant' | 'En cours' | 'Après', keyof FunnelDossier> = {
  Avant: 'datePhotosAvant',
  'En cours': 'datePhotosEnCours',
  Après: 'datePhotosApres',
};

// ── Stage ladder (closed cohort) ────────────────────────────────────────────

export type LadderStage =
  | 'requeteCreation'
  | 'creationPlanif'
  | 'planifPhotos'
  | 'photosChiffrage'
  | 'chiffrageAccord'
  | 'accordFacture'
  | 'factureValide'
  | 'valideDepot'
  | 'depotNote';

export const LADDER_STAGES: Array<{ key: LadderStage; label: string }> = [
  { key: 'requeteCreation', label: 'Requête → création' },
  { key: 'creationPlanif', label: 'Création → 1ère planification' },
  { key: 'planifPhotos', label: 'Planification → photos avant' },
  { key: 'photosChiffrage', label: 'Photos avant → envoi au chiffrage' },
  { key: 'chiffrageAccord', label: 'Chiffrage → 1er accord' },
  { key: 'accordFacture', label: '1er accord → facture validée' },
  { key: 'factureValide', label: 'Facture → rapport validé' },
  { key: 'valideDepot', label: 'Rapport validé → déposé' },
  { key: 'depotNote', label: 'Dépôt → note d’honoraire' },
];

export interface LadderRow {
  key: LadderStage;
  label: string;
  /** Calendar days. */
  dist: Dist;
}

export interface StagePoints {
  requete: Date | null;
  creation: Date | null;
  planif: Date | null;
  photosAvant: Date | null;
  envoiChiffrage: Date | null;
  accord: Date | null;
  facture: Date | null;
  valide: Date | null;
  depot: Date | null;
  note: Date | null;
}

/** Every milestone of a dossier the ladder reads, or null when it does not exist. */
export function stagePoints(
  d: FunnelDossier,
  rounds: Map<string, DashboardChiffrage[]>,
  missions: Map<string, DashboardMission[]>,
): StagePoints {
  const firstQueue = rounds.get(d.id)?.[0];
  return {
    requete: toDate(d.dateRequete),
    creation: toDate(d.createdAt),
    planif: firstPlanifAt(missions.get(d.id)),
    photosAvant: toDate(d.datePhotosAvant),
    envoiChiffrage: firstQueue ? toDate(firstQueue.createdAt) : null,
    accord: toDate(d.firstAccordReachedAt),
    facture: toDate(d.dateFactureValide),
    valide: toDate(d.directorValidated?.at),
    depot: depositAt(d),
    note: noteAt(d),
  };
}

const STAGE_ENDS: Record<LadderStage, [keyof StagePoints, keyof StagePoints]> = {
  requeteCreation: ['requete', 'creation'],
  creationPlanif: ['creation', 'planif'],
  planifPhotos: ['planif', 'photosAvant'],
  photosChiffrage: ['photosAvant', 'envoiChiffrage'],
  chiffrageAccord: ['envoiChiffrage', 'accord'],
  accordFacture: ['accord', 'facture'],
  factureValide: ['facture', 'valide'],
  valideDepot: ['valide', 'depot'],
  depotNote: ['depot', 'note'],
};

export function stageLadder(
  dossiers: FunnelDossier[],
  chiffrages: DashboardChiffrage[],
  missions: DashboardMission[],
  now: Date,
  days: number,
): LadderRow[] {
  const rounds = queueRoundsByDossier(chiffrages);
  const byDossier = missionsByDossier(missions);
  const points = closedCohort(dossiers, now, days).map((d) => stagePoints(d, rounds, byDossier));
  return LADDER_STAGES.map(({ key, label }) => {
    const [a, b] = STAGE_ENDS[key];
    const values: number[] = [];
    for (const p of points) {
      const v = calDays(p[a], p[b]);
      if (v != null) values.push(v);
    }
    return { key, label, dist: dist(values) };
  });
}

// ── Lead times ──────────────────────────────────────────────────────────────

export interface LeadTimes {
  requeteRapport: Dist;
  sinistreRequete: Dist;
  sinistreRapport: Dist;
  /** Size of the closed cohort. */
  n: number;
}

const sinistreAt = (d: FunnelDossier): Date | null => toDate((d as any).dateSinistre);

export function leadTimes(dossiers: FunnelDossier[], now: Date, days: number): LeadTimes {
  const cohort = closedCohort(dossiers, now, days);
  const rr: number[] = [];
  const sr: number[] = [];
  const sd: number[] = [];
  for (const d of cohort) {
    const requete = toDate(d.dateRequete);
    const depot = depositAt(d);
    const sinistre = sinistreAt(d);
    const a = calDays(requete, depot);
    const b = calDays(sinistre, requete);
    const c = calDays(sinistre, depot);
    if (a != null) rr.push(a);
    if (b != null) sr.push(b);
    if (c != null) sd.push(c);
  }
  return { requeteRapport: dist(rr), sinistreRequete: dist(sr), sinistreRapport: dist(sd), n: cohort.length };
}

/** Rapport déposé within 48 h ouvrées of the facture validée (BCA's published engagement). */
export function factureToDepot48(dossiers: FunnelDossier[], holidays: ReadonlySet<string>, now: Date, days: number): Rate {
  let num = 0;
  let den = 0;
  for (const d of closedCohort(dossiers, now, days)) {
    const facture = toDate(d.dateFactureValide);
    const depot = depositAt(d);
    if (!facture || !depot || depot < facture) continue;
    den += 1;
    if (bizHours(facture, depot, holidays) <= 48) num += 1;
  }
  return rate(num, den);
}

export interface UnbilledItem {
  dossier: FunnelDossier;
  daysSinceDepot: number;
}

/** Deposited dossiers without a note d'honoraire for more than `minDays`, oldest first. */
export function unbilled(dossiers: FunnelDossier[], now: Date, minDays = 30): UnbilledItem[] {
  const out: UnbilledItem[] = [];
  for (const d of dossiers) {
    const depot = depositAt(d);
    if (!depot || noteAt(d)) continue;
    const age = calDays(depot, now);
    if (age == null || age <= minDays) continue;
    out.push({ dossier: d, daysSinceDepot: age });
  }
  return out.sort((a, b) => b.daysSinceDepot - a.daysSinceDepot);
}

// ── Weekly flow ─────────────────────────────────────────────────────────────

export interface WeekFlow {
  weekStart: Date;
  /** `d MMM` (fr) of the week start. */
  label: string;
  recus: number;
  termines: number;
}

/** Weekly intake / closings, oldest first; the last entry is the current (incomplete) week. */
export function weeklyFlow(dossiers: FunnelDossier[], now: Date, weeks = 13): WeekFlow[] {
  const current = startOfWeek(now, { weekStartsOn: 1 });
  const created = dossiers.map((d) => toDate(d.createdAt)).filter((x): x is Date => !!x);
  const deposited = dossiers.map(depositAt).filter((x): x is Date => !!x);
  const out: WeekFlow[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addWeeks(current, -i);
    const weekEnd = addWeeks(weekStart, 1);
    const within = (x: Date) => x >= weekStart && x < weekEnd;
    out.push({
      weekStart,
      label: format(weekStart, 'd MMM', { locale: fr }),
      recus: created.filter(within).length,
      termines: deposited.filter(within).length,
    });
  }
  return out;
}

/** Σ terminés / Σ reçus over the completed weeks (the current week is excluded). */
export function closingRatio(flow: WeekFlow[]): number | null {
  const done = flow.slice(0, -1);
  const recus = done.reduce((n, w) => n + w.recus, 0);
  const termines = done.reduce((n, w) => n + w.termines, 0);
  return recus > 0 ? round2(termines / recus) : null;
}

// ── Quality of chiffrage (queue rounds) ─────────────────────────────────────

export interface FirstPass {
  /** Dossiers whose first queue chiffrage was never revised (1 − revised / all). */
  rate: Rate;
  /** Dossiers that reached a 3rd round. */
  thirdRound: Rate;
}

/** Dossiers whose FIRST queue chiffrage was created in the window, with their round count. */
function roundCounts(
  chiffrages: DashboardChiffrage[],
  now: Date,
  days: number,
  filter?: (dossierId: string) => boolean,
): Map<string, number> {
  const { from, to } = windowOf(now, days);
  const out = new Map<string, number>();
  for (const [dossierId, arr] of queueRoundsByDossier(chiffrages)) {
    if (filter && !filter(dossierId)) continue;
    if (!inWindow(toDate(arr[0].createdAt), from, to)) continue;
    out.set(dossierId, arr.length);
  }
  return out;
}

export function firstPass(
  chiffrages: DashboardChiffrage[],
  now: Date,
  days: number,
  filter?: (dossierId: string) => boolean,
): FirstPass {
  const counts = roundCounts(chiffrages, now, days, filter);
  const den = counts.size;
  let revised = 0;
  let third = 0;
  for (const n of counts.values()) {
    if (n >= 2) revised += 1;
    if (n >= 3) third += 1;
  }
  return { rate: rate(den - revised, den), thirdRound: rate(third, den) };
}

export interface GroupRate {
  key: string;
  label: string;
  rate: Rate;
  n: number;
}

/** First-pass rate per garage / compagnie / nature of the dossier; sorted by n desc; empty keys skipped. */
export function firstPassBy(
  chiffrages: DashboardChiffrage[],
  dossiers: FunnelDossier[],
  now: Date,
  days: number,
  by: 'garageName' | 'compagnie' | 'nature',
): GroupRate[] {
  const byId = new Map(dossiers.map((d) => [d.id, d]));
  const counts = roundCounts(chiffrages, now, days);
  const groups = new Map<string, { label: string; n: number; clean: number }>();
  for (const [dossierId, rounds] of counts) {
    const raw = str((byId.get(dossierId) as any)?.[by]);
    const key = raw.toLowerCase();
    if (!key) continue;
    const g = groups.get(key) || { label: raw, n: 0, clean: 0 };
    g.n += 1;
    if (rounds < 2) g.clean += 1;
    groups.set(key, g);
  }
  return Array.from(groups.entries())
    .map(([key, g]) => ({ key, label: g.label, rate: rate(g.clean, g.n), n: g.n }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'fr'));
}

/** Business hours from assignment to completion of every round ≥ 2 completed in the window. */
export function revisionCycleHours(
  chiffrages: DashboardChiffrage[],
  holidays: ReadonlySet<string>,
  now: Date,
  days: number,
): Dist {
  const { from, to } = windowOf(now, days);
  const values: number[] = [];
  for (const arr of queueRoundsByDossier(chiffrages).values()) {
    arr.forEach((c, idx) => {
      if (idx < 1) return;
      const start = toDate(c.createdAt);
      const done = toDate(c.completedAt);
      if (!start || !done || !inWindow(done, from, to) || done < start) return;
      values.push(bizHours(start, done, holidays));
    });
  }
  return dist(values);
}

// ── Devis lines (structuredEditables) ───────────────────────────────────────

export interface DevisLineStats {
  rows: number;
  /** observation ∈ {non_accorde, hors_sinistre}. */
  ecartees: number;
  reparation: number;
  remplacement: number;
  originale: number;
  adaptable: number;
  occasion: number;
  /** Σ rowTotalHT over every counted snapshot. */
  devisHT: number;
  /** Σ rowTotalHT over the dossiers that carry an accord column (the economie base). */
  devisHTWithAccord: number;
  /** Σ accord values over those dossiers; null when none carries an accord column. */
  accordHT: number | null;
  /** Dossiers whose snapshot carries an accord column with at least one value. */
  withAccord: number;
  /** Dossiers counted (one snapshot each). */
  dossiers: number;
}

const ECARTEE = new Set(['non_accorde', 'hors_sinistre']);

/**
 * Rank a `structuredEditables` key: accord types first (higher ordinal wins),
 * then propositions, then anything else mentioning "accord", then the Devis
 * Garage sources. Facture families and unknown keys are ignored (< 0).
 */
export function devisKeyRank(key: string): number {
  const k = str(key);
  if (!k) return -1;
  const parsed = parseAccordDocType(k);
  if (parsed) {
    if (parsed.sourceDocType !== 'Devis Garage') return -1;
    const base = parsed.kind === 'accord' ? 3000 : 2000;
    return base + parsed.ordinal * 10 + parsed.parentOrdinal;
  }
  const lower = k.toLowerCase();
  if (lower.includes('facture')) return -1;
  if (lower.includes('accord')) {
    const ord = /(\d+)\s*(?:er|ère|ere|ème|eme|e)\b/i.exec(k);
    return 1000 + (ord ? parseInt(ord[1], 10) : 1) * 10;
  }
  const garage = parseGarageSlot(k);
  if (garage) return garage.sourceDocType === 'Devis Garage' ? 100 + garage.ordinal : -1;
  return lower.includes('devis') ? 50 : -1;
}

/** The accord column of a snapshot: kind 'accord', else 'proposition-accord', else a legacy column labelled « accord ». */
export function accordColumnOf(snapshot: StructuredDevis | undefined | null): DevisExtraColumn | null {
  if (!snapshot) return null;
  let cols: DevisExtraColumn[] = [];
  try {
    cols = normalizeExtraColumns(snapshot);
  } catch {
    return null;
  }
  return (
    cols.find((c) => c.kind === 'accord') ??
    cols.find((c) => c.kind === 'proposition-accord') ??
    cols.find((c) => c.kind === 'default' && /accord/i.test(c.label)) ??
    null
  );
}

/** The most authoritative devis snapshot of an assignment (latest accord, else the garage source). */
export function latestDevisSnapshot(
  c: DashboardChiffrage,
): { rows: DevisRow[]; accord: DevisExtraColumn | null; docType: string } | null {
  const editables = c?.structuredEditables;
  if (!editables || typeof editables !== 'object') return null;
  let best: { rank: number; docType: string; snapshot: StructuredDevis } | null = null;
  for (const [docType, snapshot] of Object.entries(editables)) {
    if (!snapshot || !Array.isArray(snapshot.rows) || snapshot.rows.length === 0) continue;
    const rank = devisKeyRank(docType);
    if (rank < 0) continue;
    if (!best || rank > best.rank) best = { rank, docType, snapshot };
  }
  if (!best) return null;
  const rows = best.snapshot.rows.filter((r) => !!r && typeof r === 'object');
  if (rows.length === 0) return null;
  return { rows, accord: accordColumnOf(best.snapshot), docType: best.docType };
}

const chiffrageDoneAt = (c: DashboardChiffrage): Date | null => toDate(c.completedAt) ?? toDate(c.createdAt);

export function devisLineStats(
  chiffrages: DashboardChiffrage[],
  now: Date,
  days: number,
  filter?: (c: DashboardChiffrage) => boolean,
): DevisLineStats {
  const { from, to } = windowOf(now, days);
  // One snapshot per dossier: the latest assignment (by completedAt ?? createdAt) that carries one.
  const latest = new Map<string, { at: Date; snap: NonNullable<ReturnType<typeof latestDevisSnapshot>> }>();
  for (const c of chiffrages) {
    if (!c || !c.dossierId) continue;
    if (filter && !filter(c)) continue;
    const at = chiffrageDoneAt(c);
    if (!inWindow(at, from, to)) continue;
    const snap = latestDevisSnapshot(c);
    if (!snap) continue;
    const prev = latest.get(c.dossierId);
    if (!prev || at! > prev.at) latest.set(c.dossierId, { at: at!, snap });
  }

  const s: DevisLineStats = {
    rows: 0,
    ecartees: 0,
    reparation: 0,
    remplacement: 0,
    originale: 0,
    adaptable: 0,
    occasion: 0,
    devisHT: 0,
    devisHTWithAccord: 0,
    accordHT: null,
    withAccord: 0,
    dossiers: latest.size,
  };
  let accordHT = 0;
  for (const { snap } of latest.values()) {
    let devisHT = 0;
    for (const r of snap.rows) {
      s.rows += 1;
      devisHT += rowTotalHT(r);
      if (ECARTEE.has(norm(r.observation))) s.ecartees += 1;
      const ref = norm(r.ref);
      if (ref === 'réparation' || ref === 'reparation') s.reparation += 1;
      else if (ref === 'remplacement') {
        s.remplacement += 1;
        const type = norm(r.type);
        if (type === 'originale') s.originale += 1;
        else if (type === 'adaptable') s.adaptable += 1;
        else if (type === 'occasion') s.occasion += 1;
      }
    }
    s.devisHT += devisHT;
    if (snap.accord) {
      const values = snap.accord.values || {};
      let sum = 0;
      let seen = 0;
      for (const r of snap.rows) {
        const v = values[r.id];
        if (typeof v !== 'string' || v.trim() === '') continue;
        seen += 1;
        sum += parseFr(v);
      }
      if (seen > 0) {
        s.withAccord += 1;
        s.devisHTWithAccord += devisHT;
        accordHT += sum;
      }
    }
  }
  s.accordHT = s.withAccord > 0 ? accordHT : null;
  return s;
}

export function devisRates(s: DevisLineStats): {
  ecartees: Rate;
  reparation: Rate;
  originale: Rate;
  adaptable: Rate;
  occasion: Rate;
  economiePct: number | null;
  economieHT: number | null;
} {
  const economieHT = s.withAccord > 0 && s.accordHT != null ? round2(s.devisHTWithAccord - s.accordHT) : null;
  const economiePct =
    economieHT != null && s.devisHTWithAccord > 0 ? Math.round((economieHT / s.devisHTWithAccord) * 100) : null;
  return {
    ecartees: rate(s.ecartees, s.rows),
    reparation: rate(s.reparation, s.rows),
    originale: rate(s.originale, s.remplacement),
    adaptable: rate(s.adaptable, s.remplacement),
    occasion: rate(s.occasion, s.remplacement),
    economiePct,
    economieHT,
  };
}

// ── Portfolio ───────────────────────────────────────────────────────────────

export interface GroupCount {
  key: string;
  label: string;
  count: number;
  /** 0–100, rounded. */
  share: number;
}

/** Key/label of a free-text grouping field; empty → « Non renseigné ». */
const groupKey = (raw: unknown): { key: string; label: string } => {
  const label = str(raw) || NON_RENSEIGNE;
  return { key: label.toLowerCase(), label };
};

export function countBy(
  dossiers: FunnelDossier[],
  field: 'compagnie' | 'nature' | 'typeDossier' | 'intermediaireNom' | 'garageName',
  now: Date,
  days: number,
  dateField: 'createdAt' | 'dateRapportDepose' = 'createdAt',
): GroupCount[] {
  const cohort = dateField === 'createdAt' ? createdCohort(dossiers, now, days) : closedCohort(dossiers, now, days);
  const groups = new Map<string, { label: string; count: number }>();
  for (const d of cohort) {
    const { key, label } = groupKey((d as any)[field]);
    const g = groups.get(key) || { label, count: 0 };
    g.count += 1;
    groups.set(key, g);
  }
  const total = cohort.length;
  return Array.from(groups.entries())
    .map(([key, g]) => ({ key, label: g.label, count: g.count, share: total ? Math.round((g.count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));
}

const natureOf = (d: FunnelDossier): string => norm((d as any).nature);

export function eadShare(dossiers: FunnelDossier[], now: Date, days: number): Rate {
  const cohort = createdCohort(dossiers, now, days);
  return rate(cohort.filter((d) => natureOf(d) === 'ead').length, cohort.length);
}

/** Vehicle age bands in years (inclusive `from`, exclusive `to`). */
export const AGE_BANDS: Array<{ key: string; label: string; from: number; to: number | null }> = [
  { key: '0-3', label: '0–3', from: 0, to: 4 },
  { key: '4-7', label: '4–7', from: 4, to: 8 },
  { key: '8-12', label: '8–12', from: 8, to: 13 },
  { key: '12+', label: '> 12', from: 13, to: null },
];

/** Parse a mise-en-circulation value: Date / Timestamp / 'YYYY-MM-DD' / 'DD/MM/YYYY' / 'MM/YYYY' / 'YYYY'. */
export function parseMec(v: any): Date | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string') {
    const s = v.trim();
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    m = /^(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) return new Date(+m[2], +m[1] - 1, 1);
    m = /^(\d{4})$/.exec(s);
    if (m) return new Date(+m[1], 0, 1);
    m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, m[3] ? +m[3] : 1);
    return toDate(s);
  }
  if (typeof v === 'number') {
    if (v >= 1900 && v <= 2200) return new Date(v, 0, 1);
    return toDate(new Date(v));
  }
  return toDate(v);
}

/** Whole years since `vehicule.mec`; null when unparseable or absurd (< 0 or > 60). */
export function vehicleAgeYears(d: any, now: Date): number | null {
  const mec = parseMec(d?.vehicule?.mec);
  if (!mec) return null;
  const years = Math.floor((now.getTime() - mec.getTime()) / (365.25 * 86_400_000));
  if (!Number.isFinite(years) || years < 0 || years > 60) return null;
  return years;
}

export const ageBandOf = (years: number | null) =>
  years == null ? null : (AGE_BANDS.find((b) => years >= b.from && (b.to == null || years < b.to)) ?? null);

export interface ReformeStats {
  rate: Rate;
  byAge: Array<{ key: string; label: string; rate: Rate }>;
  byMarque: GroupRate[];
}

export const isReforme = (d: FunnelDossier): boolean => natureOf(d) === 'réforme' || norm(d.statut) === 'réforme';

export function reformeStats(dossiers: FunnelDossier[], now: Date, days: number): ReformeStats {
  const cohort = createdCohort(dossiers, now, days);
  const ages = AGE_BANDS.map((b) => ({ key: b.key, label: b.label, num: 0, den: 0 }));
  const marques = new Map<string, { label: string; n: number; num: number }>();
  let num = 0;
  for (const d of cohort) {
    const ref = isReforme(d);
    if (ref) num += 1;
    const band = ageBandOf(vehicleAgeYears(d, now));
    if (band) {
      const row = ages.find((a) => a.key === band.key)!;
      row.den += 1;
      if (ref) row.num += 1;
    }
    const raw = str((d as any)?.vehicule?.marque);
    if (raw) {
      const key = raw.toLowerCase();
      const g = marques.get(key) || { label: raw, n: 0, num: 0 };
      g.n += 1;
      if (ref) g.num += 1;
      marques.set(key, g);
    }
  }
  return {
    rate: rate(num, cohort.length),
    byAge: ages.map((a) => ({ key: a.key, label: a.label, rate: rate(a.num, a.den) })),
    byMarque: Array.from(marques.entries())
      .map(([key, g]) => ({ key, label: g.label, rate: rate(g.num, g.n), n: g.n }))
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'fr'))
      .slice(0, 8),
  };
}

const CONTRADICTOIRE = new Set(['contradictoire 1er', 'contradictoire 2ème', 'arbitrage', 'collégiale']);

export function contradictoireShare(dossiers: FunnelDossier[], now: Date, days: number): Rate {
  const cohort = createdCohort(dossiers, now, days);
  return rate(cohort.filter((d) => CONTRADICTOIRE.has(natureOf(d))).length, cohort.length);
}

// ── Per compagnie table ─────────────────────────────────────────────────────

export interface CompagnieRow {
  key: string;
  label: string;
  /** Created in the window. */
  volume: number;
  share: number;
  /** Open right now. */
  enCours: number;
  /** Requête → rapport déposé, closed cohort, calendar days. */
  delaiP50: number | null;
  delaiP90: number | null;
  sinistreRequeteP50: number | null;
  slaOnTime: Rate;
  firstPass: Rate;
  ead: Rate;
}

/** SLA clocks closed in the window that were on time. */
export function slaOnTimeRate(sla: SlaItem[], now: Date, days: number, filter?: (it: SlaItem) => boolean): Rate {
  const { from, to } = windowOf(now, days);
  let num = 0;
  let den = 0;
  for (const it of sla) {
    if (!it || !inWindow(it.doneAt, from, to)) continue;
    if (filter && !filter(it)) continue;
    den += 1;
    if (!it.late) num += 1;
  }
  return rate(num, den);
}

export function compagnieTable(
  dossiers: FunnelDossier[],
  chiffrages: DashboardChiffrage[],
  sla: SlaItem[],
  now: Date,
  days: number,
): CompagnieRow[] {
  const groups = new Map<string, { label: string; all: FunnelDossier[] }>();
  for (const d of dossiers) {
    const { key, label } = groupKey(d.compagnie);
    const g = groups.get(key) || { label, all: [] };
    g.all.push(d);
    groups.set(key, g);
  }
  const totalCreated = createdCohort(dossiers, now, days).length;
  const rows: CompagnieRow[] = [];
  for (const [key, g] of groups) {
    const created = createdCohort(g.all, now, days);
    const enCours = g.all.filter(isOpenDossier).length;
    const lead = leadTimes(g.all, now, days);
    if (created.length === 0 && enCours === 0 && lead.n === 0) continue;
    const ids = new Set(g.all.map((d) => d.id));
    rows.push({
      key,
      label: g.label,
      volume: created.length,
      share: totalCreated ? Math.round((created.length / totalCreated) * 100) : 0,
      enCours,
      delaiP50: lead.requeteRapport.p50,
      delaiP90: lead.requeteRapport.p90,
      sinistreRequeteP50: lead.sinistreRequete.p50,
      slaOnTime: slaOnTimeRate(sla, now, days, (it) => ids.has(it.dossier?.id)),
      firstPass: firstPass(chiffrages, now, days, (id) => ids.has(id)).rate,
      ead: eadShare(g.all, now, days),
    });
  }
  return rows.sort((a, b) => b.volume - a.volume || b.enCours - a.enCours || a.label.localeCompare(b.label, 'fr'));
}

// ── Terrain quality ─────────────────────────────────────────────────────────

export interface TerrainQuality {
  /** Photos taken on the RDV day, among done missions with a RDV. */
  visiteJourRdv: Rate;
  /** Check-in present, among done missions. */
  pointageGps: Rate;
  /** Missions created in the window that were deactivated or superseded by a later mission of the same type. */
  replanifiees: Rate;
  /** Calendar days from planification to RDV. */
  preavis: Dist;
  /** Business hours from planification to photos. */
  photosDelaiHours: Dist;
}

export function terrainQuality(
  missions: DashboardMission[],
  dossiers: FunnelDossier[],
  holidays: ReadonlySet<string>,
  now: Date,
  days: number,
  filter?: (m: DashboardMission) => boolean,
): TerrainQuality {
  const { from, to } = windowOf(now, days);
  const byId = new Map(dossiers.map((d) => [d.id, d]));
  const all = missions.filter((m) => !!m && !!m.dossierId);
  const mine = filter ? all.filter(filter) : all;

  let jourDen = 0;
  let jourNum = 0;
  let doneN = 0;
  let pointage = 0;
  let replDen = 0;
  let replNum = 0;
  const preavis: number[] = [];
  const photosHours: number[] = [];

  for (const m of mine) {
    const type = normalizeMissionType(m.typeMission);
    const start = toDate(m.createdAt);
    const rdv = toDate(m.dateRDV);
    const dossier = byId.get(m.dossierId);

    if (start && inWindow(start, from, to)) {
      replDen += 1;
      const superseded =
        m.active === false ||
        all.some(
          (o) =>
            o !== m &&
            o.id !== m.id &&
            o.dossierId === m.dossierId &&
            normalizeMissionType(o.typeMission) === type &&
            (toDate(o.createdAt)?.getTime() ?? -1) > start.getTime(),
        );
      if (superseded) replNum += 1;
      const pre = calDays(start, rdv);
      if (pre != null) preavis.push(pre);
    }

    if (m.active === false || !type || !dossier || !start) continue;
    const photo = toDate((dossier as any)[PHOTO_FIELD[type]]);
    if (!photo || photo < start || !inWindow(photo, from, to)) continue;
    doneN += 1;
    if (toDate(m.checkinAt)) pointage += 1;
    if (rdv) {
      jourDen += 1;
      if (isSameDay(rdv, photo)) jourNum += 1;
    }
    photosHours.push(bizHours(start, photo, holidays));
  }

  return {
    visiteJourRdv: rate(jourNum, jourDen),
    pointageGps: rate(pointage, doneN),
    replanifiees: rate(replNum, replDen),
    preavis: dist(preavis),
    photosDelaiHours: dist(photosHours),
  };
}

// ── Touches ─────────────────────────────────────────────────────────────────

/** Distinct human users who logged on each closed dossier (dossiers with no log are skipped). */
export function touchesPerDossier(logs: WorkflowLog[], dossiers: FunnelDossier[], now: Date, days: number): Dist {
  const cohort = new Set(closedCohort(dossiers, now, days).map((d) => d.id));
  const users = new Map<string, Set<string>>();
  for (const l of logs) {
    const id = l?._dossierId;
    if (!id || !cohort.has(id) || !REAL_USER(l.user)) continue;
    const set = users.get(id) || new Set<string>();
    set.add(l.user!.trim().toLowerCase());
    users.set(id, set);
  }
  return dist(Array.from(users.values()).map((s) => s.size));
}

// ── Intake heat ─────────────────────────────────────────────────────────────

export interface HeatCell {
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  /** 8 … 19. */
  hour: number;
  count: number;
}

export const HEAT_HOURS = { from: 8, to: 19 } as const;

export function intakeHeat(dossiers: FunnelDossier[], now: Date, days: number): { cells: HeatCell[]; max: number } {
  const cells: HeatCell[] = [];
  const index = new Map<string, HeatCell>();
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = HEAT_HOURS.from; hour <= HEAT_HOURS.to; hour++) {
      const cell = { weekday, hour, count: 0 };
      cells.push(cell);
      index.set(`${weekday}:${hour}`, cell);
    }
  }
  let max = 0;
  for (const d of createdCohort(dossiers, now, days)) {
    const at = toDate(d.createdAt)!;
    const cell = index.get(`${(at.getDay() + 6) % 7}:${at.getHours()}`);
    if (!cell) continue;
    cell.count += 1;
    if (cell.count > max) max = cell.count;
  }
  return { cells, max };
}

// ── Gestionnaire hand-off ───────────────────────────────────────────────────

export interface HandoffItem {
  dossier: FunnelDossier;
  /** Business hours since the photos avant. */
  sinceHours: number;
}

/** Open dossiers with photos avant and no queue chiffrage yet — the hand-off no clock covers; oldest first. */
export function photosToChiffrageOpen(
  dossiers: FunnelDossier[],
  chiffrages: DashboardChiffrage[],
  holidays: ReadonlySet<string>,
  now: Date,
  person?: PersonRef | null,
): HandoffItem[] {
  const rounds = queueRoundsByDossier(chiffrages);
  const out: HandoffItem[] = [];
  for (const d of dossiers) {
    if (!isOpenDossier(d) || rounds.has(d.id)) continue;
    if (person && !dossierOwnedBy(d as any, person)) continue;
    const photos = toDate(d.datePhotosAvant);
    if (!photos) continue;
    out.push({ dossier: d, sinceHours: bizHours(photos, now, holidays) });
  }
  return out.sort((a, b) => b.sinceHours - a.sinceHours);
}

/** Dossiers created in the window whose first planification came within 24 h ouvrées. */
export function creationToPlanif24(
  dossiers: FunnelDossier[],
  missions: DashboardMission[],
  holidays: ReadonlySet<string>,
  now: Date,
  days: number,
  person?: PersonRef | null,
): Rate {
  const byDossier = missionsByDossier(missions);
  let num = 0;
  let den = 0;
  for (const d of createdCohort(dossiers, now, days)) {
    if (person && !dossierOwnedBy(d as any, person)) continue;
    const created = toDate(d.createdAt)!;
    const planif = firstPlanifAt(byDossier.get(d.id));
    if (!planif) continue;
    den += 1;
    if (bizHours(created, planif, holidays) <= 24) num += 1;
  }
  return rate(num, den);
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface DirectionInput {
  dossiers: FunnelDossier[];
  chiffrages: DashboardChiffrage[];
  missions: DashboardMission[];
  workflowLogs: WorkflowLog[];
  sla: SlaItem[];
  holidays: ReadonlySet<string>;
}

export interface DirectionView {
  days: number;
  window: { from: Date; to: Date };
  lead: LeadTimes;
  ladder: LadderRow[];
  flow: WeekFlow[];
  closing: number | null;
  firstPass: FirstPass;
  firstPassByCompagnie: GroupRate[];
  firstPassByGarage: GroupRate[];
  revisionHours: Dist;
  devis: DevisLineStats;
  devisRates: ReturnType<typeof devisRates>;
  compagnies: CompagnieRow[];
  natures: GroupCount[];
  ead: Rate;
  reforme: ReformeStats;
  contradictoire: Rate;
  terrain: TerrainQuality;
  touches: Dist;
  facture48: Rate;
  unbilled: UnbilledItem[];
  heat: ReturnType<typeof intakeHeat>;
  slaOnTime: Rate;
  enCours: number;
  recus: number;
  termines: number;
  recusPrev: number;
  terminesPrev: number;
}

export function computeDirectionView(input: DirectionInput, now: Date, days: number): DirectionView {
  const dossiers = Array.isArray(input.dossiers) ? input.dossiers.filter((d) => !!d && !!d.id) : [];
  const chiffrages = Array.isArray(input.chiffrages) ? input.chiffrages.filter(Boolean) : [];
  const missions = Array.isArray(input.missions) ? input.missions.filter(Boolean) : [];
  const logs = Array.isArray(input.workflowLogs) ? input.workflowLogs.filter(Boolean) : [];
  const sla = Array.isArray(input.sla) ? input.sla.filter(Boolean) : [];
  const holidays = input.holidays ?? new Set<string>();

  const window = windowOf(now, days);
  const prevNow = new Date(window.from.getTime() - 1);
  const devis = devisLineStats(chiffrages, now, days);

  return {
    days,
    window,
    lead: leadTimes(dossiers, now, days),
    ladder: stageLadder(dossiers, chiffrages, missions, now, days),
    flow: weeklyFlow(dossiers, now),
    closing: closingRatio(weeklyFlow(dossiers, now)),
    firstPass: firstPass(chiffrages, now, days),
    firstPassByCompagnie: firstPassBy(chiffrages, dossiers, now, days, 'compagnie'),
    firstPassByGarage: firstPassBy(chiffrages, dossiers, now, days, 'garageName'),
    revisionHours: revisionCycleHours(chiffrages, holidays, now, days),
    devis,
    devisRates: devisRates(devis),
    compagnies: compagnieTable(dossiers, chiffrages, sla, now, days),
    natures: countBy(dossiers, 'nature', now, days),
    ead: eadShare(dossiers, now, days),
    reforme: reformeStats(dossiers, now, days),
    contradictoire: contradictoireShare(dossiers, now, days),
    terrain: terrainQuality(missions, dossiers, holidays, now, days),
    touches: touchesPerDossier(logs, dossiers, now, days),
    facture48: factureToDepot48(dossiers, holidays, now, days),
    unbilled: unbilled(dossiers, now),
    heat: intakeHeat(dossiers, now, days),
    slaOnTime: slaOnTimeRate(sla, now, days),
    enCours: dossiers.filter(isOpenDossier).length,
    recus: createdCohort(dossiers, now, days).length,
    termines: closedCohort(dossiers, now, days).length,
    recusPrev: createdCohort(dossiers, prevNow, days).length,
    terminesPrev: closedCohort(dossiers, prevNow, days).length,
  };
}
