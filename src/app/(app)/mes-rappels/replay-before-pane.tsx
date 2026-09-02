'use client';

/**
 * « Avant le rappel » pane of the session-replay comparison.
 *
 * Renders the dossier EXACTLY as it was at the start of the treatment session,
 * from the frozen snapshot stored at `rappels/{id}/snapshots/before`
 * (`ensureSnapshotBefore` in lib/rappel-session.ts) — no Firestore reads, no
 * live data, no highlights. Field/section composition follows the per-step
 * config in `replay-field-config.ts` and mirrors the step order of the live
 * replica in the right pane, so the two panes share the same section anchors
 * (used by the synchronized scrolling).
 *
 * Honesty rule: a value absent from the snapshot renders as « — »; a
 * subcollection the snapshot did not record (older sessions stored with the
 * dossier-only JSON fallback) renders « non enregistré » — nothing is ever
 * reconstructed or guessed.
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tsToMillis, getByPath } from '@/lib/rappel-snapshot';
import type { SnapshotBundle } from '@/lib/rappel-session';
import { accordSlotFromValue, parseAccordDocType } from '@/lib/docType-accorde';
import { docTypeOf } from '@/lib/required-docs';
import {
  REPLAY_STEPS,
  IMPACT_ZONE_LABELS,
  type ReplayField,
  type ReplayFieldGroup,
  type ReplaySubSpec,
} from './replay-field-config';

const DASH = <span className="font-normal text-ink-3">—</span>;

function fmtMillis(ms: number, withTime: boolean): string {
  try {
    return format(new Date(ms), withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy', { locale: fr });
  } catch {
    return '—';
  }
}

/** Format a snapshot date-ish value; falls back to the raw string, never invents. */
function fmtDate(raw: any, withTime = false): React.ReactNode {
  const ms = tsToMillis(raw);
  if (ms) return fmtMillis(ms, withTime);
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return fmtMillis(parsed, withTime);
    return raw;
  }
  return null;
}

function isEmptyDisplay(v: any): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Render one field value per its declared kind. Returns null when empty. */
function fieldValue(field: ReplayField, raw: any): React.ReactNode {
  if (isEmptyDisplay(raw)) return null;
  switch (field.kind) {
    case 'date':
      return fmtDate(raw);
    case 'boolean':
      return raw === true ? 'Oui' : raw === false ? 'Non' : String(raw);
    case 'number':
    case 'currency': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(n) ? n.toLocaleString('fr-FR') : String(raw);
    }
    case 'impactZones': {
      if (typeof raw !== 'object') return String(raw);
      const zones = Object.keys(raw)
        .filter((k) => !!(raw as any)[k])
        .map((k) => IMPACT_ZONE_LABELS[k] || k);
      return zones.length ? zones.join(', ') : null;
    }
    default:
      if (typeof raw === 'object') {
        try {
          return JSON.stringify(raw);
        } catch {
          return String(raw);
        }
      }
      return String(raw);
  }
}

/** Legacy fallback fields (label suffixed « (ancien) ») are hidden when empty. */
function isLegacyField(f: ReplayField): boolean {
  return f.label.includes('(ancien)');
}

function FieldGroupBlock({ group, dossier }: { group: ReplayFieldGroup; dossier: any }) {
  const rows = group.fields
    .map((f) => ({ f, value: fieldValue(f, getByPath(dossier, f.path)) }))
    .filter(({ f, value }) => !(isLegacyField(f) && value == null));
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="t-label mb-2">{group.title}</p>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(({ f, value }) => (
          <div key={f.path} className="min-w-0">
            <dt className="t-label">{f.label}</dt>
            <dd
              className={cn(
                'mt-0.5 break-words text-sm font-semibold text-ink',
                (f.kind === 'number' || f.kind === 'currency' || f.kind === 'date') && 'tabular-nums',
              )}
            >
              {value ?? DASH}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Snapshot photo thumbnail — Storage file may have been deleted since. */
function SnapshotPhoto({ photo }: { photo: any }) {
  const [broken, setBroken] = useState(false);
  const name = photo.name || photo.nom || '';
  return (
    <figure className="min-w-0">
      {photo.url && !broken ? (
        <img
          src={photo.url}
          alt={name || 'Photo'}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-md object-cover shadow-rim"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-md bg-surface-2 text-ink-3">
          <ImageOff className="h-4 w-4" aria-hidden />
          <span className="t-caption">Fichier indisponible</span>
        </div>
      )}
      {name && <figcaption className="t-caption mt-1 truncate">{name}</figcaption>}
    </figure>
  );
}

/**
 * Observation routing — mirrors the contextPhase / contextAccord filter of
 * ObservationsTab (minus per-viewer scoping) so the same entries appear in the
 * same step as in the right pane.
 */
function obsMatches(o: any, spec: Extract<ReplaySubSpec, { kind: 'observations' }>): boolean {
  const oPhase = o?.phaseATG as string | undefined;
  const oAccordRaw = o?.accordSlot as string | undefined;
  const oSlot = accordSlotFromValue(oAccordRaw);
  const isLegacy = !oPhase && !oAccordRaw;
  const isAllScope = !o?.visibilityScope || o.visibilityScope === 'all';
  if (spec.phaseATG) {
    if (isAllScope) return true;
    if (oPhase === spec.phaseATG) return true;
    if (isLegacy && (o.source === 'assignations-atg' || o.source === 'dossiers')) return true;
    return false;
  }
  if (spec.accordSlot) {
    if (isAllScope) return true;
    if (oSlot === spec.accordSlot) return true;
    if (
      isLegacy &&
      spec.accordSlot === '1er accord' &&
      (o.source === 'assignations-chiffrage' || o.source === 'dossiers')
    ) return true;
    return false;
  }
  return true;
}

/** Document routing per slot — mirrors the Step4Pieces slot flags per step. */
function docMatchesSlot(d: any, slot: 'base' | 'accord1' | 'accord2plus' | 'note'): boolean {
  const t = docTypeOf(d);
  const isNote = t === "Note d'honoraire";
  const isReforme = t === 'Réforme technique' || t === 'Réforme économique';
  const accord = parseAccordDocType(t);
  switch (slot) {
    case 'note':
      return isNote;
    case 'accord1':
      // Step « 1er accord » shows 1st-accord documents + the réforme slots.
      return (!!accord && accord.ordinal === 1) || isReforme;
    case 'accord2plus':
      return !!accord && accord.ordinal >= 2;
    case 'base':
    default:
      return !accord && !isNote && !isReforme;
  }
}

const NON_ENREGISTRE = (
  <p className="t-caption">
    — <span className="text-ink-3">non enregistré dans l&apos;instantané de départ</span>
  </p>
);

function SubBlock({ spec, subs }: { spec: ReplaySubSpec; subs: Record<string, any[]> | undefined }) {
  const coll =
    spec.kind === 'planifications' ? 'planifications'
    : spec.kind === 'photos' ? 'photos'
    : spec.kind === 'observations' ? 'observations'
    : spec.kind === 'documents' ? 'documents'
    : 'rapport_pieces';
  const all = subs?.[coll];
  let body: React.ReactNode;
  if (all === undefined) {
    body = NON_ENREGISTRE;
  } else {
    let items: any[] = all;
    if (spec.kind === 'planifications') {
      items = all.filter((p) => p?.typeMission === spec.typeMission);
      items = [...items].sort((a, b) => tsToMillis(a?.dateRDV) - tsToMillis(b?.dateRDV));
    } else if (spec.kind === 'photos') {
      items = all.filter((p) => p?.category === spec.category && !p?.pendingUpload);
      items = [...items].sort((a, b) => tsToMillis(a?.uploadedAt) - tsToMillis(b?.uploadedAt));
    } else if (spec.kind === 'observations') {
      items = all.filter((o) => obsMatches(o, spec));
      items = [...items].sort((a, b) => tsToMillis(a?.createdAt) - tsToMillis(b?.createdAt));
    } else if (spec.kind === 'documents') {
      items = all.filter((d) => !!d?.url && !d?.pendingUpload && docMatchesSlot(d, spec.slot));
    }

    if (items.length === 0) {
      body = <p className="t-caption text-ink-3">Aucun élément au début de la session.</p>;
    } else if (spec.kind === 'photos') {
      body = (
        <div className="grid grid-cols-2 gap-2">
          {items.map((p) => (
            <SnapshotPhoto key={p.id} photo={p} />
          ))}
        </div>
      );
    } else if (spec.kind === 'planifications') {
      body = (
        <ul className="divide-y divide-hairline">
          {items.map((p) => {
            const rdv = fmtDate(p.dateRDV, true);
            return (
              <li key={p.id} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {rdv ?? DASH}
                  <span className="ml-2 font-normal text-ink-2">
                    Visite {p.typeMission ? String(p.typeMission).toLowerCase() : '—'}
                  </span>
                </p>
                <p className="t-caption">
                  {p.agentTerrain || 'Non assigné'}
                  {p.zone ? ` · ${p.zone}` : ''}
                  {p.adresse ? ` · ${p.adresse}` : ''}
                </p>
                {p.observation && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{p.observation}</p>
                )}
              </li>
            );
          })}
        </ul>
      );
    } else if (spec.kind === 'observations') {
      body = (
        <ul className="divide-y divide-hairline">
          {items.map((o) => (
            <li key={o.id} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
              <p className="t-caption">
                <span className="font-medium text-ink">{o.author || o.authorEmail || '—'}</span>
                {o.type ? ` · ${o.type}` : ''}
                {tsToMillis(o.createdAt) ? ` · ${fmtMillis(tsToMillis(o.createdAt), true)}` : ''}
              </p>
              {o.text && <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{o.text}</p>}
            </li>
          ))}
        </ul>
      );
    } else {
      // documents / rapport_pieces — file rows.
      body = (
        <ul className="divide-y divide-hairline">
          {items.map((d) => {
            const name = d.nom || d.fileName || d.name || d.id;
            const t = docTypeOf(d);
            return (
              <li key={d.id} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 first:pt-0 last:pb-0">
                <span className="min-w-0 break-all text-sm font-semibold text-ink">{name}</span>
                {t && <span className="t-caption shrink-0">{t}</span>}
              </li>
            );
          })}
        </ul>
      );
    }
  }
  return (
    <div className="mt-4">
      <p className="t-label mb-2">{spec.title}</p>
      {body}
    </div>
  );
}

export default function ReplayBeforePane({
  bundle,
  steps,
  idPrefix,
}: {
  /** The frozen session-start snapshot; null when none was recorded. */
  bundle: SnapshotBundle | null;
  /** Step list (id + label) in the same order as the right pane. */
  steps: { id: number; label: string }[];
  /** Section anchor prefix, e.g. "replay-avant-step-". */
  idPrefix: string;
}) {
  return (
    <div className="px-3 py-4 sm:px-4">
      {!bundle && (
        <p className="t-caption mb-2 text-ink-3">
          Aucun instantané de départ n&apos;a été enregistré pour cette session&nbsp;: les valeurs
          d&apos;origine ne sont pas disponibles.
        </p>
      )}
      {steps.map((step, idx) => {
        const cfg = REPLAY_STEPS.find((s) => s.id === step.id);
        return (
          <section
            key={step.id}
            id={`${idPrefix}${step.id}`}
            className="border-b border-hairline py-6 first:pt-2 last:border-b-0"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold tabular-nums text-ink-2 shadow-rim">
                {idx + 1}
              </span>
              <h3 className="t-title">{step.label}</h3>
            </div>
            {!bundle || !cfg ? (
              <p className="t-caption text-ink-3">—</p>
            ) : (
              <div className="space-y-5">
                {cfg.groups.map((g) => (
                  <FieldGroupBlock key={g.title} group={g} dossier={bundle.dossier} />
                ))}
                {cfg.subs.map((spec, i) => (
                  <SubBlock key={`${spec.kind}-${i}`} spec={spec} subs={bundle.subs} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
