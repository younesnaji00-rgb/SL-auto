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
import { useT, dateFnsLocale } from '@/i18n';

type AssignmentHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: any | null;
};

export default function AssignmentHistorySheet({ open, onOpenChange, dossier }: AssignmentHistorySheetProps) {
  const t = useT();
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
      return format(date, "dd MMM yyyy 'à' HH:mm", { locale: dateFnsLocale() });
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
          <SheetTitle>{t('Assignations')} — {dossier.refExpert || t('Dossier')}</SheetTitle>
          <SheetDescription>
            {t('Historique des assignations chiffrage et planification.')}
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 pr-4 space-y-6 overflow-y-auto max-h-[calc(100vh-150px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground italic">{t('Chargement...')}</p>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-xl bg-muted/20">
              <Inbox className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground italic px-6">
                {t('Aucune assignation pour ce dossier.')}
              </p>
            </div>
          ) : (
            <>
              {/* Chiffrage assignments */}
              {assignmentEntries.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Send className="h-3.5 w-3.5" /> {t('Chiffrage')}
                  </h3>
                  <div className="space-y-3">
                    {assignmentEntries.map((entry: any) => (
                      <div key={entry.id} className="p-3 rounded-lg border bg-card space-y-1">
                        <p className="text-sm font-medium">{t(entry.action)}</p>
                        {entry.details && (
                          <p className="text-xs text-muted-foreground">{t(entry.details)}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(entry.date)} {t('par')} <span className="font-semibold text-primary">{entry.user}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Planification assignments */}
              {planificationEntries.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> {t('Planification')}
                  </h3>
                  <div className="space-y-3">
                    {planificationEntries.map((entry: any) => (
                      <div key={entry.id} className="p-3 rounded-lg border bg-card space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{t('Agent :')} {entry.agent}</span>
                          {entry.mission && <Badge variant="outline" className="text-[10px]">{t(entry.mission)}</Badge>}
                        </div>
                        {entry.zone && (
                          <p className="text-xs text-muted-foreground">{t('Zone :')} {entry.zone}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(entry.date)} {t('par')} <span className="font-semibold text-primary">{entry.modifiedBy}</span>
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
