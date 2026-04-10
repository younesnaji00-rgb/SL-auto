'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Check, X, User, Car, Users, PenLine, Calendar as CalendarIcon, MapPin, Info, Plus, Download, Clock, Trash2, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { updateDoc, deleteDoc, doc, type DocumentReference, Timestamp, collection, query, orderBy } from 'firebase/firestore';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { statuses as defaultStatuses, natures as defaultNatures, compagnies as defaultCompagnies } from '@/lib/dossiers-data';
import { logHistorique, logWorkflow } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { generateRapportPDF } from '@/lib/generate-rapport-pdf';
import { useCurrentUser } from '@/hooks/use-current-user';

const defaultDossierTypes = ['Automobile', 'Incendie', 'Bris de machine', 'Responsabilité civile', 'Transport', 'Divers'];

interface InformationTabProps {
  dossier: any;
  dossierRef: DocumentReference;
  dossierId: string;
  onOpenHistory?: () => void;
  onEditPlanification: (data: any) => void;
  onNewPlanification: () => void;
}

export default function InformationTab({ dossier, dossierRef, dossierId, onEditPlanification, onNewPlanification }: InformationTabProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite } = useCurrentUser();
  const canEdit = canWrite('dossiers');

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
    orderBy('createdAt', 'desc')
  ), [db, dossierId]);
  const { data: plans, loading: planLoading } = useCollection<any>(planQuery);
  const [expandedPlan, setExpandedPlan] = useState<any>(null);
  const [previewPreuvePhotos, setPreviewPreuvePhotos] = useState<{ urls: string[]; index: number } | null>(null);

  const handleDeletePlanification = async (planId: string) => {
    if (!db || !confirm('Supprimer cette planification ?')) return;
    try {
      await deleteDoc(doc(db, 'dossiers', dossierId, 'planifications', planId));
      setExpandedPlan(null);
      toast({ title: 'Planification supprimée' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: e.message });
    }
  };

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // ── Unified form state ──
  const [form, setForm] = useState<any>({
    compagnie: '', modeDossier: '', statut: '', refExpert: '', matricule: '',
    policeNumber: '', dateSinistre: null, dateRequete: null, referenceCompagnie: '',
    typeDossier: '', nature: '',
    assure: { nom: '', prenom: '', telephone: '', whatsapp: '', telephone2: '', email: '', adresse: '', cin: '' },
    vehicule: { marque: '', modele: '', immatriculation: '', serie: '', energie: '', puissance: '', mec: null, km: '' },
    adverseNom: '', adversePrenom: '', adverseTelephone: '', adverseEmail: '',
    adverseAdresse: '', adverseCompagnie: '', adverseMatricule: '', adversePermis: '',
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
      const ref = dossier.refExpert || dossierId;
      if (form.statut !== dossier.statut) {
        await logHistorique(db, dossierId, form.statut, userEmail, `Statut changé en "${form.statut}".`, 'statut');
        await logWorkflow(db, dossierId, `Changement de statut : ${form.statut}`, userEmail, userId, 'done', { dossierRef: ref, details: `Statut changé en "${form.statut}"` });
      } else {
        await logHistorique(db, dossierId, 'Mise à jour', userEmail, 'Informations du dossier mises à jour.', 'autre');
        await logWorkflow(db, dossierId, 'Modification de dossier', userEmail, userId, 'done', { dossierRef: ref, details: 'Informations du dossier mises à jour' });
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
    setInitialLoadDone(false);
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

  // ── Table-like row layout helpers ──
  type FieldDef = {
    label: string;
    value: string;
    edit?: React.ReactNode;
    modal?: React.ReactNode;
  };

  const FieldRow = ({ fields }: { fields: FieldDef[] }) => {
    const colClass = fields.length <= 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    return (
      <>
        <div className={cn('grid bg-muted/70', colClass)}>
          {fields.map((f, i) => (
            <div key={i} className={cn("px-6 py-2 flex items-center justify-between border-b border-border/60", i < fields.length - 1 && "border-r border-border/60")}>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{f.label}</span>
              {editing && f.modal}
            </div>
          ))}
        </div>
        <div className={cn('grid border-b border-border/60', colClass)}>
          {fields.map((f, i) => (
            <div key={i} className={cn("px-6 py-3 min-h-[44px] flex items-center", i < fields.length - 1 && "border-r border-border/60")}>
              {editing && f.edit ? <div className="w-full">{f.edit}</div> : <span className="text-sm font-medium">{f.value || '-'}</span>}
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Edit/Save bar */}
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

      {/* ── DOSSIER ── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted py-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Informations Dossier</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            {
              label: 'Compagnie', value: form.compagnie,
              modal: <OptionsManagerModal collectionName="compagnies" title="Compagnies" />,
              edit: (
                <Select value={form.compagnie} onValueChange={(v) => handleChange('compagnie', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              ),
            },
            {
              label: 'Type de dossier', value: form.typeDossier,
              modal: <OptionsManagerModal collectionName="options_types_dossier" title="Types de dossier" defaultValues={defaultDossierTypes} />,
              edit: (
                <Select value={form.typeDossier} onValueChange={(v) => handleChange('typeDossier', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{dossierTypes.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              ),
            },
            {
              label: 'Nature de Dossier', value: form.nature,
              modal: <OptionsManagerModal collectionName="options_natures" title="Natures" defaultValues={defaultNatures} />,
              edit: (
                <Select value={form.nature} onValueChange={(v) => handleChange('nature', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}</SelectContent>
                </Select>
              ),
            },
            {
              label: 'Statut', value: form.statut,
              modal: <OptionsManagerModal collectionName="options_statuts" title="Statuts" defaultValues={defaultStatuses} />,
              edit: (
                <Select value={form.statut} onValueChange={(v) => handleChange('statut', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">{statuses.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              ),
            },
          ]} />
          <FieldRow fields={[
            { label: 'Réf Expert', value: form.refExpert, edit: <Input className="h-9" value={form.refExpert} onChange={(e) => handleChange('refExpert', e.target.value)} /> },
            { label: 'Référence compagnie', value: form.referenceCompagnie, edit: <Input className="h-9" value={form.referenceCompagnie} onChange={(e) => handleChange('referenceCompagnie', e.target.value)} /> },
            { label: 'Matricule', value: form.matricule, edit: <Input className="h-9" value={form.matricule} onChange={(e) => handleChange('matricule', e.target.value)} /> },
            { label: 'N° de Police', value: form.policeNumber, edit: <Input className="h-9" value={form.policeNumber} onChange={(e) => handleChange('policeNumber', e.target.value)} /> },
          ]} />
          <FieldRow fields={[
            { label: 'Date Sinistre', value: formatDateDisplay(form.dateSinistre), edit: <DatePicker value={form.dateSinistre} onChange={(d) => handleChange('dateSinistre', d)} /> },
            { label: 'Date Requête', value: formatDateDisplay(form.dateRequete), edit: <DatePicker value={form.dateRequete} onChange={(d) => handleChange('dateRequete', d)} /> },
          ]} />
        </CardContent>
      </Card>

      {/* ── ASSURÉ ── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted py-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Informations Assuré
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            { label: 'Nom', value: form.assure.nom, edit: <Input className="h-9" value={form.assure.nom} onChange={(e) => handleNestedChange('assure', 'nom', e.target.value)} /> },
            { label: 'Prénom', value: form.assure.prenom, edit: <Input className="h-9" value={form.assure.prenom} onChange={(e) => handleNestedChange('assure', 'prenom', e.target.value)} /> },
            { label: 'Téléphone', value: form.assure.telephone, edit: <Input className="h-9" value={form.assure.telephone} onChange={(e) => handleNestedChange('assure', 'telephone', e.target.value)} /> },
            { label: 'WhatsApp', value: form.assure.whatsapp, edit: <Input className="h-9" value={form.assure.whatsapp} onChange={(e) => handleNestedChange('assure', 'whatsapp', e.target.value)} /> },
          ]} />
          <FieldRow fields={[
            { label: 'Téléphone 2', value: form.assure.telephone2, edit: <Input className="h-9" value={form.assure.telephone2} onChange={(e) => handleNestedChange('assure', 'telephone2', e.target.value)} /> },
            { label: 'Email', value: form.assure.email, edit: <Input type="email" className="h-9" value={form.assure.email} onChange={(e) => handleNestedChange('assure', 'email', e.target.value)} /> },
            { label: 'Adresse', value: form.assure.adresse, edit: <Input className="h-9" value={form.assure.adresse} onChange={(e) => handleNestedChange('assure', 'adresse', e.target.value)} /> },
            { label: 'CIN', value: form.assure.cin, edit: <Input className="h-9" value={form.assure.cin} onChange={(e) => handleNestedChange('assure', 'cin', e.target.value)} /> },
          ]} />
        </CardContent>
      </Card>

      {/* ── VÉHICULE ── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted py-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            { label: 'Marque', value: form.vehicule.marque, edit: <Input className="h-9" value={form.vehicule.marque} onChange={(e) => handleNestedChange('vehicule', 'marque', e.target.value)} /> },
            { label: 'Modèle', value: form.vehicule.modele, edit: <Input className="h-9" value={form.vehicule.modele} onChange={(e) => handleNestedChange('vehicule', 'modele', e.target.value)} /> },
            { label: 'Immatriculation', value: form.vehicule.immatriculation, edit: <Input className="h-9" value={form.vehicule.immatriculation} onChange={(e) => handleNestedChange('vehicule', 'immatriculation', e.target.value)} /> },
            { label: 'Numéro de série', value: form.vehicule.serie, edit: <Input className="h-9" value={form.vehicule.serie} onChange={(e) => handleNestedChange('vehicule', 'serie', e.target.value)} /> },
          ]} />
          <FieldRow fields={[
            { label: 'Énergie', value: form.vehicule.energie, edit: <Input className="h-9" value={form.vehicule.energie} onChange={(e) => handleNestedChange('vehicule', 'energie', e.target.value)} /> },
            { label: 'Puissance fiscale', value: form.vehicule.puissance, edit: <Input className="h-9" value={form.vehicule.puissance} onChange={(e) => handleNestedChange('vehicule', 'puissance', e.target.value)} /> },
            { label: 'Mise en circ. (Date)', value: formatDateDisplay(form.vehicule.mec), edit: <DatePicker value={form.vehicule.mec} onChange={(d) => handleNestedChange('vehicule', 'mec', d)} /> },
            { label: 'Kilométrage', value: form.vehicule.km, edit: <Input type="number" className="h-9" value={form.vehicule.km} onChange={(e) => handleNestedChange('vehicule', 'km', e.target.value)} /> },
          ]} />
        </CardContent>
      </Card>

      {/* ── INTERMÉDIAIRE ── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted py-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <PenLine className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Intermédiaire
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            { label: 'Nom / Raison sociale', value: form.intermediaireNom, edit: <Input className="h-9" value={form.intermediaireNom} onChange={(e) => handleChange('intermediaireNom', e.target.value)} /> },
            { label: 'Prénom', value: form.intermediairePrenom, edit: <Input className="h-9" value={form.intermediairePrenom} onChange={(e) => handleChange('intermediairePrenom', e.target.value)} /> },
            { label: 'Type', value: form.intermediaireType, edit: <Input className="h-9" value={form.intermediaireType} onChange={(e) => handleChange('intermediaireType', e.target.value)} /> },
            { label: 'Code Intermédiaire', value: form.intermediaireCode, edit: <Input className="h-9" value={form.intermediaireCode} onChange={(e) => handleChange('intermediaireCode', e.target.value)} /> },
          ]} />
          <FieldRow fields={[
            { label: 'Compagnie', value: form.intermediaireCompagnie, edit: <Input className="h-9" value={form.intermediaireCompagnie} onChange={(e) => handleChange('intermediaireCompagnie', e.target.value)} /> },
            { label: 'Téléphone', value: form.intermediaireTelephone, edit: <Input className="h-9" value={form.intermediaireTelephone} onChange={(e) => handleChange('intermediaireTelephone', e.target.value)} /> },
            { label: 'Email', value: form.intermediaireEmail, edit: <Input className="h-9" value={form.intermediaireEmail} onChange={(e) => handleChange('intermediaireEmail', e.target.value)} /> },
            { label: 'Adresse', value: form.intermediaireAdresse, edit: <Input className="h-9" value={form.intermediaireAdresse} onChange={(e) => handleChange('intermediaireAdresse', e.target.value)} /> },
          ]} />
        </CardContent>
      </Card>

      {/* ── PARTIE ADVERSE ── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted py-3 border-b border-border">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Partie Adverse
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            { label: 'Nom', value: form.adverseNom, edit: <Input className="h-9" value={form.adverseNom} onChange={(e) => handleChange('adverseNom', e.target.value)} /> },
            { label: 'Prénom', value: form.adversePrenom, edit: <Input className="h-9" value={form.adversePrenom} onChange={(e) => handleChange('adversePrenom', e.target.value)} /> },
            { label: 'Téléphone', value: form.adverseTelephone, edit: <Input className="h-9" value={form.adverseTelephone} onChange={(e) => handleChange('adverseTelephone', e.target.value)} /> },
            { label: 'Email', value: form.adverseEmail, edit: <Input className="h-9" value={form.adverseEmail} onChange={(e) => handleChange('adverseEmail', e.target.value)} /> },
          ]} />
          <FieldRow fields={[
            { label: 'Adresse', value: form.adverseAdresse, edit: <Input className="h-9" value={form.adverseAdresse} onChange={(e) => handleChange('adverseAdresse', e.target.value)} /> },
            { label: 'Compagnie', value: form.adverseCompagnie, edit: <Input className="h-9" value={form.adverseCompagnie} onChange={(e) => handleChange('adverseCompagnie', e.target.value)} /> },
            { label: 'Matricule', value: form.adverseMatricule, edit: <Input className="h-9" value={form.adverseMatricule} onChange={(e) => handleChange('adverseMatricule', e.target.value)} /> },
            { label: 'N° Permis', value: form.adversePermis, edit: <Input className="h-9" value={form.adversePermis} onChange={(e) => handleChange('adversePermis', e.target.value)} /> },
          ]} />
        </CardContent>
      </Card>

      {/* ── PLANIFICATION ── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Planification
            </CardTitle>
            {canEdit && (
              <Button size="sm" className="h-7 text-xs" onClick={onNewPlanification}>
                <Plus className="mr-1.5 h-3 w-3" /> Nouvelle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {planLoading ? (
            <div className="p-6"><Skeleton className="h-[120px] w-full" /></div>
          ) : !plans || plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucune planification programmée</p>
              {canEdit && <Button variant="outline" size="sm" className="mt-4" onClick={onNewPlanification}>Programmer une mission</Button>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-bold">Type</TableHead>
                  <TableHead className="text-xs font-bold">Date & Heure RDV</TableHead>
                  <TableHead className="text-xs font-bold">Agent</TableHead>
                  <TableHead className="text-xs font-bold">Zone</TableHead>
                  <TableHead className="text-xs font-bold">Adresse</TableHead>
                  <TableHead className="text-xs font-bold">Observation</TableHead>
                  <TableHead className="text-xs font-bold w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p: any) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedPlan(p)}
                  >
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs whitespace-nowrap">{p.typeMission || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium whitespace-nowrap">
                      {p.dateRDV ? format((p.dateRDV.toDate ? p.dateRDV.toDate() : new Date(p.dateRDV)), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                    </TableCell>
                    <TableCell className="text-xs">{p.agentTerrain || <span className="text-muted-foreground italic">Non assigné</span>}</TableCell>
                    <TableCell className="text-xs">{p.zone || '-'}</TableCell>
                    <TableCell className="text-xs max-w-[150px]"><span className="truncate block">{p.adresse || '-'}</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                      <span className="truncate block">{p.observation || '-'}</span>
                      {p.observationUpdatedAt && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 mt-0.5 font-medium">
                          <Clock className="h-3 w-3" />
                          MAJ {p.observationSource === 'ATG' ? 'Agent de Terrain' : p.observationSource === 'Gestionnaire' ? 'Gestionnaire' : 'ATG'}{p.observationUpdatedBy ? ` (${p.observationUpdatedBy})` : ''} — {p.observationUpdatedAt.toDate ? format(p.observationUpdatedAt.toDate(), 'dd/MM HH:mm', { locale: fr }) : '-'}
                        </span>
                      )}
                      {p.preuvePhotos && p.preuvePhotos.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-blue-600 mt-0.5 font-medium">
                          <ImageIcon className="h-3 w-3" />
                          {p.preuvePhotos.length} preuve{p.preuvePhotos.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeletePlanification(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Planification lightbox */}
      <Dialog open={!!expandedPlan} onOpenChange={(open) => { if (!open) setExpandedPlan(null); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CalendarIcon className="h-5 w-5" />
              Détails de la Planification
            </DialogTitle>
          </DialogHeader>
          {expandedPlan && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
                  {expandedPlan.typeMission || 'N/A'}
                </Badge>
                {expandedPlan.createdAt && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Créée le {formatTimestamp(expandedPlan.createdAt)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date & Heure RDV</p>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {formatTimestamp(expandedPlan.dateRDV)}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Agent de Terrain</p>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {expandedPlan.agentTerrain || 'Non assigné'}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Zone d'intervention</p>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {expandedPlan.zone || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Modifié par</p>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {expandedPlan.modifiedByName || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Adresse complète</p>
                <p className="font-medium text-sm">{expandedPlan.adresse || 'N/A'}</p>
              </div>

              {expandedPlan.observation && (
                <div className={cn("space-y-1 p-3 rounded-lg border border-dashed", expandedPlan.observationUpdatedAt ? "bg-amber-50/50 border-amber-300 dark:bg-amber-900/10" : "bg-muted/30")}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Info className="h-3 w-3" /> Observation / Notes
                  </p>
                  <p className="text-sm italic text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {expandedPlan.observation}
                  </p>
                  {expandedPlan.observationUpdatedAt && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 mt-1">
                      Mis à jour par {expandedPlan.observationSource === 'ATG' ? 'Agent de Terrain' : expandedPlan.observationSource === 'Gestionnaire' ? 'Gestionnaire' : 'ATG'}{expandedPlan.observationUpdatedBy ? ` (${expandedPlan.observationUpdatedBy})` : ''} le {expandedPlan.observationUpdatedAt.toDate ? format(expandedPlan.observationUpdatedAt.toDate(), "dd/MM/yyyy 'à' HH:mm", { locale: fr }) : '-'}
                    </Badge>
                  )}
                </div>
              )}

              {expandedPlan.preuvePhotos && expandedPlan.preuvePhotos.length > 0 && (
                <div className="space-y-2 p-3 rounded-lg bg-blue-50/50 border border-blue-200 dark:bg-blue-900/10 dark:border-blue-800">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Photos Preuve ATG ({expandedPlan.preuvePhotos.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {expandedPlan.preuvePhotos.map((url: string, idx: number) => (
                      <button
                        key={idx}
                        className="relative h-16 w-16 rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => setPreviewPreuvePhotos({ urls: expandedPlan.preuvePhotos, index: idx })}
                      >
                        <img src={url} alt={`Preuve ${idx + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {canEdit && (
                <div className="flex justify-between pt-2">
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeletePlanification(expandedPlan.id)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Supprimer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setExpandedPlan(null); onEditPlanification(expandedPlan); }}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preuve photo lightbox */}
      <Dialog open={!!previewPreuvePhotos} onOpenChange={(open) => { if (!open) setPreviewPreuvePhotos(null); }}>
        <DialogContent className="sm:max-w-[700px] p-2">
          {previewPreuvePhotos && (
            <div className="relative flex flex-col items-center gap-2">
              <img
                src={previewPreuvePhotos.urls[previewPreuvePhotos.index]}
                alt={`Preuve ${previewPreuvePhotos.index + 1}`}
                className="max-h-[70vh] w-auto rounded-lg object-contain"
              />
              {previewPreuvePhotos.urls.length > 1 && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={previewPreuvePhotos.index === 0}
                    onClick={() => setPreviewPreuvePhotos({ ...previewPreuvePhotos, index: previewPreuvePhotos.index - 1 })}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {previewPreuvePhotos.index + 1} / {previewPreuvePhotos.urls.length}
                  </span>
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={previewPreuvePhotos.index === previewPreuvePhotos.urls.length - 1}
                    onClick={() => setPreviewPreuvePhotos({ ...previewPreuvePhotos, index: previewPreuvePhotos.index + 1 })}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-1.5 flex-wrap justify-center">
                {previewPreuvePhotos.urls.map((url: string, idx: number) => (
                  <button
                    key={idx}
                    className={cn(
                      "h-12 w-12 rounded overflow-hidden border-2 transition-all",
                      idx === previewPreuvePhotos.index ? "border-primary ring-1 ring-primary" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                    onClick={() => setPreviewPreuvePhotos({ ...previewPreuvePhotos, index: idx })}
                  >
                    <img src={url} alt={`Thumb ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export PDF */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            try {
              await generateRapportPDF(db, dossierId);
              toast({ title: 'PDF exporté avec succès' });
            } catch (e: any) {
              toast({ variant: 'destructive', title: "Erreur d'export", description: e.message });
            }
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Exporter PDF
        </Button>
      </div>
    </div>
  );
}
