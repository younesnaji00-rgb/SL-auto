'use client';

import React, { useState } from 'react';
import { updateDoc, type DocumentReference } from 'firebase/firestore';
import { Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n';
import { INPUT_ADDRESS, INPUT_EMAIL, INPUT_ID, INPUT_NAME, INPUT_TEL, INPUT_TEXT } from '@/lib/input-attrs';
import { BRAND } from '@/lib/brand';

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

    // Labels are sentence case (element-specs §9 — uppercase is for TABLE
    // heads only, addendum 2026-09-04); controls are 48 px on a phone and the
    // keyboard preset comes from `@/lib/input-attrs` (§2.7).
    const Field = ({ label, value, field, attrs = INPUT_TEXT }: { label: string, value: string, field: keyof typeof form, attrs?: React.InputHTMLAttributes<HTMLInputElement> }) => (
        <div className="space-y-1">
            <Label className="t-label">{label}</Label>
            {editing ? (
                <Input
                    {...attrs}
                    aria-label={label}
                    className="h-9 max-md:h-12"
                    value={form[field]}
                    onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                />
            ) : (
                <div className="flex min-h-[36px] items-center break-words text-[15px] font-semibold text-ink max-md:min-h-[24px]">
                    {value || <span className="text-ink-4">—</span>}
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
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold transition-colors hover:bg-accent max-md:text-[14px]"
                        >
                            <Pencil className="h-3.5 w-3.5 text-primary" /> {t('Modifier')}
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90 disabled:opacity-50 max-md:text-[14px]"
                            >
                                {saving ? <Check className="h-3.5 w-3.5 animate-pulse" /> : <Check className="h-3.5 w-3.5" />} {t('Enregistrer')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold transition-colors hover:bg-accent max-md:text-[14px]"
                            >
                                <X className="h-3.5 w-3.5 text-muted-foreground" /> {t('Annuler')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <Card className="border-primary/5 shadow-sm">
                <CardHeader className="bg-heading-bg py-3">
                    <CardTitle className="t-heading">
                        {t("Détails de l'intermédiaire")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 pt-6 md:grid-cols-2 md:gap-y-6 lg:grid-cols-4">
                    <Field label={t('Nom / Raison sociale')} value={form.intermediaireNom} field="intermediaireNom" attrs={INPUT_NAME} />
                    <Field label={t('Prénom')} value={form.intermediairePrenom} field="intermediairePrenom" attrs={INPUT_NAME} />
                    <Field label={t('Type')} value={form.intermediaireType} field="intermediaireType" />
                    <Field label={t('Code Intermédiaire')} value={form.intermediaireCode} field="intermediaireCode" attrs={INPUT_ID} />
                    <Field label={t('Compagnie')} value={form.intermediaireCompagnie} field="intermediaireCompagnie" attrs={INPUT_NAME} />
                    <Field label={t('Téléphone')} value={form.intermediaireTelephone} field="intermediaireTelephone" attrs={{ ...INPUT_TEL, placeholder: BRAND.phonePlaceholder }} />
                    <Field label={t('Email')} value={form.intermediaireEmail} field="intermediaireEmail" attrs={INPUT_EMAIL} />
                    <Field label={t('Adresse')} value={form.intermediaireAdresse} field="intermediaireAdresse" attrs={INPUT_ADDRESS} />
                </CardContent>
            </Card>
        </div>
    );
}
