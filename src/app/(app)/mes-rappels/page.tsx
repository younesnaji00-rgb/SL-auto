'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Inbox, ChevronDown, ChevronRight, Send, ScrollText, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, STICKY_HEAD, STICKY_CELL, EmptyCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SlidingThumb } from '@/components/ui/sliding-thumb';
import { ToastAction } from '@/components/ui/toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRappels, useRappelsSent, type Rappel } from '@/hooks/use-rappels';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { hasPermission, SUB_PERMISSIONS, rappelsEnvoyesRoleDefault } from '@/lib/permissions';
import { titleForRoute } from '@/lib/nav-groups';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import SessionReplayDialog from './session-replay-dialog';
import { RappelDetailContent, RappelDetailPlaceholder, relativeAge } from './rappel-detail-panel';

const SESSION_KEY = (dossierId: string) => `rappel-active-session-${dossierId}`;

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

// Terracotta = time (2026-09-02): today's rappels carry the warm chip.
function isToday(ts: any): boolean {
  const d = toDate(ts);
  return !!d && d.toDateString() === new Date().toDateString();
}

function formatDate(ts: any): string {
  const d = toDate(ts);
  if (!d) return '—';
  try { return format(d, 'dd/MM/yyyy HH:mm', { locale: fr }); } catch { return '—'; }
}

/** Queue cells: date only (dd/MM/yyyy per the dates-as-values ruling); the
 *  clock time and relative age ride in the tooltip. */
function formatDateShort(ts: any): string {
  const d = toDate(ts);
  if (!d) return '—';
  try { return format(d, 'dd/MM/yyyy', { locale: fr }); } catch { return '—'; }
}

function tsMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  const n = Number(ts);
  return Number.isFinite(n) ? n : 0;
}

interface SentGroup {
  key: string;
  batchId?: string;
  rappels: Rappel[];
  recipientNames: string[];   // distinct, in insertion order
  dossierCount: number;       // distinct dossier ids
  latest: any;
  newCount: number;           // !read
  readCount: number;          // read && !resolvedAt
  treatedCount: number;       // !!resolvedAt
}

function groupSent(rappels: Rappel[]): SentGroup[] {
  const map = new Map<string, SentGroup>();
  const seenRecipients = new Map<string, Set<string>>(); // group key → recipientUid set
  const seenDossiers = new Map<string, Set<string>>();   // group key → dossierId set
  for (const r of rappels) {
    // Legacy data (no batchId) → each rappel is its own bundle of 1.
    const key = r.batchId || `solo:${r.id}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        batchId: r.batchId,
        rappels: [],
        recipientNames: [],
        dossierCount: 0,
        latest: r.createdAt,
        newCount: 0,
        readCount: 0,
        treatedCount: 0,
      };
      map.set(key, g);
      seenRecipients.set(key, new Set());
      seenDossiers.set(key, new Set());
    }
    g.rappels.push(r);
    if (r.resolvedAt) g.treatedCount++;
    else if (r.read) g.readCount++;
    else g.newCount++;
    if (tsMillis(r.createdAt) > tsMillis(g.latest)) g.latest = r.createdAt;
    const recipientSet = seenRecipients.get(key)!;
    if (r.recipientUid && !recipientSet.has(r.recipientUid)) {
      recipientSet.add(r.recipientUid);
      g.recipientNames.push(r.recipientNom || '—');
    }
    const dossierSet = seenDossiers.get(key)!;
    if (r.dossierId && !dossierSet.has(r.dossierId)) {
      dossierSet.add(r.dossierId);
      g.dossierCount++;
    }
  }
  return Array.from(map.values()).sort((a, b) => tsMillis(b.latest) - tsMillis(a.latest));
}

function formatRecipients(names: string[]): string {
  if (names.length === 0) return '—';
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(', ');
  return `${names.length} destinataires`;
}

// ── Status chip (element-specs §11: Carbon tag / Carbon notification / dataviz
//    "status colours are reserved… always with a label"): one helper maps a
//    rappel state to the same Badge status pair everywhere on the page. ──

type RappelState = 'nouveau' | 'lu' | 'traite';

function rappelState(r: Rappel): RappelState {
  if (r.resolvedAt) return 'traite';
  if (r.read) return 'lu';
  return 'nouveau';
}

const RAPPEL_STATE_VARIANT: Record<RappelState, 'info' | 'neutral' | 'success'> = {
  nouveau: 'info',
  lu: 'neutral',
  traite: 'success',
};

const RAPPEL_STATE_LABEL: Record<RappelState, string> = {
  nouveau: 'Nouveau',
  lu: 'Lu',
  traite: 'Traité',
};

function StateChip({ rappel }: { rappel: Rappel }) {
  const s = rappelState(rappel);
  return <Badge variant={RAPPEL_STATE_VARIANT[s]}>{RAPPEL_STATE_LABEL[s]}</Badge>;
}

/**
 * Count of one state inside a sent bundle (§11 + Few: colour only where there
 * is something to see — a zero is plain muted ink, never a coloured chip).
 */
function CountChip({ tone, value }: { tone: RappelState; value: number }) {
  if (value === 0) {
    return <span className="t-caption tabular-nums text-ink-4">{RAPPEL_STATE_LABEL[tone]} 0</span>;
  }
  return (
    <Badge variant={RAPPEL_STATE_VARIANT[tone]} className="tabular-nums">
      {RAPPEL_STATE_LABEL[tone]} {value}
    </Badge>
  );
}

/** Empty cell = « — » in ink-4 — the shared table primitive's spelling. */
const EmptyValue = EmptyCell;

// ── Loading skeleton (element-specs §15: NN/g skeleton screens "mirror the
//    final layout"; Carbon data table "skeleton states instead of spinners"):
//    header row + 6 rows at 44 px in the table's own frame. ──
function TableSkeleton({ heads = 5 }: { heads?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="flex h-10 items-center gap-4 border-b border-hairline px-4">
        {Array.from({ length: heads }).map((_, i) => (
          <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-28' : i === heads - 1 ? 'ml-auto w-20' : 'w-24')} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

type Vue = 'recus' | 'envoyes';
type Segment = 'a-traiter' | 'traites';

export default function MesRappelsPage() {
  const { rappels, loading } = useRappels();
  const { rappels: sentRappels, loading: sentLoading } = useRappelsSent();
  const { profile } = useCurrentUser();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // The rappel whose treatment session is being inspected in the read-only
  // replay lightbox (null = closed). Works for both the recipient (own work)
  // and the sender/manager (inspecting an assignee's work).
  const [replayRappel, setReplayRappel] = useState<Rappel | null>(null);

  const sentGroups = useMemo(() => groupSent(sentRappels), [sentRappels]);

  // Per-user sub-permission gates for the two tabs. "Reçus" defaults to visible
  // for everyone; "Envoyés" defaults to hidden for Gestionnaires (they only
  // receive rappels, never send them) and visible for senders. The admin can
  // override either tab independently via the permissions UI on
  // /utilisateurs/[uid].
  const recusVisible = hasPermission(profile, SUB_PERMISSIONS.RAPPELS_RECUS, true);
  const envoyesVisible = hasPermission(
    profile,
    SUB_PERMISSIONS.RAPPELS_ENVOYES,
    rappelsEnvoyesRoleDefault(profile?.role),
  );
  // Pick a default tab the user can actually see; fall back to "recus" if
  // both are denied (rare; the empty state is still informative).
  const defaultTab: Vue = recusVisible ? 'recus' : envoyesVisible ? 'envoyes' : 'recus';

  // ── Tabs (element-specs §7: NN/g "Tabs Used Right" — the selected tab is
  //    addressable; blueprint: tab in `?vue=`, default tab keeps a clean URL).
  //    Read once on mount, write with history.replaceState (no useSearchParams). ──
  const [vue, setVue] = useState<Vue | null>(null);
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('vue');
    if (v === 'recus' || v === 'envoyes') setVue(v);
  }, []);
  const visible = (v: Vue) => (v === 'recus' ? recusVisible : envoyesVisible);
  const activeVue: Vue = vue && visible(vue) ? vue : defaultTab;
  const changeVue = (next: Vue) => {
    setVue(next);
    const url = new URL(window.location.href);
    if (next === 'recus') url.searchParams.delete('vue');
    else url.searchParams.set('vue', next);
    window.history.replaceState(window.history.state, '', url);
  };

  // ── Reçus queue (addendum 2026-09-03 bis §B): « À traiter » is FIFO —
  //    oldest first (action-needed order, addendum ter A); « Traités » leaves
  //    the queue and reads newest-treated first. Sorted here, NOT in the hook
  //    (the notification bell shares useRappels and keeps newest-first). ──
  const [segment, setSegment] = useState<Segment>('a-traiter');
  const aTraiter = useMemo(
    () => rappels.filter((r) => !r.resolvedAt).sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt)),
    [rappels],
  );
  const traites = useMemo(
    () => rappels.filter((r) => !!r.resolvedAt).sort((a, b) => tsMillis(b.resolvedAt) - tsMillis(a.resolvedAt)),
    [rappels],
  );
  const queue = segment === 'a-traiter' ? aTraiter : traites;

  // Selection = the master-detail state. Row click selects (and marks Lu —
  // the honest place for "read"); navigation to the dossier is an explicit
  // act (ref cell / panel button). Deep-linkable via ?rappel=<id>.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => queue.find((r) => r.id === selectedId) ?? null, [queue, selectedId]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('rappel');
    if (id) setSelectedId(id);
  }, []);
  // A deep-linked rappel may live in the other segment — follow it once.
  const segmentInitRef = useRef(false);
  useEffect(() => {
    if (segmentInitRef.current || loading || !selectedId) return;
    segmentInitRef.current = true;
    if (!aTraiter.some((r) => r.id === selectedId) && traites.some((r) => r.id === selectedId)) {
      setSegment('traites');
    }
  }, [loading, selectedId, aTraiter, traites]);

  const writeSelectedUrl = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('rappel', id);
    else url.searchParams.delete('rappel');
    window.history.replaceState(window.history.state, '', url);
  };

  const markRead = (r: Rappel) => {
    if (!db || r.read) return;
    updateDoc(doc(db, 'rappels', r.id), {
      read: true,
      ...(r.seenAt ? {} : { seenAt: serverTimestamp() }),
    }).catch(() => {});
  };

  const selectRappel = (r: Rappel) => {
    setSelectedId(r.id);
    writeSelectedUrl(r.id);
    markRead(r);
  };

  const clearSelection = () => {
    setSelectedId(null);
    writeSelectedUrl(null);
  };

  const changeSegment = (next: Segment) => {
    if (next === segment) return;
    setSegment(next);
    const nextQueue = next === 'a-traiter' ? aTraiter : traites;
    if (selectedId && !nextQueue.some((r) => r.id === selectedId)) clearSelection();
  };

  // The panel is a side pane on xl+ and a sheet below (responsive rule).
  const [isXl, setIsXl] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const update = () => setIsXl(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Tab counts: unread received, and sent rappels still waiting on someone.
  const unreadCount = useMemo(() => rappels.filter((r) => !r.read && !r.resolvedAt).length, [rappels]);
  const pendingSentCount = useMemo(() => sentGroups.reduce((n, g) => n + g.newCount + g.readCount, 0), [sentGroups]);

  const openRappel = async (r: Rappel) => {
    // F9.A: open a rappel "session" — generate sessionId on first
    // click (and persist it on the doc), or re-stamp the existing
    // one. The localStorage key is what addObservation reads to
    // auto-tag observations during this session, and what the
    // dossier page reads to show the sticky "Sauvegarder" button.
    const existingSid = r.sessionId;
    let sid = existingSid || null;
    if (db && !existingSid) {
      // AWAIT the first write so the dossier page's session
      // lookup (queried on mount) reliably finds the sessionId.
      sid = newSessionId();
      try {
        await updateDoc(doc(db, 'rappels', r.id), {
          read: true,
          sessionId: sid,
          sessionStartedAt: serverTimestamp(),
          seenAt: serverTimestamp(),
        });
      } catch {}
      // The session-start snapshot (baseline for the manager's
      // diff) is captured on the dossier page once it loads —
      // see ensureSnapshotBefore there.
    } else if (db && !r.read) {
      markRead(r);
    }
    if (typeof window !== 'undefined' && sid) {
      try { window.localStorage.setItem(SESSION_KEY(r.dossierId), sid); } catch {}
    }
    router.push(`/dossiers/${r.dossierId}`);
  };

  const restoreTreated = (r: Rappel) => {
    if (!db) return;
    updateDoc(doc(db, 'rappels', r.id), { resolvedAt: null })
      .then(() => toast({ title: 'Rappel remis en attente' }))
      .catch(() => toast({ title: 'Erreur', description: 'Impossible d’annuler', variant: 'destructive' }));
  };

  const markTreated = (r: Rappel) => {
    if (!db || r.resolvedAt) return;
    // The row leaves « À traiter » (queue precedent: done leaves the inbox);
    // selection lands on the next item so a keyboard run never loses place.
    const idx = aTraiter.findIndex((x) => x.id === r.id);
    const next = aTraiter[idx + 1] ?? aTraiter[idx - 1] ?? null;
    updateDoc(doc(db, 'rappels', r.id), { resolvedAt: serverTimestamp() })
      .then(() => {
        if (typeof window !== 'undefined') {
          try { window.localStorage.removeItem(SESSION_KEY(r.dossierId)); } catch {}
        }
        if (selectedId === r.id) {
          if (next && segment === 'a-traiter') selectRappel(next);
          else clearSelection();
        }
        // Reversible → undo in the toast, never a confirm (addendum ter E).
        toast({
          title: 'Rappel marqué comme traité',
          action: (
            <ToastAction altText="Annuler" onClick={() => restoreTreated(r)}>
              Annuler
            </ToastAction>
          ),
        });
      })
      .catch(() => {
        toast({ title: 'Erreur', description: 'Impossible de marquer comme traité', variant: 'destructive' });
      });
  };

  // ── Keyboard spine (same model as the dossiers list, group « Mes rappels »):
  //    arrows/jk move the selection; Entrée/t/Échap register only while a
  //    rappel is selected so native button and dialog keys are never hijacked.
  //    Keyboard moves don't animate (motion-spec F0). ──
  const scrollRowIntoView = (id: string) => {
    if (typeof document === 'undefined') return;
    document
      .querySelector(`[data-rappel-row="${typeof CSS !== 'undefined' ? CSS.escape(id) : id}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  };
  const moveSelection = (delta: number) => {
    if (queue.length === 0) return;
    const idx = queue.findIndex((r) => r.id === selectedId);
    const next =
      idx === -1
        ? delta > 0 ? queue[0] : queue[queue.length - 1]
        : queue[Math.min(queue.length - 1, Math.max(0, idx + delta))];
    if (next && next.id !== selectedId) {
      selectRappel(next);
      scrollRowIntoView(next.id);
    }
  };
  const listActive = activeVue === 'recus' && queue.length > 0;
  useHotkeys(
    [
      { keys: 'arrowdown', label: 'Rappel suivant', group: 'Mes rappels', handler: () => moveSelection(1), enabled: listActive },
      { keys: 'j', label: 'Rappel suivant', group: 'Mes rappels', handler: () => moveSelection(1), enabled: listActive },
      { keys: 'arrowup', label: 'Rappel précédent', group: 'Mes rappels', handler: () => moveSelection(-1), enabled: listActive },
      { keys: 'k', label: 'Rappel précédent', group: 'Mes rappels', handler: () => moveSelection(-1), enabled: listActive },
      { keys: 'enter', label: 'Ouvrir le dossier', group: 'Mes rappels', handler: () => { if (selected) openRappel(selected); }, enabled: activeVue === 'recus' && !!selected },
      { keys: 't', label: 'Marquer traité', group: 'Mes rappels', handler: () => { if (selected && !selected.resolvedAt) markTreated(selected); }, enabled: activeVue === 'recus' && !!selected && !selected.resolvedAt },
      { keys: 'escape', label: 'Fermer le détail', group: 'Mes rappels', handler: clearSelection, enabled: activeVue === 'recus' && !!selected },
    ],
    [activeVue, segment, queue, selectedId, selected],
  );

  // Count pill on a tab or segment (§11: count pills are the neutral surface
  // step — status colour is reserved for states, not for "how many").
  const tabCount = (n: number) =>
    n > 0 ? (
      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
        {n}
      </span>
    ) : null;

  return (
    // Layout as at 3d5629a: header → tabs → content per tab. The Tabs root
    // wraps the header so the tab strip can sit in the PageHeader `tabs` slot
    // (same position, under the title). Sections 32 px apart (addendum
    // 2026-09-02 §4).
    <Tabs value={activeVue} onValueChange={(v) => changeVue(v as Vue)} className="space-y-8">
      {/* Page header (element-specs §1: Polaris Page — title only, no page
          primary here: rappels are sent from a dossier, not from this list). */}
      <PageHeader
        title={titleForRoute('/mes-rappels') ?? 'Mes rappels'}
        tabs={
          // Raised-tab-on-track tabs (addendum 2026-09-02 §2, supersedes the
          // underline idiom): the recessed track, raised active card and 2 px
          // accent bar all come from the primitive — no local overrides.
          <TabsList>
            {recusVisible && (
              <TabsTrigger value="recus" className="gap-1.5">
                Reçus
                {tabCount(unreadCount)}
              </TabsTrigger>
            )}
            {envoyesVisible && (
              <TabsTrigger value="envoyes" className="gap-1.5">
                Envoyés
                {tabCount(pendingSentCount)}
              </TabsTrigger>
            )}
          </TabsList>
        }
      />

      {recusVisible && (
        <TabsContent value="recus" className="mt-0">
          {loading ? (
            <Card className="overflow-hidden"><TableSkeleton heads={6} /></Card>
          ) : rappels.length === 0 ? (
            // Empty state (§12: NN/g — state + reason; Polaris — one line).
            // No action: a rappel can only be sent to you from a dossier.
            <EmptyState
              icon={<Inbox />}
              title="Aucun rappel reçu"
              description="Les rappels envoyés depuis un dossier apparaîtront ici."
              dashed={false}
            />
          ) : (
            // Master-detail (addendum 2026-09-03 bis §A): slim queue table +
            // detail pane. Row click SELECTS; the ref cell keeps the session
            // handshake click-through; « Ouvrir le dossier » is explicit.
            <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:items-start">
              <div className="min-w-0 space-y-4">
                {/* « À traiter / Traités » — a value picker, so segmented +
                    SlidingThumb (tabs are reserved for view switchers). Count
                    only on À traiter: a count must be able to hit zero. */}
                <div
                  role="group"
                  aria-label="État des rappels"
                  className="relative isolate flex h-9 w-fit items-center gap-0.5 rounded-md bg-surface-2 p-0.5"
                >
                  <SlidingThumb className="rounded-md bg-accent shadow-rim" deps={[segment, aTraiter.length]} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-seg-active={segment === 'a-traiter'}
                    aria-pressed={segment === 'a-traiter'}
                    onClick={() => changeSegment('a-traiter')}
                    className="relative z-[1] h-8 gap-1.5 px-3 shadow-none"
                  >
                    À traiter
                    {tabCount(aTraiter.length)}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-seg-active={segment === 'traites'}
                    aria-pressed={segment === 'traites'}
                    onClick={() => changeSegment('traites')}
                    className="relative z-[1] h-8 px-3 shadow-none"
                  >
                    Traités
                  </Button>
                </div>

                {queue.length === 0 ? (
                  segment === 'a-traiter' ? (
                    // Inbox zero — quietly celebratory (the emptiness is an
                    // achievement), one line, no theatrics.
                    <EmptyState
                      icon={<CheckCircle2 />}
                      title="Tout est traité"
                      description="Aucun rappel en attente — les nouveaux apparaîtront ici."
                      dashed={false}
                    />
                  ) : (
                    <EmptyState
                      icon={<Inbox />}
                      title="Aucun rappel traité"
                      description="Les rappels marqués comme traités apparaîtront ici."
                      dashed={false}
                    />
                  )
                ) : (
                  // Queue table (§3 + addendum bis §B): 6 columns, one-line
                  // grid, FIFO. Unread = teal left bar + full-ink ladder; the
                  // Nouveau chip is the only filled info pair. Emphasis budget:
                  // ref (mono 600) + statut chip.
                  <Card className="overflow-hidden">
                    <Table regionLabel="Rappels reçus">
                      <TableHeader>
                        <TableRow>
                          <TableHead className={cn(STICKY_HEAD, 'min-w-[11rem]')}>Référence dossier</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Observation</TableHead>
                          <TableHead>Envoyé par</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queue.map((r) => {
                          const state = rappelState(r);
                          const isSelected = selectedId === r.id;
                          return (
                            <TableRow
                              key={r.id}
                              data-rappel-row={r.id}
                              data-state={isSelected ? 'selected' : undefined}
                              className="cursor-pointer"
                              onClick={() => selectRappel(r)}
                            >
                              <TableCell className={cn(STICKY_CELL, 'relative t-mono font-semibold')}>
                                {/* Unread bar — region stimulus on the left
                                    scan rail (research: dots fail, bars work);
                                    teal = attention, never terracotta. */}
                                {state === 'nouveau' && (
                                  <span
                                    aria-hidden
                                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                                  />
                                )}
                                {/* The session-handshake click-through (tour
                                    contract: the ref cell opens the dossier). */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openRappel(r); }}
                                  className="rounded-sm text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  title="Ouvrir le dossier"
                                >
                                  {r.dossierRef || r.dossierId}
                                </button>
                              </TableCell>
                              <TableCell>
                                <StateChip rappel={r} />
                              </TableCell>
                              <TableCell className="max-w-[24rem]">
                                <span
                                  className={cn('block truncate', state === 'nouveau' ? 'font-medium text-ink' : 'text-ink-2')}
                                  title={r.observation || undefined}
                                >
                                  {r.observation || <EmptyValue />}
                                </span>
                              </TableCell>
                              <TableCell className={state === 'nouveau' ? 'text-ink' : 'text-ink-2'}>
                                {r.senderNom || <EmptyValue />}
                              </TableCell>
                              {/* Dates are values → absolute, full ink; the
                                  relative age lives in the tooltip (2026-09-03
                                  §C). Today keeps the warm TIME chip. */}
                              <TableCell>
                                <span className="inline-flex items-center gap-2">
                                  <span title={[formatDate(r.createdAt), relativeAge(r.createdAt)].filter(Boolean).join(' · ')}>
                                    {formatDateShort(r.createdAt)}
                                  </span>
                                  {isToday(r.createdAt) && <Badge variant="time">Aujourd&apos;hui</Badge>}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {!r.resolvedAt ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markTreated(r);
                                    }}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Marquer traité
                                  </Button>
                                ) : (
                                  <EmptyValue />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </div>

              {/* Detail pane (xl+): sticky, scrolls internally. Always present
                  so selecting never reflows the table (layout stability). */}
              <Card className="hidden xl:block xl:sticky xl:top-6 xl:max-h-[calc((100dvh-140px)/var(--app-zoom))] xl:overflow-y-auto">
                <div className="p-6">
                  {selected ? (
                    <RappelDetailContent
                      rappel={selected}
                      active={isXl}
                      onOpenDossier={openRappel}
                      onMarkTreated={markTreated}
                      onShowReplay={(r) => setReplayRappel(r)}
                    />
                  ) : (
                    <RappelDetailPlaceholder />
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Below xl the same detail opens as a sheet. */}
          <Sheet open={!isXl && !!selected} onOpenChange={(o) => { if (!o) clearSelection(); }}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
              <SheetHeader className="sr-only">
                <SheetTitle>Détail du rappel</SheetTitle>
                <SheetDescription>Observation, travail effectué et actions du rappel sélectionné.</SheetDescription>
              </SheetHeader>
              {selected && (
                <div className="mt-2">
                  <RappelDetailContent
                    rappel={selected}
                    active={!isXl}
                    onOpenDossier={openRappel}
                    onMarkTreated={markTreated}
                    onShowReplay={(r) => setReplayRappel(r)}
                  />
                </div>
              )}
            </SheetContent>
          </Sheet>
        </TabsContent>
      )}

      {envoyesVisible && (
        <TabsContent value="envoyes" className="mt-0">
          {sentLoading ? (
            <Card className="overflow-hidden"><TableSkeleton heads={5} /></Card>
          ) : sentGroups.length === 0 ? (
            // Empty state (§12): state + reason + ONE action — the place
            // where rappels are sent from. `tonal` (the header has no primary).
            <EmptyState
              icon={<Send />}
              title="Aucun rappel envoyé"
              description="Les rappels que vous envoyez depuis un dossier apparaîtront ici."
              dashed={false}
              action={
                <Button variant="tonal" asChild>
                  <Link href="/dossiers">Ouvrir les dossiers</Link>
                </Button>
              }
            />
          ) : (
            // Expandable table (§3): chevron column first (a real button with
            // aria-expanded), text left, the two numeric columns (Dossiers,
            // Statut counts) right-aligned with tabular digits and their
            // headers aligned the same way (Polaris: never centred).
            <Card className="overflow-hidden">
              <Table regionLabel="Rappels envoyés">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><span className="sr-only">Détails</span></TableHead>
                    <TableHead>Destinataire(s)</TableHead>
                    <TableHead className="text-right">Dossiers</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentGroups.map((g) => {
                    const isOpen = expanded.has(g.key);
                    const total = g.rappels.length;
                    return (
                      <React.Fragment key={g.key}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleExpand(g.key)}
                        >
                          <TableCell className="w-10">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-expanded={isOpen}
                              aria-label={isOpen ? 'Réduire le détail' : 'Voir le détail'}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(g.key);
                              }}
                            >
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium" title={g.recipientNames.join(', ')}>
                            {formatRecipients(g.recipientNames)}
                            <span className="t-caption ml-2 tabular-nums">
                              {total} rappel{total > 1 ? 's' : ''}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{g.dossierCount}</TableCell>
                          <TableCell>{formatDate(g.latest)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1">
                              <CountChip tone="nouveau" value={g.newCount} />
                              <CountChip tone="lu" value={g.readCount} />
                              <CountChip tone="traite" value={g.treatedCount} />
                            </div>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          // Nested sub-table on a solid surface-2 well
                          // (nested-solid rule): its own header is static and
                          // transparent so it does not stack under the sticky one.
                          <TableRow className="bg-surface-2 hover:bg-surface-2">
                            <TableCell colSpan={5} className="whitespace-normal p-0">
                              <div className="px-4 py-2">
                                <Table regionLabel={`Détail des rappels — ${formatRecipients(g.recipientNames)}`}>
                                  <TableHeader className="bg-transparent">
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="static bg-transparent">Dossier</TableHead>
                                      <TableHead className="static bg-transparent">Destinataire</TableHead>
                                      <TableHead className="static bg-transparent">Date</TableHead>
                                      <TableHead className="static bg-transparent">Suivi</TableHead>
                                      <TableHead className="static bg-transparent">Statut</TableHead>
                                      <TableHead className="static bg-transparent text-right">Travail effectué</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {g.rappels.map((r) => (
                                      <TableRow key={r.id} className="hover:bg-surface-3">
                                        <TableCell className="t-mono font-semibold">
                                          <Link href={`/dossiers/${r.dossierId}`} className="rounded-sm hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                            {r.dossierRef || r.dossierId}
                                          </Link>
                                        </TableCell>
                                        <TableCell>{r.recipientNom || <EmptyValue />}</TableCell>
                                        <TableCell>{formatDate(r.createdAt)}</TableCell>
                                        <TableCell className="t-body-sm">
                                          {r.resolvedAt ? (
                                            // Status colour never alone (element-specs §11): icon + label.
                                            <span className="inline-flex items-center gap-1 text-status-success-fg">
                                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                              Sauvegardé le {formatDate(r.resolvedAt)}
                                            </span>
                                          ) : (r.seenAt || r.read) ? (
                                            <span className="text-ink-2">Consulté{r.seenAt ? ` le ${formatDate(r.seenAt)}` : ''}</span>
                                          ) : (
                                            <span className="text-ink-4">Non consulté</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <StateChip rappel={r} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {r.sessionId ? (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="gap-1.5"
                                              onClick={() => setReplayRappel(r)}
                                            >
                                              <ScrollText className="h-3.5 w-3.5" />
                                              Voir le détail
                                            </Button>
                                          ) : (
                                            <EmptyValue />
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      )}

      <SessionReplayDialog
        rappel={replayRappel}
        open={!!replayRappel}
        onOpenChange={(open) => { if (!open) setReplayRappel(null); }}
      />
    </Tabs>
  );
}
