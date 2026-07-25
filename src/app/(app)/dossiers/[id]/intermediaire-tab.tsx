'use client';

import React, { useState } from 'react';
import { updateDoc, type DocumentReference } from 'firebase/firestore';
import { Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n';

export default function IntermediaireTab({ dossier, dossierRef }: { dossier: any; dossierRef: DocumentReference }) {
    const { toast } = useToast();
    const t = useT();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        intermediaireNom: dossier?.intermediaireNom ?? '',
        intermediairePrenom: dossier?.intermediairePrenom ?? '',
        intermediaireTelephone: dossier?.intermediaireTelephone ?? '',
        intermediaireEmail: dossier?.intermediaireEmail ?? '',
        intermediaireAdresse: dossier?.intermediaireAdresse ?? '',
        intermediaireType: dossier?.intermediaireType ?? '',
        intermediaireCode: dossier?.intermediaireCode ?? '',
        intermediaireCompagnie: dossier?.intermediaireCompagnie ?? '',
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(dossierRef, form);
            toast({ title: t('Intermédiaire mis à jour') });
            setEditing(false);
        } catch (e) {
            toast({ title: t('Erreur'), description: String(e), variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const Field = ({ label, value, field }: { label: string, value: string, field: keyof typeof form }) => (
        <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">{label}</Label>
            {editing ? (
                <Input
                    className="h-9"
                    value={form[field]}
                    onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                />
            ) : (
                <div className="text-sm font-medium border-b border-transparent min-h-[36px] flex items-center">
                    {value || '-'}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">{t('Intermédiaire / Courtier')}</h2>
                <div className="flex justify-end gap-2">
                    {!editing ? (
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full border border-border hover:bg-accent transition-colors font-semibold"
                        >
                            <Pencil className="h-3.5 w-3.5 text-primary" /> {t('Modifier')}
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors font-semibold shadow-sm"
                            >
                                {saving ? <Check className="h-3.5 w-3.5 animate-pulse" /> : <Check className="h-3.5 w-3.5" />} {t('Enregistrer')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full border border-border hover:bg-accent transition-colors font-semibold"
                            >
                                <X className="h-3.5 w-3.5 text-muted-foreground" /> {t('Annuler')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <Card className="border-primary/5 shadow-sm">
                <CardHeader className="bg-heading-bg py-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">
                        {t("Détails de l'intermédiaire")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-6">
                    <Field label={t('Nom / Raison sociale')} value={form.intermediaireNom} field="intermediaireNom" />
                    <Field label={t('Prénom')} value={form.intermediairePrenom} field="intermediairePrenom" />
                    <Field label={t('Type')} value={form.intermediaireType} field="intermediaireType" />
                    <Field label={t('Code Intermédiaire')} value={form.intermediaireCode} field="intermediaireCode" />
                    <Field label={t('Compagnie')} value={form.intermediaireCompagnie} field="intermediaireCompagnie" />
                    <Field label={t('Téléphone')} value={form.intermediaireTelephone} field="intermediaireTelephone" />
                    <Field label={t('Email')} value={form.intermediaireEmail} field="intermediaireEmail" />
                    <Field label={t('Adresse')} value={form.intermediaireAdresse} field="intermediaireAdresse" />
                </CardContent>
            </Card>
        </div>
    );
}
