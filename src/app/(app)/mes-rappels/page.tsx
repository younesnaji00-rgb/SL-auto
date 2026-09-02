'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useEffect, useMemo, useState } from 'react';
import { Inbox, ChevronDown, ChevronRight, Send, ScrollText, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRappels, useRappelsSent, type Rappel } from '@/hooks/use-rappels';
import { collection, doc, onSnapshot, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { hasPermission, SUB_PERMISSIONS, rappelsEnvoyesRoleDefault } from '@/lib/permissions';
import { titleForRoute } from '@/lib/nav-groups';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import SessionReplayDialog from './session-replay-dialog';

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

function formatHm(ts: any): string {
  const d = toDate(ts);
  if (!d) return '--:--';
  try { return format(d, 'HH:mm', { locale: fr }); } catch { return '--:--'; }
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

/** Empty cell = « — » in ink-4 (blueprint §9), never a fake value. */
function EmptyValue() {
  return <span className="text-ink-4">—</span>;
}

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

// ── First column frozen (element-specs §3: NN/g "freeze header rows and header
//    columns if the table is larger than the screen"; Polaris "fix the first
//    column when many columns"): the 8-column Reçus table pans sideways on
//    narrow screens, so the human identifier stays put on solid card. ──
const STICKY_HEAD = 'sticky left-0 z-[2] min-w-[11rem] border-r border-hairline bg-card';
const STICKY_CELL = 'sticky left-0 z-[1] border-r border-hairline bg-card [tr:hover_&]:bg-surface-2';

interface SessionTaggedProps {
  dossierId: string;
  sessionId?: string;
}

/**
 * F9.B: lists every observation on this dossier whose `rappelSessionId`
 * matches the active rappel's session. Renders as `HH:mm [author] text`.
 */
function SessionObservations({ dossierId, sessionId }: SessionTaggedProps) {
  const db = useFirestore();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!db || !dossierId || !sessionId) {
      setItems([]);
      return;
    }
    const q = query(
      collection(db, 'dossiers', dossierId, 'observations'),
      where('rappelSessionId', '==', sessionId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.metadata.fromCache && snap.size === 0) return;
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
        setItems(rows);
      },
      () => {},
    );
    return () => unsub();
  }, [db, dossierId, sessionId]);

  if (!sessionId) return <EmptyValue />;
  if (items.length === 0) return <EmptyValue />;

  return (
    <ul className="flex flex-col gap-1">
      {items.map((it) => {
        const author = it.author || it.authorEmail || 'Utilisateur inconnu';
        return (
          <li key={it.id} className="t-body-sm break-words leading-snug">
            <span className="tabular-nums text-ink-3">{formatHm(it.createdAt)}</span>
            {' '}
            <span className="font-medium text-ink-2">[{author}]</span>
            {' '}
            <span>{it.text || ''}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * F9.B: lists every historique entry on this dossier whose
 * `rappelSessionId` matches the rappel's session, grouped by historique
 * `type`. Each entry shows `HH:mm [user] action`.
 */
function SessionModifications({ dossierId, sessionId }: SessionTaggedProps) {
  const db = useFirestore();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!db || !dossierId || !sessionId) {
      setItems([]);
      return;
    }
    const q = query(
      collection(db, 'dossiers', dossierId, 'historique'),
      where('rappelSessionId', '==', sessionId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.metadata.fromCache && snap.size === 0) return;
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => tsMillis(a.date) - tsMillis(b.date));
        setItems(rows);
      },
      () => {},
    );
    return () => unsub();
  }, [db, dossierId, sessionId]);

  if (!sessionId) return <EmptyValue />;
  if (items.length === 0) return <EmptyValue />;

  const groups = new Map<string, any[]>();
  for (const it of items) {
    const type = it.type || 'autre';
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(it);
  }

  return (
    <div className="flex flex-col gap-2">
      {Array.from(groups.entries()).map(([type, rows]) => (
        <div key={type} className="flex flex-col gap-0.5">
          <p className="t-caption tabular-nums">
            {type} ({rows.length})
          </p>
          <ul>
            {rows.map((it) => {
              const who = it.userNom || it.user || 'Utilisateur inconnu';
              return (
                <li key={it.id} className="t-body-sm break-words pl-1 leading-snug">
                  <span className="tabular-nums text-ink-3">{formatHm(it.date)}</span>
                  {' '}
                  <span className="font-medium text-ink-2">[{who}]</span>
                  {' '}
                  <span>{it.action || ''}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

type Vue = 'recus' | 'envoyes';

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
      updateDoc(doc(db, 'rappels', r.id), {
        read: true,
        ...(r.seenAt ? {} : { seenAt: serverTimestamp() }),
      }).catch(() => {});
    }
    if (typeof window !== 'undefined' && sid) {
      try { window.localStorage.setItem(SESSION_KEY(r.dossierId), sid); } catch {}
    }
    router.push(`/dossiers/${r.dossierId}`);
  };

  const markTreated = (r: Rappel) => {
    if (!db || r.resolvedAt) return;
    updateDoc(doc(db, 'rappels', r.id), { resolvedAt: serverTimestamp() })
      .then(() => {
        if (typeof window !== 'undefined') {
          try { window.localStorage.removeItem(SESSION_KEY(r.dossierId)); } catch {}
        }
        toast({ title: 'Rappel marqué comme traité' });
      })
      .catch(() => {
        toast({ title: 'Erreur', description: 'Impossible de marquer comme traité', variant: 'destructive' });
      });
  };

  // Count pill on a tab (§11: count pills are the neutral surface step —
  // status colour is reserved for states, not for "how many").
  const tabCount = (n: number) =>
    n > 0 ? (
      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
        {n}
      </span>
    ) : null;

  return (
    // Layout as at 3d5629a: header → tabs → one card per tab holding a data
    // table. The Tabs root wraps the header so the tab strip can sit in the
    // PageHeader `tabs` slot (same position, under the title). Sections 32 px
    // apart (addendum 2026-09-02 §4).
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
            <Card className="overflow-hidden"><TableSkeleton heads={8} /></Card>
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
            // Data table (§3: Polaris "textual left, headers align with their
            // data"; Carbon 44 px rows, persistent row actions; NN/g "only 1–2
            // inline row actions", frozen first column, sticky header from the
            // primitive). The row is the link; refs in t-mono; status = chip.
            <Card className="overflow-hidden">
              <Table regionLabel="Rappels reçus">
                <TableHeader>
                  <TableRow>
                    <TableHead className={STICKY_HEAD}>Référence dossier</TableHead>
                    <TableHead>Envoyé par</TableHead>
                    <TableHead>Observation</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Observations</TableHead>
                    <TableHead>Modifications</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Travail effectué</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rappels.map((r) => {
                    const state = rappelState(r);
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => openRappel(r)}
                      >
                        <TableCell className={cn(STICKY_CELL, 't-mono font-semibold')}>
                          {/* Keyboard-reachable copy of the row link. */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openRappel(r); }}
                            className="rounded-sm text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title="Ouvrir le dossier"
                          >
                            {r.dossierRef || r.dossierId}
                          </button>
                        </TableCell>
                        <TableCell className={cn(state === 'nouveau' ? 'font-medium text-ink' : 'text-ink-2')}>
                          {r.senderNom || <EmptyValue />}
                        </TableCell>
                        <TableCell className={cn('min-w-[14rem] max-w-[24rem] whitespace-normal', state === 'nouveau' ? 'font-medium text-ink' : 'text-ink-2')}>
                          {r.observation || <EmptyValue />}
                        </TableCell>
                        {/* Dates are values → full ink (addendum §3); today's
                            rappels carry the warm TIME chip (terracotta =
                            temporal salience, 2026-09-02). */}
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            {formatDate(r.createdAt)}
                            {isToday(r.createdAt) && <Badge variant="time">Aujourd&apos;hui</Badge>}
                          </span>
                        </TableCell>
                        {/* Live cells: the text inside is selectable, so a click
                            here must not open the dossier. */}
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className="min-w-[14rem] max-w-[20rem] cursor-default whitespace-normal"
                        >
                          <SessionObservations dossierId={r.dossierId} sessionId={r.sessionId} />
                        </TableCell>
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className="min-w-[14rem] max-w-[20rem] cursor-default whitespace-normal"
                        >
                          <SessionModifications dossierId={r.dossierId} sessionId={r.sessionId} />
                        </TableCell>
                        <TableCell>
                          <StateChip rappel={r} />
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Row actions (§3 / §8): at most two, ghost, at the
                              row end. "Marquer traité" disappears once done
                              (GOV.UK: avoid disabled buttons — the chip says Traité). */}
                          <div className="flex items-center justify-end gap-1">
                            {r.sessionId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplayRappel(r);
                                }}
                              >
                                <ScrollText className="h-3.5 w-3.5" />
                                Voir le détail
                              </Button>
                            ) : null}
                            {!r.resolvedAt && (
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
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
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
