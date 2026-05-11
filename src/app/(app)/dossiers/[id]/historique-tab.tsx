"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useAuth } from '@/firebase';
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type HistoriqueTabProps = {
  dossierId: string;
};

export default function HistoriqueTab({ dossierId }: HistoriqueTabProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [entries, setEntries] = useState<any[]>([]);
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Listen to historique subcollection
  useEffect(() => {
    if (!db || !dossierId) return;

    const q = query(
      collection(db, 'dossiers', dossierId, 'historique'),
      orderBy('date', 'desc')
    );
    
    const unsubscribeHistory = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(items);
      setLoading(false);
    }, (err) => {
      console.error('Historique listener error:', err);
      setLoading(false);
    });
    
    return () => unsubscribeHistory();
  }, [db, dossierId]);

  // Listen to parent dossier doc for approval banner status
  useEffect(() => {
    if (!db || !dossierId) return;

    const unsubscribeDossier = onSnapshot(doc(db, 'dossiers', dossierId), (snapshot) => {
      if (snapshot.exists()) {
        setDossier({ id: snapshot.id, ...snapshot.data() });
      }
    });
    
    return () => unsubscribeDossier();
  }, [db, dossierId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Date inconnue';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const currentUserEmail = auth?.currentUser?.email || 'Admin';

  const handleApprove = async () => {
    if (!db || !dossierId) return;
    try {
      await updateDoc(doc(db, 'dossiers', dossierId), {
        'sinistreDouteux.active': false,
        statut: 'Sinistre Douteux Approuvé'
      });
      
      await addDoc(collection(db, 'dossiers', dossierId, 'historique'), {
        action: 'Sinistre Douteux Approuvé',
        date: serverTimestamp(),
        user: currentUserEmail,
        details: 'La demande a été approuvée par l\'administration.',
        type: 'sinistre_douteux'
      });
      
      toast({ title: 'Succès', description: 'Sinistre douteux approuvé.' });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  const handleReject = async () => {
    if (!db || !dossierId) return;
    try {
      await updateDoc(doc(db, 'dossiers', dossierId), {
        'sinistreDouteux.active': false,
        statut: 'Sinistre Douteux Rejeté'
      });
      
      await addDoc(collection(db, 'dossiers', dossierId, 'historique'), {
        action: 'Sinistre Douteux Rejeté',
        date: serverTimestamp(),
        user: currentUserEmail,
        details: 'La demande a été rejetée par l\'administration.',
        type: 'sinistre_douteux'
      });
      
      toast({ title: 'Succès', description: 'Sinistre douteux rejeté.' });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-8 mt-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">État du dossier</h2>
        <p className="text-sm text-muted-foreground">Suivez la progression du dossier étape par étape.</p>
      </div>

      {/* DATES CLÉS */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold text-base">Dates clés</h3>
          {/* Top block: single-column rows (no left/right pairing). */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {[
              { label: 'Date réception mission', value: dossier?.dateRequete },
              { label: 'Date sinistre', value: dossier?.dateSinistre },
              { label: 'Date création dossier', value: dossier?.createdAt },
              { label: 'Date mission AT', value: dossier?.dateMissionAgentTerrain },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">{row.value ? formatDate(row.value) : '—'}</span>
              </div>
            ))}
          </div>
          {/* Paired rows: demande on the left, expertise on the right, per phase. */}
          {([
            { phase: 'avant',    demande: dossier?.dateDemandeExpertiseAvant,    expertise: dossier?.datePhotosAvant },
            { phase: 'en cours', demande: dossier?.dateDemandeExpertiseEnCours,  expertise: dossier?.datePhotosEnCours },
            { phase: 'après',    demande: dossier?.dateDemandeExpertiseApres,    expertise: dossier?.datePhotosApres },
          ] as const).map((row) => (
            <div key={row.phase} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <div className="flex justify-between text-sm py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">{`Date demande expertise (${row.phase})`}</span>
                <span className="font-medium tabular-nums">{row.demande ? formatDate(row.demande) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">{`Date expertise (${row.phase})`}</span>
                <span className="font-medium tabular-nums">{row.expertise ? formatDate(row.expertise) : '—'}</span>
              </div>
            </div>
          ))}
          {/* Tail block: remaining single-column rows. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {[
              { label: 'Date chiffrage', value: dossier?.dateChiffrage },
              { label: 'Date validation facture', value: dossier?.dateFactureValide },
              { label: 'Date envoi accord devis', value: dossier?.dateEnvoiAccordDevis },
              { label: 'Date validation rapport', value: dossier?.directorValidated?.at },
              { label: 'Date dépôt rapport', value: dossier?.dateRapportDepose },
              { label: "Date dépôt note d'honoraire", value: (dossier as any)?.dateDepotNoteHonoraire },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">{row.value ? formatDate(row.value) : '—'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SINISTRE DOUTEUX APPROVAL BANNER */}
      {dossier?.sinistreDouteux?.active && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-red-800 dark:text-red-400">Sinistre Douteux - En attente de validation</h3>
                <p className="text-sm text-muted-foreground">
                  Demandé par <span className="font-semibold">{dossier.sinistreDouteux.demandePar || 'N/A'}</span> le {formatDate(dossier.sinistreDouteux.dateDemande)}
                </p>
                {dossier.sinistreDouteux.motif && (
                  <p className="text-sm italic mt-2 bg-white/50 dark:bg-black/20 p-2 rounded border border-red-100 dark:border-red-900/50">
                    &quot;{dossier.sinistreDouteux.motif}&quot;
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <Button 
                    onClick={handleApprove} 
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4" /> Approuver
                  </Button>
                  <Button 
                    onClick={handleReject} 
                    className="bg-red-600 hover:bg-red-700 text-white gap-2"
                    size="sm"
                  >
                    <XCircle className="h-4 w-4" /> Rejeter
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TIMELINE — only status changes */}
      {(() => {
        const statusEntries = entries.filter((e) => e.type === 'statut' || e.type === 'sinistre_douteux');
        return statusEntries.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground italic">
            Aucun changement de statut enregistré pour ce dossier.
          </div>
        ) : (
          <div className="relative pl-8 pt-4">
            {/* Vertical line */}
            <div className="absolute left-[5px] top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-10">
              {statusEntries.map((entry) => (
                <div key={entry.id} className="relative">
                  {/* Bullet */}
                  <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-muted-foreground border-2 border-background z-10" />

                  <div className="space-y-1">
                    <p className="font-semibold text-base">{entry.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(entry.date)} par <span className="font-bold text-foreground">{entry.user}</span>
                    </p>
                    {entry.details && (
                      <div className="mt-2 pl-4 border-l-2 border-primary/40 text-sm italic text-muted-foreground bg-muted/50 py-2 rounded-r-md">
                        &quot;{entry.details}&quot;
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
