'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator,
  Loader2,
  FileDown,
  FileUp,
  Sparkles,
} from 'lucide-react';
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { generateRapportReformePDF } from '@/lib/generate-rapport-reforme-pdf';
import { generateRapportPreliminairePDF } from '@/lib/generate-rapport-preliminaire-pdf';
import type { RapportType } from '@/lib/generate-rapport-shared';
import { RapportTypeDialog } from '@/components/modals/rapport-type-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { logWorkflow } from './log-historique';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ValiderDossierButton } from '@/components/dossiers/valider-dossier-button';
import CarSvgTop from '@/components/car-svg-top';
import CarSvgBottom from '@/components/car-svg-bottom';
import { apiFetch } from '@/lib/api-fetch';

export default function RapportTab({ dossierId }: { dossierId: string }) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite, profile } = useCurrentUser();
  const canEditDossiers = canWrite('dossiers');

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [directorValidated, setDirectorValidated] = useState<
    { by?: string; at?: any; role?: string } | null
  >(null);
  const [rapportAlreadyDepose, setRapportAlreadyDepose] = useState(false);

  // Chiffrage type state
  const [typeChiffrage, setTypeChiffrage] = useState<'Réparation' | 'Réforme' | ''>('');
  const [sousTypeChiffrage, setSousTypeChiffrage] = useState('');
  const typeChiffrageInitialLoaded = useRef(false);

  // Scan / AI import
  const [isScanning, setIsScanning] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Points de Choc
  const [pointsChoc, setPointsChoc] = useState<Record<string, boolean>>({
    AR: false, ARG: false, ARD: false,
    LATG: false, LATD: false,
    AVG: false, AVD: false, AV: false,
    Toit: false
  });
  const [pointsChocDessous, setPointsChocDessous] = useState<Record<string, boolean>>({
    suspensionAV: false, soubassementAV: false, plancher: false,
    transmission: false, differentiel: false,
    suspensionAR: false, echappement: false, reservoir: false
  });
  const pointsChocInitialLoaded = useRef(false);

  useEffect(() => {
    if (!db || !dossierId) return;

    const unsubscribeDossier = onSnapshot(doc(db, 'dossiers', dossierId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        if (!pointsChocInitialLoaded.current) {
          if (data.pointsChoc) setPointsChoc(data.pointsChoc);
          if (data.pointsChocDessous) setPointsChocDessous(data.pointsChocDessous);
          pointsChocInitialLoaded.current = true;
        }

        if (!typeChiffrageInitialLoaded.current) {
          if (data.typeChiffrage) setTypeChiffrage(data.typeChiffrage);
          if (data.sousTypeChiffrage) setSousTypeChiffrage(data.sousTypeChiffrage);
          typeChiffrageInitialLoaded.current = true;
        }

        setDirectorValidated(data.directorValidated ?? null);
        setRapportAlreadyDepose(!!data.dateRapportDepose);
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => {
      unsubscribeDossier();
    };
  }, [db, dossierId]);

  const handleTypeChiffrageChange = async (value: 'Réparation' | 'Réforme') => {
    setTypeChiffrage(value);
    setSousTypeChiffrage('');
    if (db) {
      try {
        await updateDoc(doc(db, 'dossiers', dossierId), { typeChiffrage: value, sousTypeChiffrage: '' });
      } catch { /* silent */ }
    }
  };

  const handleSousTypeChange = async (value: string) => {
    setSousTypeChiffrage(value);
    if (db) {
      try {
        await updateDoc(doc(db, 'dossiers', dossierId), { sousTypeChiffrage: value });
      } catch { /* silent */ }
    }
  };

  const handleScanImport = async (file: File) => {
    if (!db) return;
    setIsScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await apiFetch('/api/scan-rapport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, contentType: file.type }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors du scan');
      }

      const { data } = await res.json();

      // Add pieces to Firestore (chiffrage workflow)
      if (data.pieces && data.pieces.length > 0) {
        for (const piece of data.pieces) {
          await addDoc(collection(db, 'dossiers', dossierId, 'rapport_pieces'), {
            designation: piece.designation || '',
            operation: piece.operation || 'Echange',
            typePiece: piece.typePiece || 'P.Ps',
            vetuste: Number(piece.vetuste) || 0,
            quantite: Number(piece.quantite) || 1,
            puHT: Number(piece.puHT) || 0,
            remise: Number(piece.remise) || 0,
            tva: piece.tva !== false,
            typeChoc: piece.typeChoc || 'Choc 1',
            createdAt: serverTimestamp(),
          });
        }
      }

      // Update points de choc
      if (data.pointsChoc) {
        setPointsChoc(prev => {
          const updated = { ...prev };
          for (const [key, val] of Object.entries(data.pointsChoc)) {
            if (key in updated) updated[key] = Boolean(val);
          }
          return updated;
        });
      }
      if (data.pointsChocDessous) {
        setPointsChocDessous(prev => {
          const updated = { ...prev };
          for (const [key, val] of Object.entries(data.pointsChocDessous)) {
            if (key in updated) updated[key] = Boolean(val);
          }
          return updated;
        });
      }

      const userEmail = auth?.currentUser?.email || 'Admin';
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Rapport mis à jour', userEmail, userId, 'done', { details: `Importation IA : ${data.pieces?.length || 0} pièce(s) extraite(s)` }, profile?.nom);

      toast({
        title: 'Importation réussie',
        description: `${data.pieces?.length || 0} pièce(s) extraite(s) par l'IA.`,
      });
    } catch (error: any) {
      console.error('Scan rapport error:', error);
      toast({ variant: 'destructive', title: "Erreur lors de l'importation", description: error.message });
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  const handleToggleZone = (key: string, isDessous: boolean = false) => {
    if (isDessous) {
      setPointsChocDessous(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setPointsChoc(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleOpenTypeDialog = () => {
    setTypeDialogOpen(true);
  };

  const handleGenerate = async (type: RapportType) => {
    setIsGenerating(true);
    try {
      // Persist current points de choc before generating
      if (db) {
        try {
          await updateDoc(doc(db, 'dossiers', dossierId), { pointsChoc, pointsChocDessous });
        } catch { /* silent */ }
      }
      if (type === 'preliminaire') {
        await generateRapportPreliminairePDF(db, dossierId);
      } else {
        await generateRapportReformePDF(db, dossierId);
      }
      if (db && !rapportAlreadyDepose) {
        const userEmail = auth?.currentUser?.email || 'Admin';
        const userId = auth?.currentUser?.uid || 'unknown';
        try {
          await updateDoc(doc(db, 'dossiers', dossierId), {
            dateRapportDepose: serverTimestamp(),
            authorRapportDepose: userEmail,
          });
        } catch { /* silent — funnel-only data, must not break the user-facing flow */ }
        try {
          await logWorkflow(db, dossierId, 'Rapport déposé', userEmail, userId, 'done', { details: `Type: ${type}` }, profile?.nom);
        } catch { /* silent */ }
      }
      toast({ title: 'Rapport généré' });
      setTypeDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <Card><CardContent className="p-10"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  const alreadyValidated = directorValidated != null;

  return (
    <div className="space-y-8">
      {/* HEADER WITH GÉNÉRER LE RAPPORT BUTTON */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Rapport</h2>
          <p className="text-sm text-muted-foreground">Diagramme des points de choc et génération du PDF final.</p>
        </div>
        <div className="flex items-center gap-2">
          <ValiderDossierButton
            dossierId={dossierId}
            alreadyValidated={alreadyValidated}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleOpenTypeDialog}
                    disabled={isGenerating || !alreadyValidated}
                    className="gap-2"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    Générer le rapport
                  </Button>
                </span>
              </TooltipTrigger>
              {!alreadyValidated && (
                <TooltipContent>
                  En attente de validation du directeur des opérations ou de l'administrateur
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <RapportTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        onConfirm={handleGenerate}
        isGenerating={isGenerating}
      />

      {/* POINTS DE CHOC */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="border-b bg-heading-bg"><CardTitle className="text-xl font-bold">Points de choc</CardTitle></CardHeader>
        <CardContent className="p-6 space-y-12">
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-l-4 border-blue-500 pl-3">Vue de dessus</h3>
            <div className={cn("grid gap-12 items-center", canEditDossiers ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-md mx-auto")}>
              <div className={cn("mx-auto", !canEditDossiers && "pointer-events-none")}>
                <CarSvgTop zones={pointsChoc} onToggleZone={canEditDossiers ? (zone) => handleToggleZone(zone) : () => {}} />
              </div>
              {canEditDossiers && (
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(pointsChoc).map(zone => (
                    <div key={zone} className="flex items-center space-x-3 bg-muted/20 p-3 rounded-lg border border-transparent hover:border-primary/20 transition-colors">
                      <Checkbox id={`top-${zone}`} checked={pointsChoc[zone]} onCheckedChange={() => handleToggleZone(zone)} />
                      <Label htmlFor={`top-${zone}`} className="text-xs font-bold cursor-pointer">{zone}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-6 pt-12 border-t border-dashed">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-l-4 border-blue-500 pl-3">Vue de dessous</h3>
            <div className={cn("grid gap-12 items-center", canEditDossiers ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-md mx-auto")}>
              <div className={cn("mx-auto", !canEditDossiers && "pointer-events-none")}>
                <CarSvgBottom zones={pointsChocDessous} onToggleZone={canEditDossiers ? (zone) => handleToggleZone(zone, true) : () => {}} />
              </div>
              {canEditDossiers && (
                <div className="grid grid-cols-1 gap-3">
                  {Object.keys(pointsChocDessous).map(zone => (
                    <div key={zone} className="flex items-center space-x-3 bg-muted/20 p-3 rounded-lg border border-transparent hover:border-primary/20 transition-colors">
                      <Checkbox id={`bot-${zone}`} checked={pointsChocDessous[zone]} onCheckedChange={() => handleToggleZone(zone, true)} />
                      <Label htmlFor={`bot-${zone}`} className="text-xs font-bold cursor-pointer capitalize">{zone.replace(/([A-Z])/g, ' $1')}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
