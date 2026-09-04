'use client';

/**
 * Change-awareness for the dossier timeline, used ONLY by the rappel
 * "Voir le détail" replica. The live editing page never wraps the components in
 * a provider, so the default context is inert (every lookup returns null) and
 * the components render exactly as before — zero impact on normal editing.
 *
 * In the replica, the provider supplies a diff (computed live: current dossier
 * vs the session-start snapshot) so individual fields and subcollection entries
 * can be tinted green (added) / yellow (modified) / red (removed).
 */
import React, { createContext, useContext } from 'react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export type ChangeStatus = 'added' | 'modified' | 'removed' | null;

export interface ReplayHighlightValue {
  active: boolean;
  /** Status for a dossier main-doc dot-path (e.g. "assure.nom"). */
  statusForPath: (path: string) => ChangeStatus;
  /** Status for a subcollection entry (e.g. "photos", id). */
  statusForEntry: (collection: string, id: string) => ChangeStatus;
}

const INERT: ReplayHighlightValue = {
  active: false,
  statusForPath: () => null,
  statusForEntry: () => null,
};

const ReplayHighlightContext = createContext<ReplayHighlightValue>(INERT);

export const ReplayHighlightProvider = ReplayHighlightContext.Provider;

export function useReplayHighlight(): ReplayHighlightValue {
  return useContext(ReplayHighlightContext);
}

// Semantic status pairs (DESIGN.md §10) — light/dark handled by the tokens.
const STATUS_BG: Record<Exclude<ChangeStatus, null>, string> = {
  added: 'bg-status-success-bg ring-1 ring-inset ring-status-success-fg/30',
  modified: 'bg-status-warning-bg ring-1 ring-inset ring-status-warning-fg/30',
  removed: 'bg-status-danger-bg ring-1 ring-inset ring-status-danger-fg/30',
};

export const STATUS_LABEL: Record<Exclude<ChangeStatus, null>, string> = {
  added: 'ajouté',
  modified: 'modifié',
  removed: 'supprimé',
};

export const STATUS_TEXT: Record<Exclude<ChangeStatus, null>, string> = {
  added: 'text-status-success-fg',
  modified: 'text-status-warning-fg',
  removed: 'text-status-danger-fg',
};

/** Tailwind classes for a given change status (empty string when none). */
export function highlightClass(status: ChangeStatus): string {
  return status ? STATUS_BG[status] : '';
}

/** Small inline "ajouté/modifié/supprimé" tag. Renders nothing when status is null. */
export function ChangeBadge({ status, className }: { status: ChangeStatus; className?: string }) {
  const t = useT();
  if (!status) return null;
  return (
    <span
      className={cn(
        'text-[11px] font-medium rounded px-1 py-px',
        STATUS_TEXT[status],
        className,
      )}
    >
      {t(STATUS_LABEL[status])}
    </span>
  );
}
