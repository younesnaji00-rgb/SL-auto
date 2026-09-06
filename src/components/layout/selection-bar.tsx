'use client';

/**
 * Contextual selection bar — replaces the phone top bar while a list is in
 * selection mode (mobile-synthesis §4 « Selection / Rappeler »; Android
 * contextual action bar). 56 px: « × » (44 px, exits the mode) left,
 * « N sélectionné(s) » (t-body 600, tabular) centre, « Tout sélectionner » /
 * « Tout désélectionner » ghost right. The bar holds a history entry so the
 * platform back exits the mode exactly like ×.
 *
 * Pages publish `selection` through `usePhoneChrome`; the top bar swaps
 * itself for this component while it is set.
 */

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import type { PhoneSelection } from '@/components/layout/page-chrome';
import { useT } from '@/i18n';

export const SELECTION_BAR_HEIGHT = 56;

export function SelectionBar({ selection }: { selection: PhoneSelection }) {
  const t = useT();
  const { count, label, onExit, onSelectAll, allSelected } = selection;
  useOverlayHistory(true, onExit);

  const text = label ?? `${count} ${count > 1 ? t('sélectionnés') : t('sélectionné')}`;

  return (
    <div role="toolbar" aria-label={t('Sélection')} className="flex h-14 items-center gap-1 px-1">
      <button
        type="button"
        onClick={onExit}
        aria-label={t('Quitter la sélection')}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-6 w-6" />
      </button>
      <p className="t-body min-w-0 flex-1 truncate font-semibold tabular-nums" aria-live="polite">
        {text}
      </p>
      {onSelectAll && (
        <Button variant="ghost" size="sm" className="h-10 shrink-0 px-3 text-[13px]" onClick={onSelectAll}>
          {allSelected ? t('Tout désélectionner') : t('Tout sélectionner')}
        </Button>
      )}
    </div>
  );
}

export default SelectionBar;
