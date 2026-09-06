'use client';

/**
 * Sticky record bar — the dossier's "highlights panel" (Salesforce compact
 * layout / Jira header): identity, status, one primary action for the current
 * step, and an overflow menu. Replaces three stacked sticky rows.
 *
 * Also registers the record title for the breadcrumb / document.title and
 * keeps the workspace tab label in sync.
 *
 * PHONE (mobile pass 2026-09-06 — research mobile-record-pages.md E3): the
 * shell top bar and this bar MERGE. Two stacked 48–56 px sticky rows are 13 %
 * of an 844 px screen before anything is read (NN/g content-to-chrome), and
 * Apple's rule for a pushed hierarchical screen is back + title + ONE trailing
 * group. So below `md` this component paints nothing and instead PUBLISHES its
 * anatomy into the chrome registry — `‹ Dossiers`, the mono ref as the title,
 * the assuré as the subtitle, and every overflow row as the top bar's « ⋯ »
 * action sheet. Its side effects (title registration, workspace-tab label,
 * dirty dot) keep running: they are the same on both shells. The rappel
 * session's amber « Sauvegarder » moves to the bottom action bar (E4), and the
 * primary action to the bottom bar as well — never hidden inside « ⋯ ».
 */

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Calculator, CalendarPlus, ChevronDown, ChevronUp, History, Mail, MoreHorizontal, Save, Trash2, Undo2 } from 'lucide-react';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { usePhoneChrome } from '@/components/layout/page-chrome';
import type { ActionItem } from '@/components/ui/action-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { dossierLabel, assureName } from '@/lib/dossier-label';
import { nextStep, primaryActionForStep, type StepState } from '@/lib/dossier-steps';
import { useRegisterPageTitle } from '@/components/layout/page-chrome';
import { useWorkspaceTabs, useTabDirty } from '@/hooks/use-workspace-tabs';
import { readDossierListOrder } from '@/lib/dossier-list-order';
import { useT } from '@/i18n';

export interface RecordBarProps {
  dossierId: string;
  dossier: any;
  steps: StepState[];
  readOnly: boolean;
  activeStepId: number;
  /** Rappel-treatment session (recipient only). */
  rappel?: {
    active: boolean;
    pendingCount: number;
    validating: boolean;
    onSave: () => void;
    onDiscard: () => void;
  };
  onEmail: () => void;
  onHistorique: () => void;
  onPlanifier: (type?: 'Avant' | 'En cours' | 'Après') => void;
  onChiffrage: () => void;
  onGoToStep: (stepId: number) => void;
  onDelete?: () => void;
  /** Phone up-link target (E3). Defaults to the dossier list. */
  upHref?: string;
  upLabel?: string;
  /**
   * Phone screen title. The hub shows the record's ref; a step screen shows
   * « 2 · Visite avant », the historique screen « Historique ». Published from
   * here — one registrar per route, so leaving a sub-screen cannot blank the
   * top bar. Ignored on desktop (the bar prints its own identity row).
   */
  phoneTitle?: string | null;
}

export const RECORD_BAR_HEIGHT = 48;

export function RecordBar({
  dossierId,
  dossier,
  steps,
  readOnly,
  activeStepId,
  rappel,
  onEmail,
  onHistorique,
  onPlanifier,
  onChiffrage,
  onGoToStep,
  onDelete,
  upHref = '/dossiers',
  upLabel = 'Dossiers',
  phoneTitle,
}: RecordBarProps) {
  const t = useT();
  const isPhone = useIsPhone();
  const label = dossierLabel(dossier);
  // Phone: the title line is the mono ref alone (the assuré becomes the
  // subtitle), so `REF · Assuré` would print the name twice.
  useRegisterPageTitle(isPhone ? phoneTitle || dossier?.refExpert || t('Sans réf.') : label);
  const router = useRouter();

  // Arrival moment for a JUST-CREATED dossier (motion-spec §1.2 F3 + §8
  // Yellow-Fade): create-dossier-dialog stamps sessionStorage before
  // navigating here; the new ref takes ONE 2 s teal value-flash so the
  // landing visibly acknowledges the birth. Flag read-once, never on
  // ordinary opens or refreshes.
  const [justCreated, setJustCreated] = React.useState(false);
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('dossier_just_created') === dossierId) {
        window.sessionStorage.removeItem('dossier_just_created');
        setJustCreated(true);
        window.setTimeout(() => setJustCreated(false), 2100);
      }
    } catch { /* ignore */ }
  }, [dossierId]);

  // « Précédent / suivant » iterate the list page's filtered order (written
  // to sessionStorage when a row is opened — anti pogo-sticking, research
  // 2026-09-03). Hidden entirely when the dossier wasn't opened from the list.
  const listNav = useMemo(() => {
    const order = readDossierListOrder();
    const idx = order.indexOf(dossierId);
    if (idx === -1) return null;
    return {
      prevId: idx > 0 ? order[idx - 1] : null,
      nextId: idx < order.length - 1 ? order[idx + 1] : null,
      position: idx + 1,
      total: order.length,
    };
  }, [dossierId]);

  const tabs = useWorkspaceTabs('dossier');
  useEffect(() => {
    tabs.openTab(dossierId, label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId, label]);
  useTabDirty('dossier', dossierId, !!rappel?.active && (rappel?.pendingCount ?? 0) > 0);

  const statut: string = dossier?.statut || 'Nouveau';
  const next = nextStep(steps);
  const focus = steps.find((s) => s.id === activeStepId) ?? next;
  const action = focus ? primaryActionForStep(focus.status === 'done' && next ? next.id : focus.id) : { label: '', kind: null as null };

  const runPrimary = () => {
    if (!action.kind) return;
    if (action.kind === 'planifier') {
      const stepId = focus?.status === 'done' && next ? next.id : focus?.id;
      onPlanifier(stepId === 4 ? 'Avant' : stepId === 9 ? 'En cours' : stepId === 10 ? 'Après' : undefined);
    } else if (action.kind === 'chiffrage') onChiffrage();
    else if (action.kind === 'rapport') onGoToStep(7);
    else if (action.kind === 'honoraires') onGoToStep(8);
  };

  const showPrimary = !readOnly && !!action.kind;

  // ── Phone: publish this bar INTO the shell top bar (E3) ──────────────────
  // Every desktop overflow row becomes an « ⋯ » action-sheet item, in the same
  // order; Précédent / Suivant join it because a 44 px pair of chevrons has no
  // room next to a two-line title (they are `hidden sm:flex` on desktop too).
  const secondaryActions = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];
    if (listNav) {
      items.push({
        key: 'prev',
        label: t('Dossier précédent'),
        icon: <ChevronUp />,
        hint: `${listNav.position}/${listNav.total} ${t('de la liste')}`,
        disabled: !listNav.prevId,
        onSelect: () => listNav.prevId && router.push(`/dossiers/${listNav.prevId}`),
      });
      items.push({
        key: 'next',
        label: t('Dossier suivant'),
        icon: <ChevronDown />,
        hint: `${listNav.position}/${listNav.total} ${t('de la liste')}`,
        disabled: !listNav.nextId,
        onSelect: () => listNav.nextId && router.push(`/dossiers/${listNav.nextId}`),
      });
    }
    items.push({ key: 'planifier', label: t('Nouvelle planification'), icon: <CalendarPlus />, hidden: readOnly, onSelect: () => onPlanifier() });
    items.push({ key: 'chiffrage', label: t('Envoyer au chiffrage'), icon: <Calculator />, hidden: readOnly, onSelect: onChiffrage });
    items.push({ key: 'email', label: t('Envoyer un email'), icon: <Mail />, hidden: readOnly, onSelect: onEmail });
    items.push({ key: 'historique', label: t('Historique'), icon: <History />, onSelect: onHistorique });
    if (onDelete) items.push({ key: 'delete', label: t('Supprimer le dossier'), icon: <Trash2 />, destructive: true, onSelect: onDelete });
    return items;
  }, [listNav, readOnly, onDelete, onPlanifier, onChiffrage, onEmail, onHistorique, router, t]);

  const assure = assureName(dossier?.assure);
  const phoneChrome = useMemo(
    () =>
      isPhone
        ? {
            upHref,
            upLabel,
            subtitle: [assure, dossier?.matricule].filter(Boolean).join(' · ') || null,
            secondaryActions,
            // The primary lives in the bottom action bar (E4), never in « ⋯ ».
            primaryAction: null,
          }
        : null,
    [isPhone, upHref, upLabel, assure, dossier?.matricule, secondaryActions],
  );
  usePhoneChrome(phoneChrome);

  // The bar itself is desktop-only; the phone reads it from the top bar above.
  if (isPhone) return null;

  return (
    // Tour anchors (merge 2026-09-04): the dossier-detail tutorial anchored
    // these on the old page header, which this record bar replaced. Names are
    // unchanged so src/lib/tutorial/pages/dossier-detail.ts still resolves.
    <div
      className="sticky top-0 z-40 flex min-h-[48px] items-center gap-2 glass-bar border-b border-hairline px-3 sm:px-5"
      data-record-bar
      data-tour="dosd-header"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-ink-3 hover:text-ink" asChild>
            <Link href="/dossiers" aria-label={t('Retour aux dossiers')}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('Dossiers')}</TooltipContent>
      </Tooltip>

      {listNav && (
        <div className="hidden shrink-0 items-center sm:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-ink-3 hover:text-ink"
                disabled={!listNav.prevId}
                aria-label={t('Dossier précédent')}
                onClick={() => listNav.prevId && router.push(`/dossiers/${listNav.prevId}`)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('Dossier précédent')} — {listNav.position}/{listNav.total} {t('de la liste')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-ink-3 hover:text-ink"
                disabled={!listNav.nextId}
                aria-label={t('Dossier suivant')}
                onClick={() => listNav.nextId && router.push(`/dossiers/${listNav.nextId}`)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('Dossier suivant')} — {listNav.position}/{listNav.total} {t('de la liste')}</TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
        {/* Reading order: ref (mono, ink) → assuré (ink) → compagnie / plaque (ink-3) → statut. */}
        <h1
          className={cn(
            't-mono min-w-0 truncate rounded-md font-semibold tracking-tight',
            justCreated && 'animate-value-flash px-1 -mx-1',
          )}
          title={dossier?.refExpert || undefined}
        >
          {dossier?.refExpert || t('Sans réf.')}
        </h1>
        {assureName(dossier?.assure) && (
          <span className="t-body min-w-0 truncate font-medium">{assureName(dossier?.assure)}</span>
        )}
        {dossier?.compagnie && <span className="hidden truncate text-sm text-ink-3 md:inline">{dossier.compagnie}</span>}
        {dossier?.matricule && (
          <span className="t-mono hidden text-ink-3 lg:inline">{dossier.matricule}</span>
        )}
        <Badge
          variant="outline"
          className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(statut), 'shrink-0')}
          data-tour="dosd-statut"
        >
          {/* Display-only: `statut` stays the stored French value everywhere
              else (comparisons, writes) — only the rendered text translates. */}
          {t(statut)}
        </Badge>
        {dossier?.lastObservation?.text && (
          <span
            className="hidden max-w-[220px] truncate rounded-full border border-status-warning-fg/30 bg-status-warning-bg px-2 py-0.5 text-[11px] text-status-warning-fg xl:inline"
            title={dossier.lastObservation.text}
          >
            {dossier.lastObservation.text}
          </span>
        )}
      </div>

      {rappel?.active && (
        // data-tour: the reminder-treatment walkthrough points here. The
        // banner became this chip in the record bar during the redesign; the
        // tour step lost its anchor and stopped rendering.
        <div data-tour="dosd-rappel-banner" className="flex shrink-0 items-center gap-1.5 rounded-md border border-status-warning-fg/30 bg-status-warning-bg px-2 py-1 text-xs text-status-warning-fg">
          <Bell className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">{t('Rappel en cours')}</span>
          {rappel.pendingCount > 0 && (
            <span className="rounded-full bg-status-warning-fg/15 px-1.5 text-[11px] font-semibold tabular-nums">{rappel.pendingCount}</span>
          )}
          {rappel.pendingCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[11px] text-status-warning-fg hover:bg-status-warning-fg/10"
              onClick={rappel.onDiscard}
              title={t('Annuler les modifications de cette session')}
            >
              <Undo2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            className="h-6 gap-1 px-2 text-[11px]"
            onClick={rappel.onSave}
            disabled={rappel.validating}
            data-tour="dosd-rappel-save"
          >
            <Save className="h-3 w-3" />
            {rappel.validating ? t('Enregistrement…') : t('Sauvegarder')}
          </Button>
        </div>
      )}

      {showPrimary && (
        <Button size="sm" className="hidden h-8 shrink-0 gap-1.5 md:inline-flex" onClick={runPrimary}>
          {action.kind === 'planifier' && <CalendarPlus className="h-3.5 w-3.5" />}
          {action.kind === 'chiffrage' && <Calculator className="h-3.5 w-3.5" />}
          {/* `primaryActionForStep` is a pure lib returning French display
              labels — translated here at the render site (same convention as
              `t(step.longLabel)` in the timeline). */}
          {t(action.label)}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label={t("Plus d'actions")}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="t-caption truncate font-normal">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {showPrimary && (
            <DropdownMenuItem onSelect={runPrimary} className="md:hidden">
              {action.kind === 'planifier' ? <CalendarPlus className="mr-2 h-4 w-4" /> : <Calculator className="mr-2 h-4 w-4" />}
              {t(action.label)}
            </DropdownMenuItem>
          )}
          {!readOnly && (
            <DropdownMenuItem onSelect={() => onPlanifier()}>
              <CalendarPlus className="mr-2 h-4 w-4" /> {t('Nouvelle planification')}
            </DropdownMenuItem>
          )}
          {!readOnly && (
            <DropdownMenuItem onSelect={onChiffrage}>
              <Calculator className="mr-2 h-4 w-4" /> {t('Envoyer au chiffrage')}
            </DropdownMenuItem>
          )}
          {!readOnly && (
            <DropdownMenuItem onSelect={onEmail}>
              <Mail className="mr-2 h-4 w-4" /> {t('Envoyer un email')}
            </DropdownMenuItem>
          )}
          {/* NOTE (merge 2026-09-04): Historique moved from a visible header
              button into this ⋯ menu, so the anchor only exists while the menu
              is open — the tour needs a preceding "open ⋯" step. */}
          <DropdownMenuItem onSelect={onHistorique} data-tour="dosd-historique">
            <History className="mr-2 h-4 w-4" /> {t('Historique')}
          </DropdownMenuItem>
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {t('Supprimer le dossier')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default RecordBar;
