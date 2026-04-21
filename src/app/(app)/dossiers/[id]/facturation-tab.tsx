'use client';

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateDoc, type DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function FacturationTab({ dossier, dossierRef }: { dossier: any; dossierRef: DocumentReference }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [values, setValues] = useState({
        montantHT: 0,
        tva: 20,
        montantTTC: 0,
        statutPaiement: 'Non payé'
    });

    useEffect(() => {
        if (dossier?.facturation) {
            setValues({ ...values, ...dossier.facturation });
        }
    }, [dossier]);

    const handleUpdate = (field: string, value: string) => {
        const newValues = { ...values, [field]: field === 'statutPaiement' ? value : parseFloat(value) || 0 };
        if (field === 'montantHT' || field === 'tva') {
            newValues.montantTTC = newValues.montantHT * (1 + newValues.tva / 100);
        }
        setValues(newValues);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateDoc(dossierRef, { facturation: values });
            toast({ title: "Facturation enregistrée" });
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Informations de Facturation</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2"><Label>Montant HT (MAD)</Label><Input type="number" value={values.montantHT} onChange={e => handleUpdate('montantHT', e.target.value)} /></div>
                    <div className="space-y-2"><Label>TVA (%)</Label><Input type="number" value={values.tva} onChange={e => handleUpdate('tva', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Montant TTC (MAD)</Label><Input type="number" value={values.montantTTC.toFixed(2)} readOnly className="bg-muted" /></div>
                    <div className="space-y-2">
                        <Label>Statut Paiement</Label>
                        <Select value={values.statutPaiement} onValueChange={v => handleUpdate('statutPaiement', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Non payé">Non payé</SelectItem>
                                <SelectItem value="Payé partiellement">Payé partiellement</SelectItem>
                                <SelectItem value="Payé">Payé</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} loading={isSaving}>
                        {!isSaving && <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
