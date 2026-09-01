'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Inbox, MessageSquare, ClipboardList, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string | null;
  sessionId: string | null;
  dossierRef?: string;
};

type Entry = {
  id: string;
  kind: 'observation' | 'historique' | 'workflow';
  ts: number;
  raw: any;
};

function tsMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  const n = Number(ts);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(ts: any): string {
  if (!ts) return '-';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  try {
    return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return '-';
  }
}

function formatHm(ms: number): string {
  if (!ms) return '--:--';
  try {
    return format(new Date(ms), 'HH:mm', { locale: fr });
  } catch {
    return '--:--';
  }
}

export default function SessionHistorySheet({
  open,
  onOpenChange,
  dossierId,
  sessionId,
  dossierRef,
}: Props) {
  const db = useFirestore();
  const [observations, setObservations] = useState<any[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [workflow, setWorkflow] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !dossierId || !sessionId || !open) {
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

    const qObs = query(
      collection(db, 'dossiers', dossierId, 'observations'),
      where('rappelSessionId', '==', sessionId),
    );
    const qHist = query(
      collection(db, 'dossiers', dossierId, 'historique'),
      where('rappelSessionId', '==', sessionId),
    );
    const qWork = query(
      collection(db, 'dossiers', dossierId, 'workflow'),
      where('rappelSessionId', '==', sessionId),
    );

    const unsubObs = onSnapshot(
      qObs,
      (snap) => {
        if (snap.metadata.fromCache && snap.size === 0) return;
        setObservations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        markReceived();
      },
      () => markReceived(),
    );
    const unsubHist = onSnapshot(
      qHist,
      (snap) => {
        if (snap.metadata.fromCache && snap.size === 0) return;
        setHistorique(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        markReceived();
      },
      () => markReceived(),
    );
    const unsubWork = onSnapshot(
      qWork,
      (snap) => {
        if (snap.metadata.fromCache && snap.size === 0) return;
        setWorkflow(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        markReceived();
      },
      () => markReceived(),
    );

    return () => {
      unsubObs();
      unsubHist();
      unsubWork();
    };
  }, [db, dossierId, sessionId, open]);

  const merged = useMemo<Entry[]>(() => {
    const all: Entry[] = [];
    observations.forEach((o) =>
      all.push({ id: `obs-${o.id}`, kind: 'observation', ts: tsMillis(o.createdAt), raw: o }),
    );
    historique.forEach((h) =>
      all.push({ id: `hist-${h.id}`, kind: 'historique', ts: tsMillis(h.date), raw: h }),
    );
    workflow.forEach((w) =>
      all.push({ id: `wf-${w.id}`, kind: 'workflow', ts: tsMillis(w.date), raw: w }),
    );
    return all.sort((a, b) => a.ts - b.ts);
  }, [observations, historique, workflow]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Travail effectué</SheetTitle>
          <SheetDescription>
            {dossierRef ? (
              <>Session ouverte sur le dossier <span className="t-mono font-semibold">{dossierRef}</span></>
            ) : (
              'Toutes les actions enregistrées pendant ce traitement de rappel.'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <ul className="divide-y divide-hairline" aria-busy="true" aria-live="polite">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-start gap-3 py-4 first:pt-0">
                  <Skeleton className="h-9 w-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </li>
              ))}
            </ul>
          ) : merged.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="Aucune action enregistrée"
              description="Rien n'a été enregistré pendant cette session."
              dashed={false}
            />
          ) : (
            // Event list (planification-tab pattern): hairline rows, the time
            // block as the anchor, labels quiet / values bold — no coloured
            // header bands, no card per entry.
            <ol className="divide-y divide-hairline">
              {merged.map((e) => (
                <TimelineRow key={e.id} entry={e} />
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Entry kind → semantic status pair for the kind chip (DESIGN.md §10).
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
  const { kind, raw, ts } = entry;
  const meta = KIND_META[kind];

  let title: string;
  let who: string;
  let when: string;
  let body: string | null = null;
  let bodyLabel = 'Détails';
  let statut: string | null = null;

  if (kind === 'observation') {
    title = raw.type ? String(raw.type) : 'Observation';
    who = raw.author || raw.authorEmail || 'Utilisateur inconnu';
    when = formatDate(raw.createdAt);
    body = raw.text || null;
    bodyLabel = 'Texte';
  } else if (kind === 'historique') {
    title = raw.action || raw.type || 'Modification';
    who = raw.userNom || raw.user || '—';
    when = formatDate(raw.date);
    body = raw.details || null;
    statut = raw.type === 'statut' && raw.action ? String(raw.action) : null;
  } else {
    title = raw.action || raw.status || 'Étape de workflow';
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
            {meta.label}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-ink">{title}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label="Par">{who}</Field>
          <Field label="Date"><span className="tabular-nums">{when}</span></Field>
          {statut && (
            <Field label="Statut">{statut}</Field>
          )}
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
