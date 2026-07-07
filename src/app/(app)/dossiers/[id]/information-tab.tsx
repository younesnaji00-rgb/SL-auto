'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Check, X, User, Car, Users, PenLine, Info, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type DocumentReference, Timestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/use-form-draft';
import { logHistorique, logWorkflow } from './log-historique';
import { useDossierDocWrite } from './rappel-draft';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getStatusDotColor } from '@/lib/status-colors';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useReplayHighlight, highlightClass, ChangeBadge } from '@/components/dossier-timeline/replay-highlight';
import {
  emptyExpertInfo,
  visibleExpertRoles,
  EXPERT_ROLE_LABELS,
  type ExpertRole,
  type ExpertInfo,
} from '@/lib/create-empty-dossier';

interface InformationTabProps {
  dossier: any;
  dossierRef: DocumentReference;
  dossierId: string;
  onOpenHistory?: () => void;
  onEditPlanification: (data: any) => void;
  onNewPlanification: () => void;
}

// ── Table-like row layout helpers ──
// Hoisted to module scope so they retain a stable component identity across
// parent re-renders. Previously `FieldRow` was declared inside the component
// body, which meant each keystroke produced a new component → React unmounted
// the focused `<Input>` and remounted a fresh one, losing focus after a
// single letter.
type FieldDef = {
  label: string;
  value: string;
  edit?: React.ReactNode;
  modal?: React.ReactNode;
  /** Dossier dot-path — drives change highlighting in the read-only replay. */
  path?: string;
};

const FieldRow = ({ fields, editing }: { fields: FieldDef[]; editing: boolean }) => {
  const hl = useReplayHighlight();
  const colClass = fields.length <= 2
    ? 'grid-cols-1 md:grid-cols-2'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  return (
    <>
      <div className={cn('grid', colClass)}>
        {fields.map((f, i) => (
          <div key={i} className={cn("px-6 py-2 flex items-center justify-between bg-card", i < fields.length - 1 && "border-r border-border/10")}>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{f.label}</span>
            {editing && f.modal}
          </div>
        ))}
      </div>
      <div className={cn('grid border-b border-border/10', colClass)}>
        {fields.map((f, i) => {
          const status = !editing && f.path ? hl.statusForPath(f.path) : null;
          return (
            <div key={i} className={cn("px-6 py-3 min-h-[44px] flex items-center justify-between gap-2 bg-card", i < fields.length - 1 && "border-r border-border/10", highlightClass(status))}>
              {editing && f.edit ? <div className="w-full">{f.edit}</div> : <span className="text-sm font-medium">{f.value || '-'}</span>}
              {status && <ChangeBadge status={status} />}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default function InformationTab({ dossier, dossierRef, dossierId }: InformationTabProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite, profile } = useCurrentUser();
  const canEdit = canWrite('dossiers');

  // Single source of truth: Firestore. Filter inactive entries client-side.
  const { options: dbCompagnies } = useOptions('compagnies');
  const { options: dbStatuses } = useOptions('options_statuts');
  const { options: dbNatures } = useOptions('options_natures');
  const { options: dbDossierTypes } = useOptions('options_types_dossier');

  const compagnies = useMemo(() => dbCompagnies.filter(o => o.active !== false), [dbCompagnies]);
  const statuses = useMemo(() => dbStatuses.filter(o => o.active !== false), [dbStatuses]);
  const natures = useMemo(() => dbNatures.filter(o => o.active !== false), [dbNatures]);
  const dossierTypes = useMemo(() => dbDossierTypes.filter(o => o.active !== false), [dbDossierTypes]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Rappel session: writes are buffered until the page-level « Sauvegarder ».
  const { write: writeDossierDoc, buffered, draft } = useDossierDocWrite(dossierId);

  // ── Unified form state ──
  const [form, setForm] = useState<any>({
    compagnie: '', statut: '', refExpert: '', matricule: '',
    policeNumber: '', dateSinistre: null, dateRequete: null, referenceCompagnie: '',
    typeDossier: '', nature: '',
    expertRank: '1er' as ExpertRole,
    experts: {
      '1er': emptyExpertInfo(),
      '2eme': emptyExpertInfo(),
      arbitre: emptyExpertInfo(),
    } as Record<ExpertRole, ExpertInfo>,
    assure: { nom: '', prenom: '', telephone: '', whatsapp: '', telephone2: '', email: '', adresse: '', cin: '' },
    vehicule: { marque: '', modele: '', immatriculation: '', immatriculationAnterieur: '', serie: '', energie: '', puissance: '', mec: null, km: '' },
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

  // Crash-proof draft: while editing, the whole form is mirrored to
  // localStorage (debounced + every 60s + on tab close). A leftover draft —
  // power cut, crash, navigation without saving — is offered for restore.
  const draftKey = profile?.uid ? `form-draft:dossier-info:${dossierId}:${profile.uid}` : null;
  const { recovered, clearDraft } = useFormDraft({ storageKey: draftKey, value: form, active: editing });

  const handleRestoreDraft = () => {
    const d = recovered?.data;
    if (!d) return;
    // Dates round-tripped through JSON as ISO strings — re-parse the three
    // date paths so the pickers get real Date objects back.
    setForm({
      ...d,
      dateSinistre: parseDate(d.dateSinistre),
      dateRequete: parseDate(d.dateRequete),
      vehicule: { ...(d.vehicule || {}), mec: parseDate(d.vehicule?.mec) },
    });
    setEditing(true);
    clearDraft();
  };

  useEffect(() => {
    // Task #8 — Re-hydrate the form whenever the dossier snapshot changes,
    // EXCEPT while the user is actively editing (to avoid clobbering unsaved
    // input). This lets AI-scan writes from Step 1 flow into the Information
    // step without requiring a tab change or page refresh. Previously this
    // effect ran once (guarded by `initialLoadDone`), which meant a scan
    // completing after mount never updated the displayed fields.
    if (dossier && !editing) {
      const dataAssure = typeof dossier.assure === 'object' ? dossier.assure : { nom: dossier.assure || '' };
      const v = dossier.vehicule || {};
      const storedExperts = (dossier.experts ?? {}) as any;
      const hydrateExpert = (role: ExpertRole): ExpertInfo => ({
        ...emptyExpertInfo(),
        ...(typeof storedExperts[role] === 'object' ? storedExperts[role] : {}),
      });
      const rawRank = dossier.expertRank;
      const expertRank: ExpertRole = rawRank === '1er' || rawRank === '2eme' || rawRank === 'arbitre' ? rawRank : '1er';
      setForm({
        compagnie: dossier.compagnie || '',
        statut: dossier.statut || 'Nouveau',
        refExpert: dossier.refExpert || '',
        matricule: dossier.matricule || '',
        policeNumber: dossier.policeNumber || '',
        dateSinistre: parseDate(dossier.dateSinistre),
        dateRequete: parseDate(dossier.dateRequete),
        referenceCompagnie: dossier.referenceCompagnie || dossier.companyRef || '',
        typeDossier: dossier.typeDossier || '',
        nature: dossier.nature || '',
        expertRank,
        experts: {
          '1er': hydrateExpert('1er'),
          '2eme': hydrateExpert('2eme'),
          arbitre: hydrateExpert('arbitre'),
        },
        assure: {
          nom: `${dataAssure.nom || ''} ${dataAssure.prenom || ''}`.trim(),
          prenom: '',
          telephone: dataAssure.telephone || '', whatsapp: dataAssure.whatsapp || '',
          telephone2: dataAssure.telephone2 || '', email: dataAssure.email || '',
          adresse: dataAssure.adresse || '', cin: dataAssure.cin || '',
        },
        vehicule: {
          marque: v.marque || v.brand || '', modele: v.modele || v.model || '',
          immatriculation: v.immatriculation || v.registration || '', immatriculationAnterieur: v.immatriculationAnterieur || '', serie: v.serie || '',
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
    }
  }, [dossier, editing]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleNestedChange = (group: string, field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [group]: { ...prev[group], [field]: value } }));
  };
  const handleExpertChange = (role: ExpertRole, field: keyof ExpertInfo, value: string) => {
    setForm((prev: any) => ({
      ...prev,
      experts: {
        ...prev.experts,
        [role]: { ...(prev.experts?.[role] ?? emptyExpertInfo()), [field]: value },
      },
    }));
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
      await writeDossierDoc(payload);
      const ref = dossier.refExpert || dossierId;
      const statutChanged = form.statut !== dossier.statut;
      if (buffered) {
        // Rappel session: the audit entries are deferred with the field
        // changes so the historique never references a state the dossier
        // doesn't have yet. Everything lands on « Sauvegarder ».
        if (statutChanged) {
          draft.bufferLog({ kind: 'historique', args: [form.statut, userEmail, `Statut changé en "${form.statut}".`, 'statut', profile?.nom] });
          draft.bufferLog({ kind: 'workflow', args: [`Changement de statut : ${form.statut}`, userEmail, userId, 'done', { dossierRef: ref, details: `Statut changé en "${form.statut}"` }, profile?.nom] });
        } else {
          draft.bufferLog({ kind: 'historique', args: ['Mise à jour', userEmail, 'Informations du dossier mises à jour.', 'autre', profile?.nom] });
          draft.bufferLog({ kind: 'workflow', args: ['Modification de dossier', userEmail, userId, 'done', { dossierRef: ref, details: 'Informations du dossier mises à jour' }, profile?.nom] });
        }
        toast({
          title: 'Modifications en attente',
          description: 'Elles ne seront visibles sur le dossier qu’après « Sauvegarder » dans la bannière rappel.',
        });
      } else {
        if (statutChanged) {
          await logHistorique(db, dossierId, form.statut, userEmail, `Statut changé en "${form.statut}".`, 'statut', profile?.nom);
          await logWorkflow(db, dossierId, `Changement de statut : ${form.statut}`, userEmail, userId, 'done', { dossierRef: ref, details: `Statut changé en "${form.statut}"` }, profile?.nom);
        } else {
          await logHistorique(db, dossierId, 'Mise à jour', userEmail, 'Informations du dossier mises à jour.', 'autre', profile?.nom);
          await logWorkflow(db, dossierId, 'Modification de dossier', userEmail, userId, 'done', { dossierRef: ref, details: 'Informations du dossier mises à jour' }, profile?.nom);
        }
        toast({ title: 'Informations mises à jour' });
      }
      clearDraft();
      setEditing(false);
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Erreur', description: String(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Explicit user discard — drop the crash-recovery draft too, then exit
    // edit mode, which flips the `editing` dep of the hydrate effect and
    // re-syncs the form from the latest dossier snapshot.
    clearDraft();
    setEditing(false);
  };

  const formatDateDisplay = (date: any) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    try { return format(d, 'dd/MM/yyyy', { locale: fr }); } catch { return '-'; }
  };

  return (
    <div className="space-y-6">
      {/* Crash-recovery banner: a draft only survives here if a previous edit
          session ended without Enregistrer/Annuler (power cut, crash, tab
          closed mid-edit). */}
      {canEdit && !editing && recovered && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/25">
          <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100">
            <Clock className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200" />
            <span>
              Brouillon non enregistré récupéré
              {recovered.savedAt.getTime() > 0 && (
                <> du <strong>{format(recovered.savedAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}</strong></>
              )}
              .
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs" onClick={handleRestoreDraft}>
              Restaurer
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={clearDraft}>
              Ignorer
            </Button>
          </div>
        </div>
      )}

      {/* Edit/Save bar */}
      {canEdit && (
        <div className="flex justify-end gap-2">
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full border border-border hover:bg-accent transition-colors font-semibold">
              <Pencil className="h-3.5 w-3.5 text-primary" /> Modifier
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
      <Card className="shadow-sm overflow-hidden border-0 rounded-xl">
        <CardHeader className="bg-heading-bg py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Informations Dossier</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            {
              label: 'Compagnie', value: form.compagnie, path: 'compagnie',
              modal: <OptionsManagerModal collectionName="compagnies" title="Compagnies" />,
              edit: (
                <Select value={form.compagnie} onValueChange={(v) => handleChange('compagnie', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              ),
            },
            {
              label: 'Type de dossier', value: form.typeDossier, path: 'typeDossier',
              modal: <OptionsManagerModal collectionName="options_types_dossier" title="Types de dossier" />,
              edit: (
                <Select value={form.typeDossier} onValueChange={(v) => handleChange('typeDossier', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{dossierTypes.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              ),
            },
            {
              label: 'Nature du dossier', value: form.nature, path: 'nature',
              modal: <OptionsManagerModal collectionName="options_natures" title="Natures" />,
              edit: (
                <Select value={form.nature} onValueChange={(v) => handleChange('nature', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}</SelectContent>
                </Select>
              ),
            },
            {
              label: 'Statut', value: form.statut, path: 'statut',
              modal: <OptionsManagerModal collectionName="options_statuts" title="Statuts" />,
              edit: (
                <Select value={form.statut} onValueChange={(v) => handleChange('statut', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">{statuses.map(s => <SelectItem key={s.id} value={s.label}><span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDotColor(s.label))} />{s.label}</span></SelectItem>)}</SelectContent>
                </Select>
              ),
            },
          ]} editing={editing} />
          <FieldRow fields={[
            { label: 'Réf Dossier', value: form.refExpert, path: 'refExpert', edit: <Input className="h-9" value={form.refExpert} onChange={(e) => handleChange('refExpert', e.target.value)} /> },
            { label: 'Référence compagnie', value: form.referenceCompagnie, path: 'referenceCompagnie', edit: <Input className="h-9" value={form.referenceCompagnie} onChange={(e) => handleChange('referenceCompagnie', e.target.value)} /> },
            { label: 'Matricule', value: form.matricule, path: 'matricule', edit: <Input className="h-9" value={form.matricule} onChange={(e) => handleChange('matricule', e.target.value)} /> },
            { label: 'N° de Police', value: form.policeNumber, path: 'policeNumber', edit: <Input className="h-9" value={form.policeNumber} onChange={(e) => handleChange('policeNumber', e.target.value)} /> },
          ]} editing={editing} />
          <FieldRow fields={[
            { label: 'Date Sinistre', value: formatDateDisplay(form.dateSinistre), path: 'dateSinistre', edit: <DatePicker value={form.dateSinistre} onChange={(d) => handleChange('dateSinistre', d)} /> },
            { label: 'Date Requête', value: formatDateDisplay(form.dateRequete), path: 'dateRequete', edit: <DatePicker value={form.dateRequete} onChange={(d) => handleChange('dateRequete', d)} /> },
          ]} editing={editing} />
        </CardContent>
      </Card>

      {/* ── EXPERTS ── */}
      <Card className="shadow-sm overflow-hidden border-0 rounded-xl">
        <CardHeader className="bg-heading-bg py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Experts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            {
              label: 'Rôle du dossier', value: EXPERT_ROLE_LABELS[form.expertRank as ExpertRole] || '-', path: 'expertRank',
              edit: (
                <Select value={form.expertRank} onValueChange={(v) => handleChange('expertRank', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1er">{EXPERT_ROLE_LABELS['1er']}</SelectItem>
                    <SelectItem value="2eme">{EXPERT_ROLE_LABELS['2eme']}</SelectItem>
                    <SelectItem value="arbitre">{EXPERT_ROLE_LABELS.arbitre}</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
          ]} editing={editing} />
          {visibleExpertRoles((form.expertRank as ExpertRole) || '1er').map((role) => (
            <div key={role} className="border-t border-border/10">
              <div className="px-6 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">
                {EXPERT_ROLE_LABELS[role]}
              </div>
              <FieldRow fields={[
                { label: 'Nom complet', value: form.experts?.[role]?.nom, path: `experts.${role}.nom`, edit: <Input className="h-9" value={form.experts?.[role]?.nom ?? ''} onChange={(e) => handleExpertChange(role, 'nom', e.target.value)} /> },
                { label: 'Téléphone', value: form.experts?.[role]?.telephone, path: `experts.${role}.telephone`, edit: <Input className="h-9" value={form.experts?.[role]?.telephone ?? ''} onChange={(e) => handleExpertChange(role, 'telephone', e.target.value)} /> },
                { label: 'Email', value: form.experts?.[role]?.email, path: `experts.${role}.email`, edit: <Input type="email" className="h-9" value={form.experts?.[role]?.email ?? ''} onChange={(e) => handleExpertChange(role, 'email', e.target.value)} /> },
                { label: 'Compagnie', value: form.experts?.[role]?.compagnie, path: `experts.${role}.compagnie`, edit: <Input className="h-9" value={form.experts?.[role]?.compagnie ?? ''} onChange={(e) => handleExpertChange(role, 'compagnie', e.target.value)} /> },
              ]} editing={editing} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── ASSURÉ ── */}
      <Card className="shadow-sm overflow-hidden border-0 rounded-xl">
        <CardHeader className="bg-heading-bg py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Informations Assuré
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            { label: 'Nom complet', value: form.assure.nom, path: 'assure.nom', edit: <Input className="h-9" value={form.assure.nom} onChange={(e) => handleNestedChange('assure', 'nom', e.target.value)} /> },
            { label: 'Téléphone', value: form.assure.telephone, path: 'assure.telephone', edit: <Input className="h-9" value={form.assure.telephone} onChange={(e) => handleNestedChange('assure', 'telephone', e.target.value)} /> },
            { label: 'WhatsApp', value: form.assure.whatsapp, path: 'assure.whatsapp', edit: <Input className="h-9" value={form.assure.whatsapp} onChange={(e) => handleNestedChange('assure', 'whatsapp', e.target.value)} /> },
          ]} editing={editing} />
          <FieldRow fields={[
            { label: 'Téléphone 2', value: form.assure.telephone2, path: 'assure.telephone2', edit: <Input className="h-9" value={form.assure.telephone2} onChange={(e) => handleNestedChange('assure', 'telephone2', e.target.value)} /> },
            { label: 'Email', value: form.assure.email, path: 'assure.email', edit: <Input type="email" className="h-9" value={form.assure.email} onChange={(e) => handleNestedChange('assure', 'email', e.target.value)} /> },
            { label: 'Adresse', value: form.assure.adresse, path: 'assure.adresse', edit: <Input className="h-9" value={form.assure.adresse} onChange={(e) => handleNestedChange('assure', 'adresse', e.target.value)} /> },
            { label: 'CIN', value: form.assure.cin, path: 'assure.cin', edit: <Input className="h-9" value={form.assure.cin} onChange={(e) => handleNestedChange('assure', 'cin', e.target.value)} /> },
          ]} editing={editing} />
        </CardContent>
      </Card>

      {/* ── VÉHICULE ── */}
      <Card className="shadow-sm overflow-hidden border-0 rounded-xl">
        <CardHeader className="bg-heading-bg py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" /> Véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            { label: 'Marque', value: form.vehicule.marque, path: 'vehicule.marque', edit: <Input className="h-9" value={form.vehicule.marque} onChange={(e) => handleNestedChange('vehicule', 'marque', e.target.value)} /> },
            { label: 'Modèle', value: form.vehicule.modele, path: 'vehicule.modele', edit: <Input className="h-9" value={form.vehicule.modele} onChange={(e) => handleNestedChange('vehicule', 'modele', e.target.value)} /> },
            { label: 'Immatriculation', value: form.vehicule.immatriculation, path: 'vehicule.immatriculation', edit: <Input className="h-9" value={form.vehicule.immatriculation} onChange={(e) => handleNestedChange('vehicule', 'immatriculation', e.target.value)} /> },
            { label: 'Numéro de série', value: form.vehicule.serie, path: 'vehicule.serie', edit: <Input className="h-9" value={form.vehicule.serie} onChange={(e) => handleNestedChange('vehicule', 'serie', e.target.value)} /> },
          ]} editing={editing} />
          <FieldRow fields={[
            { label: 'Énergie', value: form.vehicule.energie, path: 'vehicule.energie', edit: <Input className="h-9" value={form.vehicule.energie} onChange={(e) => handleNestedChange('vehicule', 'energie', e.target.value)} /> },
            { label: 'Puissance fiscale', value: form.vehicule.puissance, path: 'vehicule.puissance', edit: <Input className="h-9" value={form.vehicule.puissance} onChange={(e) => handleNestedChange('vehicule', 'puissance', e.target.value)} /> },
            { label: 'Mise en circ. (Date)', value: formatDateDisplay(form.vehicule.mec), path: 'vehicule.mec', edit: <DatePicker value={form.vehicule.mec} onChange={(d) => handleNestedChange('vehicule', 'mec', d)} /> },
            { label: 'Kilométrage', value: form.vehicule.km, path: 'vehicule.km', edit: <Input type="number" className="h-9" value={form.vehicule.km} onChange={(e) => handleNestedChange('vehicule', 'km', e.target.value)} /> },
          ]} editing={editing} />
          <FieldRow fields={[
            { label: 'Immatriculation antérieure', value: form.vehicule.immatriculationAnterieur, path: 'vehicule.immatriculationAnterieur', edit: <Input className="h-9" value={form.vehicule.immatriculationAnterieur} onChange={(e) => handleNestedChange('vehicule', 'immatriculationAnterieur', e.target.value)} /> },
          ]} editing={editing} />
        </CardContent>
      </Card>

      {/* ── INTERMÉDIAIRE ── */}
      <Card className="shadow-sm overflow-hidden border-0 rounded-xl">
        <CardHeader className="bg-heading-bg py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" /> Intermédiaire
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            { label: 'Nom / Raison sociale', value: form.intermediaireNom, path: 'intermediaireNom', edit: <Input className="h-9" value={form.intermediaireNom} onChange={(e) => handleChange('intermediaireNom', e.target.value)} /> },
            { label: 'Prénom', value: form.intermediairePrenom, path: 'intermediairePrenom', edit: <Input className="h-9" value={form.intermediairePrenom} onChange={(e) => handleChange('intermediairePrenom', e.target.value)} /> },
            { label: 'Type', value: form.intermediaireType, path: 'intermediaireType', edit: <Input className="h-9" value={form.intermediaireType} onChange={(e) => handleChange('intermediaireType', e.target.value)} /> },
            { label: 'Code Intermédiaire', value: form.intermediaireCode, path: 'intermediaireCode', edit: <Input className="h-9" value={form.intermediaireCode} onChange={(e) => handleChange('intermediaireCode', e.target.value)} /> },
          ]} editing={editing} />
          <FieldRow fields={[
            { label: 'Compagnie', value: form.intermediaireCompagnie, path: 'intermediaireCompagnie', edit: (
              <Select value={form.intermediaireCompagnie} onValueChange={(v) => handleChange('intermediaireCompagnie', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{dbCompagnies.map((c: any) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            ) },
            { label: 'Téléphone', value: form.intermediaireTelephone, path: 'intermediaireTelephone', edit: <Input className="h-9" value={form.intermediaireTelephone} onChange={(e) => handleChange('intermediaireTelephone', e.target.value)} /> },
            { label: 'Email', value: form.intermediaireEmail, path: 'intermediaireEmail', edit: <Input className="h-9" value={form.intermediaireEmail} onChange={(e) => handleChange('intermediaireEmail', e.target.value)} /> },
            { label: 'Adresse', value: form.intermediaireAdresse, path: 'intermediaireAdresse', edit: <Input className="h-9" value={form.intermediaireAdresse} onChange={(e) => handleChange('intermediaireAdresse', e.target.value)} /> },
          ]} editing={editing} />
        </CardContent>
      </Card>

      {/* ── PARTIE ADVERSE ── */}
      <Card className="shadow-sm overflow-hidden border-0 rounded-xl">
        <CardHeader className="bg-heading-bg py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Partie Adverse
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <FieldRow fields={[
            { label: 'Nom', value: form.adverseNom, path: 'adverseNom', edit: <Input className="h-9" value={form.adverseNom} onChange={(e) => handleChange('adverseNom', e.target.value)} /> },
            { label: 'Prénom', value: form.adversePrenom, path: 'adversePrenom', edit: <Input className="h-9" value={form.adversePrenom} onChange={(e) => handleChange('adversePrenom', e.target.value)} /> },
            { label: 'Téléphone', value: form.adverseTelephone, path: 'adverseTelephone', edit: <Input className="h-9" value={form.adverseTelephone} onChange={(e) => handleChange('adverseTelephone', e.target.value)} /> },
            { label: 'Email', value: form.adverseEmail, path: 'adverseEmail', edit: <Input className="h-9" value={form.adverseEmail} onChange={(e) => handleChange('adverseEmail', e.target.value)} /> },
          ]} editing={editing} />
          <FieldRow fields={[
            { label: 'Adresse', value: form.adverseAdresse, path: 'adverseAdresse', edit: <Input className="h-9" value={form.adverseAdresse} onChange={(e) => handleChange('adverseAdresse', e.target.value)} /> },
            { label: 'Compagnie', value: form.adverseCompagnie, path: 'adverseCompagnie', edit: (
              <Select value={form.adverseCompagnie} onValueChange={(v) => handleChange('adverseCompagnie', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{dbCompagnies.map((c: any) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            ) },
            { label: 'Matricule', value: form.adverseMatricule, path: 'adverseMatricule', edit: <Input className="h-9" value={form.adverseMatricule} onChange={(e) => handleChange('adverseMatricule', e.target.value)} /> },
            { label: 'N° Permis', value: form.adversePermis, path: 'adversePermis', edit: <Input className="h-9" value={form.adversePermis} onChange={(e) => handleChange('adversePermis', e.target.value)} /> },
          ]} editing={editing} />
        </CardContent>
      </Card>

    </div>
  );
}
