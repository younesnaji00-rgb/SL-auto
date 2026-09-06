'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { updateDoc, type DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, useAuth } from '@/firebase';
import { logHistorique } from './log-historique';
import { useT } from '@/i18n';
import { INPUT_ADDRESS, INPUT_EMAIL, INPUT_ID, INPUT_NAME, INPUT_PLATE, INPUT_TEL, INPUT_TEXT } from '@/lib/input-attrs';
import { BRAND } from '@/lib/brand';

export default function PartieAdverseTab({ dossier, dossierRef }: { dossier: any; dossierRef: DocumentReference }) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const [form, setForm] = useState({
    adverseNom: dossier?.adverseNom ?? '',
    adversePrenom: dossier?.adversePrenom ?? '',
    adverseTelephone: dossier?.adverseTelephone ?? '',
    adverseEmail: dossier?.adverseEmail ?? '',
    adverseAdresse: dossier?.adverseAdresse ?? '',
    adverseCompagnie: dossier?.adverseCompagnie ?? '',
    adverseMatricule: dossier?.adverseMatricule ?? '',
    adversePermis: dossier?.adversePermis ?? '',
  });

  useEffect(() => {
    if (dossier && !initialLoadDone) {
      setForm({
        adverseNom: dossier.adverseNom ?? '',
        adversePrenom: dossier.adversePrenom ?? '',
        adverseTelephone: dossier.adverseTelephone ?? '',
        adverseEmail: dossier.adverseEmail ?? '',
        adverseAdresse: dossier.adverseAdresse ?? '',
        adverseCompagnie: dossier.adverseCompagnie ?? '',
        adverseMatricule: dossier.adverseMatricule ?? '',
        adversePermis: dossier.adversePermis ?? '',
      });
      setInitialLoadDone(true);
    }
  }, [dossier, initialLoadDone]);

  const handleSave = async () => {
    const userEmail = auth?.currentUser?.email || 'Admin';
    const dossierId = dossierRef.id;
    setSaving(true);
    try {
      await updateDoc(dossierRef, form);
      await logHistorique(db, dossierId, 'Mise à jour', userEmail, 'Informations de la partie adverse mises à jour.', 'autre', auth?.currentUser?.displayName ?? undefined);
      toast({ title: t('Partie adverse mise à jour') });
      setEditing(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('Erreur'), description: String(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      adverseNom: dossier?.adverseNom ?? '',
      adversePrenom: dossier?.adversePrenom ?? '',
      adverseTelephone: dossier?.adverseTelephone ?? '',
      adverseEmail: dossier?.adverseEmail ?? '',
      adverseAdresse: dossier?.adverseAdresse ?? '',
      adverseCompagnie: dossier?.adverseCompagnie ?? '',
      adverseMatricule: dossier?.adverseMatricule ?? '',
      adversePermis: dossier?.adversePermis ?? '',
    });
    setEditing(false);
  };

  // Labels are sentence case (element-specs §9 — uppercase is for TABLE heads
  // only, addendum 2026-09-04); 48 px controls on a phone; the keyboard preset
  // comes from `@/lib/input-attrs` (§2.7).
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
        <div className="flex min-h-[32px] items-center break-words text-[15px] font-semibold text-ink max-md:min-h-[24px]">
          {value || <span className="text-ink-4">—</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">{t('Partie Adverse')}</h2>
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
                onClick={handleCancel}
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
            {t('Détails de la partie adverse')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 pt-6 md:grid-cols-2 md:gap-y-6 lg:grid-cols-4">
          <Field label={t('Nom')} value={form.adverseNom} field="adverseNom" attrs={INPUT_NAME} />
          <Field label={t('Prénom')} value={form.adversePrenom} field="adversePrenom" attrs={INPUT_NAME} />
          <Field label={t('Téléphone')} value={form.adverseTelephone} field="adverseTelephone" attrs={{ ...INPUT_TEL, placeholder: BRAND.phonePlaceholder }} />
          <Field label={t('Email')} value={form.adverseEmail} field="adverseEmail" attrs={INPUT_EMAIL} />
          <Field label={t('Adresse')} value={form.adverseAdresse} field="adverseAdresse" attrs={INPUT_ADDRESS} />
          <Field label={t('Compagnie')} value={form.adverseCompagnie} field="adverseCompagnie" attrs={INPUT_NAME} />
          <Field label={t('Matricule')} value={form.adverseMatricule} field="adverseMatricule" attrs={INPUT_PLATE} />
          <Field label={t('N° Permis')} value={form.adversePermis} field="adversePermis" attrs={INPUT_ID} />
        </CardContent>
      </Card>
    </div>
  );
}
