'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Calculator,
  Loader2,
  CheckCircle2,
  Download,
  Save,
  Wrench,
  Settings,
  Pencil,
  CheckCircle,
  XCircle,
  FileUp,
  Sparkles,
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { generateRapportPDF, type Piece } from '@/lib/generate-rapport-pdf';
import { logWorkflow } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { useCurrentUser } from '@/hooks/use-current-user';
import CarSvgTop from '@/components/car-svg-top';
import CarSvgBottom from '@/components/car-svg-bottom';

type MOItem = { nbrH: number; pu: number };

const defaultTypePieceOptions = ['ORG', 'ADP', 'REC', 'ORGs', 'ADPs', 'RECs', 'P.P', 'P.Ps', 'R.P', 'R.Ps'];
const defaultOperationOptions = ['Echange', 'Réparation', 'Peinture'];
const defaultMdoTypes = ['Tolerie', 'Peinture', 'Mécanique', 'Electrique'];
const TYPE_CHOC_OPTIONS = [
  'Choc 1', 'Choc 2', 'Choc 3', 'Choc 4', 'Choc 5',
  'Choc 6', 'Choc 7', 'Choc 8', 'Choc 9', 'Choc 10'
];

export default function RapportTab({ dossierId }: { dossierId: string }) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite } = useCurrentUser();
  const canEditDossiers = canWrite('dossiers');

  const { options: dbTypePieces } = useOptions('options_rapport_types_pieces', defaultTypePieceOptions);
  const { options: dbOperations } = useOptions('options_rapport_operations', defaultOperationOptions);
  const { options: dbMdoTypes } = useOptions('options_mdo_types', defaultMdoTypes);

  const typePieceOptions = useMemo(() => dbTypePieces.length > 0 ? dbTypePieces : defaultTypePieceOptions.map((l, i) => ({ id: `f-${i}`, label: l })), [dbTypePieces]);
  const operationOptions = useMemo(() => dbOperations.length > 0 ? dbOperations : defaultOperationOptions.map((l, i) => ({ id: `f-${i}`, label: l })), [dbOperations]);
  const mdoTypes = useMemo(() => dbMdoTypes.length > 0 ? dbMdoTypes : defaultMdoTypes.map((l, i) => ({ id: `f-${i}`, label: l })), [dbMdoTypes]);

  const [loading, setLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Section 1 State: Fourniture
  const [selectedChoc, setSelectedChoc] = useState('Choc 1');
  const [allPieces, setAllPieces] = useState<Piece[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPiece, setNewPiece] = useState({
    designation: '',
    operation: 'Echange',
    typePiece: 'P.Ps',
    vetuste: 0,
    quantite: 1,
    puHT: 0,
    remise: 0,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isScanning, setIsScanning] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const pieces = useMemo(() => {
    return allPieces
      .filter(p => p.typeChoc === selectedChoc)
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        return dateB - dateA;
      });
  }, [allPieces, selectedChoc]);

  // Section 2 State: Main d'oeuvre
  const [mainOeuvre, setMainOeuvre] = useState<Record<string, MOItem>>({});
  const [isSavingMO, setIsSavingMO] = useState(false);
  const mainOeuvreInitialLoaded = useRef(false);

  // Default values for MO if empty
  useEffect(() => {
    if (mdoTypes.length > 0 && Object.keys(mainOeuvre).length === 0 && !mainOeuvreInitialLoaded.current) {
      const initialMO: Record<string, MOItem> = {};
      mdoTypes.forEach(t => {
        initialMO[t.label.toLowerCase()] = { nbrH: 0, pu: 80 };
      });
      setMainOeuvre(initialMO);
    }
  }, [mdoTypes, mainOeuvre]);

  // Section 4 State: Points de Choc & Observation
  const [pointsChoc, setPointsChoc] = useState<Record<string, boolean>>({
    AR: false, ARG: false, ARD: false,
    LATG: false, LATD: false,
    AVG: false, AVD: false, AV: false,
    Toit: false
  });
  // Rapport type
  const { options: dbRapportTypes } = useOptions('options_types_rapport', []);
  const rapportTypes = useMemo(() => dbRapportTypes.length > 0 ? dbRapportTypes : [], [dbRapportTypes]);
  const [selectedRapportType, setSelectedRapportType] = useState('');
  const rapportTypeInitialLoaded = useRef(false);

  const [pointsChocDessous, setPointsChocDessous] = useState<Record<string, boolean>>({
    suspensionAV: false, soubassementAV: false, plancher: false,
    transmission: false, differentiel: false,
    suspensionAR: false, echappement: false, reservoir: false
  });
  const [observationExpert, setObservationExpert] = useState('');
  const [dossierMode, setDossierMode] = useState('Procédure normale');
  const pointsChocInitialLoaded = useRef(false);
  const observationInitialLoaded = useRef(false);

  useEffect(() => {
    if (!db || !dossierId) return;

    const piecesRef = collection(db, 'dossiers', dossierId, 'rapport_pieces');
    const unsubscribePieces = onSnapshot(piecesRef, (snapshot) => {
      const fetchedPieces = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as Piece[];
      setAllPieces(fetchedPieces);
      setLoading(false);
    }, (error) => {
      console.error("Firestore pieces listener error:", error);
      setLoading(false);
    });

    const unsubscribeDossier = onSnapshot(doc(db, 'dossiers', dossierId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        
        if (data.mainOeuvre && !mainOeuvreInitialLoaded.current) {
          setMainOeuvre(data.mainOeuvre);
          mainOeuvreInitialLoaded.current = true;
        }

        if (!pointsChocInitialLoaded.current) {
          if (data.pointsChoc) setPointsChoc(data.pointsChoc);
          if (data.pointsChocDessous) setPointsChocDessous(data.pointsChocDessous);
          pointsChocInitialLoaded.current = true;
        }

        if (!observationInitialLoaded.current) {
          if (data.observationExpert !== undefined) setObservationExpert(data.observationExpert);
          setDossierMode(data.modeDossier || 'Procédure normale');
          observationInitialLoaded.current = true;
        }

        if (!rapportTypeInitialLoaded.current) {
          if (data.typeRapport) setSelectedRapportType(data.typeRapport);
          rapportTypeInitialLoaded.current = true;
        }
      }
    });

    return () => {
      unsubscribePieces();
      unsubscribeDossier();
    };
  }, [db, dossierId]);

  const calculatePieceRowHT = (piece: any) => {
    return piece.puHT * piece.quantite * (1 - piece.remise / 100) * (1 - piece.vetuste / 100);
  };

  const fournitureTotals = useMemo(() => {
    let totalHT = 0;
    let totalTVA = 0;
    pieces.forEach(p => {
      const rowHT = calculatePieceRowHT(p);
      totalHT += rowHT;
      if (p.tva) totalTVA += rowHT * 0.20;
    });
    return { ht: totalHT, tva: totalTVA, ttc: totalHT + totalTVA };
  }, [pieces]);

  const moTotals = useMemo(() => {
    let totalHT = 0;
    let totalTVA = 0;
    Object.values(mainOeuvre).forEach(item => {
      const nbrH = Number(item?.nbrH) || 0;
      const pu = Number(item?.pu) || 0;
      const rowHT = nbrH * pu;
      totalHT += rowHT;
      totalTVA += rowHT * 0.20;
    });
    return { ht: totalHT, tva: totalTVA, ttc: totalHT + totalTVA };
  }, [mainOeuvre]);

  const stats = useMemo(() => {
    const fTTC = allPieces.reduce((acc, p) => {
      const ht = calculatePieceRowHT(p);
      return acc + ht + (p.tva ? ht * 0.2 : 0);
    }, 0);
    const total = fTTC + moTotals.ttc;
    const fPercent = total > 0 ? Math.round((fTTC / total) * 100) : 0;
    const moPercent = total > 0 ? 100 - fPercent : 0;
    const totalH = Object.values(mainOeuvre).reduce((acc, item) => acc + item.nbrH, 0);
    return { fTTC, moTTC: moTotals.ttc, total, fPercent, moPercent, totalH, piecesCount: allPieces.length };
  }, [allPieces, moTotals, mainOeuvre]);

  const handleAddPiece = async () => {
    if (!newPiece.designation.trim() || !db) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'dossiers', dossierId, 'rapport_pieces'), {
        ...newPiece,
        typeChoc: selectedChoc,
        tva: true,
        createdAt: serverTimestamp(),
      });
      setNewPiece({ designation: '', operation: 'Echange', typePiece: 'P.Ps', vetuste: 0, quantite: 1, puHT: 0, remise: 0 });
      toast({ title: "Pièce ajoutée" });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erreur lors de l'ajout" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (piece: Piece) => {
    setEditingId(piece.id);
    setEditForm({ 
      designation: piece.designation, 
      typePiece: piece.typePiece, 
      vetuste: piece.vetuste, 
      quantite: piece.quantite, 
      puHT: piece.puHT, 
      remise: piece.remise 
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !db) return;
    try {
      await updateDoc(doc(db, 'dossiers', dossierId, 'rapport_pieces', editingId), editForm);
      toast({ title: "Pièce mise à jour" });
      setEditingId(null);
    } catch (error) {
      toast({ variant: 'destructive', title: "Erreur lors de la mise à jour" });
    }
  };

  const handleToggleTVA = async (pieceId: string, currentValue: boolean) => {
    try {
      await updateDoc(doc(db, 'dossiers', dossierId, 'rapport_pieces', pieceId), { tva: !currentValue });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeletePiece = async (pieceId: string) => {
    try {
      await deleteDoc(doc(db, 'dossiers', dossierId, 'rapport_pieces', pieceId));
      toast({ title: "Pièce supprimée" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRapportTypeChange = async (value: string) => {
    setSelectedRapportType(value);
    if (db) {
      try {
        await updateDoc(doc(db, 'dossiers', dossierId), { typeRapport: value });
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

      const res = await fetch('/api/scan-rapport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, contentType: file.type }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors du scan');
      }

      const { data } = await res.json();

      // 1. Add pieces to Firestore
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

      // 2. Update main d'oeuvre
      if (data.mainOeuvre) {
        const mo: Record<string, MOItem> = {};
        for (const [key, val] of Object.entries(data.mainOeuvre)) {
          const v = val as any;
          mo[key.toLowerCase()] = { nbrH: Number(v?.nbrH) || 0, pu: Number(v?.pu) || 80 };
        }
        if (Object.keys(mo).length > 0) {
          setMainOeuvre(prev => ({ ...prev, ...mo }));
          await updateDoc(doc(db, 'dossiers', dossierId), { mainOeuvre: mo });
        }
      }

      // 3. Update points de choc
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

      // 4. Update observation
      if (data.observationExpert) {
        setObservationExpert(data.observationExpert);
      }

      const userEmail = auth?.currentUser?.email || 'Admin';
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Rapport mis à jour', userEmail, userId, 'done', { details: `Importation IA : ${data.pieces?.length || 0} pièce(s) extraite(s)` });

      toast({
        title: 'Importation réussie',
        description: `${data.pieces?.length || 0} pièce(s) extraite(s) par l'IA. Vous pouvez maintenant modifier chaque élément.`,
      });
    } catch (error: any) {
      console.error('Scan rapport error:', error);
      toast({ variant: 'destructive', title: "Erreur lors de l'importation", description: error.message });
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  const updateMO = (key: string, field: keyof MOItem, value: number) => {
    const val = Math.max(0, value);
    setMainOeuvre(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
  };

  const handleSaveMO = async () => {
    setIsSavingMO(true);
    try {
      await updateDoc(doc(db, 'dossiers', dossierId), { mainOeuvre });
      toast({ title: "Main d'œuvre enregistrée" });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erreur de sauvegarde" });
    } finally {
      setIsSavingMO(false);
    }
  };

  const handleToggleZone = (key: string, isDessous: boolean = false) => {
    if (isDessous) {
      setPointsChocDessous(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setPointsChoc(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleValidateReport = async () => {
    setIsValidating(true);
    try {
      await updateDoc(doc(db, 'dossiers', dossierId), {
        pointsChoc,
        pointsChocDessous,
        observationExpert,
        statut: 'Rapport Validé'
      });
      const userEmail = auth?.currentUser?.email || 'Admin';
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Rapport validé', userEmail, userId, 'done', { details: 'Rapport d\'expertise validé' });
      toast({ title: "Rapport validé avec succès" });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Erreur lors de la validation" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateRapportPDF(db, dossierId, selectedRapportType || undefined);
      toast({ title: "Rapport PDF généré" });
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: 'destructive', 
        title: "Erreur lors de la génération", 
        description: error.message 
      });
    } finally {
      setIsGeneratingPDF(false);
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

  return (
    <div className="space-y-8 pb-32">
      {/* RAPPORT TYPE + AI IMPORT */}
      {canEditDossiers && (
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1 shadow-sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <Label className="font-semibold text-sm whitespace-nowrap">Type de Rapport</Label>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedRapportType} onValueChange={handleRapportTypeChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Choisir le type de rapport" />
                  </SelectTrigger>
                  <SelectContent>
                    {rapportTypes.map((t: any) => (
                      <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <OptionsManagerModal collectionName="options_types_rapport" title="Types de rapport" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 border-dashed border-2 border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">Importation IA</p>
                <p className="text-xs text-muted-foreground">Importez un document et l'IA remplira le rapport.</p>
              </div>
            </div>
            <div>
              <input
                ref={scanInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleScanImport(file);
                }}
              />
              <Button
                variant="outline"
                className="gap-2"
                disabled={isScanning}
                onClick={() => scanInputRef.current?.click()}
              >
                {isScanning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours...</>
                ) : (
                  <><FileUp className="h-4 w-4" /> Importer</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* SECTION 1 — FOURNITURE */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30">
          <div>
            <CardTitle className="text-xl font-bold">Fourniture et pieces de rechange</CardTitle>
          </div>
          <div className="flex items-center gap-4 bg-background px-4 py-2 rounded-lg border shadow-sm">
            <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Type Choc:</Label>
            <Select value={selectedChoc} onValueChange={setSelectedChoc}>
              <SelectTrigger className="w-[120px] border-none font-semibold focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_CHOC_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {canEditDossiers && <div className="p-4 bg-muted/10 border-b space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Désignation</Label><Input value={newPiece.designation} onChange={e => setNewPiece({...newPiece, designation: e.target.value})} className="bg-background" /></div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase">Ope</Label>
                  <OptionsManagerModal collectionName="options_rapport_operations" title="Opérations" defaultValues={defaultOperationOptions} />
                </div>
                <Select value={newPiece.operation} onValueChange={v => setNewPiece({...newPiece, operation: v})}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {operationOptions.map(opt => <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase">Type</Label>
                  <OptionsManagerModal collectionName="options_rapport_types_pieces" title="Types de pièces" defaultValues={defaultTypePieceOptions} />
                </div>
                <Select value={newPiece.typePiece} onValueChange={v => setNewPiece({...newPiece, typePiece: v})}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typePieceOptions.map(opt => <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Vétusté %</Label><Input type="number" value={newPiece.vetuste} onChange={e => setNewPiece({...newPiece, vetuste: Number(e.target.value)})} className="bg-background" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Qte</Label><Input type="number" value={newPiece.quantite} onChange={e => setNewPiece({...newPiece, quantite: Number(e.target.value)})} className="bg-background" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">P.U HT</Label><Input type="number" value={newPiece.puHT} onChange={e => setNewPiece({...newPiece, puHT: Number(e.target.value)})} className="bg-background" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Remise %</Label><Input type="number" value={newPiece.remise} onChange={e => setNewPiece({...newPiece, remise: Number(e.target.value)})} className="bg-background" /></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddPiece} disabled={isAdding || !newPiece.designation} className="gap-2">
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                + Ajouter la pièce
              </Button>
            </div>
          </div>}

          <Table>
            <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-[10px] font-bold uppercase">Désignation</TableHead><TableHead className="text-[10px] font-bold uppercase">Type</TableHead><TableHead className="text-[10px] font-bold uppercase">Vét.</TableHead><TableHead className="text-[10px] font-bold uppercase">Qte</TableHead><TableHead className="text-[10px] font-bold uppercase">PU HT</TableHead><TableHead className="text-[10px] font-bold uppercase">Rem.</TableHead><TableHead className="text-[10px] font-bold uppercase">Total HT</TableHead><TableHead className="text-[10px] font-bold uppercase w-[80px]">TVA</TableHead><TableHead className="text-[10px] font-bold uppercase">TTC</TableHead><TableHead className="w-[100px] text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {pieces.length === 0 ? (<TableRow><TableCell colSpan={10} className="h-32 text-center text-muted-foreground italic">Aucune pièce pour ce choc.</TableCell></TableRow>) : (
                pieces.map((piece) => {
                  const isEditing = editingId === piece.id;
                  const displayData = isEditing ? editForm : piece;
                  const rowHT = calculatePieceRowHT(displayData);
                  const tvaAmount = piece.tva ? rowHT * 0.20 : 0;

                  return (
                    <TableRow key={piece.id} className="group">
                      <TableCell>
                        {isEditing ? <Input value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} className="h-8" /> : <span className="font-medium">{piece.designation}</span>}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select value={editForm.typePiece} onValueChange={v => setEditForm({...editForm, typePiece: v})}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>{typePieceOptions.map(opt => <SelectItem key={`edit-${opt.id}`} value={opt.label}>{opt.label}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : piece.typePiece}
                      </TableCell>
                      <TableCell>
                        {isEditing ? <Input type="number" value={editForm.vetuste} onChange={e => setEditForm({...editForm, vetuste: Number(e.target.value)})} className="h-8 w-16" /> : `${piece.vetuste}%`}
                      </TableCell>
                      <TableCell>
                        {isEditing ? <Input type="number" value={editForm.quantite} onChange={e => setEditForm({...editForm, quantite: Number(e.target.value)})} className="h-8 w-16" /> : piece.quantite}
                      </TableCell>
                      <TableCell>
                        {isEditing ? <Input type="number" value={editForm.puHT} onChange={e => setEditForm({...editForm, puHT: Number(e.target.value)})} className="h-8 w-24" /> : piece.puHT.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {isEditing ? <Input type="number" value={editForm.remise} onChange={e => setEditForm({...editForm, remise: Number(e.target.value)})} className="h-8 w-16" /> : `${piece.remise}%`}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{rowHT.toFixed(2)}</TableCell>
                      <TableCell className="text-center"><Checkbox checked={piece.tva} onCheckedChange={() => handleToggleTVA(piece.id, piece.tva)} disabled={!canEditDossiers} /></TableCell>
                      <TableCell className="font-bold font-mono text-xs">{(rowHT + tvaAmount).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="h-8 w-8 text-green-600"><CheckCircle className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-8 w-8 text-gray-400"><XCircle className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              {canEditDossiers && <>
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(piece)} className="h-8 w-8 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeletePiece(piece.id)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button>
                              </>}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {pieces.length > 0 && (
              <TableFooter className="bg-primary/5">
                <TableRow>
                  <TableCell colSpan={6} className="text-right font-bold text-xs uppercase text-muted-foreground">Total Fourniture ({selectedChoc})</TableCell>
                  <TableCell className="font-mono font-bold">{fournitureTotals.ht.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-center text-xs">{fournitureTotals.tva.toFixed(2)}</TableCell>
                  <TableCell className="font-mono font-black text-primary">{fournitureTotals.ttc.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* SECTION 2: MAIN D'OEUVRE */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="border-b bg-muted/30 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">Main d'œuvre</CardTitle>
          <OptionsManagerModal collectionName="options_mdo_types" title="Rubriques MDO" defaultValues={defaultMdoTypes} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-[10px] font-bold uppercase">Main d'œuvre</TableHead><TableHead className="text-[10px] font-bold uppercase text-center">Nbr H</TableHead><TableHead className="text-[10px] font-bold uppercase text-center">P.U</TableHead><TableHead className="text-[10px] font-bold uppercase">Total HT</TableHead><TableHead className="text-[10px] font-bold uppercase">Montant TVA (20%)</TableHead><TableHead className="text-[10px] font-bold uppercase">Total TTC</TableHead></TableRow></TableHeader>
            <TableBody>
              {mdoTypes.map((type) => {
                const key = type.label.toLowerCase();
                const item = mainOeuvre[key] || { nbrH: 0, pu: 80 };
                const totalHT = (Number(item.nbrH) || 0) * (Number(item.pu) || 0);
                const tva = totalHT * 0.20;
                const ttc = totalHT + tva;
                return (
                  <TableRow key={type.id}>
                    <TableCell className="font-semibold">{type.label}</TableCell>
                    <TableCell><div className="flex items-center gap-1 justify-center">{canEditDossiers && <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateMO(key, 'nbrH', item.nbrH - 1)}><Minus className="h-3 w-3" /></Button>}<Input type="number" className="h-8 w-16 text-center" value={item.nbrH} onChange={e => updateMO(key, 'nbrH', Number(e.target.value))} readOnly={!canEditDossiers} />{canEditDossiers && <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateMO(key, 'nbrH', item.nbrH + 1)}><Plus className="h-3 w-3" /></Button>}</div></TableCell>
                    <TableCell><div className="flex items-center gap-1 justify-center">{canEditDossiers && <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateMO(key, 'pu', item.pu - 5)}><Minus className="h-3 w-3" /></Button>}<Input type="number" className="h-8 w-16 text-center" value={item.pu} onChange={e => updateMO(key, 'pu', Number(e.target.value))} readOnly={!canEditDossiers} />{canEditDossiers && <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateMO(key, 'pu', item.pu + 5)}><Plus className="h-3 w-3" /></Button>}</div></TableCell>
                    <TableCell className="font-mono text-xs">{totalHT.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{tva.toFixed(2)}</TableCell>
                    <TableCell className="font-bold font-mono text-xs">{ttc.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter className="bg-primary/5">
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold text-xs uppercase text-muted-foreground">Total Main d'œuvre</TableCell>
                <TableCell className="font-mono font-bold">{moTotals.ht.toFixed(2)} MAD</TableCell>
                <TableCell className="font-mono text-xs">{moTotals.tva.toFixed(2)} MAD</TableCell>
                <TableCell className="font-mono font-black text-primary">{moTotals.ttc.toFixed(2)} MAD</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          {canEditDossiers && (
            <div className="p-4 flex justify-end">
              <Button onClick={handleSaveMO} disabled={isSavingMO} className="bg-blue-600 hover:bg-blue-700">
                {isSavingMO ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer Main d'œuvre
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: RÉPARTITION DES COÛTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex flex-col">
          <CardHeader><CardTitle className="text-xl font-bold">Répartition des coûts</CardTitle></CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center space-y-6 py-6">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted" strokeWidth="3" />
                {stats.total > 0 ? (
                  <>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#F87171" strokeWidth="3" strokeDasharray={`${stats.fPercent} 100`} />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#3B82F6" strokeWidth="3" strokeDasharray={`${stats.moPercent} 100`} strokeDashoffset={-stats.fPercent} />
                  </>
                ) : (
                  <text x="18" y="20" textAnchor="middle" className="fill-muted-foreground text-[4px] font-bold">Aucune donnée</text>
                )}
              </svg>
              {stats.total > 0 && <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black">{stats.fPercent + stats.moPercent}%</span></div>}
            </div>
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#F87171]" /><span>Fourniture</span></div><span className="font-bold">{stats.fPercent}%</span></div>
              <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3B82F6]" /><span>Main d'œuvre</span></div><span className="font-bold">{stats.moPercent}%</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden group">
          <CardHeader className="pb-2"><Settings className="absolute top-4 right-4 h-5 w-5 text-blue-400 opacity-20 group-hover:opacity-100 transition-opacity" /><p className="text-sm font-medium text-blue-400 uppercase tracking-wider">Total Pièces</p></CardHeader>
          <CardContent className="flex flex-col items-start justify-center h-full pb-8"><span className="text-6xl font-black tabular-nums">{stats.piecesCount}</span><p className="text-xs text-muted-foreground mt-2 font-medium">unités de fourniture</p></CardContent>
        </Card>
        <Card className="relative overflow-hidden group">
          <CardHeader className="pb-2"><Wrench className="absolute top-4 right-4 h-5 w-5 text-blue-400 opacity-20 group-hover:opacity-100 transition-opacity" /><p className="text-sm font-medium text-blue-400 uppercase tracking-wider">Total Heures MDO</p></CardHeader>
          <CardContent className="flex flex-col items-start justify-center h-full pb-8"><span className="text-6xl font-black tabular-nums">{stats.totalH.toFixed(2)}</span><p className="text-xs text-muted-foreground mt-2 font-medium">heures de main d'oeuvre</p></CardContent>
        </Card>
      </div>

      {/* SECTION 4: POINTS DE CHOC */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="border-b bg-muted/30"><CardTitle className="text-xl font-bold">Points de choc</CardTitle></CardHeader>
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

      {/* SECTION 5: OBSERVATION EXPERT */}
      <Card className="border-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-xl font-bold flex items-center gap-2"><Settings className="h-5 w-5 text-primary" />Observation expert</CardTitle></CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 bg-primary/5 p-3 rounded-md border border-primary/10"><Settings className="h-4 w-4 text-primary" /><span className="text-xs font-bold uppercase tracking-wider text-primary">Mode dossier: {dossierMode}</span></div>
          <Textarea placeholder="Ajouter une observation au rapport (optionnel)..." className="min-h-[150px] resize-none focus-visible:ring-primary text-sm leading-relaxed" value={observationExpert} onChange={(e) => setObservationExpert(e.target.value)} readOnly={!canEditDossiers} />
        </CardContent>
      </Card>

      {/* STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t p-4 flex items-center justify-between z-50 md:left-[16rem] shadow-2xl">
        <div className="flex gap-2">
          {canEditDossiers && (
            <Button onClick={handleValidateReport} disabled={isValidating} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 shadow-lg shadow-green-500/20">
              {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              VALIDER LE RAPPORT
            </Button>
          )}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Général Estimé</span>
          <div className="text-2xl font-black text-primary tabular-nums">
            {stats.total.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">MAD</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="gap-2 font-semibold border-primary/20 hover:bg-primary/5">
            {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exporter PDF
          </Button>
        </div>
      </div>
    </div>
  );
}