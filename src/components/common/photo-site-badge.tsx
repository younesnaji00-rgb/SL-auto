'use client';

/**
 * « Sur place » / « Hors site · 3,2 km » / « Lieu non vérifié » on a terrain
 * photo (tester, 2026-10-13) — lib/photo-site.ts. Nothing for a photo that
 * was never checked (gestionnaire imports, photos from before the check).
 */
import { MapPin, MapPinOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { readSiteCheck, siteDetail, siteLabel } from '@/lib/photo-site';

const VARIANT = { sur_place: 'success', hors_site: 'danger', non_verifie: 'warning' } as const;

export function PhotoSiteBadge({
  check,
  overlay,
  className,
}: {
  /** The photo document's `siteCheck`. */
  check: unknown;
  /** Pinned bottom-left over a thumbnail. */
  overlay?: boolean;
  className?: string;
}) {
  const site = readSiteCheck(check);
  if (!site) return null;
  const detail = siteDetail(site);
  const Icon = site.status === 'sur_place' ? MapPin : MapPinOff;
  return (
    <Badge
      variant={VARIANT[site.status]}
      title={detail}
      aria-label={detail}
      data-site={site.status}
      className={cn(
        'gap-1 whitespace-nowrap',
        overlay && 'pointer-events-none absolute bottom-1 left-1 z-10 max-w-[calc(100%-0.5rem)] shadow-sm',
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{siteLabel(site)}</span>
    </Badge>
  );
}

export default PhotoSiteBadge;
