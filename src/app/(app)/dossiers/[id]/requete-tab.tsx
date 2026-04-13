'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Check, X, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { updateDoc, type DocumentReference, Timestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { statuses as defaultStatuses, natures as defaultNatures, compagnies as defaultCompagnies } from '@/lib/dossiers-data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { logHistorique, logWorkflow } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { useCurrentUser } from '@/hooks/use-current-user';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const defaultDossierTypes = ['Automobile', 'Incendie', 'Bris de machine', 'Responsabilité civile', 'Transport', 'Divers'];

export default function RequeteTab({ dossier, dossierRef }: { dossier: any; dossierRef: DocumentReference }) {
  const { canWrite } = useCurrentUser();
  const canEdit = canWrite('dossiers');
    const db = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    
    const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);
    const { options: dbStatuses } = useOptions('options_statuts', defaultStatuses);
    const { options: dbNatures } = useOptions('options_natures', defaultNatures);
    const { options: dbDossierTypes } = useOptions('options_types_dossier', defaultDossierTypes);

    const compagnies = useMemo(() => dbCompagnies.length > 0 ? dbCompagnies : defaultCompagnies.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbCompagnies]);
    const statuses = useMemo(() => dbStatuses.length > 0 ? dbStatuses : defaultStatuses.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbStatuses]);
    const natures = useMemo(() => dbNatures.length > 0 ? dbNatures : defaultNatures.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbNatures]);
    const dossierTypes = useMemo(() => dbDossierTypes.length > 0 ? dbDossierTypes : defaultDossierTypes.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbDossierTypes]);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    const [formValues, setFormValues] = useState<any>({
        compagnie: '',
        statut: '',
        refExpert: '',
        matricule: '',
        policeNumber: '',
        dateSinistre: null,
        dateRequete: null,
        referenceCompagnie: '',
        typeDossier: '',
        nature: '',
        assure: {
            nom: '',
            prenom: '',
            telephone: '',
            whatsapp: '',
            telephone2: '',
            email: '',
            adresse: '',
            cin: ''
        }
    });

    const initForm = (data: any) => {
        const parseDate = (val: any) => {
            if (!val) return null;
            if (val.toDate) return val.toDate();
            try {
                return new Date(val);
            } catch {
                return null;
            }
        };

        const dataAssure = typeof data.assure === 'object' ? data.assure : { nom: data.assure || '' };

        return {
            compagnie: data.compagnie || '',
            statut: data.statut || 'Nouveau',
            refExpert: data.refExpert || '',
            matricule: data.matricule || '',
            policeNumber: data.policeNumber || '',
            dateSinistre: parseDate(data.dateSinistre),
            dateRequete: parseDate(data.dateRequete),
            referenceCompagnie: data.referenceCompagnie || data.companyRef || '',
            typeDossier: data.typeDossier || '',
            nature: data.nature || '',
            assure: {
                nom: dataAssure.nom || '',
                prenom: dataAssure.prenom || '',
                telephone: dataAssure.telephone || '',
                whatsapp: dataAssure.whatsapp || '',
                telephone2: dataAssure.telephone2 || '',
                email: dataAssure.email || '',
                adresse: dataAssure.adresse || '',
                cin: dataAssure.cin || ''
            }
        };
    };

    useEffect(() => {
        if (dossier && !initialLoadDone) {
            setFormValues(initForm(dossier));
            setInitialLoadDone(true);
        }
    }, [dossier, initialLoadDone]);

    const handleFormChange = (field: string, value: any) => {
        setFormValues((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleAssureChange = (field: string, value: string) => {
        setFormValues((prev: any) => ({
            ...prev,
            assure: {
                ...prev.assure,
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        const dossierId = dossierRef.id;
        const userEmail = auth?.currentUser?.email || 'Admin';
        const userId = auth?.currentUser?.uid || 'unknown';

        const payload = {
            ...formValues,
            dateSinistre: formValues.dateSinistre ? Timestamp.fromDate(formValues.dateSinistre) : null,
            dateRequete: formValues.dateRequete ? Timestamp.fromDate(formValues.dateRequete) : null,
        };

        try {
            await updateDoc(dossierRef, payload);
            
            if (formValues.statut !== dossier.statut) {
                await logHistorique(db, dossierId, formValues.statut, userEmail, `Statut changé en "${formValues.statut}".`, 'statut');
                await logWorkflow(db, dossierId, `Changement de statut : ${formValues.statut}`, userEmail, userId, 'done', { dossierRef: dossier.refExpert || dossierId, details: `Statut changé en "${formValues.statut}"` });
            }
            await logHistorique(db, dossierId, 'Mise à jour requête', userEmail, 'Informations générales du dossier mises à jour.', 'autre');

            toast({ title: "Requête mise à jour" });
            setEditing(false);
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Erreur', description: String(error), variant: 'destructive' });
            const permissionError = new FirestorePermissionError({
                path: dossierRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormValues(initForm(dossier));
        setEditing(false);
    };

    const formatDateDisplay = (date: any) => {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        try {
            return format(d, 'dd/MM/yyyy', { locale: fr });
        } catch {
            return '-';
        }
    };

    const Field = ({ label, value, children, managerModal }: { label: string, value: string, children: React.ReactNode, managerModal?: React.ReactNode }) => (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase text-muted-foreground">{label}</Label>
              {editing && managerModal}
            </div>
            {editing ? children : <div className="text-sm font-medium border-b border-transparent min-h-[32px] flex items-center">{value || '-'}</div>}
        </div>
    );

    return (
        <div className="space-y-6">
            {canEdit && (
              <div className="flex justify-end gap-2">
                {!editing ? (
                    <button type="button" onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full border border-border hover:bg-accent transition-colors font-semibold">
                        <Pencil className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Modifier
                    </button>
                ) : (
                    <>
                        <button type="button" onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors font-semibold shadow-sm">
                            {saving ? <Check className="h-3.5 w-3.5 animate-pulse" /> : <Check className="h-3.5 w-3.5" />} Enregistrer
                        </button>
                        <button type="button" onClick={handleCancel}
                            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full border border-border hover:bg-accent transition-colors font-semibold">
                            <X className="h-3.5 w-3.5 text-muted-foreground" /> Annuler
                        </button>
                    </>
                )}
              </div>
            )}

            <Card className="border-primary/5 shadow-sm">
                <CardHeader className="bg-muted/30 py-3"><CardTitle className="text-sm font-bold uppercase tracking-wider">Informations Dossier</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-6">
                    <Field 
                      label="Compagnie" 
                      value={formValues.compagnie}
                      managerModal={<OptionsManagerModal collectionName="compagnies" title="Compagnies" />}
                    >
                        <Select value={formValues.compagnie} onValueChange={(v) => handleFormChange('compagnie', v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                            <SelectContent>
                              {compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field 
                      label="Type de dossier" 
                      value={formValues.typeDossier}
                      managerModal={<OptionsManagerModal collectionName="options_types_dossier" title="Types de dossier" defaultValues={defaultDossierTypes} />}
                    >
                        <Select value={formValues.typeDossier} onValueChange={(v) => handleFormChange('typeDossier', v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                            <SelectContent>
                                {dossierTypes.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field 
                      label="Nature de Dossier" 
                      value={formValues.nature}
                      managerModal={<OptionsManagerModal collectionName="options_natures" title="Natures" defaultValues={defaultNatures} />}
                    >
                        <Select value={formValues.nature} onValueChange={(v) => handleFormChange('nature', v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                            <SelectContent>
                                {natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field 
                      label="Statut" 
                      value={formValues.statut}
                      managerModal={<OptionsManagerModal collectionName="options_statuts" title="Statuts" defaultValues={defaultStatuses} />}
                    >
                        <Select value={formValues.statut} onValueChange={(v) => handleFormChange('statut', v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Choisir un statut" /></SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {statuses.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Réf Expert" value={formValues.refExpert}>
                        <Input className="h-9" value={formValues.refExpert} onChange={(e) => handleFormChange('refExpert', e.target.value)} />
                    </Field>
                    <Field label="Référence compagnie" value={formValues.referenceCompagnie}>
                        <Input className="h-9" value={formValues.referenceCompagnie} onChange={(e) => handleFormChange('referenceCompagnie', e.target.value)} />
                    </Field>
                    <Field label="Matricule" value={formValues.matricule}>
                        <Input className="h-9" value={formValues.matricule} onChange={(e) => handleFormChange('matricule', e.target.value)} />
                    </Field>
                    <Field label="N° de Police" value={formValues.policeNumber}>
                        <Input className="h-9" value={formValues.policeNumber} onChange={(e) => handleFormChange('policeNumber', e.target.value)} />
                    </Field>
                    {editing ? (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Date Sinistre</Label>
                            <DatePicker 
                                value={formValues.dateSinistre} 
                                onChange={(d) => handleFormChange('dateSinistre', d)} 
                            />
                        </div>
                    ) : (
                        <Field label="Date Sinistre" value={formatDateDisplay(formValues.dateSinistre)}>{null}</Field>
                    )}
                    {editing ? (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Date Requête</Label>
                            <DatePicker 
                                value={formValues.dateRequete} 
                                onChange={(d) => handleFormChange('dateRequete', d)} 
                            />
                        </div>
                    ) : (
                        <Field label="Date Requête" value={formatDateDisplay(formValues.dateRequete)}>{null}</Field>
                    )}
                </CardContent>
            </Card>

            <Card className="border-primary/5 shadow-sm">
                <CardHeader className="bg-muted/30 py-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Informations Assuré
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-6">
                    <Field label="Nom" value={formValues.assure.nom}>
                        <Input className="h-9" value={formValues.assure.nom} onChange={(e) => handleAssureChange('nom', e.target.value)} />
                    </Field>
                    <Field label="Prénom" value={formValues.assure.prenom}>
                        <Input className="h-9" value={formValues.assure.prenom} onChange={(e) => handleAssureChange('prenom', e.target.value)} />
                    </Field>
                    <Field label="Téléphone" value={formValues.assure.telephone}>
                        <Input className="h-9" value={formValues.assure.telephone} onChange={(e) => handleAssureChange('telephone', e.target.value)} />
                    </Field>
                    <Field label="WhatsApp" value={formValues.assure.whatsapp}>
                        <Input className="h-9" value={formValues.assure.whatsapp} onChange={(e) => handleAssureChange('whatsapp', e.target.value)} />
                    </Field>
                    <Field label="Téléphone 2" value={formValues.assure.telephone2}>
                        <Input className="h-9" value={formValues.assure.telephone2} onChange={(e) => handleAssureChange('telephone2', e.target.value)} />
                    </Field>
                    <Field label="Email" value={formValues.assure.email}>
                        <Input type="email" className="h-9" value={formValues.assure.email} onChange={(e) => handleAssureChange('email', e.target.value)} />
                    </Field>
                    <Field label="Adresse" value={formValues.assure.adresse}>
                        <Input className="h-9" value={formValues.assure.adresse} onChange={(e) => handleAssureChange('adresse', e.target.value)} />
                    </Field>
                    <Field label="CIN" value={formValues.assure.cin}>
                        <Input className="h-9" value={formValues.assure.cin} onChange={(e) => handleAssureChange('cin', e.target.value)} />
                    </Field>
                </CardContent>
            </Card>
        </div>
    );
}
