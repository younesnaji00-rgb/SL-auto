
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
import { useT } from '@/i18n';
import { INPUT_ID, INPUT_NUMERIC, INPUT_PLATE, INPUT_TEXT } from '@/lib/input-attrs';

export default function VehiculeTab({ dossier, dossierRef }: { dossier: any; dossierRef: DocumentReference }) {
    const { toast } = useToast();
    const t = useT();
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
            toast({ title: t('Véhicule mis à jour') });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('Erreur lors de la sauvegarde') });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>{t('Détails du Véhicule')}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
                    <div className="space-y-2"><Label>{t('Marque')}</Label><Input {...INPUT_TEXT} autoCapitalize="words" value={values.marque} onChange={e => handleChange('marque', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Modèle')}</Label><Input {...INPUT_TEXT} autoCapitalize="words" value={values.modele} onChange={e => handleChange('modele', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Immatriculation')}</Label><Input {...INPUT_PLATE} className="t-mono" value={values.immatriculation} onChange={e => handleChange('immatriculation', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Numéro de série')}</Label><Input {...INPUT_ID} value={values.serie} onChange={e => handleChange('serie', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Énergie')}</Label><Input {...INPUT_TEXT} value={values.energie} onChange={e => handleChange('energie', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Puissance fiscale')}</Label><Input {...INPUT_NUMERIC} value={values.puissance} onChange={e => handleChange('puissance', e.target.value)} /></div>
                    <div className="space-y-2">
                        <Label>{t('Mise en circ. (Date)')}</Label>
                        <DatePicker 
                            value={values.mec} 
                            onChange={(d) => handleChange('mec', d)} 
                        />
                    </div>
                    <div className="space-y-2"><Label>{t('Kilométrage')}</Label><Input {...INPUT_NUMERIC} value={values.km} onChange={e => handleChange('km', e.target.value)} /></div>
                </div>
                <div className="flex justify-end max-md:block">
                    <Button onClick={handleSave} loading={isSaving} className="max-md:h-12 max-md:w-full max-md:text-[15px] max-md:font-semibold">
                        {!isSaving && <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? t('Enregistrement...') : t('Sauvegarder')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
