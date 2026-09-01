'use client';

import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Send, MapPin, Inbox, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type AssignmentHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: any | null;
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

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try {
      return format(date, "dd MMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return '-';
    }
  };

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
    agent: p.agentTerrain || 'N/A',
    mission: p.typeMission || '',
    zone: p.zone || '',
    date: p.createdAt,
    modifiedBy: p.modifiedByName || p.modifiedBy || 'N/A',
  }));

  const loading = loadingH || loadingP;
  const hasData = assignmentEntries.length > 0 || planificationEntries.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Assignations — {dossier.refExpert || 'Dossier'}</SheetTitle>
          <SheetDescription>
            Historique des assignations chiffrage et planification.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 pr-4 space-y-6 overflow-y-auto max-h-[calc((100dvh-150px)/var(--app-zoom))]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-ink-3" />
              <p className="text-sm text-ink-3">Chargement...</p>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center space-y-4 rounded-xl bg-surface-2 py-20 text-center">
              <Inbox className="h-10 w-10 text-ink-4" />
              <p className="px-6 text-sm text-ink-3">
                Aucune assignation pour ce dossier.
              </p>
            </div>
          ) : (
            <>
              {/* Chiffrage assignments */}
              {assignmentEntries.length > 0 && (
                <div>
                  <h3 className="t-label mb-3 flex items-center gap-2">
                    <Send className="h-3.5 w-3.5" /> Chiffrage
                  </h3>
                  <div className="space-y-3">
                    {assignmentEntries.map((entry: any) => (
                      <div key={entry.id} className="space-y-1 rounded-lg border border-hairline p-3">
                        <p className="text-sm font-medium">{entry.action}</p>
                        {entry.details && (
                          <p className="t-caption">{entry.details}</p>
                        )}
                        <p className="t-caption">
                          {formatDate(entry.date)} par <span className="font-semibold text-ink-2">{entry.user}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Planification assignments */}
              {planificationEntries.length > 0 && (
                <div>
                  <h3 className="t-label mb-3 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Planification
                  </h3>
                  <div className="space-y-3">
                    {planificationEntries.map((entry: any) => (
                      <div key={entry.id} className="space-y-1 rounded-lg border border-hairline p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Agent : {entry.agent}</span>
                          {entry.mission && <Badge variant="outline" className="text-[11px]">{entry.mission}</Badge>}
                        </div>
                        {entry.zone && (
                          <p className="t-caption">Zone : {entry.zone}</p>
                        )}
                        <p className="t-caption">
                          {formatDate(entry.date)} par <span className="font-semibold text-ink-2">{entry.modifiedBy}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
