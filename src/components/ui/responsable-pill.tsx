'use client';

/**
 * « Responsable » — beside a person's name in the pickers that assign work
 * (chiffreur, agent de terrain, gestionnaire): the Responsable of a team does
 * that team's work too and is listed with it, marked so they are never picked
 * by mistake for a gestionnaire's everyday dossier (owner ruling 2026-10-14).
 */

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export function ResponsablePill({ className }: { className?: string }) {
  const t = useT();
  return (
    <Badge variant="outline" className={cn('shrink-0 px-1.5', className)} title={t('Responsable de l’équipe')}>
      <Star aria-hidden />
      {t('Responsable')}
    </Badge>
  );
}

export default ResponsablePill;
