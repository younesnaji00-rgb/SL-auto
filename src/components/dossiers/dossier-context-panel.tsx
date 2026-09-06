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
import { Bell, Check, ChevronRight, History, ListChecks, MessageSquare } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { UserNameLink } from '@/components/user-name-link';
import { toDate, type StepState } from '@/lib/dossier-steps';
import { getDossierTodos, type DossierTodo, type VisitType } from '@/lib/dossier-todos';
import type { RequiredDocsStatus } from '@/lib/required-docs';
import { auditText } from '@/lib/audit-i18n';
import { dateFnsLocale, useT } from '@/i18n';
import { cn } from '@/lib/utils';

// ── Shared data + routing (imported by the phone hub, E1) ───────────────────
// The phone lands on a HUB that shows the same four blocks this column shows
// (docs/research/mobile-record-pages.md E1: "reuse the context panel's todo
// data"). Both surfaces read through the helpers below so there is exactly one
// query set and one todo router in the app.

export interface DossierContextData {
  /** 3 latest observations, newest first. */
  observations: any[];
  /** 4 latest historique entries, newest first. */
  historique: any[];
  /** The current user's still-open rappels on this dossier. */
  openRappels: any[];
}

/**
 * The three live reads behind the context blocks. Limits match the column's
 * (3 observations / 4 history rows) because the phone hub prints the same
 * counts — a second, wider query would double the listener cost for nothing.
 */
export function useDossierContextData(dossierId: string): DossierContextData {
  const db = useFirestore();
  const { profile } = useCurrentUser();

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

  return useMemo(
    () => ({
      observations: observations ?? [],
      historique: historique ?? [],
      openRappels: (rappels ?? []).filter((r: any) => !r.resolvedAt),
    }),
    [observations, historique, rappels],
  );
}

export interface TodoHandlers {
  readOnly?: boolean;
  onGoToStep: (stepId: number, tab?: string) => void;
  onPlanifier?: (type: VisitType) => void;
  onChiffrage?: () => void;
}

/**
 * Where an « À faire » row leads. Read-only readers can look but not act:
 * every row degrades to a plain jump into the step that owns the work.
 */
export function runDossierTodo(todo: DossierTodo, { readOnly, onGoToStep, onPlanifier, onChiffrage }: TodoHandlers): void {
  const a = todo.action;
  if (a.kind === 'planifier' && !readOnly && onPlanifier) return onPlanifier(a.type);
  if (a.kind === 'chiffrage' && !readOnly && onChiffrage) return onChiffrage();
  onGoToStep(a.stepId, a.kind === 'goto' ? a.tab : a.kind === 'planifier' ? 'planification' : 'documents');
}

/**
 * `getDossierTodos` composes its own display strings via the module-level
 * translator (they are never persisted), so the memo must also depend on the
 * translator identity — otherwise switching language leaves stale rows. Both
 * the column and the phone hub go through this hook so the dependency list is
 * written once.
 */
export function useDossierTodos(dossier: any, steps: StepState[] | undefined, requiredDocs: RequiredDocsStatus | null | undefined): DossierTodo[] {
  const t = useT();
  return useMemo(
    () => (dossier && steps ? getDossierTodos(dossier, steps, requiredDocs ?? null) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is not called
    // here, but its identity changes with the locale and the rows carry text.
    [dossier, steps, requiredDocs, t],
  );
}

/**
 * Flat context block (DESIGN.md §10): no card — the title sits in a neutral
 * PILL with the light contour (owner ruling 2026-09-02: « À faire »,
 * « Observations » and every right-column title are pills, no colour, rim
 * on), over hairline-separated rows; blocks separated by hairline + spacing.
 */
function Block({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5 border-t border-hairline pt-5 first:border-t-0 first:pt-0">
      <header className="flex items-center gap-2">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-card px-3 shadow-rim">
          <span className="text-ink-3 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
          <h3 className="t-label leading-none text-ink-2">{title}</h3>
        </span>
        <span className="min-w-0 flex-1" />
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
  const t = useT();

  const todos = useDossierTodos(dossier, steps, requiredDocs);
  const runTodo = (todo: DossierTodo) => runDossierTodo(todo, { readOnly, onGoToStep, onPlanifier, onChiffrage });

  const { observations, historique, openRappels } = useDossierContextData(dossierId);

  return (
    <aside className={cn('flex flex-col gap-5 px-2', className)} aria-label={t('Contexte du dossier')}>
      {dossier && steps && (
        <Block
          title={t('À faire')}
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
              {t('Rien à faire — dossier à jour.')}
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
        title={t('Observations')}
        icon={<MessageSquare />}
        action={
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-ink-3 hover:text-ink" onClick={() => onGoToStep(4)}>
            {t('Voir')}
          </Button>
        }
      >
        {observations.length === 0 ? (
          <Empty>{t('Aucune observation.')}</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {observations.map((o: any) => {
              const d = toDate(o.createdAt);
              return (
                <li key={o.id} className="min-w-0 py-2 first:pt-0 last:pb-0">
                  <p className="t-body-sm line-clamp-2 text-ink-2">{o.text || o.observation || '—'}</p>
                  <p className="t-caption mt-0.5 truncate">
                    {o.userName || o.userNom || o.user || ''}
                    {d && <> · {formatDistanceToNow(d, { locale: dateFnsLocale(), addSuffix: true })}</>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <Block title={t('Rappels')} icon={<Bell />}>
        {openRappels.length === 0 ? (
          <Empty>{t('Aucun rappel actif pour vous sur ce dossier.')}</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {openRappels.slice(0, 3).map((r: any) => {
              const d = toDate(r.createdAt);
              return (
                <li key={r.id} className="t-body-sm min-w-0 py-2 first:pt-0 last:pb-0">
                  <span className="font-medium text-ink">{r.senderNom || t('Rappel')}</span>
                  {r.observation && <span className="text-ink-3"> — {r.observation}</span>}
                  {d && <span className="t-caption block">{format(d, 'dd/MM/yyyy HH:mm', { locale: dateFnsLocale() })}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <Block
        title={t('Historique')}
        icon={<History />}
        action={
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-ink-3 hover:text-ink" onClick={onOpenHistorique}>
            {t('Tout voir')}
          </Button>
        }
      >
        {historique.length === 0 ? (
          <Empty>{t('Aucune entrée.')}</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {historique.map((h: any) => {
              const d = toDate(h.date);
              return (
                <li key={h.id} className="min-w-0 py-2 first:pt-0 last:pb-0">
                  {/* Historique rows are persisted in French — translated at
                      DISPLAY time only, like the history sheets do. */}
                  <p className="t-body-sm truncate text-ink-2">{auditText(h.action, t) || '—'}</p>
                  <p className="t-caption truncate">
                    {d && format(d, 'dd/MM/yyyy HH:mm', { locale: dateFnsLocale() })}
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
