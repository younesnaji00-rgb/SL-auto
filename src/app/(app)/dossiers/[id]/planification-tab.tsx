'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, Calendar as CalendarIcon, User, MapPin, Plus, Info, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
 * Planifications as a calendar-style list (date block · who/where · action),
 * newest first. The latest one is emphasised; older ones read as history.
 */
export default function PlanificationTab({
  dossierId,
  onEditPlanification,
  onNewPlanification,
  typeFilter,
}: PlanificationTabProps) {
  const db = useFirestore();
  const [plans, setPlans] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<any>(null);
  // Inert on the live page; tints planifications added/modified by the
  // gestionnaire in the rappel treatment replica.
  const hl = useReplayHighlight();

  useEffect(() => {
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
  }, [db, dossierId]);

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
        // Rows on hairlines (the step itself is the paper) — the latest visit
        // is emphasised by tone + ink, older ones step down to ink-2/ink-3.
        <ol className="divide-y divide-hairline">
          {visiblePlans.map((plan: any, index: number) => {
            const replayStatus = hl.statusForEntry('planifications', plan.id);
            const rdv = toDate(plan.dateRDV);
            const latest = index === 0;
            const past = rdv ? isPast(rdv) : false;
            return (
              <li
                key={plan.id}
                className={cn(
                  'group -mx-2 flex cursor-pointer items-stretch gap-4 rounded-md px-2 py-3 transition-colors hover:bg-surface-2',
                  highlightClass(replayStatus),
                )}
                onClick={() => setExpandedPlan(plan)}
              >
                {/* Date block */}
                <div
                  className={cn(
                    'flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1.5 text-center tabular-nums',
                    latest && !past ? 'bg-surface-4 text-ink' : 'bg-surface-2 text-ink-3',
                  )}
                >
                  <span className="text-[11px] font-medium uppercase leading-none">{rdv ? format(rdv, 'MMM', { locale: fr }).replace('.', '') : '—'}</span>
                  <span className="font-headline text-xl font-semibold leading-tight">{rdv ? format(rdv, 'd') : '—'}</span>
                  <span className="text-[11px] leading-none">{rdv ? format(rdv, 'HH:mm') : ''}</span>
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium', TYPE_CHIP[plan.typeMission] ?? 'bg-surface-3 text-ink-2')}>
                      Visite {plan.typeMission ? String(plan.typeMission).toLowerCase() : '—'}
                    </span>
                    {latest && <Badge variant="outline" className="h-5 text-[11px] font-medium text-ink-2">Dernière</Badge>}
                    {rdv && <span className="t-caption">{format(rdv, 'EEEE d MMMM yyyy', { locale: fr })}</span>}
                    <ChangeBadge status={replayStatus} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-ink-3" />
                      {plan.agentTerrain ? <span className={cn('font-medium', latest ? 'text-ink' : 'text-ink-2')}>{plan.agentTerrain}</span> : <span className="text-ink-3">Agent non assigné</span>}
                    </span>
                    {(plan.zone || plan.adresse) && (
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-3">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{[plan.zone, plan.adresse].filter(Boolean).join(' · ')}</span>
                      </span>
                    )}
                  </div>
                  {plan.observation && <p className="t-caption mt-1 line-clamp-1">{plan.observation}</p>}
                </div>

                <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-ink-3 hover:text-ink" onClick={() => onEditPlanification(plan)}>
                    <Pencil className="h-3 w-3" /> Modifier
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Details dialog */}
      <Dialog open={!!expandedPlan} onOpenChange={(open) => { if (!open) setExpandedPlan(null); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-ink-3" />
              Détails de la planification
            </DialogTitle>
          </DialogHeader>
          {expandedPlan && (
            <div className="space-y-4 py-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium', TYPE_CHIP[expandedPlan.typeMission] ?? 'bg-surface-3 text-ink-2')}>
                  Visite {expandedPlan.typeMission ? String(expandedPlan.typeMission).toLowerCase() : '—'}
                </span>
                {expandedPlan.createdAt && (
                  <span className="t-caption flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Créée le {formatTimestamp(expandedPlan.createdAt)}
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="t-label">Date & heure du RDV</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-ink"><CalendarIcon className="h-4 w-4 text-ink-3" />{formatTimestamp(expandedPlan.dateRDV)}</dd>
                </div>
                <div>
                  <dt className="t-label">Agent de terrain</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-ink"><User className="h-4 w-4 text-ink-3" />{expandedPlan.agentTerrain || 'Non assigné'}</dd>
                </div>
                <div>
                  <dt className="t-label">Zone d&apos;intervention</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-ink"><MapPin className="h-4 w-4 text-ink-3" />{expandedPlan.zone || '—'}</dd>
                </div>
                <div>
                  <dt className="t-label">Modifié par</dt>
                  <dd className="mt-1 text-sm font-medium text-ink">{expandedPlan.modifiedByName || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="t-label">Adresse complète</dt>
                  <dd className="mt-1 text-sm text-ink">{expandedPlan.adresse || '—'}</dd>
                </div>
                {expandedPlan.telephone && (
                  <div>
                    <dt className="t-label">Téléphone</dt>
                    <dd className="mt-1 flex items-center gap-2 text-sm tabular-nums text-ink"><Phone className="h-4 w-4 text-ink-3" />{expandedPlan.telephone}</dd>
                  </div>
                )}
              </dl>

              {expandedPlan.observation && (
                <div className="rounded-md bg-surface-2 px-3 py-2">
                  <p className="t-label flex items-center gap-1"><Info className="h-3 w-3" /> Observation</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{expandedPlan.observation}</p>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => { setExpandedPlan(null); onEditPlanification(expandedPlan); }}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier cette planification
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
