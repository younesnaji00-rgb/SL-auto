
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Save, User, Car, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useFirestore, useDoc, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { logHistorique } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function DossierTab({ dossierId }: { dossierId: string }) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite } = useCurrentUser();
  const canEdit = canWrite('dossiers');

  // Single source of truth: Firestore. Filter inactive entries client-side.
  const { options: dbCompagnies } = useOptions('compagnies');
  const { options: dbNatures } = useOptions('options_natures');
  const { options: dbTypes } = useOptions('options_types_dossier');
  const { options: dbRepairerTypes } = useOptions('options_reparateur_types');

  const compagnies = useMemo(() => dbCompagnies.filter(o => o.active !== false), [dbCompagnies]);
  const natures = useMemo(() => dbNatures.filter(o => o.active !== false), [dbNatures]);
  const dossierTypes = useMemo(() => dbTypes.filter(o => o.active !== false), [dbTypes]);
  const repairerTypes = useMemo(() => dbRepairerTypes.filter(o => o.active !== false), [dbRepairerTypes]);

  const dossierRef = doc(db, 'dossiers', dossierId);
  const { data: dossier, loading } = useDoc(dossierRef);

  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<any>({
    expertRank: '1er expert',
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
      immatriculationAnterieur: '',
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
    repairerType: 'Agréé',
    garageName: '',
  });

  useEffect(() => {
    if (dossier) {
      const parseDate = (val: any) => {
        if (!val) return null;
        if (val.toDate) return val.toDate();
        try {
          return new Date(val);
        } catch {
          return null;
        }
      };

      setFormValues({
        expertRank: dossier.expertRank || '1er expert',
        compagnie: dossier.compagnie || '',
        typeDossier: dossier.typeDossier || '',
        nature: dossier.nature || '',
        assure: {
          nom: typeof dossier.assure === 'string' ? dossier.assure : (dossier.assure?.nom || ''),
          telephone: dossier.assure?.telephone || '',
          whatsapp: dossier.assure?.whatsapp || '',
          telephone2: dossier.assure?.telephone2 || '',
        },
        dateRequete: parseDate(dossier.dateRequete),
        vehicule: {
          marque: dossier.vehicule?.marque || '',
          modele: dossier.vehicule?.modele || '',
          immatriculation: dossier.vehicule?.immatriculation || '',
          immatriculationAnterieur: dossier.vehicule?.immatriculationAnterieur || '',
          registrationW: dossier.vehicule?.registrationW || '',
          mec: parseDate(dossier.vehicule?.mec),
        },
        dateSinistre: parseDate(dossier.dateSinistre),
        intermediaire: {
          nom: typeof dossier.intermediaire === 'string' ? dossier.intermediaire : (dossier.intermediaire?.nom || ''),
          email: dossier.intermediaire?.email || '',
        },
        referenceCompagnie: dossier.referenceCompagnie || '',
        policeNumber: dossier.policeNumber || '',
        repairerType: dossier.repairerType || 'Agréé',
        garageName: dossier.garageName || '',
      });
    }
  }, [dossier]);

  const handleSave = async () => {
    setIsSaving(true);
    const userEmail = auth?.currentUser?.email || 'Admin';

    try {
      const payload = {
        ...formValues,
        dateRequete: formValues.dateRequete ? Timestamp.fromDate(formValues.dateRequete) : null,
        dateSinistre: formValues.dateSinistre ? Timestamp.fromDate(formValues.dateSinistre) : null,
        vehicule: {
          ...formValues.vehicule,
          mec: formValues.vehicule.mec ? Timestamp.fromDate(formValues.vehicule.mec) : null,
        },
      };

      await updateDoc(dossierRef, payload);
      await logHistorique(db, dossierId, 'Mise à jour dossier', userEmail, 'Informations générales du dossier mises à jour.', 'autre');
      toast({ title: "Dossier mis à jour avec succès" });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur lors de la mise à jour" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement du dossier...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="border-primary/10">
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Expert</Label>
                <RadioGroup 
                  value={formValues.expertRank} 
                  onValueChange={(v) => setFormValues({...formValues, expertRank: v})}
                  className="flex flex-wrap gap-4"
                >
                  {['1er expert', '2eme expert', 'Arbitre'].map((rank) => (
                    <div key={rank} className="flex items-center space-x-2 bg-muted/30 px-3 py-2 rounded-md border border-transparent hover:border-primary/20 transition-colors">
                      <RadioGroupItem value={rank} id={rank} />
                      <Label htmlFor={rank} className="cursor-pointer capitalize">{rank}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Compagnie d'assurance</Label>
                    <OptionsManagerModal collectionName="compagnies" title="Compagnies" />
                  </div>
                  <Select value={formValues.compagnie} onValueChange={(v) => setFormValues({...formValues, compagnie: v})}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Type Dossier</Label>
                    <OptionsManagerModal collectionName="options_types_dossier" title="Types de dossier" />
                  </div>
                  <Select value={formValues.typeDossier} onValueChange={(v) => setFormValues({...formValues, typeDossier: v})}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {dossierTypes.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>Nature du dossier</Label>
                    <OptionsManagerModal collectionName="options_natures" title="Natures" />
                  </div>
                  <Select value={formValues.nature} onValueChange={(v) => setFormValues({...formValues, nature: v})}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-dashed">
                <div className="flex items-center gap-2 text-primary">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold uppercase">Informations Assuré</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assuré</Label>
                    <Input 
                      value={formValues.assure.nom} 
                      onChange={(e) => setFormValues({...formValues, assure: {...formValues.assure, nom: e.target.value}})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tel Assuré</Label>
                    <Input 
                      value={formValues.assure.telephone} 
                      onChange={(e) => setFormValues({...formValues, assure: {...formValues.assure, telephone: e.target.value}})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tel Whatsapp</Label>
                    <Input 
                      value={formValues.assure.whatsapp} 
                      onChange={(e) => setFormValues({...formValues, assure: {...formValues.assure, whatsapp: e.target.value}})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Autre Tel</Label>
                    <Input 
                      value={formValues.assure.telephone2} 
                      onChange={(e) => setFormValues({...formValues, assure: {...formValues.assure, telephone2: e.target.value}})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date Requête</Label>
                    <DatePicker 
                      value={formValues.dateRequete} 
                      onChange={(d) => setFormValues({...formValues, dateRequete: d})} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/10">
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Car className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold uppercase">Véhicule</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marque</Label>
                    <Input 
                      value={formValues.vehicule.marque} 
                      onChange={(e) => setFormValues({...formValues, vehicule: {...formValues.vehicule, marque: e.target.value}})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modèle</Label>
                    <Input 
                      value={formValues.vehicule.modele} 
                      onChange={(e) => setFormValues({...formValues, vehicule: {...formValues.vehicule, modele: e.target.value}})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Immatriculation</Label>
                    <Input
                      value={formValues.vehicule.immatriculation}
                      onChange={(e) => setFormValues({...formValues, vehicule: {...formValues.vehicule, immatriculation: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Immatriculation antérieure</Label>
                    <Input
                      value={formValues.vehicule.immatriculationAnterieur}
                      onChange={(e) => setFormValues({...formValues, vehicule: {...formValues.vehicule, immatriculationAnterieur: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Immatriculation W</Label>
                    <Input 
                      value={formValues.vehicule.registrationW} 
                      onChange={(e) => setFormValues({...formValues, vehicule: {...formValues.vehicule, registrationW: e.target.value}})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date Sinistre</Label>
                    <DatePicker 
                      value={formValues.dateSinistre} 
                      onChange={(d) => setFormValues({...formValues, dateSinistre: d})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de MEC</Label>
                    <DatePicker 
                      value={formValues.vehicule.mec} 
                      onChange={(d) => setFormValues({...formValues, vehicule: {...formValues.vehicule, mec: d}})} 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-dashed">
                <div className="flex items-center gap-2 text-primary">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold uppercase">Administration & Garage</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Intermédiaire</Label>
                    <Input 
                      value={formValues.intermediaire.nom} 
                      onChange={(e) => setFormValues({...formValues, intermediaire: {...formValues.intermediaire, nom: e.target.value}})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail Intermédiaire</Label>
                    <Input 
                      type="email"
                      value={formValues.intermediaire.email} 
                      onChange={(e) => setFormValues({...formValues, intermediaire: {...formValues.intermediaire, email: e.target.value}})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ref Compagnie</Label>
                    <Input 
                      value={formValues.referenceCompagnie} 
                      onChange={(e) => setFormValues({...formValues, referenceCompagnie: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>N° de Police</Label>
                    <Input 
                      value={formValues.policeNumber} 
                      onChange={(e) => setFormValues({...formValues, policeNumber: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Réparateur</Label>
                      <OptionsManagerModal collectionName="options_reparateur_types" title="Types de réparateur" />
                    </div>
                    <Select value={formValues.repairerType} onValueChange={(v) => setFormValues({...formValues, repairerType: v})}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {repairerTypes.map(r => <SelectItem key={r.id} value={r.label}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nom Garage</Label>
                    <Input 
                      value={formValues.garageName} 
                      onChange={(e) => setFormValues({...formValues, garageName: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            + Information Adversaire
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            + Information Expert
          </Button>
        </div>
        {canEdit && (
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={isSaving} className="min-w-[140px] shadow-lg shadow-primary/20">
              {isSaving ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
