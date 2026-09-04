'use client';

/**
 * Sticky record bar — the dossier's "highlights panel" (Salesforce compact
 * layout / Jira header): identity, status, one primary action for the current
 * step, and an overflow menu. Replaces three stacked sticky rows.
 *
 * Also registers the record title for the breadcrumb / document.title and
 * keeps the workspace tab label in sync.
 */

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Calculator, CalendarPlus, ChevronDown, ChevronUp, History, Mail, MoreHorizontal, Save, Trash2, Undo2 } from 'lucide-react';
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
}: RecordBarProps) {
  const label = dossierLabel(dossier);
  useRegisterPageTitle(label);
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
            <Link href="/dossiers" aria-label="Retour aux dossiers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Dossiers</TooltipContent>
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
                aria-label="Dossier précédent"
                onClick={() => listNav.prevId && router.push(`/dossiers/${listNav.prevId}`)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Dossier précédent — {listNav.position}/{listNav.total} de la liste</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-ink-3 hover:text-ink"
                disabled={!listNav.nextId}
                aria-label="Dossier suivant"
                onClick={() => listNav.nextId && router.push(`/dossiers/${listNav.nextId}`)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Dossier suivant — {listNav.position}/{listNav.total} de la liste</TooltipContent>
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
          {dossier?.refExpert || 'Sans réf.'}
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
          {statut}
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
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-status-warning-fg/30 bg-status-warning-bg px-2 py-1 text-xs text-status-warning-fg">
          <Bell className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Rappel en cours</span>
          {rappel.pendingCount > 0 && (
            <span className="rounded-full bg-status-warning-fg/15 px-1.5 text-[11px] font-semibold tabular-nums">{rappel.pendingCount}</span>
          )}
          {rappel.pendingCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[11px] text-status-warning-fg hover:bg-status-warning-fg/10"
              onClick={rappel.onDiscard}
              title="Annuler les modifications de cette session"
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
            {rappel.validating ? 'Enregistrement…' : 'Sauvegarder'}
          </Button>
        </div>
      )}

      {showPrimary && (
        <Button size="sm" className="hidden h-8 shrink-0 gap-1.5 md:inline-flex" onClick={runPrimary}>
          {action.kind === 'planifier' && <CalendarPlus className="h-3.5 w-3.5" />}
          {action.kind === 'chiffrage' && <Calculator className="h-3.5 w-3.5" />}
          {action.label}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Plus d'actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="t-caption truncate font-normal">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {showPrimary && (
            <DropdownMenuItem onSelect={runPrimary} className="md:hidden">
              {action.kind === 'planifier' ? <CalendarPlus className="mr-2 h-4 w-4" /> : <Calculator className="mr-2 h-4 w-4" />}
              {action.label}
            </DropdownMenuItem>
          )}
          {!readOnly && (
            <DropdownMenuItem onSelect={() => onPlanifier()}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Nouvelle planification
            </DropdownMenuItem>
          )}
          {!readOnly && (
            <DropdownMenuItem onSelect={onChiffrage}>
              <Calculator className="mr-2 h-4 w-4" /> Envoyer au chiffrage
            </DropdownMenuItem>
          )}
          {!readOnly && (
            <DropdownMenuItem onSelect={onEmail}>
              <Mail className="mr-2 h-4 w-4" /> Envoyer un email
            </DropdownMenuItem>
          )}
          {/* NOTE (merge 2026-09-04): Historique moved from a visible header
              button into this ⋯ menu, so the anchor only exists while the menu
              is open — the tour needs a preceding "open ⋯" step. */}
          <DropdownMenuItem onSelect={onHistorique} data-tour="dosd-historique">
            <History className="mr-2 h-4 w-4" /> Historique
          </DropdownMenuItem>
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer le dossier
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default RecordBar;
