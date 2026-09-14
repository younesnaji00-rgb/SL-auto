'use client';

/**
 * PHONE read-only replay of a rappel treatment (mobile redesign 2026-09-14 —
 * Claude Design handoff `Phone.dc.html` HTML 211–256 / JS 816–840, turn 4b
 * « Avant | Après | Modifications »).
 *
 * The desktop `SessionReplayDialog` mounts the real dossier-timeline
 * components twice, side by side. On a phone the two panes become ONE
 * segmented view over the SAME data — `rappels/{id}/snapshots` docs `before`
 * / `after` plus the stored diff, recomputed live with
 * `classifyDossierChanges` / `diffCollectionById` whenever a start snapshot
 * exists (same precedence as the dialog) — rendered as grouped fact cards:
 *
 *   Début 15/09 09:12   ✓ Sauvegardé 15/09 10:41   [👁 Lecture seule]
 *   Modifications : [3 ajouts] [1 modification] [1 suppression]
 *   ┌ Avant │ Après │ Modifications 5 ┐              ← sticky Segmented xs
 *   ① Mission  [2 modif.]
 *   ┌ Compagnie            N° de police           ┐
 *   │ Wafa Assurance       WA-2026-88213 (tinted) │  ← 2-column dl per step
 *   …
 *   Modifications = one card per change: « Mission · Kilométrage » [modifié]
 *                   84 300 km  →  84 900 km
 *
 * Grouping mirrors the dialog's step composition (dossier-steps ids 1 4 6 9
 * 11 10 7 8): Information fields + base garage / other pieces → Mission;
 * planifications / photos / observations by phase → the three visits; accord
 * documents + accord observations → 1er / 2ᵉ accord; points de choc + pièces
 * → Rapport; honoraire documents → Honoraires. Dot-paths the field map does
 * not know still surface (humanised) so no change is ever dropped.
 *
 * Bottom bar: « Ouvrir le dossier » (the page's open action). The design's
 * « Nouveau rappel » icon is omitted: rappels are sent from a dossier, this
 * route has no create flow.
 *
 * Desktop / tablet never mount this file (page.tsx gates on `useIsPhone`).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Eye, FolderOpen, Info } from 'lucide-react';
import { collection, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { dateFnsLocale, useT } from '@/i18n';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented, type SegmentedOption } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { RECORD_CARD_CLASS } from '@/components/ui/record-card';
import { BottomActionBar } from '@/components/layout/bottom-action-bar';
import { usePhoneChrome, useRegisterPageTitle } from '@/components/layout/page-chrome';
import { highlightClass, STATUS_LABEL, type ChangeStatus } from '@/components/dossier-timeline/replay-highlight';
import { DOSSIER_STEP_DEFS } from '@/lib/dossier-steps';
import type { Rappel } from '@/hooks/use-rappels';
import {
  canonicalizeDossierForDiff,
  classifyDossierChanges,
  diffCollectionById,
  docPathStatus,
  getByPath,
  tsToMillis,
  type CollectionDiff,
  type DocPathDiff,
} from '@/lib/rappel-snapshot';
import { loadReplaySnapshots, SNAP_SUBCOLLECTIONS, type ReplaySnapshots, type SnapshotBundle } from '@/lib/rappel-session';
import { cn } from '@/lib/utils';

type Kind = Exclude<ChangeStatus, null>;
type Pane = 'avant' | 'apres' | 'diff';
type Side = SnapshotBundle;
type Translate = (s: string) => string;

const KINDS: Kind[] = ['added', 'modified', 'removed'];
const KIND_VARIANT: Record<Kind, 'success' | 'warning' | 'danger'> = { added: 'success', modified: 'warning', removed: 'danger' };

/* ------------------------------------------------------------------ */
/* Field map — the Information tab's dot-paths (information-tab.tsx     */
/* `path:` list) with their labels and the step card they belong to.    */
/* Read off the CANONICALISED dossier (same shape the diff walks).      */
/* ------------------------------------------------------------------ */

interface FieldDef {
  path: string;
  label: string;
  step: number;
  span?: boolean;
  mono?: boolean;
  date?: boolean;
}

const FIELD_DEFS: FieldDef[] = [
  { path: 'compagnie', label: 'Compagnie', step: 1 },
  { path: 'typeDossier', label: 'Type de dossier', step: 1 },
  { path: 'nature', label: 'Nature du dossier', step: 1 },
  { path: 'statut', label: 'Statut', step: 1 },
  { path: 'refExpert', label: 'Réf dossier', step: 1, mono: true },
  { path: 'referenceCompagnie', label: 'Référence compagnie', step: 1, mono: true },
  { path: 'matricule', label: 'Matricule', step: 1, mono: true },
  { path: 'policeNumber', label: 'N° de police', step: 1, mono: true },
  { path: 'dateSinistre', label: 'Date sinistre', step: 1, date: true },
  { path: 'dateRequete', label: 'Date requête', step: 1, date: true },
  { path: 'expertRank', label: 'Rôle du dossier', step: 1 },
  { path: 'assure.nom', label: 'Assuré · Nom', step: 1 },
  { path: 'assure.telephone', label: 'Assuré · Téléphone', step: 1, mono: true },
  { path: 'assure.whatsapp', label: 'Assuré · WhatsApp', step: 1, mono: true },
  { path: 'assure.telephone2', label: 'Assuré · Téléphone 2', step: 1, mono: true },
  { path: 'assure.email', label: 'Assuré · Email', step: 1 },
  { path: 'assure.adresse', label: 'Assuré · Adresse', step: 1, span: true },
  { path: 'assure.cin', label: 'Assuré · CIN', step: 1, mono: true },
  { path: 'vehicule.marque', label: 'Marque', step: 1 },
  { path: 'vehicule.modele', label: 'Modèle', step: 1 },
  { path: 'vehicule.immatriculation', label: 'Immatriculation', step: 1, mono: true },
  { path: 'vehicule.serie', label: 'Numéro de série', step: 1, mono: true },
  { path: 'vehicule.energie', label: 'Énergie', step: 1 },
  { path: 'vehicule.puissance', label: 'Puissance fiscale', step: 1 },
  { path: 'vehicule.mec', label: 'Mise en circulation', step: 1, date: true },
  { path: 'vehicule.km', label: 'Kilométrage', step: 1 },
  { path: 'vehicule.immatriculationAnterieur', label: 'Immatriculation antérieure', step: 1, mono: true },
  { path: 'intermediaireNom', label: 'Intermédiaire · Nom', step: 1 },
  { path: 'intermediairePrenom', label: 'Intermédiaire · Prénom', step: 1 },
  { path: 'intermediaireType', label: 'Intermédiaire · Type', step: 1 },
  { path: 'intermediaireCode', label: 'Intermédiaire · Code', step: 1, mono: true },
  { path: 'intermediaireCompagnie', label: 'Intermédiaire · Compagnie', step: 1 },
  { path: 'intermediaireTelephone', label: 'Intermédiaire · Téléphone', step: 1, mono: true },
  { path: 'intermediaireEmail', label: 'Intermédiaire · Email', step: 1 },
  { path: 'intermediaireAdresse', label: 'Intermédiaire · Adresse', step: 1, span: true },
  { path: 'adverseNom', label: 'Partie adverse · Nom', step: 1 },
  { path: 'adversePrenom', label: 'Partie adverse · Prénom', step: 1 },
  { path: 'adverseTelephone', label: 'Partie adverse · Téléphone', step: 1, mono: true },
  { path: 'adverseEmail', label: 'Partie adverse · Email', step: 1 },
  { path: 'adverseAdresse', label: 'Partie adverse · Adresse', step: 1, span: true },
  { path: 'adverseCompagnie', label: 'Partie adverse · Compagnie', step: 1 },
  { path: 'adverseMatricule', label: 'Partie adverse · Matricule', step: 1, mono: true },
  { path: 'adversePermis', label: 'Partie adverse · N° permis', step: 1, mono: true },
  { path: 'pointsChoc', label: 'Points de choc', step: 7, span: true },
  { path: 'pointsChocDessous', label: 'Points de choc dessous', step: 7, span: true },
];
const FIELD_BY_PATH = new Map(FIELD_DEFS.map((f) => [f.path, f]));

/** Step card for a dot-path outside the map (a parent object, an unknown key). */
function fallbackStep(path: string): number {
  if (path.startsWith('pointsChoc')) return 7;
  return 1;
}

/** `garages.2.montant` → « Garages › n° 3 › montant ». */
function humanizePath(path: string): string {
  const parts = path.split('.').map((seg) =>
    /^\d+$/.test(seg) ? `n° ${Number(seg) + 1}` : seg.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(),
  );
  const s = parts.join(' › ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

function fmtMs(ms: number, pattern: string): string {
  if (!ms) return '—';
  try {
    return format(new Date(ms), pattern, { locale: dateFnsLocale() });
  } catch {
    return '—';
  }
}

/** Session facts (design): « 15/09 09:12 ». */
const fmtFact = (ts: any) => fmtMs(tsToMillis(ts), 'dd/MM HH:mm');

function isTimeLike(v: any): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  return typeof v.toDate === 'function' || typeof v.toMillis === 'function' || v instanceof Date || typeof v.seconds === 'number' || typeof v._seconds === 'number';
}

/** A dossier value as one line of text; « — » for nothing. */
function fmtValue(v: any, def?: Pick<FieldDef, 'date'> | null): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (typeof v === 'number') return def?.date ? fmtMs(v, 'dd/MM/yyyy') : String(v);
  if (typeof v === 'string') {
    if (def?.date) {
      const ms = Date.parse(v);
      return Number.isFinite(ms) ? fmtMs(ms, 'dd/MM/yyyy') : v;
    }
    return v.trim() || '—';
  }
  if (isTimeLike(v)) return fmtMs(tsToMillis(v), def?.date ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm');
  if (Array.isArray(v)) {
    if (v.length === 0) return '—';
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) return v.map(String).join(', ');
    return `${v.length} ${v.length > 1 ? 'éléments' : 'élément'}`;
  }
  try {
    const s = JSON.stringify(v);
    if (!s || s === '{}') return '—';
    return s.length > 80 ? `${s.slice(0, 77)}…` : s;
  } catch {
    return '…';
  }
}

/* ------------------------------------------------------------------ */
/* Subcollection entries → step card + label + one-line value           */
/* ------------------------------------------------------------------ */

const PHASE_STEP: Record<string, number> = { Avant: 4, 'En cours': 9, Après: 10 };
const CATEGORY_STEP: Record<string, number> = { avant: 4, en_cours: 9, apres: 10 };

/** Document type → step (mirrors step-4-pieces' slot flags, approximated). */
function docStep(type: string): number {
  if (/honoraire/i.test(type)) return 8;
  if (/accord|proposition/i.test(type)) return /(^|\D)[2-9]\s*(ème|eme|e)\b/i.test(type) ? 11 : 6;
  return 1;
}

function obsStep(o: any): number {
  const phase = o?.phaseATG;
  if (phase && PHASE_STEP[phase]) return PHASE_STEP[phase];
  if (o?.accordSlot === '2ème accord ou +') return 11;
  // Legacy (untagged) observations show under the 1er accord on the desktop.
  return 6;
}

interface EntryDesc {
  step: number;
  label: string;
  value: string;
  span?: boolean;
}

function describeEntry(coll: string, e: any, t: Translate): EntryDesc {
  switch (coll) {
    case 'planifications': {
      const ms = tsToMillis(e?.dateRDV);
      return {
        step: PHASE_STEP[e?.typeMission] ?? 4,
        label: t('Planification'),
        value: `${e?.agentTerrain || t('Non assigné')} · ${ms ? fmtMs(ms, 'dd/MM/yyyy HH:mm') : '—'}`,
        span: true,
      };
    }
    case 'photos': {
      const ms = tsToMillis(e?.createdAt);
      return {
        step: CATEGORY_STEP[e?.category] ?? 4,
        label: `${t('Photo')} « ${e?.name || t('sans nom')} »`,
        value: ms ? fmtMs(ms, 'dd/MM/yyyy') : t('Photo'),
      };
    }
    case 'observations':
      return {
        step: obsStep(e),
        label: e?.type ? `${t('Observation')} · ${String(e.type)}` : t('Observation'),
        value: (typeof e?.text === 'string' && e.text.trim()) || '—',
        span: true,
      };
    case 'documents': {
      const type = String(e?.type || e?.typeDocument || '').trim();
      return { step: docStep(type), label: type || t('Document'), value: e?.nom || e?.fileName || t('Fichier') };
    }
    case 'rapport_pieces':
      return {
        step: 7,
        label: t('Pièce'),
        value:
          [e?.designation, e?.operation, e?.quantite != null && e?.quantite !== '' ? `× ${e.quantite}` : null]
            .filter(Boolean)
            .join(' · ') || '—',
        span: true,
      };
    default:
      return { step: 1, label: coll, value: e?.id || '—' };
  }
}

/* ------------------------------------------------------------------ */
/* Pane model                                                          */
/* ------------------------------------------------------------------ */

interface Row {
  key: string;
  label: string;
  value: string;
  span?: boolean;
  mono?: boolean;
  status: ChangeStatus;
}

interface Group {
  id: number;
  pos: number;
  title: string;
  rows: Row[];
  changes: number;
}

/**
 * Rows of one side (frozen `before`, or `after` / live), grouped by step.
 * `other` decides which empty fields still get a row (kept in BOTH panes so
 * Avant and Après line up); `highlight` (Après only) tints changed rows and
 * appends the entries the gestionnaire deleted, struck through.
 */
function buildGroups(
  side: Side,
  other: Side | null,
  docDiff: DocPathDiff | null,
  subDiffs: Record<string, CollectionDiff> | null,
  highlight: boolean,
  t: Translate,
): Group[] {
  const rowsByStep = new Map<number, Row[]>();
  for (const s of DOSSIER_STEP_DEFS) rowsByStep.set(s.id, []);
  const push = (step: number, row: Row) => (rowsByStep.get(step) ?? rowsByStep.get(1)!).push(row);

  const canon = canonicalizeDossierForDiff(side.dossier ?? {});
  const canonOther = other ? canonicalizeDossierForDiff(other.dossier ?? {}) : null;
  const seen = new Set<string>();

  for (const f of FIELD_DEFS) {
    seen.add(f.path);
    const status = highlight && docDiff ? docPathStatus(docDiff, f.path) : null;
    const value = fmtValue(getByPath(canon, f.path), f);
    const otherValue = canonOther ? fmtValue(getByPath(canonOther, f.path), f) : '—';
    if (value === '—' && otherValue === '—' && !status) continue;
    // A removed field on the Après side: show what was there, struck through.
    const shown = status === 'removed' && value === '—' ? otherValue : value;
    push(f.step, { key: f.path, label: t(f.label), value: shown, span: f.span, mono: f.mono, status });
  }

  // Changed paths the map does not know — never drop a change.
  if (docDiff) {
    for (const kind of KINDS) {
      for (const p of docDiff[kind]) {
        if (seen.has(p) || FIELD_DEFS.some((f) => p.startsWith(`${f.path}.`))) continue;
        seen.add(p);
        const value = fmtValue(getByPath(canon, p));
        const otherValue = canonOther ? fmtValue(getByPath(canonOther, p)) : '—';
        const status: ChangeStatus = highlight ? kind : null;
        if (value === '—' && otherValue === '—' && !status) continue;
        push(fallbackStep(p), {
          key: p,
          label: humanizePath(p),
          value: status === 'removed' && value === '—' ? otherValue : value,
          span: true,
          status,
        });
      }
    }
  }

  for (const coll of SNAP_SUBCOLLECTIONS) {
    const mine: any[] = Array.isArray(side.subs?.[coll]) ? side.subs[coll] : [];
    const theirs: any[] = Array.isArray(other?.subs?.[coll]) ? other!.subs[coll] : [];
    const d = subDiffs?.[coll];
    const statusOf = (id: string): ChangeStatus => {
      if (!highlight || !d) return null;
      if (d.added.includes(id)) return 'added';
      if (d.modified.includes(id)) return 'modified';
      if (d.removed.includes(id)) return 'removed';
      return null;
    };
    const removedHere = (e: any) => highlight && !!d && d.removed.includes(e?.id);

    if (coll === 'photos') {
      // One count row per visit (design « Photos · 8 photos »), then a row
      // for each photo the gestionnaire added / renamed / deleted.
      for (const [cat, step] of Object.entries(CATEGORY_STEP)) {
        const n = mine.filter((p) => p?.category === cat).length;
        const nOther = theirs.filter((p) => p?.category === cat).length;
        if (n === 0 && nOther === 0) continue;
        push(step, { key: `photos-${cat}`, label: t('Photos'), value: `${n} ${n > 1 ? t('photos') : t('photo')}`, status: null });
      }
      if (highlight && d) {
        const changed = new Set([...d.added, ...d.modified]);
        for (const p of mine) {
          if (!changed.has(p?.id)) continue;
          const desc = describeEntry(coll, p, t);
          push(desc.step, { key: `photo-${p.id}`, label: desc.label, value: desc.value, status: statusOf(p.id) });
        }
        for (const p of theirs) {
          if (!removedHere(p)) continue;
          const desc = describeEntry(coll, p, t);
          push(desc.step, { key: `photo-${p.id}`, label: desc.label, value: desc.value, status: 'removed' });
        }
      }
      continue;
    }

    for (const e of mine) {
      const desc = describeEntry(coll, e, t);
      push(desc.step, { key: `${coll}-${e?.id}`, label: desc.label, value: desc.value, span: desc.span, status: statusOf(e?.id) });
    }
    for (const e of theirs) {
      if (!removedHere(e)) continue;
      const desc = describeEntry(coll, e, t);
      push(desc.step, { key: `${coll}-${e?.id}`, label: desc.label, value: desc.value, span: desc.span, status: 'removed' });
    }
  }

  return DOSSIER_STEP_DEFS.map((s, i) => {
    const rows = rowsByStep.get(s.id) ?? [];
    return { id: s.id, pos: i + 1, title: t(s.label), rows, changes: rows.filter((r) => r.status).length };
  });
}

interface Change {
  key: string;
  pos: number;
  step: string;
  field: string;
  before: string;
  after: string;
  kind: Kind;
}

/** The « Modifications » list: one entry per changed path / entry, in step order. */
function buildChanges(
  before: Side | null,
  after: Side | null,
  docDiff: DocPathDiff | null,
  subDiffs: Record<string, CollectionDiff> | null,
  t: Translate,
): Change[] {
  const out: Change[] = [];
  const stepPos = (id: number) => Math.max(0, DOSSIER_STEP_DEFS.findIndex((s) => s.id === id)) + 1;
  const stepLabel = (id: number) => t(DOSSIER_STEP_DEFS.find((s) => s.id === id)?.label ?? 'Mission');
  const cb = before ? canonicalizeDossierForDiff(before.dossier ?? {}) : null;
  const ca = after ? canonicalizeDossierForDiff(after.dossier ?? {}) : null;

  if (docDiff) {
    for (const kind of KINDS) {
      for (const p of docDiff[kind]) {
        const def = FIELD_BY_PATH.get(p) ?? FIELD_DEFS.find((f) => p.startsWith(`${f.path}.`)) ?? null;
        const step = def?.step ?? fallbackStep(p);
        out.push({
          key: `doc-${p}`,
          pos: stepPos(step),
          step: stepLabel(step),
          field: def && def.path === p ? t(def.label) : humanizePath(p),
          before: cb ? fmtValue(getByPath(cb, p), def) : '—',
          after: ca ? fmtValue(getByPath(ca, p), def) : '—',
          kind,
        });
      }
    }
  }

  if (subDiffs) {
    for (const coll of SNAP_SUBCOLLECTIONS) {
      const d = subDiffs[coll];
      if (!d) continue;
      const findIn = (side: Side | null, id: string) => (Array.isArray(side?.subs?.[coll]) ? side!.subs[coll].find((x: any) => x?.id === id) : undefined);
      for (const kind of KINDS) {
        for (const id of d[kind]) {
          const eA = findIn(after, id);
          const eB = findIn(before, id);
          const ref = eA ?? eB;
          if (!ref) continue;
          const desc = describeEntry(coll, ref, t);
          out.push({
            key: `${coll}-${id}`,
            pos: stepPos(desc.step),
            step: stepLabel(desc.step),
            field: desc.label,
            before: eB ? describeEntry(coll, eB, t).value : '—',
            after: eA ? describeEntry(coll, eA, t).value : '—',
            kind,
          });
        }
      }
    }
  }

  return out.sort((a, b) => a.pos - b.pos || a.field.localeCompare(b.field));
}

/* ------------------------------------------------------------------ */
/* Bits                                                                */
/* ------------------------------------------------------------------ */

function valueClass(row: Pick<Row, 'value' | 'mono' | 'status'>): string {
  const empty = row.value === '—';
  return cn(
    'text-[13px] leading-[1.35] [overflow-wrap:anywhere]',
    empty ? 'font-normal text-ink-4' : 'font-medium text-ink',
    row.mono && !empty && 'font-mono tabular-nums',
    row.status && cn(highlightClass(row.status), 'inline-block max-w-full rounded px-1.5 py-px -mx-1.5'),
    row.status === 'removed' && 'line-through decoration-status-danger-fg/60',
  );
}

function Legend({ t }: { t: Translate }) {
  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-1 pt-1.5 text-[11px] text-ink-3" aria-label={t('Légende des surlignages')}>
      {KINDS.map((k) => (
        <span key={k} className="inline-flex items-center gap-1">
          <span className={cn('h-2.5 w-2.5 rounded-[3px]', highlightClass(k))} aria-hidden />
          {t(STATUS_LABEL[k])}
        </span>
      ))}
    </div>
  );
}

function GroupCards({ groups, highlight, t }: { groups: Group[]; highlight: boolean; t: Translate }) {
  return (
    <div className="flex flex-col gap-3 pt-2.5">
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`replay-group-${g.id}`}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold tabular-nums text-ink-2">
              {g.pos}
            </span>
            <h2 id={`replay-group-${g.id}`} className="m-0 text-[14px] font-semibold text-ink">
              {g.title}
            </h2>
            {highlight && g.changes > 0 && (
              <Badge variant="warning">
                {g.changes} {t('modif.')}
              </Badge>
            )}
          </div>
          <div className={cn(RECORD_CARD_CLASS, 'grid grid-cols-2 gap-x-3 px-3.5 py-1')}>
            {g.rows.length === 0 ? (
              <p className="col-span-2 m-0 py-2 text-[12px] text-ink-4">{t('Aucun élément')}</p>
            ) : (
              g.rows.map((row) => (
                <div key={row.key} className={cn('min-w-0 py-2', row.span && 'col-span-2')}>
                  <div className="text-[11px] leading-4 text-ink-3">{row.label}</div>
                  <div className={cn('mt-0.5', valueClass(row))}>{row.value}</div>
                </div>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChangeCards({ changes, t }: { changes: Change[]; t: Translate }) {
  if (changes.length === 0) {
    return (
      <div className="pt-2.5">
        <EmptyState icon={<Info />} title={t('Aucune modification détectée')} description={t("Rien n'a changé sur le dossier pendant ce traitement.")} dashed={false} />
      </div>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 pt-2.5" aria-label={t('Modifications du gestionnaire')}>
      {changes.map((c) => {
        const beforeEmpty = c.before === '—';
        const afterEmpty = c.after === '—';
        return (
          <li key={c.key} className={cn(RECORD_CARD_CLASS, 'px-3.5 py-2.5')}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="min-w-0 text-[12px] leading-4 text-ink-3 [overflow-wrap:anywhere]">
                {c.step} · <b className="font-medium text-ink">{c.field}</b>
              </span>
              <Badge variant={KIND_VARIANT[c.kind]} className="shrink-0">
                {t(STATUS_LABEL[c.kind])}
              </Badge>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-1.5">
              <span className={cn('min-w-0 text-[13px] leading-[1.35] [overflow-wrap:anywhere]', beforeEmpty ? 'text-ink-4' : 'text-ink-2', c.kind === 'removed' && !beforeEmpty && 'line-through decoration-status-danger-fg/60')}>
                {c.before}
              </span>
              <ArrowRight className="h-4 w-4 justify-self-center text-ink-4" aria-hidden />
              <span className={cn('min-w-0 text-[13px] leading-[1.35] [overflow-wrap:anywhere]', afterEmpty ? 'text-ink-4' : cn('font-medium text-ink', highlightClass(c.kind), 'inline-block max-w-full rounded px-1.5 py-px -mx-1.5'))}>
                {c.after}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export interface PhoneReplayScreenProps {
  rappel: Rappel;
  /** Up-link of the top bar (« ‹ Rappels »). */
  upHref?: string;
  /** « Ouvrir le dossier » — the page's open action for this rappel. */
  onOpenDossier: (r: Rappel) => void;
}

export default function PhoneReplayScreen({ rappel, upHref = '/mes-rappels', onOpenDossier }: PhoneReplayScreenProps) {
  const db = useFirestore();
  const t = useT();
  const id = rappel.dossierId;
  const rappelId = rappel.id;
  const resolved = !!rappel.resolvedAt;

  useRegisterPageTitle(rappel.dossierRef || id);
  const subtitle = `${t('Traitement')} · ${rappel.recipientNom || '—'}`;
  usePhoneChrome(
    useMemo(
      () => ({
        upHref,
        upLabel: t('Rappels'),
        subtitle,
        titleChip: resolved ? { label: t('Traité'), tone: 'success' as const } : { label: t('En cours'), tone: 'info' as const },
        primaryAction: null,
        secondaryActions: [],
        search: null,
        onSearchFocus: null,
        filters: null,
      }),
      [upHref, subtitle, resolved, t],
    ),
  );

  const [pane, setPane] = useState<Pane>('apres');

  // ── Snapshots (same source as the desktop dialog). ──
  const [snaps, setSnaps] = useState<ReplaySnapshots | null>(null);
  const [snapsLoading, setSnapsLoading] = useState(true);
  useEffect(() => {
    if (!db || !rappelId) {
      setSnaps(null);
      setSnapsLoading(false);
      return;
    }
    let cancelled = false;
    setSnapsLoading(true);
    loadReplaySnapshots(db, rappelId).then((s) => {
      if (!cancelled) {
        setSnaps(s);
        setSnapsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db, rappelId]);

  // ── Treatment still open → no `after` snapshot yet: the « Après » side is
  //    the live dossier (dialog precedence), subscribed only in that case. ──
  const needLive = !!snaps && !snaps.after && !!db && !!id;
  const dossierRef = useMemo(() => (needLive ? doc(db, 'dossiers', id) : null), [db, id, needLive]);
  const { data: liveDossier } = useDoc(dossierRef as any);
  const obsQ = useMemo(() => (needLive ? collection(db, 'dossiers', id, 'observations') : null), [db, id, needLive]);
  const planifQ = useMemo(() => (needLive ? collection(db, 'dossiers', id, 'planifications') : null), [db, id, needLive]);
  const photosQ = useMemo(() => (needLive ? collection(db, 'dossiers', id, 'photos') : null), [db, id, needLive]);
  const docsQ = useMemo(() => (needLive ? collection(db, 'dossiers', id, 'documents') : null), [db, id, needLive]);
  const piecesQ = useMemo(() => (needLive ? collection(db, 'dossiers', id, 'rapport_pieces') : null), [db, id, needLive]);
  const { data: liveObs } = useCollection<any>(obsQ as any);
  const { data: livePlanifs } = useCollection<any>(planifQ as any);
  const { data: livePhotos } = useCollection<any>(photosQ as any);
  const { data: liveDocs } = useCollection<any>(docsQ as any);
  const { data: livePieces } = useCollection<any>(piecesQ as any);

  const before = snaps?.before ?? null;
  const storedDiff = snaps?.diff ?? null;
  const after = useMemo<Side | null>(() => {
    if (snaps?.after) return snaps.after;
    if (needLive && liveDossier) {
      return {
        dossier: liveDossier,
        subs: {
          observations: liveObs || [],
          planifications: livePlanifs || [],
          photos: livePhotos || [],
          documents: liveDocs || [],
          rapport_pieces: livePieces || [],
        },
      };
    }
    return null;
  }, [snaps, needLive, liveDossier, liveObs, livePlanifs, livePhotos, liveDocs, livePieces]);

  // Prefer the recompute against the start snapshot (latest canonicalising
  // diff logic); fall back to the diff frozen at save time.
  const docDiff = useMemo<DocPathDiff | null>(
    () => (before && after ? classifyDossierChanges(before.dossier ?? {}, after.dossier ?? {}) : storedDiff?.doc ?? null),
    [before, after, storedDiff],
  );
  const subDiffs = useMemo<Record<string, CollectionDiff> | null>(() => {
    if (before && after) {
      const out: Record<string, CollectionDiff> = {};
      for (const name of SNAP_SUBCOLLECTIONS) out[name] = diffCollectionById(before.subs?.[name], after.subs?.[name]);
      return out;
    }
    return storedDiff?.subs ?? null;
  }, [before, after, storedDiff]);

  const hasBaseline = !!before || !!storedDiff;
  const summary = useMemo(() => {
    let added = 0, modified = 0, removed = 0;
    if (docDiff) {
      added += docDiff.added.length;
      modified += docDiff.modified.length;
      removed += docDiff.removed.length;
    }
    if (subDiffs) {
      for (const c of Object.values(subDiffs)) {
        added += c.added.length;
        modified += c.modified.length;
        removed += c.removed.length;
      }
    }
    return { added, modified, removed, total: added + modified + removed };
  }, [docDiff, subDiffs]);

  const groups = useMemo(() => {
    const side = pane === 'avant' ? before : after;
    if (!side || pane === 'diff') return null;
    return buildGroups(side, pane === 'avant' ? after : before, docDiff, subDiffs, pane === 'apres', t);
  }, [pane, before, after, docDiff, subDiffs, t]);
  const changes = useMemo(() => buildChanges(before, after, docDiff, subDiffs, t), [before, after, docDiff, subDiffs, t]);

  const loading = snapsLoading || (needLive && !liveDossier);

  const paneOptions: SegmentedOption<Pane>[] = [
    { value: 'avant', label: t('Avant') },
    { value: 'apres', label: t('Après') },
    {
      value: 'diff',
      label: (
        <>
          {t('Modifications')}
          {summary.total > 0 && <span className="text-[11px] tabular-nums opacity-70">{summary.total}</span>}
        </>
      ),
      labelText: t('Modifications'),
    },
  ];

  const paneHint =
    pane === 'avant'
      ? t("L'état du dossier tel qu'il était à l'envoi du rappel : une copie figée, non modifiable.")
      : resolved
        ? t("Le dossier tel que le gestionnaire l'a sauvegardé : ce qu'il a changé pendant le traitement est surligné.")
        : t("Le dossier tel qu'il est aujourd'hui : ce que le gestionnaire a changé pendant le traitement est surligné.");

  return (
    <div data-tour="rap-replay" className="flex flex-col pb-4">
      {/* Session facts (design 211–216): Début · ✓ Sauvegardé · Lecture seule. */}
      <div data-tour="rap-replay-head" className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px] leading-4 text-ink-3">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t('Début')} <b className="font-medium text-ink">{fmtFact(rappel.sessionStartedAt)}</b>
        </span>
        {resolved ? (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-success-fg" aria-hidden />
            {t('Sauvegardé')} <b className="font-medium text-ink">{fmtFact(rappel.resolvedAt)}</b>
          </span>
        ) : (
          <Badge variant="info">{t('Traitement en cours')}</Badge>
        )}
        <Badge variant="neutral" className="gap-1">
          <Eye aria-hidden /> {t('Lecture seule')}
        </Badge>
      </div>

      {/* Change counters (design 217). */}
      <div data-tour="rap-replay-summary" className="flex flex-wrap items-center gap-1.5 pt-2 text-[12px] leading-4 text-ink-2">
        {loading ? (
          <Skeleton className="h-5 w-56 rounded-full" />
        ) : !hasBaseline ? (
          <span className="text-ink-3">
            {t("Aucun instantané de départ n'a été enregistré pour ce traitement : les modifications ne peuvent pas être mises en évidence.")}
          </span>
        ) : (
          <>
            <span className="font-medium">{t('Modifications :')}</span>
            {summary.total === 0 && <span className="text-ink-3">{t('aucune')}</span>}
            {summary.added > 0 && (
              <Badge variant="success">
                {summary.added} {summary.added > 1 ? t('ajouts') : t('ajout')}
              </Badge>
            )}
            {summary.modified > 0 && (
              <Badge variant="warning">
                {summary.modified} {summary.modified > 1 ? t('modifications') : t('modification')}
              </Badge>
            )}
            {summary.removed > 0 && (
              <Badge variant="danger">
                {summary.removed} {summary.removed > 1 ? t('suppressions') : t('suppression')}
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Avant | Après | Modifications — pinned under the top bar while the
          cards scroll (design 218–224). */}
      <div className="sticky top-0 z-30 -mx-4 mt-2.5 border-b border-hairline bg-background/90 px-4 pb-2 pt-0.5 backdrop-blur-sm">
        <Segmented<Pane> size="xs" options={paneOptions} value={pane} onValueChange={setPane} aria-label={t('Volet du traitement')} />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 pt-3" aria-busy="true" aria-live="polite">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : pane === 'diff' ? (
        <ChangeCards changes={changes} t={t} />
      ) : (
        <>
          <p className="m-0 pt-2.5 text-[12px] leading-[1.4] text-ink-3">{paneHint}</p>
          {pane === 'apres' && hasBaseline && <Legend t={t} />}
          {groups ? (
            <GroupCards groups={groups} highlight={pane === 'apres'} t={t} />
          ) : (
            <p className="m-0 pt-3 text-[12px] leading-[1.4] text-ink-3">
              {pane === 'avant'
                ? t("Aucun instantané de départ n'a été enregistré pour cette session : les valeurs d'origine ne sont pas disponibles.")
                : t("Le dossier n'a pas pu être chargé.")}
            </p>
          )}
        </>
      )}

      <BottomActionBar
        primary={{ label: t('Ouvrir le dossier'), icon: <FolderOpen className="h-4 w-4" aria-hidden />, onClick: () => onOpenDossier(rappel) }}
      />
    </div>
  );
}
