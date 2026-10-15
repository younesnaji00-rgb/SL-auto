'use client';

/**
 * « Dossiers des compagnies de votre compte » — the one filter nobody picks on
 * the page: an account given compagnies sees the dossiers of those compagnies
 * only (Gestion des dossiers, Suivi d'équipe, the search and the dashboards —
 * owner rulings 2026-10-14). Consultation alone lists every dossier, read
 * only (2026-10-15), so the Gestion des dossiers note says so. The testers
 * counted fewer dossiers than existed « sans qu'aucun filtre visible ne le
 * justifie » (QA #003, #054); this line is that filter, with how many it
 * keeps out.
 */

import { Building2 } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export function CompagnieScopeNote({
  compagnies,
  outOfScope = 0,
  loading = false,
  inConsultation = false,
  className,
}: {
  /** The account's compagnies; nothing is shown without any (no limit). */
  compagnies: ReadonlyArray<string> | null | undefined;
  /** Dossiers of other compagnies left out of the page. */
  outOfScope?: number;
  loading?: boolean;
  /** Say that the dossiers left out stay listed in Consultation. */
  inConsultation?: boolean;
  className?: string;
}) {
  const t = useT();
  if (!compagnies || compagnies.length === 0) return null;
  return (
    <p className={cn('t-caption flex items-start gap-1.5 text-ink-3', className)} data-testid="compagnie-scope-note">
      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">
        {compagnies.length > 1 ? t('Dossiers des compagnies de votre compte :') : t('Dossiers de la compagnie de votre compte :')}{' '}
        <span className="font-medium text-ink-2">{compagnies.join(', ')}</span>
        {!loading && outOfScope > 0
          ? ` · ${outOfScope} ${outOfScope > 1 ? t('dossiers d’autres compagnies ne sont pas affichés') : t('dossier d’une autre compagnie n’est pas affiché')}${inConsultation ? ` ${outOfScope > 1 ? t('ici (visibles dans Consultation, en lecture seule)') : t('ici (visible dans Consultation, en lecture seule)')}` : ''}.`
          : '.'}
      </span>
    </p>
  );
}

export default CompagnieScopeNote;
