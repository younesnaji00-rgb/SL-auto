'use client';

import React, { useMemo } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
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

type AssignmentHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: any | null;
};

// Visit type → status pair (same mapping as the Planifications tab).
const MISSION_CHIP: Record<string, string> = {
  Avant: 'bg-status-info-bg text-status-info-fg',
  'En cours': 'bg-status-warning-bg text-status-warning-fg',
  Après: 'bg-status-success-bg text-status-success-fg',
};

export default function AssignmentHistorySheet({ open, onOpenChange, dossier }: AssignmentHistorySheetProps) {
  const db = useFirestore();

  // Fetch historique entries that are assignment-related
  const historiqueQuery = useMemo(() => {
    if (!db || !dossier?.id) return null;
    return query(
      collection(db, 'dossiers', dossier.id, 'historique'),
      orderBy('date', 'desc')
    );
  }, [db, dossier?.id]);

  const planificationsQuery = useMemo(() => {
    if (!db || !dossier?.id) return null;
    return query(
      collection(db, 'dossiers', dossier.id, 'planifications'),
      orderBy('createdAt', 'desc')
    );
  }, [db, dossier?.id]);

  const { data: allHistorique, loading: loadingH } = useCollection<any>(historiqueQuery);
  const { data: planifications, loading: loadingP } = useCollection<any>(planificationsQuery);

  if (!dossier) return null;

  // Filter historique to only assignment-related entries
  const assignmentEntries = (allHistorique || []).filter((e: any) =>
    e.type === 'assignation' ||
    e.action?.toLowerCase().includes('chiffrage') ||
    e.action?.toLowerCase().includes('assignation')
  );

  // Build planification assignment entries
  const planificationEntries = (planifications || []).map((p: any) => ({
    id: p.id,
    type: 'planification',
    agent: p.agentTerrain || '',
    mission: p.typeMission || '',
    zone: p.zone || '',
    date: p.createdAt,
    modifiedBy: p.modifiedByName || p.modifiedBy || '',
  }));

  const loading = loadingH || loadingP;
  const hasData = assignmentEntries.length > 0 || planificationEntries.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <HistorySheetContent
        title="Assignations"
        description="Historique des assignations chiffrage et planification."
        refExpert={dossier.refExpert}
      >
        {loading ? (
          <HistoryLoading />
        ) : !hasData ? (
          <HistoryEmpty title="Aucune assignation" description="Les envois au chiffrage et les planifications apparaissent ici." />
        ) : (
          <div className="space-y-6">
            {/* Chiffrage assignments — group label is quiet, rows hairline-separated. */}
            {assignmentEntries.length > 0 && (
              <section>
                <h3 className="t-label mb-2">Chiffrage</h3>
                <ul className="divide-y divide-hairline">
                  {assignmentEntries.map((entry: any) => (
                    <HistoryRow key={entry.id} date={entry.date}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{entry.action}</span>
                        <span className="t-caption tabular-nums">{formatDateTime(entry.date)}</span>
                      </div>
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                        <HistoryField label="Par">
                          {entry.userNom || entry.user ? <UserNameLink entry={entry} /> : <span className="font-normal text-ink-4">—</span>}
                        </HistoryField>
                        {entry.details && (
                          <HistoryField label="Détails" className="sm:col-span-2">
                            <span className="whitespace-pre-wrap break-words font-normal text-ink">{entry.details}</span>
                          </HistoryField>
                        )}
                      </dl>
                    </HistoryRow>
                  ))}
                </ul>
              </section>
            )}

            {/* Planification assignments */}
            {planificationEntries.length > 0 && (
              <section className={cn(assignmentEntries.length > 0 && 'border-t border-hairline pt-6')}>
                <h3 className="t-label mb-2">Planification</h3>
                <ul className="divide-y divide-hairline">
                  {planificationEntries.map((entry) => (
                    <HistoryRow key={entry.id} date={entry.date}>
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.mission && (
                          <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium', MISSION_CHIP[entry.mission] ?? 'bg-surface-3 text-ink-2')}>
                            Visite {String(entry.mission).toLowerCase()}
                          </span>
                        )}
                        <span className="t-caption tabular-nums">{formatDateTime(entry.date)}</span>
                      </div>
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                        <HistoryField label="Agent de terrain">
                          {entry.agent || <span className="font-normal text-ink-4">—</span>}
                        </HistoryField>
                        <HistoryField label="Zone">
                          {entry.zone || <span className="font-normal text-ink-4">—</span>}
                        </HistoryField>
                        <HistoryField label="Par">
                          {entry.modifiedBy || <span className="font-normal text-ink-4">—</span>}
                        </HistoryField>
                      </dl>
                    </HistoryRow>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </HistorySheetContent>
    </Sheet>
  );
}
