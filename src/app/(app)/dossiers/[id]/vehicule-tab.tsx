
'use client';

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateDoc, type DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';

export default function VehiculeTab({ dossier, dossierRef }: { dossier: any; dossierRef: DocumentReference }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    
    const [values, setValues] = useState<any>({
        marque: '',
        modele: '',
        immatriculation: '',
        serie: '',
        energie: '',
        puissance: '',
        mec: null,
        km: ''
    });

    useEffect(() => {
        if (dossier?.vehicule && !initialLoadDone) {
            const v = dossier.vehicule;
            const parseDate = (val: any) => {
                if (!val) return null;
                if (val.toDate) return val.toDate();
                try { return new Date(val); } catch { return null; }
            };

            setValues({
                marque: v.marque || v.brand || '',
                modele: v.modele || v.model || '',
                immatriculation: v.immatriculation || v.registration || '',
                serie: v.serie || '',
                energie: v.energie || '',
                puissance: v.puissance || v.puissanceFiscale || '',
                mec: parseDate(v.mec),
                km: v.km || v.kilometrage || ''
            });
            setInitialLoadDone(true);
        }
    }, [dossier, initialLoadDone]);

    const handleChange = (field: string, value: any) => {
        setValues((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateDoc(dossierRef, { vehicule: values });
            toast({ title: "Véhicule mis à jour" });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Erreur lors de la sauvegarde" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Détails du Véhicule</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2"><Label>Marque</Label><Input value={values.marque} onChange={e => handleChange('marque', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Modèle</Label><Input value={values.modele} onChange={e => handleChange('modele', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Immatriculation</Label><Input value={values.immatriculation} onChange={e => handleChange('immatriculation', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Numéro de série</Label><Input value={values.serie} onChange={e => handleChange('serie', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Énergie</Label><Input value={values.energie} onChange={e => handleChange('energie', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Puissance fiscale</Label><Input value={values.puissance} onChange={e => handleChange('puissance', e.target.value)} /></div>
                    <div className="space-y-2">
                        <Label>Mise en circ. (Date)</Label>
                        <DatePicker 
                            value={values.mec} 
                            onChange={(d) => handleChange('mec', d)} 
                        />
                    </div>
                    <div className="space-y-2"><Label>Kilométrage</Label><Input type="number" value={values.km} onChange={e => handleChange('km', e.target.value)} /></div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave} loading={isSaving}>
                        {!isSaving && <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
