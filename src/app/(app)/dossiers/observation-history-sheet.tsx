'use client';

import React, { useMemo } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { UserNameLink } from '@/components/user-name-link';
import {
  HistoryEmpty,
  HistoryLoading,
  HistoryRow,
  HistorySheetContent,
  formatDateTime,
  toDateSafe,
} from './status-history-sheet';
import { useT } from '@/i18n';

type ObservationHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: { id: string; refExpert?: string } | null;
};

export default function ObservationHistorySheet({ open, onOpenChange, dossier }: ObservationHistorySheetProps) {
  const t = useT();
  const db = useFirestore();

  const historyQuery = useMemo(() => {
    if (!db || !dossier?.id) return null;
    return query(collection(db, 'dossiers', dossier.id, 'observations'));
  }, [db, dossier?.id]);

  const { data: entries, loading } = useCollection<any>(historyQuery);

  const sortedEntries = useMemo(() => {
    if (!entries) return entries;
    const tsOf = (e: any) => toDateSafe(e.createdAt)?.getTime() ?? 0;
    // Descending — latest observation first.
    return [...entries].sort((a, b) => tsOf(b) - tsOf(a));
  }, [entries]);

  if (!dossier) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <HistorySheetContent
        title={t('Observations du dossier')}
        description={t('Historique des observations')}
        refExpert={dossier.refExpert}
      >
        {loading ? (
          <HistoryLoading />
        ) : !sortedEntries || sortedEntries.length === 0 ? (
          <HistoryEmpty title={t('Aucune observation')} description={t('Les observations saisies sur le dossier apparaissent ici.')} />
        ) : (
          <ul className="divide-y divide-hairline">
            {sortedEntries.map((e: any) => (
              <HistoryRow key={e.id} date={e.createdAt}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-ink">
                    <UserNameLink entry={{ userNom: e.author, user: e.authorEmail }} />
                  </span>
                  {e.authorRole && <span className="t-caption">{t(e.authorRole)}</span>}
                  <span className="t-caption tabular-nums">· {formatDateTime(e.createdAt)}</span>
                </div>
                {/* The observation itself is the value: warning pair, like the list chip. */}
                <p className="whitespace-pre-wrap break-words rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
                  {e.text || '—'}
                </p>
              </HistoryRow>
            ))}
          </ul>
        )}
      </HistorySheetContent>
    </Sheet>
  );
}
