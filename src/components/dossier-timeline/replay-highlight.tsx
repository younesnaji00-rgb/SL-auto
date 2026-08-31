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

const STATUS_BG: Record<Exclude<ChangeStatus, null>, string> = {
  added: 'bg-green-100/70 ring-1 ring-inset ring-green-400/60 dark:bg-green-900/30 dark:ring-green-600/50',
  modified: 'bg-yellow-100/70 ring-1 ring-inset ring-yellow-400/60 dark:bg-yellow-900/30 dark:ring-yellow-600/50',
  removed: 'bg-red-100/70 ring-1 ring-inset ring-red-400/60 dark:bg-red-900/30 dark:ring-red-600/50',
};

export const STATUS_LABEL: Record<Exclude<ChangeStatus, null>, string> = {
  added: 'ajouté',
  modified: 'modifié',
  removed: 'supprimé',
};

export const STATUS_TEXT: Record<Exclude<ChangeStatus, null>, string> = {
  added: 'text-green-700 dark:text-green-300',
  modified: 'text-yellow-700 dark:text-yellow-300',
  removed: 'text-red-700 dark:text-red-300',
};

/** Tailwind classes for a given change status (empty string when none). */
export function highlightClass(status: ChangeStatus): string {
  return status ? STATUS_BG[status] : '';
}

/** Small inline "ajouté/modifié/supprimé" tag. Renders nothing when status is null. */
export function ChangeBadge({ status, className }: { status: ChangeStatus; className?: string }) {
  if (!status) return null;
  return (
    <span
      className={cn(
        'text-[11px] font-semibold uppercase tracking-wide rounded px-1 py-px',
        STATUS_TEXT[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
