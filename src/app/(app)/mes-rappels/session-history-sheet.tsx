'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Loader2, Inbox, MessageSquare, ClipboardList, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getStatusHeaderStyles } from '@/lib/status-colors';

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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary">Travail effectué</SheetTitle>
          <SheetDescription>
            {dossierRef ? (
              <>Session ouverte sur le dossier <span className="font-semibold text-foreground">{dossierRef}</span></>
            ) : (
              'Toutes les actions enregistrées pendant ce traitement de rappel.'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : merged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Inbox className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">Aucune action enregistrée pour cette session.</p>
            </div>
          ) : (
            <div className="relative pl-8">
              {/* Vertical rail */}
              <div className="absolute left-3 top-2 bottom-2 w-px bg-primary/20" />

              <div className="space-y-4">
                {merged.map((e) => (
                  <TimelineCard key={e.id} entry={e} />
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TimelineCard({ entry }: { entry: Entry }) {
  const { kind, raw } = entry;

  if (kind === 'observation') {
    const author = raw.author || raw.authorEmail || 'Utilisateur inconnu';
    return (
      <div className="relative">
        <div className="absolute -left-[22px] top-3 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-background" />
        <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
          <div className="px-4 py-2 text-sm font-semibold bg-amber-50 text-amber-800 border-b border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/40 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" /> Observation
            {raw.type && (
              <span className="ml-auto text-[10px] font-normal uppercase tracking-wide opacity-70">
                {String(raw.type)}
              </span>
            )}
          </div>
          <div className="p-4 space-y-1.5 text-sm">
            <div>
              <span className="font-semibold">Auteur :</span>{' '}
              <span className="text-muted-foreground">{author}</span>
            </div>
            <div>
              <span className="font-semibold">Date :</span>{' '}
              <span className="text-muted-foreground">{formatDate(raw.createdAt)}</span>
            </div>
            {raw.text && (
              <div>
                <span className="font-semibold">Texte :</span>{' '}
                <span className="text-muted-foreground whitespace-pre-wrap">{raw.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'historique') {
    const isStatut = raw.type === 'statut';
    const headerClass = isStatut
      ? getStatusHeaderStyles(raw.action)
      : 'bg-slate-50 text-slate-800 border-b border-slate-200 dark:bg-slate-900/40 dark:text-slate-100 dark:border-slate-700/50';
    return (
      <div className="relative">
        <div className="absolute -left-[22px] top-3 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-background" />
        <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
          <div className={cn('px-4 py-2 text-sm font-semibold flex items-center gap-2', headerClass)}>
            <ClipboardList className="h-3.5 w-3.5" />
            <span>{raw.action || raw.type || 'Modification'}</span>
            {raw.type && !isStatut && (
              <span className="ml-auto text-[10px] font-normal uppercase tracking-wide opacity-70">
                {String(raw.type)}
              </span>
            )}
          </div>
          <div className="p-4 space-y-1.5 text-sm">
            <div>
              <span className="font-semibold">Par :</span>{' '}
              <span className="text-muted-foreground">{raw.userNom || raw.user || '—'}</span>
            </div>
            <div>
              <span className="font-semibold">Date :</span>{' '}
              <span className="text-muted-foreground">{formatDate(raw.date)}</span>
            </div>
            {raw.details && (
              <div>
                <span className="font-semibold">Détails :</span>{' '}
                <span className="text-muted-foreground whitespace-pre-wrap">{raw.details}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // workflow
  return (
    <div className="relative">
      <div className="absolute -left-[22px] top-3 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-background" />
      <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
        <div className="px-4 py-2 text-sm font-semibold bg-emerald-50 text-emerald-800 border-b border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/40 flex items-center gap-2">
          <Workflow className="h-3.5 w-3.5" />
          <span>{raw.action || raw.status || 'Étape de workflow'}</span>
        </div>
        <div className="p-4 space-y-1.5 text-sm">
          <div>
            <span className="font-semibold">Par :</span>{' '}
            <span className="text-muted-foreground">{raw.userNom || raw.user || '—'}</span>
          </div>
          <div>
            <span className="font-semibold">Date :</span>{' '}
            <span className="text-muted-foreground">{formatDate(raw.date)}</span>
          </div>
          {raw.status && raw.action && raw.status !== raw.action && (
            <div>
              <span className="font-semibold">Statut :</span>{' '}
              <span className="text-muted-foreground">{String(raw.status)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
