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
            <RotateCcw className="h-5 w-5 text-primary" />
            Historique des versions
          </DialogTitle>
          <DialogDescription>
            Consultez les versions précédentes et restaurez une ancienne planification.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] mt-4 pr-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Clock className="animate-spin h-6 w-6 text-muted-foreground" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground italic border-2 border-dashed rounded-lg">
              Aucun historique disponible pour ce dossier.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry: any) => (
                <div key={entry.id} className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">
                        Version du {formatTimestamp(entry.modifiedAt)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {entry.modifiedByName || 'Utilisateur inconnu'}
                        <Badge variant="outline" className="text-[11px] h-4 py-0">
                          {entry.action || 'Modification'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleExpand(entry.id)}>
                        {expandedId === entry.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="ml-1 text-xs">Détails</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-primary border-primary/20 hover:bg-primary hover:text-white"
                        onClick={() => handleRestore(entry)}
                        disabled={restoringId === entry.id}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        <span className="text-xs">Restaurer</span>
                      </Button>
                    </div>
                  </div>

                  {expandedId === entry.id && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-x-4 gap-y-3 text-sm animate-in fade-in-0 duration-300">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase font-bold text-muted-foreground">Date RDV</p>
                        <p className="flex items-center gap-2"><Calendar className="h-3 w-3" /> {formatTimestamp(entry.dateRDV)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase font-bold text-muted-foreground">Type de RDV</p>
                        <p className="capitalize">{entry.typeMission}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase font-bold text-muted-foreground">Agent</p>
                        <p>{entry.agentTerrain}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase font-bold text-muted-foreground">Zone</p>
                        <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {entry.zone}</p>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <p className="text-[11px] uppercase font-bold text-muted-foreground">Adresse</p>
                        <p>{entry.adresse}</p>
                      </div>
                      {entry.observation && (
                        <div className="col-span-2 bg-muted/30 p-3 rounded-md italic text-xs">
                          <p className="not-italic font-bold text-[11px] uppercase mb-1 opacity-60">Observation:</p>
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
