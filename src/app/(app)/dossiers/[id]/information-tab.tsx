'use client';

/**
 * Informations — the dossier's record form.
 *
 * Two shapes, one state and ONE save path:
 *
 *  ≥ md   the historic whole-form flip: « Modifier » in the identity header
 *         turns ~35 fields into inputs at once, « Enregistrer » writes.
 *  < md   NEVER a 35-field edit (docs/research/mobile-forms-inputs.md §2.1:
 *         Enregistrer would sit five screens above the last field, and a
 *         multi-column form on a phone makes users "inadvertently skip or omit
 *         required fields"). Read mode is a one-column `DefinitionList` (§2.9
 *         — a 2-column `dl` at 390 px makes the eye pair a label with the
 *         wrong value); each section header carries its own 44 px
 *         « Modifier », which opens a **section edit sheet**: a
 *         `FullScreenDialog` titled by the section with only its 5–11 fields,
 *         single column, 48 px controls.
 *
 * CRITICAL — the section sheet is not a partial write. The dossier save
 * canonicalises the WHOLE form (`handleSave` writes every field, and
 * `classifyDossierChanges` diffs a canonicalised before/after), and the rappel
 * draft buffer (`useDossierDocWrite`) has to see the same payload it sees on
 * desktop. So a section sheet edits the SAME `form` state the desktop mode
 * edits and calls the SAME `handleSave`; it only limits which fields it
 * RENDERS. « Annuler » restores the snapshot taken when the sheet opened.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Check, X, User, Car, Users, PenLine, FileText, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { type DocumentReference, Timestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/use-form-draft';
import { logHistorique, logWorkflow } from './log-historique';
import { useDossierDocWrite } from './rappel-draft';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';
import { DefinitionList, type DefinitionItem } from '@/components/ui/definition-list';
import { FullScreenDialog } from '@/components/ui/full-screen-dialog';
import { format } from 'date-fns';
import { dateFnsLocale, useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';
import { getStatusDotColor } from '@/lib/status-colors';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useReplayHighlight, highlightClass, ChangeBadge } from '@/components/dossier-timeline/replay-highlight';
import { usePrefillFlash } from '@/hooks/use-prefill-flash';
import { BRAND } from '@/lib/brand';
import {
  INPUT_ADDRESS,
  INPUT_EMAIL,
  INPUT_ID,
  INPUT_NAME,
  INPUT_NUMERIC,
  INPUT_PLATE,
  INPUT_TEL,
  INPUT_TEXT,
} from '@/lib/input-attrs';
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
  /** Extra controls rendered in the identity block header, left of Modifier / Enregistrer. */
  headerActions?: React.ReactNode;
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
  /**
   * What the value IS. Drives the phone read mode (a téléphone dials, an
   * adresse opens maps, a plate is mono — §2.9) and nothing else; the edit
   * node already carries the matching keyboard preset.
   */
  kind?: 'tel' | 'email' | 'address' | 'plate' | 'text';
  /**
   * May share a row with its neighbour in a section sheet. §2.1 allows this
   * for the single-entity pairs ONLY (Nom | Prénom, Date | Heure).
   */
  pair?: boolean;
  /** Renders as a sub-heading inside a section sheet (the expert's role). */
  heading?: boolean;
};

/** Column rhythm: `full` for the full-width identity block, `half` for a
 *  section that shares a row with another one at ≥ lg (DESIGN.md §10). */
type FieldCols = 'full' | 'half';
const FIELD_GRID: Record<FieldCols, string> = {
  full: 'sm:grid-cols-2 lg:grid-cols-4',
  half: 'sm:grid-cols-2 xl:grid-cols-3',
};

/** Section identity — one per « Modifier » sheet on a phone. */
type SectionKey = 'dossier' | 'experts' | 'assure' | 'vehicule' | 'intermediaire' | 'adverse';

const FieldRow = ({
  fields,
  editing,
  cols = 'half',
  className,
}: {
  fields: FieldDef[];
  editing: boolean;
  cols?: FieldCols;
  className?: string;
}) => {
  const hl = useReplayHighlight();
  const flash = usePrefillFlash();
  return (
    // Mode flip = ONE coordinated fade-through (researched 2026-09-02:
    // Material choreography "transformation of the group provides
    // continuity… don't animate multiple elements independently"; NN/g
    // attention-competition; Atlassian inline-edit = geometric parity, no
    // per-field motion). The key remount fades the WHOLE incoming mode in as
    // one group — entering edit 200ms decelerate, returning to read 150ms —
    // no stagger, no movement; borders emerge with the fade. Reduced motion:
    // instant swap.
    <dl
      key={editing ? 'edit' : 'read'}
      className={cn(
        'grid grid-cols-1 gap-x-6 gap-y-4',
        FIELD_GRID[cols],
        // Fade alone was invisible (hairline borders on cream — owner
        // 2026-09-02): the incoming mode also RISES 4px, 300ms in / 200 out.
        'animate-in fade-in-0 slide-in-from-bottom-1 ease-enter motion-reduce:animate-none',
        editing ? 'duration-300' : 'duration-200',
        className,
      )}
    >
      {fields.map((f, i) => {
        const status = !editing && f.path ? hl.statusForPath(f.path) : null;
        const empty = !editing && !f.value;
        return (
          <div
            key={i}
            // Teal value-change fade on fields the AI scan just wrote
            // (owner option B1; motion-spec §8) — colour-only, one-shot.
            className={cn('min-w-0 rounded-md', highlightClass(status), flash(f.path) && 'animate-value-flash')}
          >
            <dt className="t-label flex items-center gap-1">
              <span className="truncate">{f.label}</span>
              {editing && f.modal}
              {status && <ChangeBadge status={status} className="ml-auto" />}
            </dt>
            <dd className="mt-1 min-h-[20px]">
              {editing && f.edit ? (
                <div className="w-full">{f.edit}</div>
              ) : (
                <span className={cn('t-body break-words', empty ? 'text-ink-4' : 'font-semibold text-ink')}>{f.value || '—'}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
};

/**
 * Phone read mode of a section (§2.9): the same fields as ONE column, key
 * over value, action values live, « — » when empty. It reuses the replay
 * highlight and the AI pre-fill flash so the two modes agree.
 */
const PhoneFields = ({ fields }: { fields: FieldDef[] }) => {
  const hl = useReplayHighlight();
  const flash = usePrefillFlash();
  const items: DefinitionItem[] = fields.map((f) => {
    const status = f.path ? hl.statusForPath(f.path) : null;
    return {
      label: f.label,
      value: f.value,
      action: f.kind === 'tel' ? 'tel' : f.kind === 'email' ? 'email' : f.kind === 'address' ? 'map' : undefined,
      mono: f.kind === 'plate',
      className: cn('rounded-md', highlightClass(status), flash(f.path) && 'animate-value-flash'),
      trailing: status ? <ChangeBadge status={status} /> : undefined,
    };
  });
  return <DefinitionList items={items} />;
};

/** Quiet section: hairline header (icon + title, optional right-side actions)
 *  and a padded body. `outline` because the active timeline step is already
 *  paper — never stack two tonal cards (DESIGN.md §10). */
const Section = ({
  title,
  icon,
  actions,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card variant="outline" role="region" aria-label={title} className={cn('min-w-0', className)}>
    <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-hairline px-6 py-3 max-md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="shrink-0 text-ink-3 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        <h3 className="t-heading truncate">{title}</h3>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
    <div className="px-6 py-5 max-md:px-4 max-md:py-4">{children}</div>
  </Card>
);

/** Read-mode stand-in for a half-width section whose every field is empty:
 *  one quiet row instead of a card full of dashes. Fields are never hidden
 *  individually, and edit mode always renders the full section. */
const EmptySection = ({ title, icon, onEdit }: { title: string; icon?: React.ReactNode; onEdit?: () => void }) => {
  const t = useT();
  return (
  <Card
    variant="flat"
    role="region"
    aria-label={title}
    className="flex min-h-[44px] items-center justify-between gap-3 self-start px-5 py-2 max-md:px-4"
  >
    <div className="flex min-w-0 items-center gap-2 text-ink-3">
      {icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <h3 className="t-heading truncate text-ink-3">{title}</h3>
      <span className="t-caption hidden truncate sm:inline">· {t('Aucune information')}</span>
    </div>
    {onEdit && (
      <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 gap-1.5 px-2 text-xs text-ink-2 max-md:h-11 max-md:px-3 max-md:text-[14px]" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" /> {t('Modifier')}
      </Button>
    )}
  </Card>
  );
};

// ── AI learning loop ──
// Fields the AI pre-fill can write (see step-1-import FIELD_MAP). When the
// dossier was pre-filled and the user changes one of them, the diff is sent to
// /api/extract-feedback so the next extraction for this compagnie is told.
const FEEDBACK_PATHS = [
  'compagnie', 'typeDossier', 'nature', 'refExpert', 'referenceCompagnie', 'matricule', 'policeNumber',
  'dateSinistre', 'dateRequete', 'assure.nom', 'assure.telephone', 'assure.adresse',
  'vehicule.marque', 'vehicule.modele', 'vehicule.immatriculation', 'vehicule.serie', 'vehicule.energie',
  'vehicule.puissance', 'vehicule.mec', 'vehicule.km', 'vehicule.immatriculationAnterieur',
  'intermediaireNom', 'intermediaireEmail', 'adverseNom', 'adverseMatricule', 'adverseCompagnie',
];
function feedbackNorm(v: any): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v?.toDate === 'function') return v.toDate().toISOString().slice(0, 10);
  const s = String(v).trim();
  return s.length ? s : null;
}
function feedbackGet(o: any, path: string): any {
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), o);
}
function diffForFeedback(dossier: any, form: any): { field: string; before: string | null; after: string | null }[] {
  const out: { field: string; before: string | null; after: string | null }[] = [];
  for (const p of FEEDBACK_PATHS) {
    const before = feedbackNorm(feedbackGet(dossier, p));
    const after = feedbackNorm(feedbackGet(form, p));
    if (before !== after) out.push({ field: p, before, after });
  }
  return out;
}

export default function InformationTab({ dossier, dossierRef, dossierId, headerActions }: InformationTabProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const t = useT();
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
  // Phone: which section's edit sheet is open, and the form as it was when it
  // opened (« Annuler » / « Abandonner » restore it).
  const [sheetSection, setSheetSection] = useState<SectionKey | null>(null);
  const [sheetSnapshot, setSheetSnapshot] = useState<any>(null);

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
      if (dossier?.importDocId) {
        const corrections = diffForFeedback(dossier, form);
        if (corrections.length > 0) {
          apiFetch('/api/extract-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dossierId, compagnie: form.compagnie || dossier.compagnie || null, corrections }),
          }).catch(() => { /* learning is best-effort */ });
        }
      }
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
          title: t('Modifications en attente'),
          description: t('Elles ne seront visibles sur le dossier qu’après « Sauvegarder » dans la bannière rappel.'),
        });
      } else {
        if (statutChanged) {
          await logHistorique(db, dossierId, form.statut, userEmail, `Statut changé en "${form.statut}".`, 'statut', profile?.nom);
          await logWorkflow(db, dossierId, `Changement de statut : ${form.statut}`, userEmail, userId, 'done', { dossierRef: ref, details: `Statut changé en "${form.statut}"` }, profile?.nom);
        } else {
          await logHistorique(db, dossierId, 'Mise à jour', userEmail, 'Informations du dossier mises à jour.', 'autre', profile?.nom);
          await logWorkflow(db, dossierId, 'Modification de dossier', userEmail, userId, 'done', { dossierRef: ref, details: 'Informations du dossier mises à jour' }, profile?.nom);
        }
        toast({ title: t('Informations mises à jour') });
      }
      clearDraft();
      setEditing(false);
      setSheetSection(null);
      setSheetSnapshot(null);
    } catch (error: any) {
      console.error(error);
      toast({ title: t('Erreur'), description: String(error), variant: 'destructive' });
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

  /** Phone: open one section's sheet on top of the SHARED form state. */
  const openSection = (key: SectionKey) => {
    setSheetSnapshot(form);
    setSheetSection(key);
    // `editing` freezes the hydrate effect exactly as on desktop, so a live
    // snapshot can't clobber what is being typed, and `useFormDraft` starts
    // mirroring the form to localStorage.
    setEditing(true);
  };

  /** « × » / « Abandonner » / Annuler — put the form back as it was. */
  const closeSection = (restore: boolean) => {
    if (restore && sheetSnapshot) setForm(sheetSnapshot);
    setSheetSection(null);
    setSheetSnapshot(null);
    setEditing(false);
    if (restore) clearDraft();
  };

  const sectionDirty = !!sheetSnapshot && JSON.stringify(form) !== JSON.stringify(sheetSnapshot);

  // Display only. Empty / invalid → '' so FieldRow renders the quiet '—'.
  const formatDateDisplay = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    try { return format(d, 'dd/MM/yyyy', { locale: dateFnsLocale() }); } catch { return ''; }
  };

  // ── Field definitions ──
  // Declared once per render so the read-mode "section entirely empty" check
  // and the rendered FieldRow share the same list (never hide single fields).
  // Every input carries its keyboard / autofill preset (`@/lib/input-attrs`):
  // a téléphone opens the phone pad, a kilométrage the digit pad (never
  // `type="number"` — GOV.UK), a plate the capitals keyboard with autocorrect
  // off (Baymard: autocorrect corrupts identifiers).
  const dossierFields: FieldDef[] = [
    {
      label: t('Compagnie'), value: form.compagnie, path: 'compagnie',
      modal: <OptionsManagerModal collectionName="compagnies" title={t('Compagnies')} />,
      edit: (
        <Select value={form.compagnie} onValueChange={(v) => handleChange('compagnie', v)}>
          <SelectTrigger className="h-8 max-md:h-12" aria-label={t('Compagnie')}><SelectValue placeholder={t('Choisir')} /></SelectTrigger>
          <SelectContent>{compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      ),
    },
    {
      label: t('Type de dossier'), value: form.typeDossier, path: 'typeDossier',
      modal: <OptionsManagerModal collectionName="options_types_dossier" title={t('Types de dossier')} />,
      edit: (
        <Select value={form.typeDossier} onValueChange={(v) => handleChange('typeDossier', v)}>
          <SelectTrigger className="h-8 max-md:h-12" aria-label={t('Type de dossier')}><SelectValue placeholder={t('Choisir')} /></SelectTrigger>
          <SelectContent>{dossierTypes.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      ),
    },
    {
      label: t('Nature du dossier'), value: form.nature, path: 'nature',
      modal: <OptionsManagerModal collectionName="options_natures" title={t('Natures')} />,
      edit: (
        <Select value={form.nature} onValueChange={(v) => handleChange('nature', v)}>
          <SelectTrigger className="h-8 max-md:h-12" aria-label={t('Nature du dossier')}><SelectValue placeholder={t('Choisir')} /></SelectTrigger>
          <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}</SelectContent>
        </Select>
      ),
    },
    {
      label: t('Statut'), value: t(form.statut), path: 'statut',
      modal: <OptionsManagerModal collectionName="options_statuts" title={t('Statuts')} />,
      edit: (
        <Select value={form.statut} onValueChange={(v) => handleChange('statut', v)}>
          <SelectTrigger className="h-8 max-md:h-12" aria-label={t('Statut')}><SelectValue placeholder={t('Choisir')} /></SelectTrigger>
          <SelectContent className="max-h-[300px]">{statuses.map(s => <SelectItem key={s.id} value={s.label}><span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDotColor(s.label))} />{t(s.label)}</span></SelectItem>)}</SelectContent>
        </Select>
      ),
    },
    { label: t('Réf Dossier'), value: form.refExpert, path: 'refExpert', edit: <Input {...INPUT_ID} className="h-8 max-md:h-12" value={form.refExpert} onChange={(e) => handleChange('refExpert', e.target.value)} /> },
    { label: t('Référence compagnie'), value: form.referenceCompagnie, path: 'referenceCompagnie', edit: <Input {...INPUT_ID} className="h-8 max-md:h-12" value={form.referenceCompagnie} onChange={(e) => handleChange('referenceCompagnie', e.target.value)} /> },
    { label: t('Matricule'), value: form.matricule, path: 'matricule', kind: 'plate', edit: <Input {...INPUT_PLATE} className="h-8 max-md:h-12 t-mono" value={form.matricule} onChange={(e) => handleChange('matricule', e.target.value)} /> },
    { label: t('N° de Police'), value: form.policeNumber, path: 'policeNumber', edit: <Input {...INPUT_ID} className="h-8 max-md:h-12" value={form.policeNumber} onChange={(e) => handleChange('policeNumber', e.target.value)} /> },
    // Sinistre / requête are dates the gestionnaire COPIES off a paper mission
    // — often months old. §2.3: typed masked field on touch, never a calendar.
    { label: t('Date Sinistre'), value: formatDateDisplay(form.dateSinistre), path: 'dateSinistre', edit: <DatePicker horizon="far" label={t('Date Sinistre')} className="h-8 max-md:h-12" value={form.dateSinistre} onChange={(d) => handleChange('dateSinistre', d)} /> },
    { label: t('Date Requête'), value: formatDateDisplay(form.dateRequete), path: 'dateRequete', edit: <DatePicker horizon="far" label={t('Date Requête')} className="h-8 max-md:h-12" value={form.dateRequete} onChange={(d) => handleChange('dateRequete', d)} /> },
    // The firm's role sits with the dossier identity (it fills the third
    // slot of the last row at no height cost) and drives the Experts rows.
    {
      label: t('Rôle du dossier'), value: EXPERT_ROLE_LABELS[form.expertRank as ExpertRole] ? t(EXPERT_ROLE_LABELS[form.expertRank as ExpertRole]) : '', path: 'expertRank',
      edit: (
        <Select value={form.expertRank} onValueChange={(v) => handleChange('expertRank', v)}>
          <SelectTrigger className="h-8 max-md:h-12" aria-label={t('Rôle du dossier')}><SelectValue placeholder={t('Choisir')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1er">{t(EXPERT_ROLE_LABELS['1er'])}</SelectItem>
            <SelectItem value="2eme">{t(EXPERT_ROLE_LABELS['2eme'])}</SelectItem>
            <SelectItem value="arbitre">{t(EXPERT_ROLE_LABELS.arbitre)}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ];

  const expertFields = (role: ExpertRole): FieldDef[] => [
    { label: t('Expert'), value: t(EXPERT_ROLE_LABELS[role]) },
    { label: t('Nom complet'), value: form.experts?.[role]?.nom, path: `experts.${role}.nom`, edit: <Input {...INPUT_NAME} className="h-8 max-md:h-12" value={form.experts?.[role]?.nom ?? ''} onChange={(e) => handleExpertChange(role, 'nom', e.target.value)} /> },
    { label: t('Téléphone'), value: form.experts?.[role]?.telephone, path: `experts.${role}.telephone`, kind: 'tel', edit: <Input {...INPUT_TEL} placeholder={BRAND.phonePlaceholder} className="h-8 max-md:h-12" value={form.experts?.[role]?.telephone ?? ''} onChange={(e) => handleExpertChange(role, 'telephone', e.target.value)} /> },
    { label: t('Email'), value: form.experts?.[role]?.email, path: `experts.${role}.email`, kind: 'email', edit: <Input {...INPUT_EMAIL} className="h-8 max-md:h-12" value={form.experts?.[role]?.email ?? ''} onChange={(e) => handleExpertChange(role, 'email', e.target.value)} /> },
    { label: t('Compagnie'), value: form.experts?.[role]?.compagnie, path: `experts.${role}.compagnie`, edit: <Input {...INPUT_NAME} className="h-8 max-md:h-12" value={form.experts?.[role]?.compagnie ?? ''} onChange={(e) => handleExpertChange(role, 'compagnie', e.target.value)} /> },
  ];

  const assureFields: FieldDef[] = [
    { label: t('Nom complet'), value: form.assure.nom, path: 'assure.nom', edit: <Input {...INPUT_NAME} className="h-8 max-md:h-12" value={form.assure.nom} onChange={(e) => handleNestedChange('assure', 'nom', e.target.value)} /> },
    { label: t('Téléphone'), value: form.assure.telephone, path: 'assure.telephone', kind: 'tel', edit: <Input {...INPUT_TEL} placeholder={BRAND.phonePlaceholder} className="h-8 max-md:h-12" value={form.assure.telephone} onChange={(e) => handleNestedChange('assure', 'telephone', e.target.value)} /> },
    { label: 'WhatsApp', value: form.assure.whatsapp, path: 'assure.whatsapp', kind: 'tel', edit: <Input {...INPUT_TEL} placeholder={BRAND.phonePlaceholder} className="h-8 max-md:h-12" value={form.assure.whatsapp} onChange={(e) => handleNestedChange('assure', 'whatsapp', e.target.value)} /> },
    { label: t('Téléphone 2'), value: form.assure.telephone2, path: 'assure.telephone2', kind: 'tel', edit: <Input {...INPUT_TEL} placeholder={BRAND.phonePlaceholder} className="h-8 max-md:h-12" value={form.assure.telephone2} onChange={(e) => handleNestedChange('assure', 'telephone2', e.target.value)} /> },
    { label: t('Email'), value: form.assure.email, path: 'assure.email', kind: 'email', edit: <Input {...INPUT_EMAIL} className="h-8 max-md:h-12" value={form.assure.email} onChange={(e) => handleNestedChange('assure', 'email', e.target.value)} /> },
    { label: t('Adresse'), value: form.assure.adresse, path: 'assure.adresse', kind: 'address', edit: <Input {...INPUT_ADDRESS} className="h-8 max-md:h-12" value={form.assure.adresse} onChange={(e) => handleNestedChange('assure', 'adresse', e.target.value)} /> },
    { label: t('CIN'), value: form.assure.cin, path: 'assure.cin', edit: <Input {...INPUT_ID} className="h-8 max-md:h-12" value={form.assure.cin} onChange={(e) => handleNestedChange('assure', 'cin', e.target.value)} /> },
  ];

  const vehiculeFields: FieldDef[] = [
    { label: t('Marque'), value: form.vehicule.marque, path: 'vehicule.marque', edit: <Input {...INPUT_TEXT} autoCapitalize="words" className="h-8 max-md:h-12" value={form.vehicule.marque} onChange={(e) => handleNestedChange('vehicule', 'marque', e.target.value)} /> },
    { label: t('Modèle'), value: form.vehicule.modele, path: 'vehicule.modele', edit: <Input {...INPUT_TEXT} autoCapitalize="words" className="h-8 max-md:h-12" value={form.vehicule.modele} onChange={(e) => handleNestedChange('vehicule', 'modele', e.target.value)} /> },
    { label: t('Immatriculation'), value: form.vehicule.immatriculation, path: 'vehicule.immatriculation', kind: 'plate', edit: <Input {...INPUT_PLATE} className="h-8 max-md:h-12 t-mono" value={form.vehicule.immatriculation} onChange={(e) => handleNestedChange('vehicule', 'immatriculation', e.target.value)} /> },
    { label: t('Numéro de série'), value: form.vehicule.serie, path: 'vehicule.serie', edit: <Input {...INPUT_ID} className="h-8 max-md:h-12" value={form.vehicule.serie} onChange={(e) => handleNestedChange('vehicule', 'serie', e.target.value)} /> },
    { label: t('Énergie'), value: form.vehicule.energie, path: 'vehicule.energie', edit: <Input {...INPUT_TEXT} className="h-8 max-md:h-12" value={form.vehicule.energie} onChange={(e) => handleNestedChange('vehicule', 'energie', e.target.value)} /> },
    { label: t('Puissance fiscale'), value: form.vehicule.puissance, path: 'vehicule.puissance', edit: <Input {...INPUT_NUMERIC} className="h-8 max-md:h-12" value={form.vehicule.puissance} onChange={(e) => handleNestedChange('vehicule', 'puissance', e.target.value)} /> },
    { label: t('Mise en circ. (Date)'), value: formatDateDisplay(form.vehicule.mec), path: 'vehicule.mec', edit: <DatePicker horizon="far" label={t('Mise en circ. (Date)')} className="h-8 max-md:h-12" value={form.vehicule.mec} onChange={(d) => handleNestedChange('vehicule', 'mec', d)} /> },
    { label: t('Kilométrage'), value: form.vehicule.km, path: 'vehicule.km', edit: <Input {...INPUT_NUMERIC} className="h-8 max-md:h-12" value={form.vehicule.km} onChange={(e) => handleNestedChange('vehicule', 'km', e.target.value)} /> },
    { label: t('Immatriculation antérieure'), value: form.vehicule.immatriculationAnterieur, path: 'vehicule.immatriculationAnterieur', kind: 'plate', edit: <Input {...INPUT_PLATE} className="h-8 max-md:h-12 t-mono" value={form.vehicule.immatriculationAnterieur} onChange={(e) => handleNestedChange('vehicule', 'immatriculationAnterieur', e.target.value)} /> },
  ];

  const intermediaireFields: FieldDef[] = [
    { label: t('Nom / Raison sociale'), value: form.intermediaireNom, path: 'intermediaireNom', pair: true, edit: <Input {...INPUT_NAME} className="h-8 max-md:h-12" value={form.intermediaireNom} onChange={(e) => handleChange('intermediaireNom', e.target.value)} /> },
    { label: t('Prénom'), value: form.intermediairePrenom, path: 'intermediairePrenom', pair: true, edit: <Input {...INPUT_NAME} className="h-8 max-md:h-12" value={form.intermediairePrenom} onChange={(e) => handleChange('intermediairePrenom', e.target.value)} /> },
    { label: t('Type'), value: form.intermediaireType, path: 'intermediaireType', edit: <Input {...INPUT_TEXT} className="h-8 max-md:h-12" value={form.intermediaireType} onChange={(e) => handleChange('intermediaireType', e.target.value)} /> },
    { label: t('Code Intermédiaire'), value: form.intermediaireCode, path: 'intermediaireCode', edit: <Input {...INPUT_ID} className="h-8 max-md:h-12" value={form.intermediaireCode} onChange={(e) => handleChange('intermediaireCode', e.target.value)} /> },
    { label: t('Compagnie'), value: form.intermediaireCompagnie, path: 'intermediaireCompagnie', edit: (
      <Select value={form.intermediaireCompagnie} onValueChange={(v) => handleChange('intermediaireCompagnie', v)}>
        <SelectTrigger className="h-8 max-md:h-12" aria-label={t('Compagnie')}><SelectValue placeholder={t('Sélectionner')} /></SelectTrigger>
        <SelectContent>{dbCompagnies.map((c: any) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
      </Select>
    ) },
    { label: t('Téléphone'), value: form.intermediaireTelephone, path: 'intermediaireTelephone', kind: 'tel', edit: <Input {...INPUT_TEL} placeholder={BRAND.phonePlaceholder} className="h-8 max-md:h-12" value={form.intermediaireTelephone} onChange={(e) => handleChange('intermediaireTelephone', e.target.value)} /> },
    { label: t('Email'), value: form.intermediaireEmail, path: 'intermediaireEmail', kind: 'email', edit: <Input {...INPUT_EMAIL} className="h-8 max-md:h-12" value={form.intermediaireEmail} onChange={(e) => handleChange('intermediaireEmail', e.target.value)} /> },
    { label: t('Adresse'), value: form.intermediaireAdresse, path: 'intermediaireAdresse', kind: 'address', edit: <Input {...INPUT_ADDRESS} className="h-8 max-md:h-12" value={form.intermediaireAdresse} onChange={(e) => handleChange('intermediaireAdresse', e.target.value)} /> },
  ];

  const adverseFields: FieldDef[] = [
    { label: t('Nom'), value: form.adverseNom, path: 'adverseNom', pair: true, edit: <Input {...INPUT_NAME} className="h-8 max-md:h-12" value={form.adverseNom} onChange={(e) => handleChange('adverseNom', e.target.value)} /> },
    { label: t('Prénom'), value: form.adversePrenom, path: 'adversePrenom', pair: true, edit: <Input {...INPUT_NAME} className="h-8 max-md:h-12" value={form.adversePrenom} onChange={(e) => handleChange('adversePrenom', e.target.value)} /> },
    { label: t('Téléphone'), value: form.adverseTelephone, path: 'adverseTelephone', kind: 'tel', edit: <Input {...INPUT_TEL} placeholder={BRAND.phonePlaceholder} className="h-8 max-md:h-12" value={form.adverseTelephone} onChange={(e) => handleChange('adverseTelephone', e.target.value)} /> },
    { label: t('Email'), value: form.adverseEmail, path: 'adverseEmail', kind: 'email', edit: <Input {...INPUT_EMAIL} className="h-8 max-md:h-12" value={form.adverseEmail} onChange={(e) => handleChange('adverseEmail', e.target.value)} /> },
    { label: t('Adresse'), value: form.adverseAdresse, path: 'adverseAdresse', kind: 'address', edit: <Input {...INPUT_ADDRESS} className="h-8 max-md:h-12" value={form.adverseAdresse} onChange={(e) => handleChange('adverseAdresse', e.target.value)} /> },
    { label: t('Compagnie'), value: form.adverseCompagnie, path: 'adverseCompagnie', edit: (
      <Select value={form.adverseCompagnie} onValueChange={(v) => handleChange('adverseCompagnie', v)}>
        <SelectTrigger className="h-8 max-md:h-12" aria-label={t('Compagnie')}><SelectValue placeholder={t('Sélectionner')} /></SelectTrigger>
        <SelectContent>{dbCompagnies.map((c: any) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
      </Select>
    ) },
    { label: t('Matricule'), value: form.adverseMatricule, path: 'adverseMatricule', kind: 'plate', edit: <Input {...INPUT_PLATE} className="h-8 max-md:h-12 t-mono" value={form.adverseMatricule} onChange={(e) => handleChange('adverseMatricule', e.target.value)} /> },
    { label: t('N° Permis'), value: form.adversePermis, path: 'adversePermis', edit: <Input {...INPUT_ID} className="h-8 max-md:h-12" value={form.adversePermis} onChange={(e) => handleChange('adversePermis', e.target.value)} /> },
  ];

  const expertRoles = visibleExpertRoles((form.expertRank as ExpertRole) || '1er');

  /** The fields a section sheet renders — the same objects the page renders. */
  const SECTIONS: Record<SectionKey, { title: string; fields: FieldDef[] }> = {
    dossier: { title: t('Informations Dossier'), fields: dossierFields },
    experts: {
      title: t('Experts'),
      fields: expertRoles.flatMap((role) => {
        const fields = expertFields(role).filter((f) => f.edit);
        // Several roles in one sheet → each gets its own sub-heading; a
        // single role needs none (the sheet title already says « Experts »).
        return expertRoles.length > 1
          ? [{ label: t(EXPERT_ROLE_LABELS[role]), value: '', heading: true } as FieldDef, ...fields]
          : fields;
      }),
    },
    assure: { title: t('Informations Assuré'), fields: assureFields },
    vehicule: { title: t('Véhicule'), fields: vehiculeFields },
    intermediaire: { title: t('Intermédiaire'), fields: intermediaireFields },
    adverse: { title: t('Partie Adverse'), fields: adverseFields },
  };

  /** Phone-only 44 px « Modifier » in a section header. */
  const sectionEdit = (key: SectionKey) =>
    canEdit ? (
      <Button
        type="button"
        variant="ghost"
        onClick={() => openSection(key)}
        className="h-11 gap-1.5 px-3 text-[14px] text-ink-2 md:hidden"
      >
        <Pencil className="h-4 w-4" /> {t('Modifier')}
      </Button>
    ) : null;

  /**
   * `EmptySection`'s « Modifier » is shared by both shells, so it decides at
   * CLICK time (never during render — that would be a hydration mismatch):
   * a phone opens the section sheet, a desk flips the whole form.
   */
  const editFrom = (key: SectionKey) => () => {
    const phone = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;
    if (phone) openSection(key);
    else setEditing(true);
  };

  /** Half-width section: full card, or — in read mode when nothing is filled
   *  in — a single quiet row that leads straight into edit mode. */
  const renderHalf = (key: SectionKey, title: string, icon: React.ReactNode, fields: FieldDef[]) =>
    !editing && fields.every(f => !f.value) ? (
      <EmptySection title={title} icon={icon} onEdit={canEdit ? editFrom(key) : undefined} />
    ) : (
      <Section title={title} icon={icon} actions={sectionEdit(key)}>
        {/* Phone read mode: one column, action values (§2.9). */}
        <div className="md:hidden">
          <PhoneFields fields={fields} />
        </div>
        <div className="hidden md:block">
          <FieldRow fields={fields} editing={editing} />
        </div>
      </Section>
    );

  // Edit / Save controls live in the identity block header (no dedicated row).
  // Below md they are hidden: the phone never edits 35 fields at once (§2.1).
  const editControls = canEdit ? (
    !editing ? (
      <Button type="button" size="sm" variant="outline" className="hidden h-7 gap-1.5 px-2.5 text-xs md:inline-flex" onClick={() => setEditing(true)} data-tour="dosd-info-edit">
        <Pencil className="h-3.5 w-3.5" /> {t('Modifier')}
      </Button>
    ) : (
      <>
        <Button type="button" size="sm" className="hidden h-7 gap-1.5 px-2.5 text-xs md:inline-flex" onClick={handleSave} disabled={saving}>
          <Check className="h-3.5 w-3.5" /> {saving ? t('Enregistrement…') : t('Enregistrer')}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="hidden h-7 gap-1.5 px-2.5 text-xs md:inline-flex" onClick={handleCancel}>
          <X className="h-3.5 w-3.5" /> {t('Annuler')}
        </Button>
      </>
    )
  ) : null;

  const openSheet = sheetSection ? SECTIONS[sheetSection] : null;

  return (
    <div className="space-y-4">
      {/* Crash-recovery banner: a draft only survives here if a previous edit
          session ended without Enregistrer/Annuler (power cut, crash, tab
          closed mid-edit). */}
      {canEdit && !editing && recovered && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-warning-fg/30 bg-status-warning-bg px-4 py-2.5 text-status-warning-fg"
        >
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {t('Brouillon non enregistré récupéré')}
              {recovered.savedAt.getTime() > 0 && (
                <> {t('du')} <strong>{format(recovered.savedAt, 'dd/MM/yyyy à HH:mm', { locale: dateFnsLocale() })}</strong></>
              )}
              .
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs max-md:h-11 max-md:text-[14px]" onClick={handleRestoreDraft}>
              {t('Restaurer')}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-status-warning-fg hover:text-status-warning-fg max-md:h-11 max-md:text-[14px]" onClick={clearDraft}>
              {t('Ignorer')}
            </Button>
          </div>
        </div>
      )}

      {/* ── DOSSIER (identity block, full width) + EXPERTS sub-block ── */}
      <Section
        title={t('Informations Dossier')}
        icon={<FileText />}
        actions={
          (headerActions || editControls || canEdit) ? (
            <>
              {headerActions}
              {editControls}
              {sectionEdit('dossier')}
            </>
          ) : undefined
        }
      >
        <div className="md:hidden">
          <PhoneFields fields={dossierFields} />
        </div>
        <div className="hidden md:block">
          <FieldRow cols="full" fields={dossierFields} editing={editing} />
        </div>

        <div className="mt-4 border-t border-hairline pt-4">
          <div className="mb-3 flex items-center justify-between gap-2 text-ink-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden />
              <h4 className="t-label">{t('Experts')}</h4>
            </div>
            {sectionEdit('experts')}
          </div>
          <div className="space-y-3">
            {expertRoles.map((role) => (
              <React.Fragment key={role}>
                <div className="md:hidden">
                  <p className="t-label mb-1 font-semibold text-ink-2">{t(EXPERT_ROLE_LABELS[role])}</p>
                  <PhoneFields fields={expertFields(role).slice(1)} />
                </div>
                <div className="hidden md:block">
                  <FieldRow
                    cols="full"
                    className="lg:grid-cols-[minmax(0,0.7fr)_repeat(4,minmax(0,1fr))]"
                    fields={expertFields(role)}
                    editing={editing}
                  />
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </Section>

      {/* ── ASSURÉ | VÉHICULE · INTERMÉDIAIRE | PARTIE ADVERSE ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {renderHalf('assure', t('Informations Assuré'), <User />, assureFields)}
        {renderHalf('vehicule', t('Véhicule'), <Car />, vehiculeFields)}
        {renderHalf('intermediaire', t('Intermédiaire'), <PenLine />, intermediaireFields)}
        {renderHalf('adverse', t('Partie Adverse'), <Users />, adverseFields)}
      </div>

      {/* ── Section edit sheet (phones) ────────────────────────────────
          One section, 5–11 fields, single column, 48 px controls. It writes
          through `handleSave` — the SAME whole-form canonicalising path the
          desktop mode uses — so nothing is dropped and the rappel draft
          buffer still sees one complete payload. */}
      {openSheet && (
        <FullScreenDialog
          open
          onOpenChange={(next) => {
            if (!next) closeSection(true);
          }}
          title={openSheet.title}
          dirty={sectionDirty}
          onDiscard={() => closeSection(true)}
          primary={{ label: saving ? t('Enregistrement…') : t('Enregistrer'), onClick: handleSave, loading: saving }}
        >
          <div className="grid gap-4">
            {(() => {
              const rows: React.ReactNode[] = [];
              const fields = openSheet.fields;
              for (let i = 0; i < fields.length; i += 1) {
                const f = fields[i];
                if (f.heading) {
                  rows.push(
                    <h4 key={`h-${f.label}-${i}`} className="t-heading mt-2 border-t border-hairline pt-4 first:mt-0 first:border-0 first:pt-0">
                      {f.label}
                    </h4>,
                  );
                  continue;
                }
                if (!f.edit) continue;
                // §2.1: a row may hold two controls ONLY for the single-entity
                // pairs (Nom | Prénom). Everything else is one per row.
                const next = fields[i + 1];
                if (f.pair && next?.pair && next.edit) {
                  rows.push(
                    <div key={f.label + i} className="grid grid-cols-2 gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="t-label">{f.label}</p>
                        {f.edit}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="t-label">{next.label}</p>
                        {next.edit}
                      </div>
                    </div>,
                  );
                  i += 1;
                  continue;
                }
                rows.push(
                  <div key={f.label + i} className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1">
                      <p className="t-label">{f.label}</p>
                      {f.modal}
                    </div>
                    {f.edit}
                  </div>,
                );
              }
              return rows;
            })()}
          </div>
        </FullScreenDialog>
      )}
    </div>
  );
}
