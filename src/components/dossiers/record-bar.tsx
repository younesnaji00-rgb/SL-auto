'use client';

/**
 * Sticky record bar — the dossier's "highlights panel" (Salesforce compact
 * layout / Jira header): identity, status, one primary action for the current
 * step, and an overflow menu. Replaces three stacked sticky rows.
 *
 * Also registers the record title for the breadcrumb / document.title and
 * keeps the workspace tab label in sync.
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Calculator, CalendarPlus, History, Mail, MoreHorizontal, Save, Trash2, Undo2 } from 'lucide-react';
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
    <div
      className="sticky top-0 z-40 flex min-h-[48px] items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-5"
      data-record-bar
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/dossiers" aria-label="Retour aux dossiers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Dossiers</TooltipContent>
      </Tooltip>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
        <h1 className="min-w-0 truncate font-mono text-[15px] font-semibold tracking-tight text-foreground" title={dossier?.refExpert || undefined}>
          {dossier?.refExpert || 'Sans réf.'}
        </h1>
        {assureName(dossier?.assure) && (
          <span className="min-w-0 truncate text-sm font-medium text-foreground/90">{assureName(dossier?.assure)}</span>
        )}
        {dossier?.compagnie && <span className="hidden truncate text-sm text-muted-foreground md:inline">{dossier.compagnie}</span>}
        {dossier?.matricule && (
          <span className="hidden font-mono text-xs text-muted-foreground lg:inline">{dossier.matricule}</span>
        )}
        <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(statut), 'shrink-0')}>
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
          <Button size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={rappel.onSave} disabled={rappel.validating}>
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
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{label}</DropdownMenuLabel>
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
          <DropdownMenuItem onSelect={onHistorique}>
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
