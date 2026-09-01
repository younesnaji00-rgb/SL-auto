'use client';

/**
 * Right-hand context column for the dossier page on wide screens (HubSpot /
 * Jira pattern): « À faire » (what still blocks the dossier — GOV.UK task-list
 * summary, each row a link into the step/tab where it gets done), then
 * compact summaries of Observations, Rappels and Historique so they are
 * visible without opening sheets. Below `xl` the page keeps its existing
 * sheets/dialogs — this column simply isn't rendered.
 */

import React, { useMemo } from 'react';
import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, Check, ChevronRight, History, ListChecks, MessageSquare } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { UserNameLink } from '@/components/user-name-link';
import { toDate, type StepState } from '@/lib/dossier-steps';
import { getDossierTodos, type DossierTodo, type VisitType } from '@/lib/dossier-todos';
import type { RequiredDocsStatus } from '@/lib/required-docs';
import { cn } from '@/lib/utils';

/**
 * Flat context block (DESIGN.md §10): no card, no border — a `t-label`
 * header and hairline-separated rows; blocks are separated by spacing so the
 * column reads as one quiet aside next to the paper steps.
 */
function Block({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <header className="flex h-6 items-center gap-2">
        <span className="text-ink-3 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        <h3 className="t-label flex-1">{title}</h3>
        {action}
      </header>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="t-caption py-1">{children}</p>;
}

/**
 * One « À faire » row: label (ink) over detail (caption), destination on the
 * right. Rows the reader is only waiting on (chiffreur, agent) are toned to
 * ink-2 — still a link, but not a call to action.
 */
function TodoRow({ todo, onSelect }: { todo: DossierTodo; onSelect: (todo: DossierTodo) => void }) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(todo)}
        className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1">
          <span className={cn('t-body-sm block truncate', todo.waiting ? 'text-ink-2' : 'font-medium text-ink')}>{todo.label}</span>
          {todo.detail && <span className="t-caption block truncate">{todo.detail}</span>}
        </span>
        <span className="t-caption inline-flex shrink-0 items-center gap-0.5 text-ink-3 transition-colors group-hover:text-ink">
          {todo.target}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </button>
    </li>
  );
}

export function DossierContextPanel({
  dossierId,
  dossier,
  steps,
  requiredDocs,
  readOnly = false,
  onOpenHistorique,
  onGoToStep,
  onPlanifier,
  onChiffrage,
  className,
}: {
  dossierId: string;
  /** The dossier document (or its rappel overlay) — drives « À faire ». */
  dossier?: any;
  steps?: StepState[];
  /** Live required-pieces status; `null` while loading. */
  requiredDocs?: RequiredDocsStatus | null;
  readOnly?: boolean;
  onOpenHistorique: () => void;
  /** Go to a step, optionally on one of its tabs. */
  onGoToStep: (stepId: number, tab?: string) => void;
  onPlanifier?: (type: VisitType) => void;
  onChiffrage?: () => void;
  className?: string;
}) {
  const db = useFirestore();
  const { profile } = useCurrentUser();

  const todos = useMemo(
    () => (dossier && steps ? getDossierTodos(dossier, steps, requiredDocs ?? null) : []),
    [dossier, steps, requiredDocs],
  );
  const runTodo = (todo: DossierTodo) => {
    const a = todo.action;
    // Read-only readers can look but not act: every row becomes a plain jump.
    if (a.kind === 'planifier' && !readOnly && onPlanifier) return onPlanifier(a.type);
    if (a.kind === 'chiffrage' && !readOnly && onChiffrage) return onChiffrage();
    onGoToStep(a.stepId, a.kind === 'goto' ? a.tab : a.kind === 'planifier' ? 'planification' : 'documents');
  };

  const obsQuery = useMemo(
    () => (db && dossierId ? query(collection(db, 'dossiers', dossierId, 'observations'), orderBy('createdAt', 'desc'), limit(3)) : null),
    [db, dossierId],
  );
  const histQuery = useMemo(
    () => (db && dossierId ? query(collection(db, 'dossiers', dossierId, 'historique'), orderBy('date', 'desc'), limit(4)) : null),
    [db, dossierId],
  );
  const rappelQuery = useMemo(
    () =>
      db && dossierId && profile?.uid
        ? query(collection(db, 'rappels'), where('recipientUid', '==', profile.uid), where('dossierId', '==', dossierId))
        : null,
    [db, dossierId, profile?.uid],
  );

  const { data: observations } = useCollection<any>(obsQuery as any);
  const { data: historique } = useCollection<any>(histQuery as any);
  const { data: rappels } = useCollection<any>(rappelQuery as any);

  const openRappels = (rappels || []).filter((r: any) => !r.resolvedAt);

  return (
    <aside className={cn('flex flex-col gap-8 px-2', className)} aria-label="Contexte du dossier">
      {dossier && steps && (
        <Block
          title="À faire"
          icon={<ListChecks />}
          action={
            todos.length > 0 ? (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-status-warning-bg px-1.5 text-[11px] font-medium tabular-nums text-status-warning-fg">
                {todos.length}
              </span>
            ) : undefined
          }
        >
          {todos.length === 0 ? (
            <p className="t-caption inline-flex items-center gap-1.5 py-1 text-status-success-fg">
              <Check className="h-3.5 w-3.5" aria-hidden />
              Rien à faire — dossier à jour.
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {todos.map((t) => (
                <TodoRow key={t.id} todo={t} onSelect={runTodo} />
              ))}
            </ul>
          )}
        </Block>
      )}

      <Block
        title="Observations"
        icon={<MessageSquare />}
        action={
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-ink-3 hover:text-ink" onClick={() => onGoToStep(4)}>
            Voir
          </Button>
        }
      >
        {!observations || observations.length === 0 ? (
          <Empty>Aucune observation.</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {observations.map((o: any) => {
              const d = toDate(o.createdAt);
              return (
                <li key={o.id} className="min-w-0 py-2 first:pt-0 last:pb-0">
                  <p className="t-body-sm line-clamp-2 text-ink-2">{o.text || o.observation || '—'}</p>
                  <p className="t-caption mt-0.5 truncate">
                    {o.userName || o.userNom || o.user || ''}
                    {d && <> · {formatDistanceToNow(d, { locale: fr, addSuffix: true })}</>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <Block title="Rappels" icon={<Bell />}>
        {openRappels.length === 0 ? (
          <Empty>Aucun rappel actif pour vous sur ce dossier.</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {openRappels.slice(0, 3).map((r: any) => {
              const d = toDate(r.createdAt);
              return (
                <li key={r.id} className="t-body-sm min-w-0 py-2 first:pt-0 last:pb-0">
                  <span className="font-medium text-ink">{r.senderNom || 'Rappel'}</span>
                  {r.observation && <span className="text-ink-3"> — {r.observation}</span>}
                  {d && <span className="t-caption block">{format(d, 'dd/MM/yyyy HH:mm', { locale: fr })}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <Block
        title="Historique"
        icon={<History />}
        action={
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-ink-3 hover:text-ink" onClick={onOpenHistorique}>
            Tout voir
          </Button>
        }
      >
        {!historique || historique.length === 0 ? (
          <Empty>Aucune entrée.</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {historique.map((h: any) => {
              const d = toDate(h.date);
              return (
                <li key={h.id} className="min-w-0 py-2 first:pt-0 last:pb-0">
                  <p className="t-body-sm truncate text-ink-2">{h.action || '—'}</p>
                  <p className="t-caption truncate">
                    {d && format(d, 'dd/MM/yyyy HH:mm', { locale: fr })}
                    {h.user && (
                      <>
                        {' · '}
                        <UserNameLink entry={{ userNom: h.userNom, user: h.user }} className="text-ink-3" />
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Block>
    </aside>
  );
}

export default DossierContextPanel;
