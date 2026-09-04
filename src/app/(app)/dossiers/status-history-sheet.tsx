'use client';

import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { UserNameLink } from '@/components/user-name-link';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { useT, dateFnsLocale } from '@/i18n';
import { auditText } from '@/lib/audit-i18n';

/* ------------------------------------------------------------------------- */
/* Shared "list of events" pieces for the dossier history sheets             */
/* (blueprint §6: rows separated by hairlines only, the date block is the    */
/* row's anchor, labels quiet / values bold, every detail in the row).       */
/* ------------------------------------------------------------------------- */

/** Firestore Timestamp | Date | number | string → Date | null. */
export function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  try {
    const d = ts.toDate ? ts.toDate() : ts.toMillis ? new Date(ts.toMillis()) : new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Tinted date block with the light contour — same anatomy as Planifications. */
export function HistoryDateBlock({ date, className }: { date: Date | null; className?: string }) {
  return (
    <div
      className={cn(
        'flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-surface-3 py-1.5 text-center tabular-nums text-ink-2 shadow-rim',
        className,
      )}
    >
      <span className="text-[11px] font-medium leading-none">{date ? format(date, 'MMM', { locale: dateFnsLocale() }).replace('.', '') : '—'}</span>
      <span className="font-headline text-xl font-semibold leading-tight">{date ? format(date, 'd') : '—'}</span>
      <span className="text-[11px] leading-none">{date ? format(date, 'HH:mm') : ''}</span>
    </div>
  );
}

/** One hairline-separated event row: date block anchor + body. */
export function HistoryRow({ date, children, className }: { date: any; children: React.ReactNode; className?: string }) {
  return (
    <li className={cn('flex items-start gap-4 py-4 first:pt-0', className)}>
      <HistoryDateBlock date={toDateSafe(date)} />
      <div className="min-w-0 flex-1 space-y-3">{children}</div>
    </li>
  );
}

/** Quiet label over a bold value (Refactoring UI: labels light, values bold). */
export function HistoryField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="t-label">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** Loading placeholder shaped like two event rows. */
export function HistoryLoading() {
  return (
    <ul className="divide-y divide-hairline" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-start gap-4 py-4 first:pt-0">
          <Skeleton className="h-14 w-14 rounded-md" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HistoryEmpty({ title, description }: { title: string; description?: string }) {
  return <EmptyState icon={<Inbox />} title={title} description={description} dashed={false} />;
}

/** Full date+time in text ("dd/MM/yyyy HH:mm"), for the row's helper line. */
export function formatDateTime(ts: any): string {
  const d = toDateSafe(ts);
  return d ? format(d, 'dd/MM/yyyy HH:mm', { locale: dateFnsLocale() }) : '—';
}

/** Sheet chrome shared by the history sheets: title, ref, scrollable body. */
export function HistorySheetContent({
  title,
  description,
  refExpert,
  dataTour,
  children,
}: {
  title: string;
  description: string;
  refExpert?: string;
  /** Guided-tour anchor for the sheet panel (driver.js steps target it). */
  dataTour?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <SheetContent className="flex w-full flex-col lg:max-w-lg" data-tour={dataTour}>
      <SheetHeader className="pr-6">
        <SheetTitle className="t-heading">{title}</SheetTitle>
        <SheetDescription className="text-sm text-ink-3">
          {refExpert ? (
            <>
              {t('Dossier')} <span className="t-mono font-semibold">{refExpert}</span>
            </>
          ) : (
            description
          )}
        </SheetDescription>
      </SheetHeader>
      {/* Rows bleed into the sheet padding so the hairlines run edge to edge. */}
      <div className="-mx-6 mt-4 min-h-0 flex-1 overflow-y-auto px-6">{children}</div>
    </SheetContent>
  );
}

/* ------------------------------------------------------------------------- */

type StatusHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: { id: string; refExpert?: string } | null;
};

export default function StatusHistorySheet({ open, onOpenChange, dossier }: StatusHistorySheetProps) {
  const t = useT();
  const db = useFirestore();

  const historyQuery = useMemo(() => {
    if (!db || !dossier?.id) return null;
    return query(
      collection(db, 'dossiers', dossier.id, 'historique'),
      where('type', '==', 'statut'),
    );
  }, [db, dossier?.id]);

  const { data: entries, loading } = useCollection<any>(historyQuery);

  const sortedEntries = useMemo(() => {
    if (!entries) return entries;
    const tsOf = (e: any) => toDateSafe(e.date)?.getTime() ?? 0;
    return [...entries].sort((a, b) => tsOf(a) - tsOf(b));
  }, [entries]);

  if (!dossier) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <HistorySheetContent
        title={t('États du dossier')}
        description={t('Historique des changements de statut')}
        refExpert={dossier.refExpert}
        dataTour="dos-status-sheet"
      >
        {loading ? (
          <HistoryLoading />
        ) : !sortedEntries || sortedEntries.length === 0 ? (
          <HistoryEmpty title={t('Aucun changement de statut')} description={t("Les statuts s'enregistrent ici au fil des étapes.")} />
        ) : (
          <ul className="divide-y divide-hairline">
            {sortedEntries.map((e: any) => (
              <HistoryRow key={e.id} date={e.date}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(e.action))}>
                    {auditText(e.action, t) || '—'}
                  </Badge>
                  <span className="t-caption tabular-nums">{formatDateTime(e.date)}</span>
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  <HistoryField label={t('Par')}>
                    {e.userNom || e.user ? <UserNameLink entry={e} /> : <span className="font-normal text-ink-4">—</span>}
                  </HistoryField>
                  {e.details && (
                    <HistoryField label={t('Message')} className="sm:col-span-2">
                      <span className="whitespace-pre-wrap break-words font-normal text-ink">{auditText(e.details, t)}</span>
                    </HistoryField>
                  )}
                </dl>
              </HistoryRow>
            ))}
          </ul>
        )}
      </HistorySheetContent>
    </Sheet>
  );
}
