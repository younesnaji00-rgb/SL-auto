'use client';

import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Loader2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getStatusHeaderStyles } from '@/lib/status-colors';

type StatusHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: { id: string; refExpert?: string } | null;
};

export default function StatusHistorySheet({ open, onOpenChange, dossier }: StatusHistorySheetProps) {
  const db = useFirestore();

  const historyQuery = useMemo(() => {
    if (!db || !dossier?.id) return null;
    return query(
      collection(db, 'dossiers', dossier.id, 'historique'),
      where('type', '==', 'statut'),
      orderBy('date', 'asc'),
    );
  }, [db, dossier?.id]);

  const { data: entries, loading } = useCollection<any>(historyQuery);

  if (!dossier) return null;

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try {
      return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch {
      return '-';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary">États Du Dossier</SheetTitle>
          <SheetDescription>
            {dossier.refExpert ? <>Dossier <span className="font-semibold text-foreground">{dossier.refExpert}</span></> : 'Historique des changements de statut'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !entries || entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Inbox className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">Aucun changement de statut.</p>
            </div>
          ) : (
            <div className="relative pl-8">
              {/* Vertical rail */}
              <div className="absolute left-3 top-2 bottom-2 w-px bg-indigo-200 dark:bg-indigo-900" />

              <div className="space-y-4">
                {entries.map((e: any) => (
                  <div key={e.id} className="relative">
                    {/* Dot on the rail */}
                    <div className="absolute -left-[22px] top-3 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-background" />

                    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
                      <div className={cn('px-4 py-2 text-sm font-semibold', getStatusHeaderStyles(e.action))}>
                        {e.action}
                      </div>
                      <div className="p-4 space-y-1.5 text-sm">
                        <div>
                          <span className="font-semibold">Nom :</span>{' '}
                          <span className="text-muted-foreground">{e.user || '—'}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Date :</span>{' '}
                          <span className="text-muted-foreground">{formatDate(e.date)}</span>
                        </div>
                        {e.details && (
                          <div>
                            <span className="font-semibold">Message :</span>{' '}
                            <span className="text-muted-foreground whitespace-pre-wrap">{e.details}</span>
                          </div>
                        )}
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
