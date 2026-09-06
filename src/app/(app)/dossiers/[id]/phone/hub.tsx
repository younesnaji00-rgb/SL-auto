'use client';

/**
 * Record HUB — what a phone lands on at `/dossiers/[id]` (mobile pass
 * 2026-09-06; research docs/research/mobile-record-pages.md E1, binding
 * synthesis §6).
 *
 * A dossier lives for weeks and its 8 steps are workspaces (a 40-field form,
 * socket grids, uploads), not article sections. NN/g's own accordion caveats
 * ("the content under an accordion can be really long"; Back-button
 * disorientation) and GOV.UK's task list ("only use the task list if users do
 * not want to, or cannot, complete all the tasks in one sitting"; "the whole
 * row is linked") land on the same shape: give the reader the big picture and
 * ONE tap into any step, never the desktop page shrunk.
 *
 * Order, top to bottom:
 *   1. identity — status chip + « modifié il y a 2 h »; compagnie · plaque
 *   2. « À faire » — the context column's todos, ≥ 48 px rows, whole row tappable
 *   3. « Étapes » — the 8-row task list (shared with the step picker sheet)
 *   4. flat summaries: Observations (3) · Rappels (mine, open) · Historique (4)
 *
 * Must not (E1 do-not list): a stepper strip, scroll-spy, the 8 paper
 * sections, an auto-jump to the last viewed step, or the primary action hidden
 * in « ⋯ » — it lives in the bottom action bar, published by the page.
 */

import * as React from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { Bell, Check, ChevronRight, History, ListChecks, ListOrdered, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserNameLink } from '@/components/user-name-link';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { toDate, type StepState } from '@/lib/dossier-steps';
import type { DossierTodo, VisitType } from '@/lib/dossier-todos';
import type { RequiredDocsStatus } from '@/lib/required-docs';
import { runDossierTodo, useDossierContextData, useDossierTodos } from '@/components/dossiers/dossier-context-panel';
import { auditText } from '@/lib/audit-i18n';
import { historiqueUrl, stepUrl } from '@/lib/step-navigation';
import { StepRows } from './step-picker-sheet';
import { cn } from '@/lib/utils';
import { dateFnsLocale, useT } from '@/i18n';

/**
 * Flat block with the neutral pill title (owner ruling 2026-09-02) — the same
 * anatomy the desktop context column uses, at phone padding. No card frame:
 * a phone page of stacked cards is a page of borders (density §7).
 */
function Block({
  title,
  icon,
  count,
  action,
  flush,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: React.ReactNode;
  action?: React.ReactNode;
  /** The body is a full-bleed row list (no 16 px side padding). */
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-hairline pt-5 first:border-t-0 first:pt-0">
      <header className="flex items-center gap-2 px-4">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-card px-3 shadow-rim">
          <span className="text-ink-3 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
          <h2 className="t-label leading-none text-ink-2">{title}</h2>
        </span>
        {count}
        <span className="min-w-0 flex-1" />
        {action}
      </header>
      <div className={cn('mt-2.5', flush ? '' : 'px-4')}>{children}</div>
    </section>
  );
}

/** « Voir » / « Tout voir » — 44 px hit area, word not icon (density §7). */
function BlockLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="-my-2 inline-flex min-h-[44px] shrink-0 items-center rounded-md px-2 text-[13px] text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="t-caption py-1">{children}</p>;
}

export interface PhoneHubProps {
  dossierId: string;
  dossier: any;
  steps: StepState[];
  requiredDocs: RequiredDocsStatus | null;
  readOnly: boolean;
  onGoToStep: (stepId: number, tab?: string) => void;
  onPlanifier: (type: VisitType) => void;
  onChiffrage: () => void;
}

export function PhoneHub({
  dossierId,
  dossier,
  steps,
  requiredDocs,
  readOnly,
  onGoToStep,
  onPlanifier,
  onChiffrage,
}: PhoneHubProps) {
  const t = useT();
  const todos = useDossierTodos(dossier, steps, requiredDocs);
  const { observations, historique, openRappels } = useDossierContextData(dossierId);

  const statut: string = dossier?.statut || 'Nouveau';
  const modifiedAt = toDate(dossier?.updatedAt ?? dossier?.lastStatusChange?.at ?? dossier?.createdAt);
  const identityLine = [dossier?.compagnie, dossier?.matricule].filter(Boolean).join(' · ');

  return (
    <div className="space-y-5 pb-4">
      {/* 1 — identity. The ref and the assuré are already in the top bar (E3),
          so this block carries only what the bar cannot: state and recency. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-4">
        <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(statut))}>
          {t(statut)}
        </Badge>
        {modifiedAt && (
          <span className="t-caption">
            {t('modifié')} {formatDistanceToNow(modifiedAt, { locale: dateFnsLocale(), addSuffix: true })}
          </span>
        )}
        {identityLine && <span className="t-body-sm w-full truncate text-ink-2">{identityLine}</span>}
      </div>

      {/* 2 — « À faire » first: what still blocks the dossier. */}
      <Block
        title={t('À faire')}
        icon={<ListChecks />}
        count={
          todos.length > 0 ? (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-status-warning-bg px-1.5 text-[11px] font-medium tabular-nums text-status-warning-fg">
              {todos.length}
            </span>
          ) : undefined
        }
        flush
      >
        {todos.length === 0 ? (
          <p className="t-caption inline-flex items-center gap-1.5 px-4 py-1 text-status-success-fg">
            <Check className="h-3.5 w-3.5" aria-hidden />
            {t('Rien à faire — dossier à jour.')}
          </p>
        ) : (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {todos.map((todo: DossierTodo) => (
              <li key={todo.id}>
                <button
                  type="button"
                  onClick={() => runDossierTodo(todo, { readOnly, onGoToStep, onPlanifier, onChiffrage })}
                  className="flex min-h-[48px] w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn('t-body block truncate', todo.waiting ? 'text-ink-2' : 'font-medium text-ink')}>{todo.label}</span>
                    {todo.detail && <span className="t-caption block truncate">{todo.detail}</span>}
                  </span>
                  <span className="t-caption shrink-0 text-ink-3">{todo.target}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {/* 3 — the record's spine. */}
      <Block title={t("Étapes")} icon={<ListOrdered />} flush>
        <StepRows dossierId={dossierId} steps={steps} />
      </Block>

      {/* 4 — the context column's remaining blocks, flattened (never a sheet:
          LukeW ✓ "hiding critical parts of an application behind these kinds
          of menus could negatively impact usage"). */}
      <Block
        title={t('Observations')}
        icon={<MessageSquare />}
        action={<BlockLink href={stepUrl(dossierId, 4, 'observations')}>{t('Voir')}</BlockLink>}
      >
        {observations.length === 0 ? (
          <Empty>{t('Aucune observation.')}</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {observations.map((o: any) => {
              const d = toDate(o.createdAt);
              return (
                <li key={o.id} className="min-w-0 py-2.5 first:pt-0 last:pb-0">
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
                <li key={r.id} className="t-body-sm min-w-0 py-2.5 first:pt-0 last:pb-0">
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
        action={<BlockLink href={historiqueUrl(dossierId)}>{t('Tout voir')}</BlockLink>}
      >
        {historique.length === 0 ? (
          <Empty>{t('Aucune entrée.')}</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {historique.map((h: any) => {
              const d = toDate(h.date);
              return (
                <li key={h.id} className="min-w-0 py-2.5 first:pt-0 last:pb-0">
                  {/* Historique rows are persisted in French — translated at
                      DISPLAY time only, like the desktop column does. */}
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
    </div>
  );
}

export default PhoneHub;
