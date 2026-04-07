'use client';

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateDoc, type DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AssureTab({ dossier, dossierRef }: { dossier: any; dossierRef: DocumentReference }) {
    const { toast } = useToast();
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
            toast({ title: "Assuré mis à jour" });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Erreur lors de la sauvegarde" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Détails de l'Assuré</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label>Nom</Label><Input value={values.nom} onChange={e => handleChange('nom', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Prénom</Label><Input value={values.prenom} onChange={e => handleChange('prenom', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Téléphone</Label><Input value={values.telephone} onChange={e => handleChange('telephone', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Email</Label><Input type="email" value={values.email} onChange={e => handleChange('email', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Adresse</Label><Input value={values.adresse} onChange={e => handleChange('adresse', e.target.value)} /></div>
                    <div className="space-y-2"><Label>CIN</Label><Input value={values.cin} onChange={e => handleChange('cin', e.target.value)} /></div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
