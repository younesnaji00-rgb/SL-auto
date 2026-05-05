'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { InlineLoader } from '@/components/ui/inline-loader';
import { cn } from '@/lib/utils';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';

interface DossierEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossierId: string;
}

export default function DossierEditModal({ isOpen, onClose, dossierId }: DossierEditModalProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // DB-driven options — Firestore is the single source of truth.
  const { options: dbCompagnies } = useOptions('compagnies');
  const { options: dbNatures } = useOptions('options_natures');
  const { options: dbDossierTypes } = useOptions('options_types_dossier');

  const compagnies = useMemo(() => dbCompagnies.filter(o => o.active !== false), [dbCompagnies]);
  const natures = useMemo(() => dbNatures.filter(o => o.active !== false), [dbNatures]);
  const dossierTypes = useMemo(() => dbDossierTypes.filter(o => o.active !== false), [dbDossierTypes]);

  const [formData, setFormData] = useState<any>({
    expertRank: '1er expert',
    compagnie: '',
    typeDossier: '',
    nature: '',
    assure: { nom: '', telephone: '', whatsapp: '', telephone2: '' },
    dateRequete: null as Date | null,
    vehicule: { marque: '', modele: '', immatriculation: '', registrationW: '', mec: null as Date | null },
    dateSinistre: null as Date | null,
    // Flat fields matching information-tab
    intermediaireNom: '',
    intermediaireEmail: '',
    referenceCompagnie: '',
    policeNumber: '',
    repairerType: 'Agréé',
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
              try { return new Date(val); } catch { return null; }
            };

            setFormData({
              expertRank: data.expertRank || '1er expert',
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
              // Read flat fields (matching information-tab)
              intermediaireNom: data.intermediaireNom || data.intermediaryName || '',
              intermediaireEmail: data.intermediaireEmail || data.intermediaryEmail || '',
              referenceCompagnie: data.referenceCompagnie || data.companyRef || '',
              policeNumber: data.policeNumber || '',
              repairerType: data.repairerType || 'Agréé',
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
      const payload: Record<string, any> = {
        expertRank: formData.expertRank,
        compagnie: formData.compagnie,
        typeDossier: formData.typeDossier,
        nature: formData.nature,
        assure: formData.assure,
        dateRequete: formData.dateRequete ? Timestamp.fromDate(formData.dateRequete) : null,
        dateSinistre: formData.dateSinistre ? Timestamp.fromDate(formData.dateSinistre) : null,
        vehicule: {
          ...formData.vehicule,
          mec: formData.vehicule.mec ? formData.vehicule.mec.toISOString() : '',
        },
        // Flat fields matching what information-tab reads
        intermediaireNom: formData.intermediaireNom,
        intermediaireEmail: formData.intermediaireEmail,
        referenceCompagnie: formData.referenceCompagnie,
        policeNumber: formData.policeNumber,
        repairerType: formData.repairerType,
        garageName: formData.garageName,
        // Also keep matricule in sync with vehicule.immatriculation
        matricule: formData.vehicule.immatriculation,
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

  const InputField = ({ label, value, onChange, type = "text", className = "" }: any) => (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs text-muted-foreground font-semibold">{label}</Label>
      <Input type={type} className="h-10 focus-visible:ring-primary" value={value} onChange={onChange} />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
        <DialogHeader className="p-6 border-b bg-muted/30">
          <DialogTitle className="text-xl font-bold">Modifier Dossier</DialogTitle>
        </DialogHeader>

        {loading ? (
          <InlineLoader label="Chargement des données…" size="md" className="justify-center py-20" />
        ) : (
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expert</Label>
                <RadioGroup
                  value={formData.expertRank}
                  onValueChange={(v) => setFormData({ ...formData, expertRank: v })}
                  className="flex gap-8"
                >
                  {['1er expert', '2eme expert', 'Arbitre'].map((rank) => (
                    <div key={rank} className="flex items-center space-x-2">
                      <RadioGroupItem value={rank} id={`modal-${rank}`} />
                      <Label htmlFor={`modal-${rank}`} className="text-sm font-medium cursor-pointer capitalize">{rank}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

<div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground font-semibold">Compagnie</Label>
                    <OptionsManagerModal collectionName="compagnies" title="Compagnies" />
                  </div>
                  <Select value={formData.compagnie} onValueChange={(v) => setFormData({ ...formData, compagnie: v })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground font-semibold">Type Dossier</Label>
                    <OptionsManagerModal collectionName="options_types_dossier" title="Types de dossier" />
                  </div>
                  <Select value={formData.typeDossier} onValueChange={(v) => setFormData({ ...formData, typeDossier: v })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{dossierTypes.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground font-semibold">Nature du dossier</Label>
                    <OptionsManagerModal collectionName="options_natures" title="Natures" />
                  </div>
                  <Select value={formData.nature} onValueChange={(v) => setFormData({ ...formData, nature: v })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">{natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t">
                <div className="grid grid-cols-2 gap-6">
                  <InputField label="Assuré" value={formData.assure.nom} onChange={(e: any) => setFormData({ ...formData, assure: { ...formData.assure, nom: e.target.value } })} />
                  <InputField label="Tel Assuré" value={formData.assure.telephone} onChange={(e: any) => setFormData({ ...formData, assure: { ...formData.assure, telephone: e.target.value } })} />
                  <InputField label="Tel Whatsapp" value={formData.assure.whatsapp} onChange={(e: any) => setFormData({ ...formData, assure: { ...formData.assure, whatsapp: e.target.value } })} />
                  <InputField label="Autre Tel" value={formData.assure.telephone2} onChange={(e: any) => setFormData({ ...formData, assure: { ...formData.assure, telephone2: e.target.value } })} />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground font-semibold">Date Requête</Label>
                    <DatePicker value={formData.dateRequete} onChange={(d) => setFormData({ ...formData, dateRequete: d })} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <InputField label="Marque" value={formData.vehicule.marque} onChange={(e: any) => setFormData({ ...formData, vehicule: { ...formData.vehicule, marque: e.target.value } })} />
                <InputField label="Modèle" value={formData.vehicule.modele} onChange={(e: any) => setFormData({ ...formData, vehicule: { ...formData.vehicule, modele: e.target.value } })} />
                <InputField label="Immatriculation" value={formData.vehicule.immatriculation} onChange={(e: any) => setFormData({ ...formData, vehicule: { ...formData.vehicule, immatriculation: e.target.value } })} />
                <InputField label="Immatriculation W" value={formData.vehicule.registrationW} onChange={(e: any) => setFormData({ ...formData, vehicule: { ...formData.vehicule, registrationW: e.target.value } })} />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-semibold">Date Sinistre</Label>
                  <DatePicker value={formData.dateSinistre} onChange={(d) => setFormData({ ...formData, dateSinistre: d })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-semibold">Date de MEC</Label>
                  <DatePicker value={formData.vehicule.mec} onChange={(d) => setFormData({ ...formData, vehicule: { ...formData.vehicule, mec: d } })} />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t">
                <div className="grid grid-cols-2 gap-6">
                  <InputField label="Intermédiaire" value={formData.intermediaireNom} onChange={(e: any) => setFormData({ ...formData, intermediaireNom: e.target.value })} />
                  <InputField label="E-mail Intermédiaire" type="email" value={formData.intermediaireEmail} onChange={(e: any) => setFormData({ ...formData, intermediaireEmail: e.target.value })} />
                  <InputField label="Ref Compagnie" value={formData.referenceCompagnie} onChange={(e: any) => setFormData({ ...formData, referenceCompagnie: e.target.value })} />
                  <InputField label="N° de Police" value={formData.policeNumber} onChange={(e: any) => setFormData({ ...formData, policeNumber: e.target.value })} />

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground font-semibold">Réparateur</Label>
                    <Select value={formData.repairerType} onValueChange={(v) => setFormData({ ...formData, repairerType: v })}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Agréé">Agréé</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <InputField label="Nom Garage" value={formData.garageName} onChange={(e: any) => setFormData({ ...formData, garageName: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="p-6 border-t bg-muted/30 flex flex-row items-center justify-end sm:justify-end">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving} className="h-10 px-6 font-bold shadow-sm">
              Annuler
            </Button>
            <Button onClick={handleUpdate} loading={saving} disabled={loading} className="h-10 px-8 bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-semibold">
              {saving ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
