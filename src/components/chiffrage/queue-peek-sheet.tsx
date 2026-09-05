'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { useT } from '@/i18n';

// A8 — peek panel (chiffrage-redesign-spec): read-mostly right sheet ≈480px,
// rendered instantly from data the queue page already holds. No fetching here;
// the peek never mints a workspace tab — only « Ouvrir le chiffrage » does.
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

export function QueuePeekSheet({ open, onOpenChange, data, onOpen, onShowObservations }: QueuePeekSheetProps) {
  const t = useT();
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

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="t-label">{t('Dernière observation')}</span>
                {data.obsCount > 0 && (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                    {data.obsCount}
                  </span>
                )}
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
