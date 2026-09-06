'use client';

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateDoc, type DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/i18n';
import { INPUT_ADDRESS, INPUT_EMAIL, INPUT_ID, INPUT_NAME, INPUT_TEL } from '@/lib/input-attrs';
import { BRAND } from '@/lib/brand';

export default function AssureTab({ dossier, dossierRef }: { dossier: any; dossierRef: DocumentReference }) {
    const { toast } = useToast();
    const t = useT();
    const [isSaving, setIsSaving] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    
    const [values, setValues] = useState({
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        adresse: '',
        cin: ''
    });

    useEffect(() => {
        const data = dossier?.assure || dossier?.assureDetails;
        if (data && typeof data === 'object' && !initialLoadDone) {
            setValues({
                nom: data.nom || '',
                prenom: data.prenom || '',
                telephone: data.telephone || '',
                email: data.email || '',
                adresse: data.adresse || '',
                cin: data.cin || ''
            });
            setInitialLoadDone(true);
        }
    }, [dossier, initialLoadDone]);

    const handleChange = (field: string, value: string) => {
        setValues(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateDoc(dossierRef, { assure: values });
            toast({ title: t('Assuré mis à jour') });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('Erreur lors de la sauvegarde') });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>{t("Détails de l'Assuré")}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                    <div className="space-y-2"><Label>{t('Nom')}</Label><Input {...INPUT_NAME} value={values.nom} onChange={e => handleChange('nom', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Prénom')}</Label><Input {...INPUT_NAME} value={values.prenom} onChange={e => handleChange('prenom', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Téléphone')}</Label><Input {...INPUT_TEL} placeholder={BRAND.phonePlaceholder} value={values.telephone} onChange={e => handleChange('telephone', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Email')}</Label><Input {...INPUT_EMAIL} value={values.email} onChange={e => handleChange('email', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Adresse')}</Label><Input {...INPUT_ADDRESS} value={values.adresse} onChange={e => handleChange('adresse', e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('CIN')}</Label><Input {...INPUT_ID} value={values.cin} onChange={e => handleChange('cin', e.target.value)} /></div>
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
