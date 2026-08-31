'use client';

import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Loader2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ObservationHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: { id: string; refExpert?: string } | null;
};

export default function ObservationHistorySheet({ open, onOpenChange, dossier }: ObservationHistorySheetProps) {
  const db = useFirestore();

  const historyQuery = useMemo(() => {
    if (!db || !dossier?.id) return null;
    return query(collection(db, 'dossiers', dossier.id, 'observations'));
  }, [db, dossier?.id]);

  const { data: entries, loading } = useCollection<any>(historyQuery);

  const sortedEntries = useMemo(() => {
    if (!entries) return entries;
    const tsOf = (e: any) => {
      const t = e.createdAt;
      if (!t) return 0;
      if (t.toMillis) return t.toMillis();
      if (t.toDate) return t.toDate().getTime();
      const n = Number(t);
      return Number.isFinite(n) ? n : 0;
    };
    // Descending — latest observation first.
    return [...entries].sort((a, b) => tsOf(b) - tsOf(a));
  }, [entries]);

  if (!dossier) return null;

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, 'dd/MM/yyyy HH:mm', { locale: fr }); } catch { return '-'; }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Observations du dossier</SheetTitle>
          <SheetDescription>
            {dossier.refExpert ? <>Dossier <span className="font-mono font-semibold tabular-nums text-ink">{dossier.refExpert}</span></> : 'Historique des observations'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-ink-3" /></div>
          ) : !sortedEntries || sortedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-ink-3">
              <Inbox className="mb-3 h-10 w-10 text-ink-4" />
              <p className="text-sm">Aucune observation.</p>
            </div>
          ) : (
            <div className="relative pl-8">
              <div className="absolute bottom-2 left-3 top-2 w-px bg-hairline-strong" />
              <div className="space-y-4">
                {sortedEntries.map((e: any) => (
                  <div key={e.id} className="relative">
                    <div className="absolute -left-[22px] top-3 h-3 w-3 rounded-full bg-status-warning-fg ring-4 ring-background" />
                    <div className="overflow-hidden rounded-lg border border-hairline bg-card">
                      <div className="flex items-center justify-between gap-2 bg-status-warning-bg px-4 py-2 text-sm font-semibold text-status-warning-fg">
                        <span className="truncate">{e.author || '—'}</span>
                        {e.authorRole && <span className="text-[11px] font-medium uppercase tracking-[0.06em]">{e.authorRole}</span>}
                      </div>
                      <div className="p-4 space-y-1.5 text-sm">
                        <p className="whitespace-pre-wrap break-words">{e.text || '—'}</p>
                        <p className="t-caption">{formatDate(e.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
