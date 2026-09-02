'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, Calendar as CalendarIcon, User, MapPin, Plus, Info, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useReplayHighlight, highlightClass, ChangeBadge } from '@/components/dossier-timeline/replay-highlight';

type PlanificationTabProps = {
  dossierId: string;
  onOpenHistory: () => void;
  onEditPlanification: (data: any) => void;
  onNewPlanification: (defaultType?: 'Avant' | 'En cours' | 'Après') => void;
  typeFilter?: 'Avant' | 'En cours' | 'Après';
  /** Replay: frozen list rendered instead of the live subscription. */
  plansOverride?: any[];
};

function toDate(ts: any): Date | null {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

const TYPE_CHIP: Record<string, string> = {
  Avant: 'bg-status-info-bg text-status-info-fg',
  'En cours': 'bg-status-warning-bg text-status-warning-fg',
  Après: 'bg-status-success-bg text-status-success-fg',
};

/**
 * Planifications as a calendar-style list (date block · details), newest
 * first. Every row carries its FULL details inline — no dialog. The NEXT
 * upcoming visit's date block is this tab's single navy element
 * (the upcoming visit's date block is the tab's one terracotta element).
 */
export default function PlanificationTab({
  dossierId,
  onEditPlanification,
  onNewPlanification,
  typeFilter,
  plansOverride,
}: PlanificationTabProps) {
  const db = useFirestore();
  const [plans, setPlans] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Inert on the live page; tints planifications added/modified by the
  // gestionnaire in the rappel treatment replica.
  const hl = useReplayHighlight();

  useEffect(() => {
    if (plansOverride !== undefined) {
      // Replay override: frozen data, same newest-first order as the live query.
      setPlans(
        [...plansOverride].sort(
          (a: any, b: any) => (toDate(b?.createdAt)?.getTime() || 0) - (toDate(a?.createdAt)?.getTime() || 0),
        ),
      );
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'dossiers', dossierId, 'planifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.warn('[planification-tab] listener error', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [db, dossierId, plansOverride]);

  const formatTimestamp = (ts: any) => {
    const d = toDate(ts);
    return d ? format(d, "d MMMM yyyy 'à' HH:mm", { locale: fr }) : 'N/A';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  const visiblePlans = typeFilter ? (plans ?? []).filter((p: any) => p.typeMission === typeFilter) : (plans ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="t-heading flex items-center gap-2">
          Visites planifiées
          {visiblePlans.length > 0 && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-2">{visiblePlans.length}</span>}
        </h3>
        <Button size="sm" variant={visiblePlans.length === 0 ? 'default' : 'outline'} className="h-8 gap-1.5" onClick={() => onNewPlanification(typeFilter)}>
          <Plus className="h-3.5 w-3.5" /> Nouvelle planification
        </Button>
      </div>

      {visiblePlans.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon />}
          title="Aucune visite planifiée"
          description={typeFilter ? `Programmez la visite « ${typeFilter.toLowerCase()} » pour assigner un agent de terrain.` : "Ce dossier n'a pas encore de mission planifiée."}
          action={<Button size="sm" onClick={() => onNewPlanification(typeFilter)}>Programmer une visite</Button>}
        />
      ) : (
        // Rows on hairlines; each row is self-contained — all details inline.
        <ol className="divide-y divide-hairline">
          {visiblePlans.map((plan: any, index: number) => {
            const replayStatus = hl.statusForEntry('planifications', plan.id);
            const rdv = toDate(plan.dateRDV);
            const latest = index === 0;
            const past = rdv ? isPast(rdv) : false;
            const upcoming = latest && !past;
            return (
              <li
                key={plan.id}
                className={cn(
                  'flex items-start gap-4 py-4 first:pt-0',
                  replayStatus && '-mx-2 rounded-md px-2',
                  highlightClass(replayStatus),
                )}
              >
                {/* Date block — the row's anchor: tinted + light contour; the next
                    upcoming visit gets the terracotta surface. */}
                <div
                  className={cn(
                    'flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1.5 text-center tabular-nums',
                    upcoming ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled' : 'bg-surface-3 text-ink-2 shadow-rim',
                  )}
                >
                  <span className="text-[11px] font-medium uppercase leading-none">{rdv ? format(rdv, 'MMM', { locale: fr }).replace('.', '') : '—'}</span>
                  <span className="font-headline text-xl font-semibold leading-tight">{rdv ? format(rdv, 'd') : '—'}</span>
                  <span className="text-[11px] leading-none">{rdv ? format(rdv, 'HH:mm') : ''}</span>
                </div>

                {/* Body — everything the details dialog used to show, in the row. */}
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium', TYPE_CHIP[plan.typeMission] ?? 'bg-surface-3 text-ink-2')}>
                        Visite {plan.typeMission ? String(plan.typeMission).toLowerCase() : '—'}
                      </span>
                      {latest && <Badge variant="outline" className="h-5 text-[11px] font-medium text-ink-2">Dernière</Badge>}
                      {rdv && <span className={cn('text-sm', upcoming ? 'font-medium text-ink' : 'text-ink-3')}>{format(rdv, 'EEEE d MMMM yyyy', { locale: fr })}</span>}
                      <ChangeBadge status={replayStatus} />
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5 text-xs text-ink-3 hover:text-ink" onClick={() => onEditPlanification(plan)}>
                      <Pencil className="h-3 w-3" /> Modifier
                    </Button>
                  </div>

                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    <div>
                      <dt className="t-label">Agent de terrain</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                        <User className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                        {plan.agentTerrain || <span className="font-normal text-ink-3">Non assigné</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="t-label">Zone d&apos;intervention</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                        {plan.zone || <span className="font-normal text-ink-3">—</span>}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="t-label">Adresse complète</dt>
                      <dd className="mt-0.5 text-sm text-ink">{plan.adresse || <span className="text-ink-3">—</span>}</dd>
                    </div>
                    {plan.telephone && (
                      <div>
                        <dt className="t-label">Téléphone</dt>
                        <dd className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-ink">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                          <a href={`tel:${plan.telephone}`} className="hover:underline">{plan.telephone}</a>
                        </dd>
                      </div>
                    )}
                  </dl>

                  {plan.observation && (
                    <div className="rounded-md bg-surface-2 px-3 py-2">
                      <p className="t-label flex items-center gap-1"><Info className="h-3 w-3" /> Observation</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{plan.observation}</p>
                    </div>
                  )}

                  {(plan.createdAt || plan.modifiedByName) && (
                    <p className="t-caption flex flex-wrap items-center gap-1 tabular-nums">
                      <Clock className="h-3 w-3 shrink-0" />
                      {plan.createdAt ? <>Créée le {formatTimestamp(plan.createdAt)}</> : null}
                      {plan.createdAt && plan.modifiedByName ? <span aria-hidden>·</span> : null}
                      {plan.modifiedByName ? <>modifiée par {plan.modifiedByName}</> : null}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
