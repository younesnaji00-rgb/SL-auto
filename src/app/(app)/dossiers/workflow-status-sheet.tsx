'use client';

import React, { useMemo } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dossier } from '@/lib/dossiers-data';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { UserNameLink } from '@/components/user-name-link';
import {
  HistoryEmpty,
  HistoryField,
  HistoryLoading,
  HistoryRow,
  HistorySheetContent,
  formatDateTime,
} from './status-history-sheet';

type WorkflowStatusSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: Dossier | null;
};

/** Step state as a status-pair chip (success = done, warning = pending). */
function WorkflowChip({ status }: { status: 'done' | 'pending' }) {
  const done = status === 'done';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium',
        done ? 'bg-status-success-bg text-status-success-fg' : 'bg-status-warning-bg text-status-warning-fg',
      )}
    >
      {done ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <Clock className="h-3 w-3" aria-hidden />}
      {done ? 'Terminé' : 'En attente'}
    </span>
  );
}

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <HistorySheetContent
        title="Workflow du dossier"
        description="Suivi en temps réel de l'état d'avancement."
        refExpert={dossier.refExpert}
      >
        {loading ? (
          <HistoryLoading />
        ) : !logs || logs.length === 0 ? (
          <HistoryEmpty title="Aucun historique" description="Les actions du workflow apparaissent ici au fil du dossier." />
        ) : (
          <ul className="divide-y divide-hairline">
            {logs.map((log: any) => (
              <HistoryRow key={log.id} date={log.date}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('text-sm font-semibold', log.status === 'done' ? 'text-ink' : 'text-ink-2')}>{log.action}</span>
                  <WorkflowChip status={log.status === 'done' ? 'done' : 'pending'} />
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  <HistoryField label="Par">
                    {log.userNom || log.user ? <UserNameLink entry={log} /> : <span className="font-normal text-ink-4">—</span>}
                  </HistoryField>
                  <HistoryField label="Date">
                    <span className="tabular-nums">{formatDateTime(log.date)}</span>
                  </HistoryField>
                  {log.details && (
                    <HistoryField label="Détails" className="sm:col-span-2">
                      <span className="whitespace-pre-wrap break-words font-normal text-ink">{log.details}</span>
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
