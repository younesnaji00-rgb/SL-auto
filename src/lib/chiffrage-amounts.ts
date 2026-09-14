/**
 * chiffrage-amounts — the two figures the phone chiffrage screens print
 * (mobile redesign 2026-09-14, `Phone.dc.html` « Montant chiffré » card):
 *
 *   - `devisTTC`  — the garage's devis total: Σ TTC of the source snapshot's
 *                   rows (`structuredEditables[parent]`, the gestionnaire-built
 *                   or AI-extracted table the editor opens on).
 *   - `accordTTC` — what the chiffreur chiffré: the accord / proposition
 *                   column of the highest-ranked accord snapshot, summed the
 *                   way the editor's « Total TTC Expert » is
 *                   (`accordRowTotalHT(pu, qte, vétusté)` × (1 + TVA)).
 *
 * Read-only: the amounts are DERIVED from what the devis editor persisted —
 * nothing here writes. Pure so both the queue card and the detail card use the
 * same arithmetic.
 */

import { parseAccordDocType } from './docType-accorde';
import {
  accordRowTotalHT,
  formatFr,
  normalizeExtraColumns,
  parseFr,
  sumTTC,
  type DevisExtraColumn,
  type DevisRow,
  type DevisSnapshot,
} from './devis-schema';

export interface ChiffrageAmounts {
  /** Garage devis total TTC, null when no structured source rows exist. */
  devisTTC: number | null;
  /** Chiffreur's accord total TTC, null when no accord column carries a value. */
  accordTTC: number | null;
  /** The `structuredEditables` key the accord total came from (« Devis accordé », « Devis 2ème accord »…). */
  accordDocType: string | null;
}

const EMPTY: ChiffrageAmounts = { devisTTC: null, accordTTC: null, accordDocType: null };

function rowsOf(snapshot: unknown): DevisRow[] {
  const rows = (snapshot as DevisSnapshot | undefined)?.rows;
  return Array.isArray(rows) ? rows.filter((r) => !!r && typeof r === 'object') : [];
}

/** kind 'accord', else 'proposition-accord', else a legacy column labelled « accord ». */
function accordColumnOf(snapshot: unknown): DevisExtraColumn | null {
  let cols: DevisExtraColumn[] = [];
  try {
    cols = normalizeExtraColumns(snapshot as DevisSnapshot);
  } catch {
    return null;
  }
  return (
    cols.find((c) => c.kind === 'accord') ??
    cols.find((c) => c.kind === 'proposition-accord') ??
    cols.find((c) => (c.kind === 'default' || !c.kind) && /accord/i.test(c.label)) ??
    null
  );
}

function accordTotalTTC(rows: DevisRow[], col: DevisExtraColumn): number | null {
  const values = col.values || {};
  let any = false;
  let sum = 0;
  for (const r of rows) {
    const raw = values[r.id];
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    any = true;
    const pu = parseFr(String(raw));
    const qte = typeof r.qte === 'number' && Number.isFinite(r.qte) ? r.qte : 0;
    const vetuste = typeof r.vetuste === 'number' && Number.isFinite(r.vetuste) ? r.vetuste : 0;
    const tva = typeof r.tva === 'number' && Number.isFinite(r.tva) ? r.tva : 0;
    sum += accordRowTotalHT(pu, qte, vetuste) * (1 + tva / 100);
  }
  return any ? sum : null;
}

/**
 * Amounts of one chiffrage source (`parent` = « Devis Garage », « Devis Garage 2 »…).
 * Accepts the raw `structuredEditables` map of a chiffrage document.
 */
export function chiffrageAmounts(
  structuredEditables: Record<string, unknown> | null | undefined,
  parent = 'Devis Garage',
): ChiffrageAmounts {
  if (!structuredEditables || typeof structuredEditables !== 'object') return EMPTY;

  const sourceRows = rowsOf(structuredEditables[parent]);
  const devisTTC = sourceRows.length > 0 ? sumTTC(sourceRows) : null;

  // Highest-ranked accord snapshot of this parent that actually carries values.
  let best: { rank: number; key: string; total: number } | null = null;
  for (const [key, snapshot] of Object.entries(structuredEditables)) {
    const parsed = parseAccordDocType(key);
    if (!parsed || parsed.parent !== parent) continue;
    const rows = rowsOf(snapshot);
    if (rows.length === 0) continue;
    const col = accordColumnOf(snapshot);
    if (!col) continue;
    const total = accordTotalTTC(rows, col);
    if (total === null) continue;
    const rank = (parsed.kind === 'accord' ? 1000 : 0) + parsed.ordinal;
    if (!best || rank > best.rank) best = { rank, key, total };
  }

  return {
    devisTTC,
    accordTTC: best ? best.total : null,
    accordDocType: best ? best.key : null,
  };
}

/** « 18 450,00 DHS » */
export function formatDhs(n: number): string {
  return `${formatFr(n)} DHS`;
}

export interface Ecart {
  /** accord − devis, in DHS. */
  delta: number;
  /** Signed percentage of the devis total, null when the devis is 0. */
  pct: number | null;
  /**
   * « − 498,00 · − 2,7 % » — U+2212 minus, thin thousands, 2 decimals, NO
   * unit (the design's écart line; the DHS unit is already printed twice
   * above it on the same card). Only the phone chiffrage screen reads this.
   */
  label: string;
  tone: 'success' | 'danger' | 'neutral';
}

/** Écart avec le devis: negative (below the garage) = success, positive = danger. */
export function ecartWithDevis(accordTTC: number, devisTTC: number): Ecart {
  const delta = accordTTC - devisTTC;
  const pct = devisTTC !== 0 ? (delta / devisTTC) * 100 : null;
  const sign = delta < 0 ? '− ' : delta > 0 ? '+ ' : '';
  const abs = formatFr(Math.abs(delta));
  const pctLabel = pct === null ? '' : ` · ${sign}${formatFr(Math.abs(pct), 1)} %`;
  return {
    delta,
    pct,
    label: `${sign}${abs}${pctLabel}`,
    tone: delta < 0 ? 'success' : delta > 0 ? 'danger' : 'neutral',
  };
}
