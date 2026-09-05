'use client';

/**
 * Peek panel — the EPHEMERAL tier of the two-tier detail access every
 * best-in-class list tool converges on (research 2026-09-03,
 * docs/research/dossiers-structure-navigation.md: Linear peek, Zendesk split
 * view rationale, Airtable row expand). A row click opens it beside the
 * table; ↑/↓ retarget it; Entrée / « Ouvrir » commit to the full page;
 * Échap closes. Non-modal by construction — no overlay, no focus trap — so
 * the list keeps scrolling and the keyboard spine keeps working.
 *
 * Anatomy: fixed right panel under the top bar, `.glass-strong` (menus /
 * sheets material), identity header (réf mono + assuré + statut chip), the
 * 5–8 decision fields as a §10 definition list, latest observation callout,
 * and the row's actions. Everything read-only — editing is the full page's
 * job (progressive disclosure: details on demand, actions on commit).
 */

import React from 'react';
import { ArrowRight, ExternalLink, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/status-chip';
import { Separator } from '@/components/ui/separator';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export interface DossierPeekPanelProps {
  dossier: any | null;
  /** Position within the filtered list, 1-based, for the « n/N » caption. */
  position?: { index: number; total: number };
  onClose: () => void;
  onOpen: () => void;
  onOpenInTab: () => void;
  onStatusHistory: () => void;
  onObservationHistory: () => void;
  formatDate: (val: any) => string;
  relativeDate: (val: any) => string | undefined;
  renderAssure: (assure: any) => string;
  creatorName: string;
}

function Field({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="t-label">{label}</dt>
      <dd className={cn('mt-0.5 truncate text-sm font-semibold text-ink', mono && 't-mono font-semibold')}>
        {value || <span className="font-sans font-normal text-ink-4">—</span>}
      </dd>
    </div>
  );
}

export function DossierPeekPanel({
  dossier,
  position,
  onClose,
  onOpen,
  onOpenInTab,
  onStatusHistory,
  onObservationHistory,
  formatDate,
  relativeDate,
  renderAssure,
  creatorName,
}: DossierPeekPanelProps) {
  const t = useT();
  if (!dossier) return null;
  const d = dossier;

  return (
    <aside
      // Under the 56 px top bar; every vh is divided by --app-zoom (repo rule).
      className={cn(
        'fixed right-0 z-30 flex w-[min(26rem,92vw)] flex-col',
        'top-[calc(56px/var(--app-zoom))] h-[calc((100dvh-56px)/var(--app-zoom))]',
        'glass-strong border-l border-hairline',
        'animate-in fade-in-0 slide-in-from-right-4 duration-200 ease-enter motion-reduce:animate-none',
      )}
      role="complementary"
      data-tour="dos-peek"
      aria-label={`${t('Aperçu du dossier')} ${d.refExpert || ''}`}
    >
      {/* Identity header */}
      <div className="flex items-start gap-3 border-b border-hairline px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="t-mono truncate font-semibold text-ink" title={d.refExpert || undefined}>
              {d.refExpert || t('Sans réf.')}
            </span>
            {position && (
              <span className="t-caption shrink-0 tabular-nums">{position.index}/{position.total}</span>
            )}
          </div>
          {renderAssure(d.assure) && (
            <p className="mt-0.5 truncate text-sm text-ink-2" title={renderAssure(d.assure)}>
              {renderAssure(d.assure)}
            </p>
          )}
          <div className="mt-2">
            <StatusChip status={d.statut} />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-ink-3 hover:text-ink"
          onClick={onClose}
          aria-label={t("Fermer l'aperçu (Échap)")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Decision fields (§10 definition list, 2-col grid) */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label={t('Compagnie')} value={d.compagnie} />
          <Field label={t('Référence compagnie')} value={d.referenceCompagnie} />
          <Field label={t('Nature')} value={d.nature} />
          <Field label={t('Type')} value={d.typeDossier} />
          <Field label={t('Matricule')} value={d.matricule} mono />
          <Field label={t('Matricule antérieur')} value={d.vehicule?.immatriculationAnterieur} mono />
          <Field
            label={t('Date de création')}
            value={formatDate((d as any).createdAt) || undefined}
          />
          <Field label={t('Créé par')} value={creatorName || undefined} />
          <Field label={t('Date sinistre')} value={formatDate(d.dateSinistre) || undefined} />
          <Field label={t('Date requête')} value={formatDate(d.dateRequete) || undefined} />
        </dl>
        {relativeDate((d as any).createdAt) && (
          // `relativeDate` already formats with `dateFnsLocale()` (client-page),
          // so only the leading verb needs translating: « Créé il y a un mois »
          // / "Created a month ago".
          <p className="mt-3 t-caption">{t('Créé')} {relativeDate((d as any).createdAt)}</p>
        )}

        {d.lastObservation?.text && (
          <>
            <Separator className="my-4" />
            <div>
              <span className="t-label">{t('Dernière observation')}</span>
              <button
                type="button"
                onClick={onObservationHistory}
                className="mt-1.5 block w-full text-left"
                title={t("Voir l'historique des observations")}
              >
                <Badge variant="warning" className="max-w-full whitespace-normal py-1 text-left">
                  {d.lastObservation.text}
                </Badge>
              </button>
            </div>
          </>
        )}

        <Separator className="my-4" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onStatusHistory}>
            <History className="h-3.5 w-3.5" aria-hidden /> {t('Statuts')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onObservationHistory}>
            <History className="h-3.5 w-3.5" aria-hidden /> {t('Observations')}
          </Button>
        </div>
      </div>

      {/* Commit tier */}
      <div className="flex items-center gap-2 border-t border-hairline px-5 py-3">
        <Button className="flex-1 gap-1.5 font-semibold" onClick={onOpen}>
          {t('Ouvrir')} <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={onOpenInTab} title={t('Ouvrir dans un onglet')} aria-label={t('Ouvrir dans un onglet')}>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}

export default DossierPeekPanel;
