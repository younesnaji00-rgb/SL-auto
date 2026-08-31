'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  User, 
  Calendar, 
  MapPin, 
  Clock,
  Info 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCollection, useFirestore, useAuth } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type ModalPlanificationHistoryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
};

export default function ModalPlanificationHistory({ open, onOpenChange, dossierId }: ModalPlanificationHistoryProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const historyQuery = useMemo(() => 
    query(collection(db, 'dossiers', dossierId, 'planificationHistory'), orderBy('modifiedAt', 'desc')),
    [db, dossierId]
  );
  
  const { data: history, loading } = useCollection<any>(historyQuery);

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleRestore = async (snapshot: any) => {
    if (!db) return;
    setRestoringId(snapshot.id);

    try {
      // 1. Get current active planification doc ID
      const planColl = collection(db, 'dossiers', dossierId, 'planifications');
      const qLatest = query(planColl, orderBy('createdAt', 'desc'), limit(1));
      const latestSnap = await getDocs(qLatest);
      const currentPlanDoc = latestSnap.docs[0];
      
      const restoreData = {
        agentTerrain: snapshot.agentTerrain || '',
        typeMission: snapshot.typeMission || '',
        dateRDV: snapshot.dateRDV || null,
        zone: snapshot.zone || '',
        adresse: snapshot.adresse || '',
        observation: snapshot.observation || '',
        modifiedAt: serverTimestamp(),
        modifiedBy: auth?.currentUser?.uid || 'guest-user',
        modifiedByName: auth?.currentUser?.displayName || auth?.currentUser?.email || 'Utilisateur',
        restoredFrom: snapshot.id,
      };

      if (currentPlanDoc) {
        await updateDoc(doc(db, 'dossiers', dossierId, 'planifications', currentPlanDoc.id), restoreData);
      } else {
        await addDoc(planColl, { ...restoreData, createdAt: serverTimestamp(), active: true });
      }

      // Log restoration action
      await addDoc(collection(db, 'dossiers', dossierId, 'planificationHistory'), {
        ...restoreData,
        action: 'Restauration',
        snapshotDate: snapshot.modifiedAt,
      });

      toast({ title: "Planification restaurée avec succès" });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erreur lors de la restauration" });
    } finally {
      setRestoringId(null);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'N/A';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-ink-3" />
            Historique des versions
          </DialogTitle>
          <DialogDescription>
            Consultez les versions précédentes et restaurez une ancienne planification.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] mt-4 pr-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Clock className="h-6 w-6 animate-spin text-ink-3" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-hairline-strong py-10 text-center">
              <p className="t-heading">Aucun historique</p>
              <p className="t-caption mt-1">Aucune version antérieure n&apos;a été enregistrée pour ce dossier.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry: any) => (
                <div key={entry.id} className="group rounded-lg border border-hairline p-4 transition-colors hover:bg-surface-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-ink">
                        Version du {formatTimestamp(entry.modifiedAt)}
                      </p>
                      <div className="t-caption flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {entry.modifiedByName || 'Utilisateur inconnu'}
                        <Badge variant="outline" className="h-4 py-0 text-[11px] font-medium text-ink-2">
                          {entry.action || 'Modification'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-ink-3 hover:text-ink" onClick={() => handleToggleExpand(entry.id)}>
                        {expandedId === entry.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="ml-1 text-xs">Détails</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(entry)}
                        disabled={restoringId === entry.id}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        <span className="text-xs">Restaurer</span>
                      </Button>
                    </div>
                  </div>

                  {expandedId === entry.id && (
                    <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-hairline pt-4 text-sm text-ink animate-in fade-in-0 duration-300">
                      <div className="space-y-1">
                        <p className="t-label">Date RDV</p>
                        <p className="flex items-center gap-2"><Calendar className="h-3 w-3 text-ink-3" /> {formatTimestamp(entry.dateRDV)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="t-label">Type de RDV</p>
                        <p className="capitalize">{entry.typeMission}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="t-label">Agent</p>
                        <p>{entry.agentTerrain}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="t-label">Zone</p>
                        <p className="flex items-center gap-2"><MapPin className="h-3 w-3 text-ink-3" /> {entry.zone}</p>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <p className="t-label">Adresse</p>
                        <p>{entry.adresse}</p>
                      </div>
                      {entry.observation && (
                        <div className="col-span-2 rounded-md bg-surface-2 p-3 text-xs italic text-ink-2">
                          <p className="t-label mb-1 not-italic">Observation:</p>
                          "{entry.observation}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
