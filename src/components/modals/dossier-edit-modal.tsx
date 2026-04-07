'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useCompagnies } from '@/hooks/use-compagnies';

const dossierModes = ['Procédure normale', 'Forfait', 'Prise en charge', 'Contradictoire', 'Collégiale'];
const typeDossierOptions = ['Automobile', 'Incendie', 'Bris de machine', 'Responsabilité civile', 'Transport', 'Divers'];
const natureDossierOptions = ['Automobile', 'Incendie', 'Classique', 'Contradictoire', 'Arbitrage', 'Réforme', 'Collégiale', 'Appréciation', 'Flotte', 'Forfait', 'EAD'];

interface DossierEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossierId: string;
}

export default function DossierEditModal({ isOpen, onClose, dossierId }: DossierEditModalProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const { compagnies } = useCompagnies();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    expertRank: '1er expert',
    modeDossier: 'Procédure normale',
    compagnie: '',
    typeDossier: '',
    nature: '',
    assure: {
      nom: '',
      telephone: '',
      whatsapp: '',
      telephone2: '',
    },
    dateRequete: null,
    vehicule: {
      marque: '',
      modele: '',
      immatriculation: '',
      registrationW: '',
      mec: null,
    },
    dateSinistre: null,
    intermediaire: {
      nom: '',
      email: '',
    },
    referenceCompagnie: '',
    policeNumber: '',
    repairerType: 'Particulier',
    garageName: '',
  });

  useEffect(() => {
    if (isOpen && dossierId && db) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'dossiers', dossierId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            const parseDate = (val: any) => {
              if (!val) return null;
              if (val.toDate) return val.toDate();
              try {
                return new Date(val);
              } catch {
                return null;
              }
            };

            setFormData({
              expertRank: data.expertRank || '1er expert',
              modeDossier: data.modeDossier || 'Procédure normale',
              compagnie: data.compagnie || '',
              typeDossier: data.typeDossier || '',
              nature: data.nature || '',
              assure: {
                nom: typeof data.assure === 'string' ? data.assure : (data.assure?.nom || ''),
                telephone: data.assure?.telephone || '',
                whatsapp: data.assure?.whatsapp || '',
                telephone2: data.assure?.telephone2 || '',
              },
              dateRequete: parseDate(data.dateRequete),
              vehicule: {
                marque: data.vehicule?.marque || '',
                modele: data.vehicule?.modele || '',
                immatriculation: data.vehicule?.immatriculation || '',
                registrationW: data.vehicule?.registrationW || '',
                mec: parseDate(data.vehicule?.mec),
              },
              dateSinistre: parseDate(data.dateSinistre),
              intermediaire: {
                nom: typeof data.intermediaire === 'string' ? data.intermediaire : (data.intermediaire?.nom || ''),
                email: data.intermediaire?.email || '',
              },
              referenceCompagnie: data.referenceCompagnie || '',
              policeNumber: data.policeNumber || '',
              repairerType: data.repairerType || 'Particulier',
              garageName: data.garageName || '',
            });
          }
        } catch (error) {
          console.error("Error fetching dossier:", error);
          toast({ variant: 'destructive', title: "Erreur de chargement" });
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, dossierId, db, toast]);

  const handleUpdate = async () => {
    if (!db || !dossierId) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        dateRequete: formData.dateRequete ? Timestamp.fromDate(formData.dateRequete) : null,
        dateSinistre: formData.dateSinistre ? Timestamp.fromDate(formData.dateSinistre) : null,
        vehicule: {
          ...formData.vehicule,
          mec: formData.vehicule.mec ? Timestamp.fromDate(formData.vehicule.mec) : null,
        },
      };

      await updateDoc(doc(db, 'dossiers', dossierId), payload);
      toast({ title: "Dossier mis à jour" });
      onClose();
    } catch (error) {
      console.error("Error updating dossier:", error);
      toast({ variant: 'destructive', title: "Erreur lors de la mise à jour" });
    } finally {
      setSaving(false);
    }
  };

  const DatePicker = ({ value, onChange, label }: { value: Date | null, onChange: (d: Date | null) => void, label: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground font-semibold">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-10 px-3",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP", { locale: fr }) : <span>Choisir une date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={(d) => onChange(d || null)}
            initialFocus
            locale={fr}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const InputField = ({ label, value, onChange, type = "text", className = "" }: any) => (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs text-muted-foreground font-semibold">{label}</Label>
      <Input 
        type={type}
        className="h-10 focus-visible:ring-primary"
        value={value} 
        onChange={onChange} 
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
        <DialogHeader className="p-6 border-b bg-muted/30">
          <DialogTitle className="text-xl font-bold">Modifier Dossier</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Chargement des données...</p>
          </div>
        ) : (
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expert</Label>
                <RadioGroup 
                  value={formData.expertRank} 
                  onValueChange={(v) => setFormData({...formData, expertRank: v})}
                  className="flex gap-8"
                >
                  {['1er expert', '2eme expert', '3eme expert'].map((rank) => (
                    <div key={rank} className="flex items-center space-x-2">
                      <RadioGroupItem value={rank} id={`modal-${rank}`} />
                      <Label htmlFor={`modal-${rank}`} className="text-sm font-medium cursor-pointer capitalize">{rank}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mode Dossier</Label>
                <div className="flex flex-wrap gap-2">
                  {dossierModes.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFormData({...formData, modeDossier: mode})}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold border transition-all duration-200",
                        formData.modeDossier === mode 
                          ? "bg-primary text-primary-foreground border-primary shadow-md" 
                          : "bg-background text-muted-foreground border-input hover:border-foreground hover:bg-accent"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-semibold">Compagnie</Label>
                  <Select value={formData.compagnie} onValueChange={(v) => setFormData({...formData, compagnie: v})}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {compagnies.map(c => <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-semibold">Type Dossier</Label>
                  <Select value={formData.typeDossier} onValueChange={(v) => setFormData({...formData, typeDossier: v})}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeDossierOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground font-semibold">Nature de Dossier</Label>
                  <Select value={formData.nature} onValueChange={(v) => setFormData({...formData, nature: v})}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {natureDossierOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t">
                <div className="grid grid-cols-2 gap-6">
                  <InputField label="Assuré" value={formData.assure.nom} onChange={(e: any) => setFormData({...formData, assure: {...formData.assure, nom: e.target.value}})} />
                  <InputField label="Tel Assuré" value={formData.assure.telephone} onChange={(e: any) => setFormData({...formData, assure: {...formData.assure, telephone: e.target.value}})} />
                  <InputField label="Tel Whatsapp" value={formData.assure.whatsapp} onChange={(e: any) => setFormData({...formData, assure: {...formData.assure, whatsapp: e.target.value}})} />
                  <InputField label="Autre Tel" value={formData.assure.telephone2} onChange={(e: any) => setFormData({...formData, assure: {...formData.assure, telephone2: e.target.value}})} />
                  <DatePicker 
                    label="Date Requête" 
                    value={formData.dateRequete} 
                    onChange={(d) => setFormData({...formData, dateRequete: d})} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <InputField label="Marque" value={formData.vehicule.marque} onChange={(e: any) => setFormData({...formData, vehicule: {...formData.vehicule, marque: e.target.value}})} />
                <InputField label="Modèle" value={formData.vehicule.modele} onChange={(e: any) => setFormData({...formData, vehicule: {...formData.vehicule, modele: e.target.value}})} />
                <InputField label="Immatriculation" value={formData.vehicule.immatriculation} onChange={(e: any) => setFormData({...formData, vehicule: {...formData.vehicule, immatriculation: e.target.value}})} />
                <InputField label="Immatriculation W" value={formData.vehicule.registrationW} onChange={(e: any) => setFormData({...formData, vehicule: {...formData.vehicule, registrationW: e.target.value}})} />
                <DatePicker 
                  label="Date Sinistre" 
                  value={formData.dateSinistre} 
                  onChange={(d) => setFormData({...formData, dateSinistre: d})} 
                />
                <DatePicker 
                  label="Date de MEC" 
                  value={formData.vehicule.mec} 
                  onChange={(d) => setFormData({...formData, vehicule: {...formData.vehicule, mec: d}})} 
                />
              </div>

              <div className="space-y-4 pt-6 border-t">
                <div className="grid grid-cols-2 gap-6">
                  <InputField label="Intermédiaire" value={formData.intermediaire.nom} onChange={(e: any) => setFormData({...formData, intermediaire: {...formData.intermediaire, nom: e.target.value}})} />
                  <InputField label="E-mail Intermédiaire" type="email" value={formData.intermediaire.email} onChange={(e: any) => setFormData({...formData, intermediaire: {...formData.intermediaire, email: e.target.value}})} />
                  <InputField label="Ref Compagnie" value={formData.referenceCompagnie} onChange={(e: any) => setFormData({...formData, referenceCompagnie: e.target.value})} />
                  <InputField label="N° de Police" value={formData.policeNumber} onChange={(e: any) => setFormData({...formData, policeNumber: e.target.value})} />
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground font-semibold">Réparateur</Label>
                    <Select value={formData.repairerType} onValueChange={(v) => setFormData({...formData, repairerType: v})}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Particulier">Particulier</SelectItem>
                        <SelectItem value="Garage">Garage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <InputField label="Nom Garage" value={formData.garageName} onChange={(e: any) => setFormData({...formData, garageName: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="p-6 border-t bg-muted/30 flex flex-row items-center justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs h-9 text-primary hover:bg-primary/10 font-bold">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Info Adversaire
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-9 text-primary hover:bg-primary/10 font-bold">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Info Expert
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving} className="h-10 px-6 font-bold shadow-sm">
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={saving || loading} className="h-10 px-8 bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Mise à jour...</> : "Mettre à jour"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
