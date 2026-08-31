'use client';

import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { CheckCircle2, Clock, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dossier } from '@/lib/dossiers-data';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type WorkflowStatusSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: Dossier | null;
};

const StatusIcon = ({ status }: { status: 'done' | 'pending' }) => {
  if (status === 'done') {
    return <CheckCircle2 className="h-5 w-5 text-status-success-fg" />;
  }
  return <Clock className="h-5 w-5 text-status-warning-fg" />;
};

export default function WorkflowStatusSheet({ open, onOpenChange, dossier }: WorkflowStatusSheetProps) {
  const db = useFirestore();
  
  const workflowQuery = useMemo(() => {
    if (!db || !dossier?.id) return null;
    return query(
      collection(db, 'dossiers', dossier.id, 'workflow'),
      orderBy('date', 'desc')
    );
  }, [db, dossier?.id]);

  const { data: logs, loading } = useCollection<any>(workflowQuery);

  if (!dossier) return null;

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try {
      return format(date, "dd MMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return '-';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Workflow du Dossier: {dossier.refExpert}</SheetTitle>
          <SheetDescription>
            Suivi en temps réel de l'état d'avancement.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-6 pr-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-ink-3" />
              <p className="text-sm text-ink-3">Chargement du workflow...</p>
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-4 rounded-xl bg-surface-2 py-20 text-center">
              <Inbox className="h-10 w-10 text-ink-4" />
              <p className="px-6 text-sm text-ink-3">
                Aucun historique disponible pour ce dossier.
              </p>
            </div>
          ) : (
            <div className="relative space-y-8">
              {logs.map((log, index) => (
                <div key={log.id} className="relative flex items-start gap-4">
                  {index < logs.length - 1 && (
                    <div className="absolute left-[9px] top-5 h-full w-px bg-hairline" />
                  )}
                  <div className="z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-background">
                    <StatusIcon status={log.status} />
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-semibold", log.status === 'done' ? 'text-ink' : 'text-ink-3')}>
                      {log.action}
                    </p>
                    <p className="t-caption mt-0.5">
                      {formatDate(log.date)} par <span className="font-semibold text-ink-2">{log.user}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
