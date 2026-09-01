'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useEffect, useMemo, useState } from 'react';
import { Inbox, ChevronDown, ChevronRight, Send, ScrollText, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
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

function formatDate(ts: any): string {
  if (!ts) return '-';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  try { return format(date, 'dd/MM/yyyy HH:mm', { locale: fr }); } catch { return '-'; }
}

function formatHm(ts: any): string {
  if (!ts) return '--:--';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  try { return format(date, 'HH:mm', { locale: fr }); } catch { return '--:--'; }
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

// ── Presentation helpers (blueprint §5/§6: inbox rows, status pairs) ──

/** Rappel state → semantic status pair; never a coloured card. */
const RAPPEL_STATE_CHIP: Record<'nouveau' | 'lu' | 'traite', string> = {
  nouveau: 'bg-status-info-bg text-status-info-fg',
  lu: 'bg-surface-3 text-ink-2',
  traite: 'bg-status-success-bg text-status-success-fg',
};

function rappelState(r: Rappel): 'nouveau' | 'lu' | 'traite' {
  if (r.resolvedAt) return 'traite';
  if (r.read) return 'lu';
  return 'nouveau';
}

const RAPPEL_STATE_LABEL: Record<'nouveau' | 'lu' | 'traite', string> = {
  nouveau: 'Nouveau',
  lu: 'Lu',
  traite: 'Traité',
};

function StateChip({ rappel, className }: { rappel: Rappel; className?: string }) {
  const s = rappelState(rappel);
  return (
    <span className={cn('inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-medium', RAPPEL_STATE_CHIP[s], className)}>
      {RAPPEL_STATE_LABEL[s]}
    </span>
  );
}

/** Count chip for the sent-group summary: status pair when > 0, quiet otherwise. */
function CountChip({ label, value, tone }: { label: string; value: number; tone: 'nouveau' | 'lu' | 'traite' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium tabular-nums',
        value > 0 ? RAPPEL_STATE_CHIP[tone] : 'bg-transparent text-ink-4',
      )}
    >
      {label} {value}
    </span>
  );
}

/**
 * Date block — the row's anchor (planification-tab pattern): tinted + light
 * contour; the one rappel to act on next gets the terracotta surface.
 */
function DateAnchor({ ts, next = false }: { ts: any; next?: boolean }) {
  const d = toDate(ts);
  return (
    <div
      className={cn(
        'flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1.5 text-center tabular-nums',
        next ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled' : 'bg-surface-3 text-ink-2 shadow-rim',
      )}
    >
      <span className="text-[11px] font-medium leading-none">{d ? format(d, 'MMM', { locale: fr }).replace('.', '') : '—'}</span>
      <span className="font-headline text-xl font-semibold leading-tight">{d ? format(d, 'd') : '—'}</span>
      <span className="text-[11px] leading-none">{d ? format(d, 'HH:mm') : ''}</span>
    </div>
  );
}

/** Label over bold value (information-tab definition-list pattern). */
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="t-label">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function EmptyValue() {
  return <span className="font-normal text-ink-4">—</span>;
}

/** Inbox-row skeleton — same anatomy as the real row (date block + lines). */
function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-hairline" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
          <Skeleton className="h-[60px] w-14 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-32" />
          </div>
        </li>
      ))}
    </ul>
  );
}

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
          <li key={it.id} className="t-body-sm break-words font-normal leading-snug">
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
                <li key={it.id} className="t-body-sm break-words pl-1 font-normal leading-snug">
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
  const defaultTab = recusVisible ? 'recus' : envoyesVisible ? 'envoyes' : 'recus';

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Inbox counts: unread received (tab badge) and the next rappel to act on
  // (first unresolved, newest first) — the row that gets the terracotta anchor.
  const unreadCount = useMemo(() => rappels.filter((r) => !r.read && !r.resolvedAt).length, [rappels]);
  const nextRappelId = useMemo(() => rappels.find((r) => !r.resolvedAt)?.id ?? null, [rappels]);
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

  return (
    // The Tabs root wraps the header so the tab strip can live in the
    // PageHeader `tabs` slot (DESIGN.md §2) while the panels follow below.
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <PageHeader
        title={titleForRoute('/mes-rappels') ?? 'Mes rappels'}
        tabs={
          <TabsList>
            {recusVisible && (
              <TabsTrigger value="recus" className="gap-1.5">
                Reçus
                {unreadCount > 0 && (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-status-info-bg px-1.5 text-[11px] font-medium tabular-nums text-status-info-fg">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            )}
            {envoyesVisible && (
              <TabsTrigger value="envoyes" className="gap-1.5">
                Envoyés
                {pendingSentCount > 0 && (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                    {pendingSentCount}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        }
      />

      {recusVisible && (
        <TabsContent value="recus" className="mt-0">
          {loading ? (
            <Card className="p-6"><RowsSkeleton /></Card>
          ) : rappels.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="Aucun rappel pour le moment"
              description="Les rappels envoyés depuis Gestion des dossiers apparaîtront ici."
            />
          ) : (
            // Inbox: hairline-separated rows, the date block as the anchor,
            // labels quiet / values bold, per-item actions ghost (blueprint §6).
            <Card className="p-6">
              <ol className="divide-y divide-hairline" aria-label="Rappels reçus">
                {rappels.map((r) => {
                  const state = rappelState(r);
                  return (
                    <li key={r.id} className="group flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                      <DateAnchor ts={r.createdAt} next={r.id === nextRappelId} />

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <button
                              type="button"
                              onClick={() => openRappel(r)}
                              className={cn(
                                't-mono rounded-sm text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                state === 'nouveau' ? 'font-semibold' : 'font-medium',
                              )}
                              title="Ouvrir le dossier"
                            >
                              {r.dossierRef || r.dossierId}
                            </button>
                            <StateChip rappel={r} />
                            <span className="t-caption">
                              de <span className="font-medium text-ink-2">{r.senderNom || '—'}</span>
                              {' · '}
                              <span className="tabular-nums">{formatDate(r.createdAt)}</span>
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {r.sessionId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-xs text-ink-3 hover:text-ink"
                                onClick={() => setReplayRappel(r)}
                              >
                                <ScrollText className="h-3.5 w-3.5" />
                                Voir le détail
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-ink-3 hover:text-ink"
                              disabled={!!r.resolvedAt}
                              onClick={() => markTreated(r)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Marquer traité
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-ink-3 hover:text-ink"
                              aria-label="Ouvrir le dossier"
                              title="Ouvrir le dossier"
                              onClick={() => openRappel(r)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <p className={cn('t-body whitespace-pre-wrap break-words', state === 'nouveau' ? 'font-medium' : 'text-ink-2')}>
                          {r.observation || <span className="text-ink-4">—</span>}
                        </p>

                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                          <Field label="Observations pendant la session">
                            <SessionObservations dossierId={r.dossierId} sessionId={r.sessionId} />
                          </Field>
                          <Field label="Modifications">
                            <SessionModifications dossierId={r.dossierId} sessionId={r.sessionId} />
                          </Field>
                        </dl>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
        </TabsContent>
      )}

      {envoyesVisible && (
        <TabsContent value="envoyes" className="mt-0">
          {sentLoading ? (
            <Card className="p-6"><RowsSkeleton /></Card>
          ) : sentGroups.length === 0 ? (
            <EmptyState
              icon={<Send />}
              title="Aucun rappel envoyé pour le moment"
              description="Les rappels que vous envoyez depuis Gestion des dossiers apparaîtront ici."
            />
          ) : (
            <Card className="p-6">
              <ol className="divide-y divide-hairline" aria-label="Rappels envoyés">
                {sentGroups.map((g) => {
                  const isOpen = expanded.has(g.key);
                  const total = g.rappels.length;
                  return (
                    <li key={g.key} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-4">
                        <DateAnchor ts={g.latest} />
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink" title={g.recipientNames.join(', ')}>
                                {formatRecipients(g.recipientNames)}
                              </p>
                              <p className="t-caption tabular-nums">
                                {g.dossierCount} dossier{g.dossierCount > 1 ? 's' : ''} · {total} rappel{total > 1 ? 's' : ''} · {formatDate(g.latest)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                              <CountChip label="Nouveau" value={g.newCount} tone="nouveau" />
                              <CountChip label="Lu" value={g.readCount} tone="lu" />
                              <CountChip label="Traité" value={g.treatedCount} tone="traite" />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-xs text-ink-3 hover:text-ink"
                                aria-expanded={isOpen}
                                onClick={() => toggleExpand(g.key)}
                              >
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                {isOpen ? 'Réduire' : 'Détails'}
                              </Button>
                            </div>
                          </div>

                          {isOpen && (
                            // Nested list flattens to a surface-2 well (nested-solid
                            // rule) with hairline rows — never a second paper.
                            <ul className="divide-y divide-hairline rounded-lg bg-surface-2 px-4">
                              {g.rappels.map((r) => (
                                <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 py-3">
                                  <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                                    <Field label="Dossier">
                                      <Link href={`/dossiers/${r.dossierId}`} className="t-mono font-semibold hover:underline">
                                        {r.dossierRef || r.dossierId}
                                      </Link>
                                    </Field>
                                    <Field label="Destinataire">{r.recipientNom || <EmptyValue />}</Field>
                                    <Field label="Date"><span className="tabular-nums">{formatDate(r.createdAt)}</span></Field>
                                    <Field label="Suivi">
                                      {r.resolvedAt ? (
                                        <span className="font-normal text-status-success-fg">Sauvegardé le {formatDate(r.resolvedAt)}</span>
                                      ) : (r.seenAt || r.read) ? (
                                        <span className="font-normal text-ink-2">Consulté{r.seenAt ? ` le ${formatDate(r.seenAt)}` : ''}</span>
                                      ) : (
                                        <span className="font-normal text-ink-4">Non consulté</span>
                                      )}
                                    </Field>
                                  </dl>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <StateChip rappel={r} />
                                    {r.sessionId ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1.5 text-xs text-ink-3 hover:text-ink"
                                        onClick={() => setReplayRappel(r)}
                                      >
                                        <ScrollText className="h-3.5 w-3.5" />
                                        Voir le détail
                                      </Button>
                                    ) : null}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
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
