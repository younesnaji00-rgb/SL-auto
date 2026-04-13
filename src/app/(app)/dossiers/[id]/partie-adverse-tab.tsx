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

export default function PartieAdverseTab({ dossier, dossierRef }: { dossier: any; dossierRef: DocumentReference }) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
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
      await logHistorique(db, dossierId, 'Mise à jour', userEmail, 'Informations de la partie adverse mises à jour.', 'autre');
      toast({ title: 'Partie adverse mise à jour' });
      setEditing(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: String(error) });
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
        <div className="text-sm font-medium border-b border-transparent min-h-[32px] flex items-center">
          {value || '-'}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Partie Adverse</h2>
        <div className="flex justify-end gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full border border-border hover:bg-accent transition-colors font-semibold"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" /> Modifier
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors font-semibold shadow-sm"
              >
                {saving ? <Check className="h-3.5 w-3.5 animate-pulse" /> : <Check className="h-3.5 w-3.5" />} Enregistrer
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full border border-border hover:bg-accent transition-colors font-semibold"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" /> Annuler
              </button>
            </>
          )}
        </div>
      </div>

      <Card className="border-primary/5 shadow-sm">
        <CardHeader className="bg-heading-bg py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">
            Détails de la partie adverse
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-6">
          <Field label="Nom" value={form.adverseNom} field="adverseNom" />
          <Field label="Prénom" value={form.adversePrenom} field="adversePrenom" />
          <Field label="Téléphone" value={form.adverseTelephone} field="adverseTelephone" />
          <Field label="Email" value={form.adverseEmail} field="adverseEmail" />
          <Field label="Adresse" value={form.adverseAdresse} field="adverseAdresse" />
          <Field label="Compagnie" value={form.adverseCompagnie} field="adverseCompagnie" />
          <Field label="Matricule" value={form.adverseMatricule} field="adverseMatricule" />
          <Field label="N° Permis" value={form.adversePermis} field="adversePermis" />
        </CardContent>
      </Card>
    </div>
  );
}
