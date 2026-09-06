'use client';

/**
 * PhotoGrid — the one photo gallery of the app on a phone
 * (docs/research/mobile-record-pages.md §E7; mobile-synthesis §6 « Photos »).
 *
 * Evidence behind the numbers: Apple Collections ("collections are ideal for
 * showing image-based content"), MDC image list (1:1 tiles), uxpatterns.dev
 * ("touch targets need more room on mobile … especially for thumbnails").
 * Three columns at ≥ 360 px gives ~110 px thumbs — two would waste the row,
 * four would drop under 80 px. 8 px gutter, `aspect-square`, `object-cover`,
 * 10 px radius, and NO file-name caption: the count lives in the group header
 * and the name in the lightbox.
 *
 * Deleting is NOT here. On touch there is no hover, so a per-tile delete would
 * either be permanently visible (a mis-tap next to a 110 px photo) or
 * unreachable. Tap opens the lightbox; the lightbox header's « ⋯ » owns
 * Télécharger / Supprimer (E8).
 *
 * Used by the dossier Photos facet and by the field agent's mission detail.
 */

import * as React from 'react';
import { ChevronDown, ChevronRight, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

export interface PhotoGridItem {
  id: string;
  url: string;
  name: string;
  /** Queued by the offline uploader — shown as a waiting tile, not tappable. */
  pendingUpload?: boolean;
}

export interface PhotoGridProps<T extends PhotoGridItem> {
  photos: T[];
  /** Tap on a tile → open the lightbox at that photo. */
  onOpen: (photo: T, index: number) => void;
  /** Extra node stamped in the tile's top-left corner (replay badge…). */
  renderBadge?: (photo: T) => React.ReactNode;
  /** Tour anchor on the grid root. */
  dataTour?: string;
  className?: string;
}

/** 3 columns on a phone; the desktop rhythm of the previous galleries above. */
const GRID_CLASS = 'grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6';

export function PhotoGrid<T extends PhotoGridItem>({ photos, onOpen, renderBadge, dataTour, className }: PhotoGridProps<T>) {
  const t = useT();
  if (photos.length === 0) return null;
  return (
    <ul className={cn(GRID_CLASS, className)} data-tour={dataTour}>
      {photos.map((photo, i) => (
        <li key={photo.id} className="relative">
          {photo.pendingUpload ? (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-[10px] bg-status-warning-bg text-status-warning-fg">
              <Upload className="h-5 w-5" aria-hidden />
              <span className="text-[11px] font-medium">{t('En attente')}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(photo, i)}
              aria-label={`${t('Agrandir')} ${photo.name}`}
              className="block aspect-square w-full overflow-hidden rounded-[10px] bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          )}
          {renderBadge?.(photo)}
        </li>
      ))}
    </ul>
  );
}

export interface PhotoGroupProps {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Collapsible group header above a `PhotoGrid` — 44 px row, chevron LEADING
 * (it is a disclosure, not a link), label then count. Kept separate from the
 * grid so a page with one flat list (the mission detail) does not pay for it.
 */
export function PhotoGroup({ label, count, open, onToggle, children, className }: PhotoGroupProps) {
  const t = useT();
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2 rounded-md px-1 text-left transition-colors hover:bg-surface-2"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{label}</span>
        <span className="shrink-0 text-[12px] tabular-nums text-ink-3">
          {count} {count > 1 ? t('photos') : t('photo')}
        </span>
      </button>
      {open && <div className="pb-3 pt-1">{children}</div>}
    </div>
  );
}

export default PhotoGrid;
