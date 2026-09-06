'use client';

/**
 * Detail pane for the Reçus queue (element-specs addendum 2026-09-03 bis §A):
 * the row SELECTS, this pane shows the full rappel — observation at reading
 * size, dossier identity, the session timeline (details-on-demand: one
 * listener pair for the selected rappel, replacing the old 2×N per-row
 * columns) and the explicit actions. Rendered inside a sticky Card on xl+
 * and inside a Sheet below (the page owns both shells).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, FolderOpen, Inbox, MessageSquare, ScrollText, Workflow } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { dateFnsLocale, useT } from '@/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Kbd } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Rappel } from '@/hooks/use-rappels';
import { BottomActionBar } from '@/components/layout/bottom-action-bar';
import { usePhoneChrome, useRegisterPageTitle } from '@/components/layout/page-chrome';

function tsMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  const n = Number(ts);
  return Number.isFinite(n) ? n : 0;
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(ts: any): string {
  const d = toDate(ts);
  if (!d) return '—';
  try { return format(d, 'dd/MM/yyyy HH:mm', { locale: dateFnsLocale() }); } catch { return '—'; }
}

/** Relative age for tooltips only (dates-as-values ruling: cells absolute). */
export function relativeAge(ts: any): string | undefined {
  const d = toDate(ts);
  if (!d) return undefined;
  try { return formatDistanceToNow(d, { addSuffix: true, locale: dateFnsLocale() }); } catch { return undefined; }
}

function formatHm(ms: number): string {
  if (!ms) return '--:--';
  try { return format(new Date(ms), 'HH:mm', { locale: dateFnsLocale() }); } catch { return '--:--'; }
}

// ── Session timeline (moved from the superseded session-history-sheet) ──

type Entry = {
  id: string;
  kind: 'observation' | 'historique' | 'workflow';
  ts: number;
  raw: any;
};

// Entry kind → semantic status pair for the kind chip (DESIGN.md §10).
// `label` is the FRENCH translation key — translated at render with `t()`.
const KIND_META: Record<Entry['kind'], { label: string; chip: string; icon: React.ReactNode }> = {
  observation: { label: 'Observation', chip: 'bg-status-info-bg text-status-info-fg', icon: <MessageSquare className="h-3 w-3" /> },
  historique: { label: 'Modification', chip: 'bg-surface-3 text-ink-2', icon: <ClipboardList className="h-3 w-3" /> },
  workflow: { label: 'Workflow', chip: 'bg-status-success-bg text-status-success-fg', icon: <Workflow className="h-3 w-3" /> },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="t-label">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function TimelineRow({ entry }: { entry: Entry }) {
  const t = useT();
  const { kind, raw, ts } = entry;
  const meta = KIND_META[kind];

  let title: string;
  let who: string;
  let when: string;
  let body: string | null = null;
  let bodyLabel = t('Détails');
  let statut: string | null = null;

  if (kind === 'observation') {
    title = raw.type ? String(raw.type) : t('Observation');
    who = raw.author || raw.authorEmail || t('Utilisateur inconnu');
    when = formatDate(raw.createdAt);
    body = raw.text || null;
    bodyLabel = t('Texte');
  } else if (kind === 'historique') {
    title = raw.action || raw.type || t('Modification');
    who = raw.userNom || raw.user || '—';
    when = formatDate(raw.date);
    body = raw.details || null;
    statut = raw.type === 'statut' && raw.action ? String(raw.action) : null;
  } else {
    title = raw.action || raw.status || t('Étape de workflow');
    who = raw.userNom || raw.user || '—';
    when = formatDate(raw.date);
    statut = raw.status && raw.action && raw.status !== raw.action ? String(raw.status) : null;
  }

  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      {/* Time block — the row's anchor (tinted + light contour). */}
      <div className="flex w-12 shrink-0 items-center justify-center rounded-md bg-surface-3 py-2 text-center text-sm font-semibold tabular-nums text-ink-2 shadow-rim">
        {formatHm(ts)}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium', meta.chip)}>
            {meta.icon}
            {t(meta.label)}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-ink">{title}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label={t('Par')}>{who}</Field>
          <Field label={t('Date')}><span className="tabular-nums">{when}</span></Field>
          {statut && <Field label={t('Statut')}>{statut}</Field>}
          {body && (
            <div className="col-span-2 min-w-0">
              <dt className="t-label">{bodyLabel}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{body}</dd>
            </div>
          )}
        </dl>
      </div>
    </li>
  );
}

/**
 * Everything logged on the dossier during this rappel's session, merged into
 * one chronological list. `active` gates the three listeners so only ONE
 * mounted copy (panel on xl+, sheet below) actually subscribes.
 */
export function SessionTimeline({
  dossierId,
  sessionId,
  active,
}: {
  dossierId: string;
  sessionId?: string;
  active: boolean;
}) {
  const t = useT();
  const db = useFirestore();
  const [observations, setObservations] = useState<any[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [workflow, setWorkflow] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !dossierId || !sessionId || !active) {
      setObservations([]);
      setHistorique([]);
      setWorkflow([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let received = 0;
    const markReceived = () => {
      received += 1;
      if (received >= 3) setLoading(false);
    };

    const mk = (coll: string, set: (rows: any[]) => void) =>
      onSnapshot(
        query(collection(db, 'dossiers', dossierId, coll), where('rappelSessionId', '==', sessionId)),
        (snap) => {
          if (snap.metadata.fromCache && snap.size === 0) return;
          set(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
          markReceived();
        },
        () => markReceived(),
      );

    const unsubObs = mk('observations', setObservations);
    const unsubHist = mk('historique', setHistorique);
    const unsubWork = mk('workflow', setWorkflow);
    return () => { unsubObs(); unsubHist(); unsubWork(); };
  }, [db, dossierId, sessionId, active]);

  const merged = useMemo<Entry[]>(() => {
    const all: Entry[] = [];
    observations.forEach((o) => all.push({ id: `obs-${o.id}`, kind: 'observation', ts: tsMillis(o.createdAt), raw: o }));
    historique.forEach((h) => all.push({ id: `hist-${h.id}`, kind: 'historique', ts: tsMillis(h.date), raw: h }));
    workflow.forEach((w) => all.push({ id: `wf-${w.id}`, kind: 'workflow', ts: tsMillis(w.date), raw: w }));
    return all.sort((a, b) => a.ts - b.ts);
  }, [observations, historique, workflow]);

  if (!sessionId) {
    return <p className="t-caption">{t("Aucune session de traitement pour l'instant.")}</p>;
  }
  if (loading) {
    return (
      <ul className="divide-y divide-hairline" aria-busy="true" aria-live="polite">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="flex items-start gap-3 py-4 first:pt-0">
            <Skeleton className="h-9 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (merged.length === 0) {
    return (
      <EmptyState
        icon={<Inbox />}
        title={t('Aucune action enregistrée')}
        description={t("Rien n'a été enregistré pendant cette session.")}
        dashed={false}
      />
    );
  }
  return (
    <ol className="divide-y divide-hairline">
      {merged.map((e) => (
        <TimelineRow key={e.id} entry={e} />
      ))}
    </ol>
  );
}

// ── The rappel detail itself ──

function assureName(r: Rappel): string {
  const a = r.dossierData?.assure;
  if (typeof a === 'string') return a;
  if (a) return `${a.prenom || ''} ${a.nom || ''}`.trim();
  return '';
}

export interface RappelDetailProps {
  rappel: Rappel;
  /** Gates the session-timeline listeners (see SessionTimeline). */
  active: boolean;
  onOpenDossier: (r: Rappel) => void;
  onMarkTreated: (r: Rappel) => void;
  onShowReplay: (r: Rappel) => void;
}

/**
 * Panel body, shared by the xl side pane and the <xl sheet. Observation at
 * reading size (15 px per the prose ruling); actions are the ONLY navigation
 * path (« Ouvrir le dossier » is an explicit act — anti-pogo-sticking).
 */
export function RappelDetailContent({ rappel: r, active, onOpenDossier, onMarkTreated, onShowReplay }: RappelDetailProps) {
  const t = useT();
  const assure = assureName(r);
  const state = r.resolvedAt ? 'traite' : r.read ? 'lu' : 'nouveau';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-mono text-[15px] font-semibold text-ink">{r.dossierRef || r.dossierId}</span>
        {state === 'traite' ? (
          <Badge variant="success">{t('Traité')}</Badge>
        ) : state === 'lu' ? (
          <Badge variant="neutral">{t('Lu')}</Badge>
        ) : (
          <Badge variant="info">{t('Nouveau')}</Badge>
        )}
      </div>
      <p className="t-caption">
        {t('Envoyé par')} <span className="font-medium text-ink-2">{r.senderNom || '—'}</span>
        {' '}{t('le')} <span className="tabular-nums text-ink-2" title={relativeAge(r.createdAt)}>{formatDate(r.createdAt)}</span>
        {r.resolvedAt ? (
          <>
            {' '}· <span className="inline-flex items-center gap-1 text-status-success-fg">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t('traité le')} <span className="tabular-nums">{formatDate(r.resolvedAt)}</span>
            </span>
          </>
        ) : null}
      </p>

      <div>
        <p className="t-label">{t('Observation')}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-ink">
          {r.observation || <span className="text-ink-4">—</span>}
        </p>
      </div>

      {assure ? (
        <div>
          <p className="t-label">{t('Assuré')}</p>
          <p className="mt-0.5 text-sm font-medium text-ink">{assure}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {/* Below md this pair's primary lives in the bottom action bar (thumb
            zone, mobile-synthesis §4 master-detail) — never two primaries. */}
        <Button variant="tonal" className="gap-1.5 max-md:hidden" onClick={() => onOpenDossier(r)}>
          <FolderOpen className="h-4 w-4" />
          {t('Ouvrir le dossier')}
        </Button>
        {!r.resolvedAt && (
          <Button variant="outline" className="gap-1.5" onClick={() => onMarkTreated(r)}>
            <CheckCircle2 className="h-4 w-4" />
            {t('Marquer traité')}
          </Button>
        )}
        {r.sessionId ? (
          <Button variant="ghost" className="gap-1.5" onClick={() => onShowReplay(r)}>
            <ScrollText className="h-4 w-4" />
            {t('Comparer avant/après')}
          </Button>
        ) : null}
      </div>

      <Separator />

      <div>
        <p className="t-label">{t('Travail effectué')}</p>
        <div className="mt-2">
          <SessionTimeline dossierId={r.dossierId} sessionId={r.sessionId} active={active} />
        </div>
      </div>
    </div>
  );
}

/**
 * PHONE full-screen detail (mobile-synthesis §4 master-detail; research §8:
 * "a bottom sheet for the detail" is the anti-pattern — the phone gets a real
 * page-to-page flow). The shell's top bar carries « ‹ Rappels » + the dossier
 * ref (published through the chrome registry), the body is the SAME
 * `RappelDetailContent` at reading size, and the two actions sit in a 56 px
 * bottom action bar that replaces the navigation bar.
 */
export function PhoneRappelDetailScreen({ rappel: r, onOpenDossier, onMarkTreated, onShowReplay }: Omit<RappelDetailProps, 'active'>) {
  const t = useT();
  useRegisterPageTitle(r.dossierRef || r.dossierId);
  usePhoneChrome(
    React.useMemo(
      () => ({
        upHref: '/mes-rappels',
        upLabel: 'Rappels',
        subtitle: assureName(r) || null,
        count: null,
        primaryAction: null,
        secondaryActions: [],
        onSearchFocus: null,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [r.id],
    ),
  );
  return (
    <div className="pb-4">
      <RappelDetailContent
        rappel={r}
        active
        onOpenDossier={onOpenDossier}
        onMarkTreated={onMarkTreated}
        onShowReplay={onShowReplay}
      />
      <BottomActionBar
        secondary={
          r.resolvedAt
            ? []
            : [{ label: t('Marquer traité'), icon: <CheckCircle2 />, onClick: () => onMarkTreated(r) }]
        }
        primary={{ label: t('Ouvrir le dossier'), icon: <FolderOpen className="h-4 w-4" />, onClick: () => onOpenDossier(r) }}
      />
    </div>
  );
}

/** xl+ pane placeholder — where the keyboard hints live (visible, ignorable). */
export function RappelDetailPlaceholder() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-ink-3">
        <Inbox className="h-5 w-5" aria-hidden />
      </div>
      <p className="t-heading">{t('Sélectionnez un rappel')}</p>
      <p className="t-caption max-w-[32ch]">
        {t("Cliquez sur une ligne pour lire l'observation et le travail effectué sans quitter la liste.")}
      </p>
      <p className="t-caption flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> {t('naviguer')}</span>
        <span className="inline-flex items-center gap-1"><Kbd>↵</Kbd> {t('ouvrir le dossier')}</span>
        <span className="inline-flex items-center gap-1"><Kbd>T</Kbd> {t('marquer traité')}</span>
      </p>
    </div>
  );
}
