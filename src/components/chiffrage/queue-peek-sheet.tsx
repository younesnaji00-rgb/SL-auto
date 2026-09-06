'use client';

import React from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { BottomSheet, BottomSheetFooter } from '@/components/ui/bottom-sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

// A8 — peek panel (chiffrage-redesign-spec): read-mostly right sheet ≈480px,
// rendered instantly from data the queue page already holds. No fetching here;
// the peek never mints a workspace tab — only « Ouvrir le chiffrage » does.
//
// Phone form (research docs/research/mobile-overlays-feedback.md §1, §7): a
// peek is a GLANCE, so below md it is a `BottomSheet tall`, not a full-screen
// page. The « Voir les observations » button used to open a SECOND modal on
// top of this one — a sheet on a sheet, the pair the depth budget forbids
// ("if your flow requires two modals back-to-back, you've got a design
// problem"). On a phone it becomes an in-sheet `Collapsible` expand instead;
// the desktop keeps its observations dialog.
export interface QueuePeekData {
  id: string;
  dossierRef: string;
  assure: string | null;
  statut: string;
  matricule: string;
  chiffreur: string;
  assignePar: string;
  dateLabel: string | null;
  isToday: boolean;
  /** A2 deadline rendering, single-sourced by the page. */
  delai: React.ReactNode;
  obsText: string;
  obsCount: number;
  filesCount: number;
}

interface QueuePeekSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: QueuePeekData | null;
  /** Footer primary: openTab + navigate (owned by the page). */
  onOpen: () => void;
  onShowObservations?: () => void;
}

const dash = <span className="text-ink-4">—</span>;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  // §10 definition list: t-label key over a full-ink value.
  return (
    <div className="flex flex-col gap-1">
      <dt className="t-label">{label}</dt>
      <dd className="t-body font-medium text-ink">{children}</dd>
    </div>
  );
}

function Facts({ data }: { data: QueuePeekData }) {
  const t = useT();
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <Fact label={t('Chiffreur')}>{data.chiffreur || dash}</Fact>
      <Fact label={t('Assigné par')}>{data.assignePar || dash}</Fact>
      <Fact label={t('Immatriculation')}>
        {data.matricule ? <span className="t-mono">{data.matricule}</span> : dash}
      </Fact>
      <Fact label={t('Fichiers')}>
        <span className="tabular-nums">{data.filesCount}</span>
      </Fact>
      <Fact label={t("Date d'assignation")}>
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="tabular-nums">{data.dateLabel ?? dash}</span>
          {data.isToday && <Badge variant="time">{t("Aujourd'hui")}</Badge>}
        </span>
      </Fact>
      <Fact label={t('Délai')}>{data.delai}</Fact>
    </dl>
  );
}

function ObsCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
      {count}
    </span>
  );
}

export function QueuePeekSheet({ open, onOpenChange, data, onOpen, onShowObservations }: QueuePeekSheetProps) {
  const t = useT();
  const isPhone = useIsPhone();
  const [obsOpen, setObsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) setObsOpen(false);
  }, [open]);

  /* ---------------------------- phone: sheet ---------------------------- */

  if (isPhone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        detent="tall"
        title={<span className="t-mono truncate text-[17px] font-semibold">{data?.dossierRef ?? ''}</span>}
        titleText={data?.dossierRef ?? t('Chiffrage')}
        description={data?.assure || t('Assuré non renseigné')}
        footer={
          <BottomSheetFooter>
            <Button onClick={onOpen}>{t('Ouvrir le chiffrage')}</Button>
          </BottomSheetFooter>
        }
      >
        {data && (
          <div className="flex flex-col gap-5 pt-2">
            <div>
              <StatusChip status={data.statut} />
            </div>

            <Facts data={data} />

            {/* No second modal: the observations expand in place (D §7). */}
            <Collapsible open={obsOpen} onOpenChange={setObsOpen}>
              <div className="flex items-center gap-2">
                <span className="t-label">{t('Dernière observation')}</span>
                <ObsCount count={data.obsCount} />
              </div>
              {data.obsCount > 0 && data.obsText ? (
                <>
                  {/* Reading prose steps up to 15px (element-specs addendum ter D). */}
                  {!obsOpen && (
                    <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-[15px] leading-[1.5] text-ink">
                      {data.obsText}
                    </p>
                  )}
                  <CollapsibleContent>
                    <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-[1.5] text-ink">{data.obsText}</p>
                  </CollapsibleContent>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-medium text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {obsOpen ? t('Réduire') : t('Voir les observations')}
                      <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', obsOpen && 'rotate-180')} />
                    </button>
                  </CollapsibleTrigger>
                </>
              ) : (
                <p className="t-caption mt-1.5">{t('Aucune observation')}</p>
              )}
            </Collapsible>
          </div>
        )}
      </BottomSheet>
    );
  }

  /* -------------------------- desktop: side sheet ------------------------ */

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" data-tour="ach-peek" className="flex flex-col gap-6 overflow-y-auto lg:max-w-[480px]">
        {data && (
          <>
            <SheetHeader>
              <SheetTitle>
                <span className="t-mono text-[17px] font-semibold">{data.dossierRef}</span>
              </SheetTitle>
              <SheetDescription>{data.assure || t('Assuré non renseigné')}</SheetDescription>
              <div>
                <StatusChip status={data.statut} />
              </div>
            </SheetHeader>

            <Facts data={data} />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="t-label">{t('Dernière observation')}</span>
                <ObsCount count={data.obsCount} />
              </div>
              {data.obsCount > 0 && data.obsText ? (
                // Reading prose steps up to 15px (element-specs addendum ter D).
                <p className="line-clamp-6 whitespace-pre-wrap text-[15px] leading-[1.5] text-ink">{data.obsText}</p>
              ) : (
                <p className="t-caption">{t('Aucune observation')}</p>
              )}
            </div>

            <SheetFooter className="mt-auto gap-2 sm:items-center">
              {data.obsCount > 0 && onShowObservations && (
                <Button variant="ghost" onClick={onShowObservations}>
                  <MessageSquare />
                  {t('Voir les observations')}
                </Button>
              )}
              <Button onClick={onOpen}>{t('Ouvrir le chiffrage')}</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default QueuePeekSheet;
