'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Check, X, User, Car, Users, PenLine, Calendar as CalendarIcon, MapPin, Info, Plus, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { updateDoc, type DocumentReference, Timestamp, collection, query, orderBy, limit } from 'firebase/firestore';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { statuses as defaultStatuses, natures as defaultNatures, compagnies as defaultCompagnies } from '@/lib/dossiers-data';
import { logHistorique, logWorkflow } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const defaultDossierTypes = ['Automobile', 'Incendie', 'Bris de machine', 'Responsabilité civile', 'Transport', 'Divers'];

interface InformationTabProps {
  dossier: any;
  dossierRef: DocumentReference;
  dossierId: string;
  onOpenHistory: () => void;
  onEditPlanification: (data: any) => void;
  onNewPlanification: () => void;
}

export default function InformationTab({ dossier, dossierRef, dossierId, onOpenHistory, onEditPlanification, onNewPlanification }: InformationTabProps) {
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

  // Planification
  const planQuery = useMemo(() => query(
    collection(db, 'dossiers', dossierId, 'planifications'),
    orderBy('createdAt', 'desc'),
    limit(1)
  ), [db, dossierId]);
  const { data: plans, loading: planLoading } = useCollection<any>(planQuery);
  const plan = plans?.[0];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // ── Unified form state ──
  const [form, setForm] = useState<any>({
    // Dossier
    compagnie: '', modeDossier: '', statut: '', refExpert: '', matricule: '',
    policeNumber: '', dateSinistre: null, dateRequete: null, referenceCompagnie: '',
    typeDossier: '', nature: '',
    // Assuré
    assure: { nom: '', prenom: '', telephone: '', whatsapp: '', telephone2: '', email: '', adresse: '', cin: '' },
    // Véhicule
    vehicule: { marque: '', modele: '', immatriculation: '', serie: '', energie: '', puissance: '', mec: null, km: '' },
    // Partie Adverse
    adverseNom: '', adversePrenom: '', adverseTelephone: '', adverseEmail: '',
    adverseAdresse: '', adverseCompagnie: '', adverseMatricule: '', adversePermis: '',
    // Intermédiaire
    intermediaireNom: '', intermediairePrenom: '', intermediaireTelephone: '', intermediaireEmail: '',
    intermediaireAdresse: '', intermediaireType: '', intermediaireCode: '', intermediaireCompagnie: '',
  });

  const parseDate = (val: any) => {
    if (!val) return null;
    if (val.toDate) return val.toDate();
    try { return new Date(val); } catch { return null; }
  };

  useEffect(() => {
    if (dossier && !initialLoadDone) {
      const dataAssure = typeof dossier.assure === 'object' ? dossier.assure : { nom: dossier.assure || '' };
      const v = dossier.vehicule || {};
      setForm({
        compagnie: dossier.compagnie || '',
        modeDossier: dossier.modeDossier || 'Normal',
        statut: dossier.statut || 'Nouveau',
        refExpert: dossier.refExpert || '',
        matricule: dossier.matricule || '',
        policeNumber: dossier.policeNumber || '',
        dateSinistre: parseDate(dossier.dateSinistre),
        dateRequete: parseDate(dossier.dateRequete),
        referenceCompagnie: dossier.referenceCompagnie || dossier.companyRef || '',
        typeDossier: dossier.typeDossier || '',
        nature: dossier.nature || '',
        assure: {
          nom: dataAssure.nom || '', prenom: dataAssure.prenom || '',
          telephone: dataAssure.telephone || '', whatsapp: dataAssure.whatsapp || '',
          telephone2: dataAssure.telephone2 || '', email: dataAssure.email || '',
          adresse: dataAssure.adresse || '', cin: dataAssure.cin || '',
        },
        vehicule: {
          marque: v.marque || v.brand || '', modele: v.modele || v.model || '',
          immatriculation: v.immatriculation || v.registration || '', serie: v.serie || '',
          energie: v.energie || '', puissance: v.puissance || v.puissanceFiscale || '',
          mec: parseDate(v.mec), km: v.km || v.kilometrage || '',
        },
        adverseNom: dossier.adverseNom ?? dossier.partieAdverse?.assure ?? '',
        adversePrenom: dossier.adversePrenom ?? '',
        adverseTelephone: dossier.adverseTelephone ?? '',
        adverseEmail: dossier.adverseEmail ?? '',
        adverseAdresse: dossier.adverseAdresse ?? '',
        adverseCompagnie: dossier.adverseCompagnie ?? dossier.partieAdverse?.compagnie ?? '',
        adverseMatricule: dossier.adverseMatricule ?? dossier.partieAdverse?.matricule ?? '',
        adversePermis: dossier.adversePermis ?? '',
        intermediaireNom: dossier.intermediaireNom ?? dossier.intermediaryName ?? '',
        intermediairePrenom: dossier.intermediairePrenom ?? '',
        intermediaireTelephone: dossier.intermediaireTelephone ?? '',
        intermediaireEmail: dossier.intermediaireEmail ?? dossier.intermediaryEmail ?? '',
        intermediaireAdresse: dossier.intermediaireAdresse ?? '',
        intermediaireType: dossier.intermediaireType ?? '',
        intermediaireCode: dossier.intermediaireCode ?? '',
        intermediaireCompagnie: dossier.intermediaireCompagnie ?? '',
      });
      setInitialLoadDone(true);
    }
  }, [dossier, initialLoadDone]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleNestedChange = (group: string, field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [group]: { ...prev[group], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    const userEmail = auth?.currentUser?.email || 'Admin';
    const userId = auth?.currentUser?.uid || 'unknown';

    const payload: any = {
      ...form,
      dateSinistre: form.dateSinistre ? Timestamp.fromDate(form.dateSinistre) : null,
      dateRequete: form.dateRequete ? Timestamp.fromDate(form.dateRequete) : null,
      vehicule: {
        ...form.vehicule,
        mec: form.vehicule.mec ? form.vehicule.mec.toISOString() : '',
      },
    };

    try {
      await updateDoc(dossierRef, payload);
      if (form.statut !== dossier.statut) {
        await logHistorique(db, dossierId, form.statut, userEmail, `Statut changé en "${form.statut}".`, 'statut');
        await logWorkflow(db, dossierId, form.statut, userEmail, userId, 'done');
      } else {
        await logHistorique(db, dossierId, 'Mise à jour', userEmail, 'Informations du dossier mises à jour.', 'autre');
      }
      toast({ title: 'Informations mises à jour' });
      setEditing(false);
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Erreur', description: String(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setInitialLoadDone(false); // triggers re-init from dossier
    setEditing(false);
  };

  const formatDateDisplay = (date: any) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    try { return format(d, 'dd/MM/yyyy', { locale: fr }); } catch { return '-'; }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'N/A';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  const Field = ({ label, value, children, managerModal }: { label: string; value: string; children: React.ReactNode; managerModal?: React.ReactNode }) => (
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
      {/* Edit/Save bar */}
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

      {/* ── DOSSIER ── */}
      <Card className="border-primary/5 shadow-sm">
        <CardHeader className="bg-muted/30 py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Informations Dossier</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-6">
          <Field label="Compagnie" value={form.compagnie} managerModal={<OptionsManagerModal collectionName="compagnies" title="Compagnies" />}>
            <Select value={form.compagnie} onValueChange={(v) => handleChange('compagnie', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Type de dossier" value={form.typeDossier} managerModal={<OptionsManagerModal collectionName="options_types_dossier" title="Types de dossier" defaultValues={defaultDossierTypes} />}>
            <Select value={form.typeDossier} onValueChange={(v) => handleChange('typeDossier', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{dossierTypes.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Nature de Dossier" value={form.nature} managerModal={<OptionsManagerModal collectionName="options_natures" title="Natures" defaultValues={defaultNatures} />}>
            <Select value={form.nature} onValueChange={(v) => handleChange('nature', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Statut" value={form.statut} managerModal={<OptionsManagerModal collectionName="options_statuts" title="Statuts" defaultValues={defaultStatuses} />}>
            <Select value={form.statut} onValueChange={(v) => handleChange('statut', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">{statuses.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Réf Expert" value={form.refExpert}>
            <Input className="h-9" value={form.refExpert} onChange={(e) => handleChange('refExpert', e.target.value)} />
          </Field>
          <Field label="Référence compagnie" value={form.referenceCompagnie}>
            <Input className="h-9" value={form.referenceCompagnie} onChange={(e) => handleChange('referenceCompagnie', e.target.value)} />
          </Field>
          <Field label="Matricule" value={form.matricule}>
            <Input className="h-9" value={form.matricule} onChange={(e) => handleChange('matricule', e.target.value)} />
          </Field>
          <Field label="N° de Police" value={form.policeNumber}>
            <Input className="h-9" value={form.policeNumber} onChange={(e) => handleChange('policeNumber', e.target.value)} />
          </Field>
          {editing ? (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Date Sinistre</Label>
              <DatePicker value={form.dateSinistre} onChange={(d) => handleChange('dateSinistre', d)} />
            </div>
          ) : (
            <Field label="Date Sinistre" value={formatDateDisplay(form.dateSinistre)}>{null}</Field>
          )}
          {editing ? (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Date Requête</Label>
              <DatePicker value={form.dateRequete} onChange={(d) => handleChange('dateRequete', d)} />
            </div>
          ) : (
            <Field label="Date Requête" value={formatDateDisplay(form.dateRequete)}>{null}</Field>
          )}
        </CardContent>
      </Card>

      {/* ── ASSURÉ ── */}
      <Card className="border-primary/5 shadow-sm">
        <CardHeader className="bg-muted/30 py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Informations Assuré
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-6">
          <Field label="Nom" value={form.assure.nom}>
            <Input className="h-9" value={form.assure.nom} onChange={(e) => handleNestedChange('assure', 'nom', e.target.value)} />
          </Field>
          <Field label="Prénom" value={form.assure.prenom}>
            <Input className="h-9" value={form.assure.prenom} onChange={(e) => handleNestedChange('assure', 'prenom', e.target.value)} />
          </Field>
          <Field label="Téléphone" value={form.assure.telephone}>
            <Input className="h-9" value={form.assure.telephone} onChange={(e) => handleNestedChange('assure', 'telephone', e.target.value)} />
          </Field>
          <Field label="WhatsApp" value={form.assure.whatsapp}>
            <Input className="h-9" value={form.assure.whatsapp} onChange={(e) => handleNestedChange('assure', 'whatsapp', e.target.value)} />
          </Field>
          <Field label="Téléphone 2" value={form.assure.telephone2}>
            <Input className="h-9" value={form.assure.telephone2} onChange={(e) => handleNestedChange('assure', 'telephone2', e.target.value)} />
          </Field>
          <Field label="Email" value={form.assure.email}>
            <Input type="email" className="h-9" value={form.assure.email} onChange={(e) => handleNestedChange('assure', 'email', e.target.value)} />
          </Field>
          <Field label="Adresse" value={form.assure.adresse}>
            <Input className="h-9" value={form.assure.adresse} onChange={(e) => handleNestedChange('assure', 'adresse', e.target.value)} />
          </Field>
          <Field label="CIN" value={form.assure.cin}>
            <Input className="h-9" value={form.assure.cin} onChange={(e) => handleNestedChange('assure', 'cin', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* ── VÉHICULE ── */}
      <Card className="border-primary/5 shadow-sm">
        <CardHeader className="bg-muted/30 py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-6">
          <Field label="Marque" value={form.vehicule.marque}>
            <Input className="h-9" value={form.vehicule.marque} onChange={(e) => handleNestedChange('vehicule', 'marque', e.target.value)} />
          </Field>
          <Field label="Modèle" value={form.vehicule.modele}>
            <Input className="h-9" value={form.vehicule.modele} onChange={(e) => handleNestedChange('vehicule', 'modele', e.target.value)} />
          </Field>
          <Field label="Immatriculation" value={form.vehicule.immatriculation}>
            <Input className="h-9" value={form.vehicule.immatriculation} onChange={(e) => handleNestedChange('vehicule', 'immatriculation', e.target.value)} />
          </Field>
          <Field label="Numéro de série" value={form.vehicule.serie}>
            <Input className="h-9" value={form.vehicule.serie} onChange={(e) => handleNestedChange('vehicule', 'serie', e.target.value)} />
          </Field>
          <Field label="Énergie" value={form.vehicule.energie}>
            <Input className="h-9" value={form.vehicule.energie} onChange={(e) => handleNestedChange('vehicule', 'energie', e.target.value)} />
          </Field>
          <Field label="Puissance fiscale" value={form.vehicule.puissance}>
            <Input className="h-9" value={form.vehicule.puissance} onChange={(e) => handleNestedChange('vehicule', 'puissance', e.target.value)} />
          </Field>
          {editing ? (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Mise en circ. (Date)</Label>
              <DatePicker value={form.vehicule.mec} onChange={(d) => handleNestedChange('vehicule', 'mec', d)} />
            </div>
          ) : (
            <Field label="Mise en circ. (Date)" value={formatDateDisplay(form.vehicule.mec)}>{null}</Field>
          )}
          <Field label="Kilométrage" value={form.vehicule.km}>
            <Input type="number" className="h-9" value={form.vehicule.km} onChange={(e) => handleNestedChange('vehicule', 'km', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* ── INTERMÉDIAIRE ── */}
      <Card className="border-primary/5 shadow-sm">
        <CardHeader className="bg-muted/30 py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <PenLine className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Intermédiaire
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-6">
          <Field label="Nom / Raison sociale" value={form.intermediaireNom}>
            <Input className="h-9" value={form.intermediaireNom} onChange={(e) => handleChange('intermediaireNom', e.target.value)} />
          </Field>
          <Field label="Prénom" value={form.intermediairePrenom}>
            <Input className="h-9" value={form.intermediairePrenom} onChange={(e) => handleChange('intermediairePrenom', e.target.value)} />
          </Field>
          <Field label="Type" value={form.intermediaireType}>
            <Input className="h-9" value={form.intermediaireType} onChange={(e) => handleChange('intermediaireType', e.target.value)} />
          </Field>
          <Field label="Code Intermédiaire" value={form.intermediaireCode}>
            <Input className="h-9" value={form.intermediaireCode} onChange={(e) => handleChange('intermediaireCode', e.target.value)} />
          </Field>
          <Field label="Compagnie" value={form.intermediaireCompagnie}>
            <Input className="h-9" value={form.intermediaireCompagnie} onChange={(e) => handleChange('intermediaireCompagnie', e.target.value)} />
          </Field>
          <Field label="Téléphone" value={form.intermediaireTelephone}>
            <Input className="h-9" value={form.intermediaireTelephone} onChange={(e) => handleChange('intermediaireTelephone', e.target.value)} />
          </Field>
          <Field label="Email" value={form.intermediaireEmail}>
            <Input className="h-9" value={form.intermediaireEmail} onChange={(e) => handleChange('intermediaireEmail', e.target.value)} />
          </Field>
          <Field label="Adresse" value={form.intermediaireAdresse}>
            <Input className="h-9" value={form.intermediaireAdresse} onChange={(e) => handleChange('intermediaireAdresse', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* ── PARTIE ADVERSE ── */}
      <Card className="border-primary/5 shadow-sm">
        <CardHeader className="bg-muted/30 py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Partie Adverse
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-6">
          <Field label="Nom" value={form.adverseNom}>
            <Input className="h-9" value={form.adverseNom} onChange={(e) => handleChange('adverseNom', e.target.value)} />
          </Field>
          <Field label="Prénom" value={form.adversePrenom}>
            <Input className="h-9" value={form.adversePrenom} onChange={(e) => handleChange('adversePrenom', e.target.value)} />
          </Field>
          <Field label="Téléphone" value={form.adverseTelephone}>
            <Input className="h-9" value={form.adverseTelephone} onChange={(e) => handleChange('adverseTelephone', e.target.value)} />
          </Field>
          <Field label="Email" value={form.adverseEmail}>
            <Input className="h-9" value={form.adverseEmail} onChange={(e) => handleChange('adverseEmail', e.target.value)} />
          </Field>
          <Field label="Adresse" value={form.adverseAdresse}>
            <Input className="h-9" value={form.adverseAdresse} onChange={(e) => handleChange('adverseAdresse', e.target.value)} />
          </Field>
          <Field label="Compagnie" value={form.adverseCompagnie}>
            <Input className="h-9" value={form.adverseCompagnie} onChange={(e) => handleChange('adverseCompagnie', e.target.value)} />
          </Field>
          <Field label="Matricule" value={form.adverseMatricule}>
            <Input className="h-9" value={form.adverseMatricule} onChange={(e) => handleChange('adverseMatricule', e.target.value)} />
          </Field>
          <Field label="N° Permis" value={form.adversePermis}>
            <Input className="h-9" value={form.adversePermis} onChange={(e) => handleChange('adversePermis', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* ── PLANIFICATION ── */}
      <Card className="border-primary/5 shadow-sm">
        <CardHeader className="bg-muted/30 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Planification
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onOpenHistory}>
                <RotateCcw className="mr-1.5 h-3 w-3" /> Historique
              </Button>
              {plan && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEditPlanification(plan)}>
                  <Pencil className="mr-1.5 h-3 w-3" /> Modifier
                </Button>
              )}
              <Button size="sm" className="h-7 text-xs" onClick={onNewPlanification}>
                <Plus className="mr-1.5 h-3 w-3" /> Nouvelle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {planLoading ? (
            <Skeleton className="h-[120px] w-full" />
          ) : !plan ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucune planification programmée</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={onNewPlanification}>Programmer une mission</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date & Heure RDV</p>
                <span className="font-semibold text-lg">{formatTimestamp(plan.dateRDV)}</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Agent de Terrain</p>
                <p className="font-medium flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {plan.agentTerrain || 'Non assigné'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Zone</p>
                <p className="font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {plan.zone || 'N/A'}</p>
              </div>
              <div className="space-y-1 lg:col-span-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Adresse complète</p>
                <p className="font-medium">{plan.adresse || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type mission</p>
                <Badge variant="secondary" className="capitalize">{plan.typeMission || 'N/A'}</Badge>
              </div>
              {plan.observation && (
                <div className="space-y-1 lg:col-span-3 pt-4 border-t border-dashed">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Info className="h-3 w-3" /> Observation</p>
                  <p className="text-sm italic text-muted-foreground leading-relaxed">"{plan.observation}"</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
