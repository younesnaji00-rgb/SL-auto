'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CalendarClock, CheckCircle2, ChevronDown, Eye, AlertTriangle, History, Info, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { scrollBehavior } from '@/lib/motion';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Rappel } from '@/hooks/use-rappels';
import { tsToMillis, classifyDossierChanges, diffCollectionById, docPathStatus, type CollectionDiff } from '@/lib/rappel-snapshot';
import { loadReplaySnapshots, type ReplaySnapshots, SNAP_SUBCOLLECTIONS } from '@/lib/rappel-session';
import { ReadOnlyUserScope } from '@/hooks/use-current-user';
import {
  ReplayHighlightProvider,
  type ChangeStatus,
  type ReplayHighlightValue,
} from '@/components/dossier-timeline/replay-highlight';
import { DOSSIER_TIMELINE_STEPS } from '@/components/dossier-timeline/timeline';
import { TimelineBar } from '@/components/dossier-timeline/timeline-bar';
import { getStepStatuses, type StepState } from '@/lib/dossier-steps';

// The real dossier-timeline components — rendered read-only + live so the
// AFTER pane is the exact detail page (every field, photo, table), not an
// approximation. Read-only is surgical: ReadOnlyUserScope zeroes canWrite /
// canDelete / isAdmin for the subtree (hiding every canWrite-gated mutating
// affordance), `readOnly` props neutralise the few ROLE-gated write paths
// (observations « Valider le traitement », rapport « Générer » + validation
// directeur), and mutation callbacks are no-ops — while purely navigational
// controls (tabs, collapsibles, lightboxes, downloads) stay ALIVE so a
// session can be skimmed. The BEFORE pane renders the SAME components (same
// cards, same anatomy) fed with the frozen session-start snapshot through
// each component's `…Override` prop — and no ReplayHighlightProvider, so it
// stays untinted.
import Step1Import from '@/components/dossier-timeline/step-1-import';
import Step2Information from '@/components/dossier-timeline/step-2-information';
import Step3Planification from '@/components/dossier-timeline/step-3-planification';
import Step4Pieces from '@/components/dossier-timeline/step-4-pieces';
import Step6Rapport from '@/components/dossier-timeline/step-6-rapport';
import TypedDocumentsGrid from '@/components/dossier-timeline/typed-documents-grid';
import ObservationsTab from '@/components/observations-tab';
import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';

type Props = {
  rappel: Rappel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const noop = () => {};

/** Section anchor prefixes — one id namespace per pane. */
const AVANT_PREFIX = 'replay-avant-step-';
const AFTER_PREFIX = 'replay-after-step-';

/**
 * Scoped pane CSS — two jobs, both limited to `.replay-pane` descendants so
 * the real dossier pages are untouched, and applied identically to BOTH panes:
 *
 * 1. DENSITY: the replay is a skim view — card/section paddings and vertical
 *    rhythm drop one notch (24→16, 16→10), inter-block gaps tighten, body
 *    type 14→13 px (never below the 11 px floor), step titles 18→16 px, and
 *    photo grids become dense auto-fill rows of small square tiles (~84 px)
 *    instead of viewport-breakpoint columns.
 * 2. HALF-WIDTH FITTING (≥ lg, panes side by side): Tailwind breakpoints look
 *    at the viewport, which stays wide while each pane gets half of it — so
 *    the socket/definition grids collapse to 2 columns (3 from 1536 px).
 *
 * Selectors target the exact utility classes used by the embedded tabs and
 * out-specify them (2 classes vs 1); `.\32 xl` = CSS escape for the leading
 * "2" of `2xl:`. The pt-0/pb-0 rules restore shadcn Card's collapsed edges
 * that the p-6 shorthand override would otherwise re-pad.
 */
const PANE_FIT_CSS = `
.replay-pane .p-6 { padding: 1rem; }
.replay-pane .px-6 { padding-left: 1rem; padding-right: 1rem; }
.replay-pane .py-6 { padding-top: 1rem; padding-bottom: 1rem; }
.replay-pane .pt-0 { padding-top: 0; }
.replay-pane .pb-0 { padding-bottom: 0; }
.replay-pane .p-4 { padding: 0.625rem; }
.replay-pane .gap-6 { gap: 0.75rem; }
.replay-pane .gap-4 { gap: 0.5rem; }
.replay-pane .mt-4 { margin-top: 0.625rem; }
.replay-pane .mb-4 { margin-bottom: 0.625rem; }
.replay-pane .space-y-8 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.25rem; }
.replay-pane .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
.replay-pane .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.625rem; }
.replay-pane .text-sm { font-size: 0.8125rem; }
.replay-pane .t-title { font-size: 1rem; }
.replay-pane .lg\\:grid-cols-6 { grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 0.375rem; }
@media (min-width: 1024px) {
  .replay-pane .xl\\:grid-cols-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .replay-pane .\\32 xl\\:grid-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1536px) {
  .replay-pane .\\32 xl\\:grid-cols-4 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
`;

function fmtDateTime(ts: any): string {
  const ms = tsToMillis(ts);
  if (!ms) return '—';
  try {
    return format(new Date(ms), 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return '—';
  }
}

const isLgViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

/**
 * Deep-convert JSON-roundtripped timestamps ({seconds}/{_seconds} maps — the
 * snapshot write-fallback format) into real Dates, so the live components'
 * `ts.toDate ? … : new Date(ts)` / date-fns paths work on frozen data.
 * Live Timestamp instances (structured snapshots) pass through untouched.
 */
function hydrateTimestamps<T>(value: T): T {
  const walk = (v: any): any => {
    if (v == null || typeof v !== 'object') return v;
    if (typeof v.toDate === 'function' || v instanceof Date) return v;
    if (Array.isArray(v)) return v.map(walk);
    const keys = Object.keys(v);
    if (typeof v.seconds === 'number' && keys.length <= 2)
      return new Date(v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6));
    if (typeof v._seconds === 'number' && keys.length <= 2)
      return new Date(v._seconds * 1000 + Math.floor((v._nanoseconds || 0) / 1e6));
    const out: any = {};
    for (const k of keys) out[k] = walk(v[k]);
    return out;
  };
  return walk(value);
}

/**
 * Step-section anchor offsets inside a scroll container: the scrollTop at
 * which each step section starts, plus a final anchor at the very end. Returns
 * null when a section is missing (pane not rendered yet).
 */
function stepAnchors(container: HTMLElement, prefix: string): number[] | null {
  const cTop = container.getBoundingClientRect().top;
  const tops: number[] = [];
  for (const s of DOSSIER_TIMELINE_STEPS) {
    const el = document.getElementById(`${prefix}${s.id}`);
    if (!el) return null;
    tops.push(el.getBoundingClientRect().top - cTop + container.scrollTop);
  }
  tops.push(container.scrollHeight);
  return tops;
}

/**
 * Map a scroll position from one pane onto the other by matching step anchors:
 * both panes render the same 8 step sections, so the position is expressed as
 * "fraction f through step i" in the source and re-applied in the destination.
 * Falls back to plain proportional mapping when anchors are unavailable.
 */
function mirrorTarget(
  src: HTMLElement,
  dst: HTMLElement,
  srcPrefix: string,
  dstPrefix: string,
): number | null {
  const a = stepAnchors(src, srcPrefix);
  const b = stepAnchors(dst, dstPrefix);
  const y = src.scrollTop;
  if (!a || !b) {
    const srcMax = src.scrollHeight - src.clientHeight;
    const dstMax = dst.scrollHeight - dst.clientHeight;
    if (srcMax <= 0 || dstMax <= 0) return null;
    return (y / srcMax) * dstMax;
  }
  let target: number;
  if (y <= a[0]) {
    target = a[0] > 0 ? (y / a[0]) * b[0] : b[0];
  } else {
    let i = 0;
    for (let k = 0; k < a.length - 1; k++) {
      if (y >= a[k]) i = k;
    }
    const span = a[i + 1] - a[i];
    const f = span > 0 ? (y - a[i]) / span : 0;
    target = b[i] + f * (b[i + 1] - b[i]);
  }
  return Math.max(0, Math.min(target, dst.scrollHeight - dst.clientHeight));
}

/**
 * Replay step bar = the REAL dossier TimelineBar (owner ruling 2026-09-02:
 * « make it the exact same as in dossier where it expands on hover ») inside
 * the replay's sticky glass shell — same 28 px medallions, same statuses,
 * same CSS-only hover/focus slide-reveal of each step's details (stamp /
 * status / blocked reason). Step statuses come from the LIVE dossier through
 * `getStepStatuses` — exactly what the dossier page's bar shows. One bar
 * above BOTH panes; clicks scroll the two panes in sync, and the
 * `[data-replay-bar]` hook keeps feeding the offset math below lg.
 */
function ReplayStepBar({
  steps,
  activeId,
  onStepClick,
}: {
  steps: StepState[];
  activeId: number;
  onStepClick: (id: number) => void;
}) {
  return (
    <div data-replay-bar className="glass-bar sticky top-0 z-30 w-full shrink-0 border-b border-hairline">
      <TimelineBar steps={steps} activeId={activeId} onStepClick={onStepClick} />
    </div>
  );
}

/** Step-section shell — same anatomy in both panes so the anchors line up. */
function StepSectionHeader({ position, label }: { position: number; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold tabular-nums text-ink-2 shadow-rim">
        {position}
      </span>
      <h3 className="t-title">{label}</h3>
    </div>
  );
}

export default function SessionReplayDialog({ rappel, open, onOpenChange }: Props) {
  const db = useFirestore();
  const id = rappel?.dossierId ?? null;
  const startTs = rappel?.sessionStartedAt ?? null;
  const endTs = rappel?.resolvedAt ?? null;

  const [activeStep, setActiveStep] = useState<number>(DOSSIER_TIMELINE_STEPS[0].id);
  // Below lg the panes stack; the « Avant » pane is collapsed by default.
  const [avantOpen, setAvantOpen] = useState(false);

  const stackRef = useRef<HTMLDivElement>(null); // scrolls below lg (stacked panes)
  const leftRef = useRef<HTMLDivElement>(null); // « Avant » pane scroller (≥ lg)
  const rightRef = useRef<HTMLDivElement>(null); // « Après » pane scroller (≥ lg)
  const suppressSpyRef = useRef(false); // programmatic (smooth) scroll in flight
  const syncGuardRef = useRef<'left' | 'right' | null>(null); // pane whose next event is our own write
  const rafSyncRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafSyncRef.current), []);

  const dossierRef = useMemo(() => (db && id && open ? doc(db, 'dossiers', id) : null), [db, id, open]);
  const { data: dossier, loading } = useDoc(dossierRef as any);
  // Real per-step statuses for the step bar — same computation as the dossier
  // page (`getStepStatuses`), from the live (« après ») dossier.
  const stepStates = useMemo(() => getStepStatuses(dossier), [dossier]);

  // ── Change awareness: diff the LIVE dossier against the session-start
  // snapshot so the real components can tint changed fields/entries. The
  // authoritative "what the gestionnaire changed" is the diff stored at save
  // time (before→after, both real snapshots); for an in-progress treatment we
  // fall back to diffing the start snapshot against the live dossier. ──
  const rappelId = rappel?.id ?? null;
  const [snaps, setSnaps] = useState<ReplaySnapshots | null>(null);
  const [snapsLoading, setSnapsLoading] = useState(false);
  useEffect(() => {
    if (!open || !db || !rappelId) {
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
  }, [open, db, rappelId]);
  const before = snaps?.before ?? null;
  const storedDiff = snaps?.diff ?? null;

  // ── « Avant » pane data: the frozen snapshot, hydrated so JSON-roundtripped
  // timestamps behave like live Timestamps inside the embedded components.
  // Memoised so the override props keep a stable identity (the components'
  // effects depend on them). ──
  const beforeDossier = useMemo(
    () => (before?.dossier ? hydrateTimestamps(before.dossier) : null),
    [before],
  );
  const { subs: beforeSubs, missing: beforeSubsMissing } = useMemo(() => {
    const subs: Record<string, any[]> = {};
    let missing = false;
    for (const name of SNAP_SUBCOLLECTIONS) {
      const list = before?.subs?.[name];
      if (Array.isArray(list)) subs[name] = hydrateTimestamps(list);
      else {
        subs[name] = [];
        missing = true;
      }
    }
    return { subs, missing };
  }, [before]);
  const beforeImportDoc = useMemo(() => {
    const iid = beforeDossier?.importDocId;
    if (!iid) return null;
    return beforeSubs.documents.find((d: any) => d?.id === iid) ?? null;
  }, [beforeDossier, beforeSubs]);

  const ready = !!db && !!id && open;
  const obsQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'observations') : null), [db, id, ready]);
  const planifQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'planifications') : null), [db, id, ready]);
  const photosQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'photos') : null), [db, id, ready]);
  const docsQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'documents') : null), [db, id, ready]);
  const piecesQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'rapport_pieces') : null), [db, id, ready]);
  const { data: observations } = useCollection<any>(obsQ as any);
  const { data: planifications } = useCollection<any>(planifQ as any);
  const { data: photos } = useCollection<any>(photosQ as any);
  const { data: documents } = useCollection<any>(docsQ as any);
  const { data: rapportPieces } = useCollection<any>(piecesQ as any);

  const liveDocDiff = useMemo(
    () => (before?.dossier && dossier ? classifyDossierChanges(before.dossier, dossier) : null),
    [before, dossier],
  );
  const liveSubDiffs = useMemo(() => {
    if (!before) return null;
    const live: Record<string, any[]> = {
      observations: observations || [],
      planifications: planifications || [],
      photos: photos || [],
      documents: documents || [],
      rapport_pieces: rapportPieces || [],
    };
    const out: Record<string, CollectionDiff> = {};
    for (const name of SNAP_SUBCOLLECTIONS) out[name] = diffCollectionById(before.subs?.[name], live[name]);
    return out;
  }, [before, observations, planifications, photos, documents, rapportPieces]);

  // Prefer the live recompute against the session-start snapshot — it reflects
  // the current data AND the latest (canonicalising) diff logic, so it doesn't
  // inherit a stale diff frozen by an earlier save. Only fall back to the
  // stored diff when there's no start snapshot to compare against.
  const docDiff = useMemo(
    () => liveDocDiff ?? storedDiff?.doc ?? null,
    [liveDocDiff, storedDiff],
  );
  const subDiffs = useMemo(
    () => liveSubDiffs ?? storedDiff?.subs ?? null,
    [liveSubDiffs, storedDiff],
  );

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

  const hlValue = useMemo<ReplayHighlightValue>(
    () => ({
      active: !!docDiff || !!subDiffs,
      statusForPath: (path: string): ChangeStatus => (docDiff ? docPathStatus(docDiff, path) : null),
      statusForEntry: (coll: string, entryId: string): ChangeStatus => {
        const d = subDiffs?.[coll];
        if (!d) return null;
        if (d.added.includes(entryId)) return 'added';
        if (d.modified.includes(entryId)) return 'modified';
        if (d.removed.includes(entryId)) return 'removed';
        return null;
      },
    }),
    [docDiff, subDiffs],
  );

  // ── Navigation: step bar click scrolls BOTH panes (≥ lg) or the stacked
  // container (below lg) to the step's section. ──
  const scrollToStep = useCallback((stepId: number) => {
    suppressSpyRef.current = true;
    setActiveStep(stepId);
    if (isLgViewport()) {
      const panes: Array<[HTMLDivElement | null, string]> = [
        [rightRef.current, AFTER_PREFIX],
        [leftRef.current, AVANT_PREFIX],
      ];
      for (const [container, prefix] of panes) {
        const el = document.getElementById(`${prefix}${stepId}`);
        if (!container || !el) continue;
        const top =
          container.scrollTop + (el.getBoundingClientRect().top - container.getBoundingClientRect().top) - 8;
        container.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior() });
      }
    } else {
      const container = stackRef.current;
      const el = document.getElementById(`${AFTER_PREFIX}${stepId}`);
      if (container && el) {
        const bar = container.querySelector('[data-replay-bar]') as HTMLElement | null;
        const barH = bar?.offsetHeight ?? 56;
        const top =
          container.scrollTop + (el.getBoundingClientRect().top - container.getBoundingClientRect().top) - barH - 8;
        container.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior() });
      }
    }
    window.setTimeout(() => {
      suppressSpyRef.current = false;
    }, 700);
  }, []);

  /** Scroll-spy: mark the step whose section is at the top of `container`. */
  const updateSpy = useCallback((container: HTMLElement, prefix: string, threshold: number) => {
    const cTop = container.getBoundingClientRect().top;
    let active = DOSSIER_TIMELINE_STEPS[0].id;
    for (const s of DOSSIER_TIMELINE_STEPS) {
      const el = document.getElementById(`${prefix}${s.id}`);
      if (!el) continue;
      if (el.getBoundingClientRect().top - cTop <= threshold) active = s.id;
    }
    setActiveStep((prev) => (prev === active ? prev : active));
  }, []);

  // ── Synchronized scrolling (≥ lg): mirror the scrolled pane onto the other
  // by matching step anchors, rAF-throttled, with a guard so the mirrored
  // write does not echo back. ──
  const handlePaneScroll = useCallback(
    (which: 'left' | 'right') => {
      if (suppressSpyRef.current) return;
      if (syncGuardRef.current === which) {
        syncGuardRef.current = null;
        return;
      }
      if (rafSyncRef.current) return;
      rafSyncRef.current = requestAnimationFrame(() => {
        rafSyncRef.current = 0;
        const src = which === 'left' ? leftRef.current : rightRef.current;
        const dst = which === 'left' ? rightRef.current : leftRef.current;
        const srcPrefix = which === 'left' ? AVANT_PREFIX : AFTER_PREFIX;
        const dstPrefix = which === 'left' ? AFTER_PREFIX : AVANT_PREFIX;
        if (src && dst && isLgViewport()) {
          const target = mirrorTarget(src, dst, srcPrefix, dstPrefix);
          if (target != null && Math.abs(dst.scrollTop - target) >= 1) {
            syncGuardRef.current = which === 'left' ? 'right' : 'left';
            dst.scrollTop = target;
          }
        }
        if (src) updateSpy(src, srcPrefix, 80);
      });
    },
    [updateSpy],
  );

  // Below lg the stacked container scrolls; the spy follows the AFTER sections.
  const handleStackScroll = useCallback(() => {
    if (suppressSpyRef.current) return;
    if (isLgViewport()) return;
    const container = stackRef.current;
    if (!container) return;
    const bar = container.querySelector('[data-replay-bar]') as HTMLElement | null;
    updateSpy(container, AFTER_PREFIX, (bar?.offsetHeight ?? 56) + 24);
  }, [updateSpy]);

  // Section composition — mirrors src/app/(app)/dossiers/[id]/page.tsx. Keep in
  // sync if the dossier timeline composition changes. readOnly + no-op handlers;
  // mutations are held off by ReadOnlyUserScope + readOnly props (see top note).
  const renderStep = (stepId: number) => {
    if (!id || !dossier || !dossierRef) return null;
    const common = { dossierId: id, dossier, dossierRef, readOnly: true };
    switch (stepId) {
      case 1:
        return (
          <>
            <Step1Import {...common} />
            <div className="mt-4">
              <Step2Information {...common} onEditPlanification={noop} onNewPlanification={noop} />
            </div>
            <div className="mt-4">
              <Step4Pieces {...common} onSendToChiffrage={noop} hidePhotos hideAccordSlots showBaseGarageSlots hideOtherSlots showAllNonAccordSlots />
            </div>
          </>
        );
      case 4:
        return (
          <>
            <Step3Planification {...common} onEditPlanification={noop} onNewPlanification={noop} typeFilter="Avant" />
            <div className="mt-4"><PhotosTab dossierId={id} onlyCategory="avant" /></div>
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextPhase="Avant" /></div>
          </>
        );
      case 6:
        return (
          <>
            <Step4Pieces {...common} onSendToChiffrage={noop} hidePhotos showOnlyAccordSlots hideCardinalPlus onlyImportTab showReformeSlots />
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextAccord="1er accord" /></div>
          </>
        );
      case 9:
        return (
          <>
            <Step3Planification {...common} onEditPlanification={noop} onNewPlanification={noop} typeFilter="En cours" />
            <div className="mt-4"><PhotosTab dossierId={id} onlyCategory="en_cours" /></div>
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextPhase="En cours" /></div>
          </>
        );
      case 11:
        return (
          <>
            <Step4Pieces {...common} onSendToChiffrage={noop} requireFirstAccordFilled hidePhotos showOnlyAccordSlots onlyImportTab cardinalFilter="2-plus" />
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextAccord="2ème accord ou +" /></div>
          </>
        );
      case 10:
        return (
          <>
            <Step3Planification {...common} onEditPlanification={noop} onNewPlanification={noop} typeFilter="Après" />
            <div className="mt-4"><PhotosTab dossierId={id} onlyCategory="apres" /></div>
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextPhase="Après" /></div>
          </>
        );
      case 7:
        return <Step6Rapport {...common} />;
      case 8:
        return <TypedDocumentsGrid dossierId={id} showOnlyNoteHonoraire />;
      default:
        return null;
    }
  };

  // « Avant » pane: the SAME composition, fed with the frozen snapshot via the
  // components' `…Override` props (no live subscriptions, no highlights — the
  // pane is rendered outside the ReplayHighlightProvider, so the highlight
  // context stays inert). Keep in sync with renderStep above.
  const renderStepBefore = (stepId: number) => {
    if (!id || !beforeDossier || !dossierRef) return null;
    const common = { dossierId: id, dossier: beforeDossier, dossierRef, readOnly: true };
    const ov = beforeSubs;
    switch (stepId) {
      case 1:
        return (
          <>
            <Step1Import {...common} importDocOverride={beforeImportDoc} />
            <div className="mt-4">
              <Step2Information {...common} onEditPlanification={noop} onNewPlanification={noop} />
            </div>
            <div className="mt-4">
              <Step4Pieces {...common} onSendToChiffrage={noop} hidePhotos hideAccordSlots showBaseGarageSlots hideOtherSlots showAllNonAccordSlots docsOverride={ov.documents} photosOverride={ov.photos} />
            </div>
          </>
        );
      case 4:
        return (
          <>
            <Step3Planification {...common} onEditPlanification={noop} onNewPlanification={noop} typeFilter="Avant" plansOverride={ov.planifications} />
            <div className="mt-4"><PhotosTab dossierId={id} onlyCategory="avant" photosOverride={ov.photos} /></div>
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextPhase="Avant" observationsOverride={ov.observations} /></div>
          </>
        );
      case 6:
        return (
          <>
            <Step4Pieces {...common} onSendToChiffrage={noop} hidePhotos showOnlyAccordSlots hideCardinalPlus onlyImportTab showReformeSlots docsOverride={ov.documents} photosOverride={ov.photos} />
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextAccord="1er accord" observationsOverride={ov.observations} /></div>
          </>
        );
      case 9:
        return (
          <>
            <Step3Planification {...common} onEditPlanification={noop} onNewPlanification={noop} typeFilter="En cours" plansOverride={ov.planifications} />
            <div className="mt-4"><PhotosTab dossierId={id} onlyCategory="en_cours" photosOverride={ov.photos} /></div>
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextPhase="En cours" observationsOverride={ov.observations} /></div>
          </>
        );
      case 11:
        return (
          <>
            <Step4Pieces {...common} onSendToChiffrage={noop} requireFirstAccordFilled hidePhotos showOnlyAccordSlots onlyImportTab cardinalFilter="2-plus" docsOverride={ov.documents} photosOverride={ov.photos} />
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextAccord="2ème accord ou +" observationsOverride={ov.observations} /></div>
          </>
        );
      case 10:
        return (
          <>
            <Step3Planification {...common} onEditPlanification={noop} onNewPlanification={noop} typeFilter="Après" plansOverride={ov.planifications} />
            <div className="mt-4"><PhotosTab dossierId={id} onlyCategory="apres" photosOverride={ov.photos} /></div>
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" readOnly contextPhase="Après" observationsOverride={ov.observations} /></div>
          </>
        );
      case 7:
        return <Step6Rapport {...common} dossierOverride={beforeDossier} />;
      case 8:
        return <TypedDocumentsGrid dossierId={id} showOnlyNoteHonoraire docsOverride={ov.documents} />;
      default:
        return null;
    }
  };

  return (
    // Dialog (element-specs §13: Material 3 — brief, clear headline; the panel
    // is `.glass-strong` from the primitive, bottom sheet below `lg`). This one
    // is a before/after comparison of a whole dossier — two half-screen panes —
    // so it takes the full frame; no footer actions (nothing to confirm).
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Effectively full-screen: the primitive's `lg:max-w-lg` must be beaten
          with the SAME `lg:` modifier (tailwind-merge only dedupes identical
          modifiers, so a bare max-w-none would lose to it in the cascade). */}
      <DialogContent calm className="lg:max-w-none max-lg:w-full w-[calc((100vw-24px)/var(--app-zoom))] h-[calc((100vh-24px)/var(--app-zoom))] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header: `t-title` headline (the ref stays in t-mono — numbers never
            in the display face) + one `t-caption` line of session facts. */}
        <DialogHeader className="shrink-0 space-y-1.5 border-b border-hairline px-6 py-4">
          <DialogTitle className="t-title flex flex-wrap items-center gap-2">
            Traitement du dossier{' '}
            <span className="t-mono text-base font-semibold">{rappel?.dossierRef || id}</span>
            {/* Read-only marker (§11): neutral pair, icon + label. */}
            <Badge variant="neutral" className="ml-1 gap-1 font-normal">
              <Eye className="h-3 w-3" aria-hidden /> Lecture seule
            </Badge>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="t-caption flex flex-wrap items-center gap-x-4 gap-y-1">
              {rappel?.recipientNom && (
                <span>
                  Gestionnaire : <span className="font-medium text-ink">{rappel.recipientNom}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                Début : <span className="font-medium text-ink">{fmtDateTime(startTs)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                {endTs ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-success-fg" aria-hidden />
                    Sauvegardé : <span className="font-medium text-ink">{fmtDateTime(endTs)}</span>
                  </>
                ) : (
                  // Status pair with its label (§11) — the treatment is still open.
                  <Badge variant="warning">Traitement en cours</Badge>
                )}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading || !dossier ? (
          // Skeleton shaped like the comparison (§15): step bar + two pane papers.
          <div className="flex-1 space-y-4 overflow-hidden px-3 py-4 sm:px-6" aria-busy="true" aria-live="polite">
            <div className="flex gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-28 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
            <div className="grid gap-3 lg:grid-cols-2">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="hidden h-64 w-full rounded-xl lg:block" />
            </div>
          </div>
        ) : (
          <div
            ref={stackRef}
            onScroll={handleStackScroll}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden"
          >
            <ReplayStepBar steps={stepStates} activeId={activeStep} onStepClick={scrollToStep} />
            {/* Change summary (§14: Carbon notification — inline, persists,
                every status with its icon; §11 counts as status-pair chips
                with their label). Stays above BOTH panes. */}
            <div className="shrink-0 px-3 pt-3 sm:px-6">
              {snapsLoading ? (
                <div className="t-caption flex items-center gap-2 rounded-[10px] bg-surface-2 px-3 py-2" aria-busy="true">
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> Analyse des modifications du gestionnaire…
                </div>
              ) : !hasBaseline ? (
                <Alert variant="warning">
                  <AlertTriangle />
                  <AlertDescription>
                    Aucun instantané de départ n&apos;a été enregistré pour ce traitement&nbsp;: les modifications
                    ne peuvent pas être mises en évidence. Le gestionnaire doit ouvrir le dossier depuis
                    «&nbsp;Mes rappels&nbsp;» pour démarrer une session.
                  </AlertDescription>
                </Alert>
              ) : summary.total === 0 ? (
                <Alert>
                  <Info />
                  <AlertDescription>Aucune modification détectée pendant ce traitement.</AlertDescription>
                </Alert>
              ) : (
                <div className="t-caption flex flex-wrap items-center gap-2 rounded-[10px] bg-surface-2 px-3 py-2">
                  <span className="font-medium text-ink">Modifications du gestionnaire&nbsp;:</span>
                  {summary.added > 0 && (
                    <Badge variant="success">{summary.added} ajout{summary.added > 1 ? 's' : ''}</Badge>
                  )}
                  {summary.modified > 0 && (
                    <Badge variant="warning">{summary.modified} modification{summary.modified > 1 ? 's' : ''}</Badge>
                  )}
                  {summary.removed > 0 && (
                    <Badge variant="danger">{summary.removed} suppression{summary.removed > 1 ? 's' : ''}</Badge>
                  )}
                </div>
              )}
            </div>

            {/* ── Comparison: « Avant » (frozen snapshot, plain) | « Après »
                (live replica, highlighted). Side by side ≥ lg, each pane
                scrolling on its own with mirrored positions; stacked below lg
                with the Avant pane collapsible. ── */}
            <div className="flex flex-col gap-3 px-3 pb-4 pt-3 sm:px-6 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:gap-x-6 lg:pb-3">
              {/* Avant */}
              <div className="flex min-w-0 flex-col lg:min-h-0">
                {/* Pane header — persistent identity cap (NN/g, comparison
                    tables: without a header that stays put readers forget
                    which column is which). Sits ABOVE the pane scroller, so
                    at lg+ the content scrolls underneath it and the label
                    never leaves the screen. Recessed neutral surface
                    (surface-3) = the frozen original. */}
                <div
                  className={cn(
                    'flex shrink-0 items-start justify-between gap-2 rounded-t-lg border border-hairline bg-surface-3 px-3 py-2 sm:px-4',
                    !avantOpen && 'max-lg:rounded-b-lg',
                  )}
                >
                  <div className="min-w-0">
                    <p className="t-body-sm flex items-center gap-1.5 font-semibold text-ink">
                      <History className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                      Avant le rappel — document d&apos;origine
                    </p>
                    <p className="t-caption mt-0.5 text-ink-3">
                      L&apos;état du dossier tel qu&apos;il était à l&apos;envoi du rappel&nbsp;: une copie figée, non modifiable.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvantOpen((v) => !v)}
                    className="t-caption inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-ink-3 transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                    aria-expanded={avantOpen}
                  >
                    {avantOpen ? 'Masquer' : 'Afficher'}
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', avantOpen && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                </div>
                <div
                  ref={leftRef}
                  onScroll={() => handlePaneScroll('left')}
                  className={cn(
                    'replay-pane min-w-0 rounded-b-lg border border-t-0 border-hairline',
                    'lg:min-h-0 lg:flex-1 lg:overflow-y-auto',
                    !avantOpen && 'hidden lg:block',
                  )}
                >
                  {snapsLoading ? (
                    <div className="space-y-3 p-4" aria-busy="true">
                      <Skeleton className="h-6 w-40 rounded-md" />
                      <Skeleton className="h-40 w-full rounded-xl" />
                      <Skeleton className="h-40 w-full rounded-xl" />
                    </div>
                  ) : !beforeDossier ? (
                    // Honest fallback: no start snapshot → no origin values.
                    // The step shells stay so the scroll anchors still line up.
                    <div className="px-3 py-4 sm:px-4">
                      <p className="t-caption mb-2 text-ink-3">
                        Aucun instantané de départ n&apos;a été enregistré pour cette session&nbsp;:
                        les valeurs d&apos;origine ne sont pas disponibles.
                      </p>
                      {DOSSIER_TIMELINE_STEPS.map((step, idx) => (
                        <section
                          key={step.id}
                          id={`${AVANT_PREFIX}${step.id}`}
                          className="border-b border-hairline py-6 first:pt-2 last:border-b-0"
                        >
                          <StepSectionHeader position={idx + 1} label={step.label} />
                          <p className="t-caption text-ink-3">—</p>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <ReadOnlyUserScope>
                      {/* Same surgical read-only treatment as the right pane
                          (scope + readOnly props — navigation stays alive). NO
                          highlight provider here — the « Avant » pane renders
                          plain. */}
                      <div className="min-w-0">
                        <div className="px-3 py-4 sm:px-4">
                          {beforeSubsMissing && (
                            <p className="t-caption mb-2 text-ink-3">
                              Certaines listes (documents, photos, planifications…) n&apos;ont pas
                              été enregistrées dans l&apos;instantané de départ et apparaissent vides.
                            </p>
                          )}
                          {DOSSIER_TIMELINE_STEPS.map((step, idx) => (
                            <section
                              key={step.id}
                              id={`${AVANT_PREFIX}${step.id}`}
                              className="border-b border-hairline py-6 first:pt-2 last:border-b-0"
                            >
                              <StepSectionHeader position={idx + 1} label={step.label} />
                              {renderStepBefore(step.id)}
                            </section>
                          ))}
                        </div>
                      </div>
                    </ReadOnlyUserScope>
                  )}
                </div>
              </div>

              {/* Après */}
              <div className="flex min-w-0 flex-col lg:min-h-0">
                {/* Pane header — same anatomy as the Avant cap, but on the
                    paper surface (bg-card) and carrying the highlight legend,
                    so the status colours used inside are explained right
                    where they appear (status pairs always ship with their
                    label). */}
                <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-3 gap-y-1.5 rounded-t-lg border border-hairline bg-card px-3 py-2 sm:px-4">
                  <div className="min-w-0">
                    <p className="t-body-sm flex items-center gap-1.5 font-semibold text-ink">
                      <Pencil className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                      Après le rappel — document modifié
                    </p>
                    <p className="t-caption mt-0.5 text-ink-3">
                      Le dossier tel qu&apos;il est aujourd&apos;hui&nbsp;: ce que le gestionnaire a changé pendant le traitement est surligné.
                    </p>
                  </div>
                  {hasBaseline && (
                    <div className="flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5" aria-label="Légende des surlignages">
                      <span className="t-caption inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-[3px] bg-status-success-bg ring-1 ring-inset ring-status-success-fg/30" aria-hidden />
                        ajouté
                      </span>
                      <span className="t-caption inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-[3px] bg-status-warning-bg ring-1 ring-inset ring-status-warning-fg/30" aria-hidden />
                        modifié
                      </span>
                      <span className="t-caption inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-[3px] bg-status-danger-bg ring-1 ring-inset ring-status-danger-fg/30" aria-hidden />
                        supprimé
                      </span>
                    </div>
                  )}
                </div>
                <div
                  ref={rightRef}
                  onScroll={() => handlePaneScroll('right')}
                  className="replay-pane min-w-0 rounded-b-lg border border-t-0 border-hairline lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
                >
                  <ReplayHighlightProvider value={hlValue}>
                    <ReadOnlyUserScope>
                      {/* Read-only without a disabled fieldset: navigation (tabs,
                          collapsibles, lightboxes) must work; mutations are held
                          off by ReadOnlyUserScope + readOnly props + no-op
                          callbacks (see the audit note at the top). */}
                      <div className="min-w-0">
                        <div className="px-3 py-4 sm:px-4">
                          {DOSSIER_TIMELINE_STEPS.map((step, idx) => (
                            <section
                              key={step.id}
                              id={`${AFTER_PREFIX}${step.id}`}
                              className="border-b border-hairline py-6 first:pt-2 last:border-b-0"
                            >
                              <StepSectionHeader position={idx + 1} label={step.label} />
                              {renderStep(step.id)}
                            </section>
                          ))}
                        </div>
                      </div>
                    </ReadOnlyUserScope>
                  </ReplayHighlightProvider>
                </div>
              </div>
            </div>
            <style>{PANE_FIT_CSS}</style>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
