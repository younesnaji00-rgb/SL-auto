'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Loader2, Eye, ChevronDown, ChevronRight, CheckCircle2, Paperclip, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  collection, addDoc, serverTimestamp, orderBy, query, where,
  updateDoc, doc, arrayUnion, setDoc, Timestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirestore, useAuth, useCollection, useStorage } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions } from '@/hooks/use-options';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { addObservation, type VisibilityScope } from '@/app/(app)/dossiers/[id]/log-observation';
import { accordSlotFromValue } from '@/lib/docType-accorde';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';

// Label/value pairs for the per-observation visibility dropdown. Default on
// entry is 'all' ("À tous").
const VISIBILITY_SCOPE_OPTIONS: { value: VisibilityScope; label: string }[] = [
  { value: 'all',           label: 'À tous' },
  { value: 'gestionnaire',  label: 'Gestionnaire' },
  { value: 'chiffreur',     label: 'Chiffreur' },
  { value: 'agent_terrain', label: 'Agent de terrain' },
];

// F2 — Read-side filter for per-observation visibility scope.
// Rules:
//   - 'all' / undefined → visible to everyone.
//   - Author always sees their own observations regardless of scope.
//     (Observations carry `authorEmail`, not `authorUid`, so we match by email.)
//   - Super-roles (Admin / Directeur family) see everything.
//   - Otherwise, the user's role must map to the observation's scope.
const SUPER_ROLES = new Set([
  'Admin',
  'Directeur',
  'Directeur des opérations',
  'Directeur technique',
]);
const ROLE_TO_SCOPE: Record<string, VisibilityScope> = {
  'Gestionnaire':     'gestionnaire',
  'Chiffreur':        'chiffreur',
  // Codebase role string uses capital T (see src/lib/dossiers-data.ts).
  'Agent de Terrain': 'agent_terrain',
};
function canSeeObservation(
  obs: { visibilityScope?: string; authorEmail?: string },
  currentRole: string | undefined,
  currentEmail: string | undefined,
): boolean {
  if (!obs.visibilityScope || obs.visibilityScope === 'all') return true;
  if (obs.authorEmail && currentEmail && obs.authorEmail === currentEmail) return true;
  if (currentRole && SUPER_ROLES.has(currentRole)) return true;
  return ROLE_TO_SCOPE[currentRole ?? ''] === obs.visibilityScope;
}

type ProofFile = {
  url: string;
  name: string;
  uploadedBy: string;       // email
  uploadedByNom?: string;
  uploadedByRole?: string;
  uploadedAt: any;
};

type Observation = {
  id: string;
  text: string;
  type: 'Planification' | 'Décision de statut' | 'Expert' | 'Général';
  author: string;
  authorEmail: string;
  authorRole: string;
  source: string;
  createdAt: any;
  dossierId: string;
  // Item 014–016 — per-observation "Valider le traitement".
  traitementValideAt?: any;
  traitementValidePar?: string;     // email
  traitementValideParNom?: string;
  traitementProofs?: ProofFile[];
  // [observations] view-stamps — map of viewer emailKey -> view metadata.
  // emailKey is the viewer's email with `.` replaced by `_` (Firestore
  // dot-notation parses `.` in field paths as nesting).
  viewedBy?: Record<string, { name: string; role?: string; viewedAt: any }>;
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  'Planification':      'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
  'Décision de statut': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  'Expert':             'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  'Général':            'bg-secondary text-secondary-foreground',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  'Admin':                'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200',
  'Responsable d\'équipe':'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
  'Gestionnaire':         'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200',
  'Agent de Terrain':     'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  'Chiffreur':            'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
};

type PhaseATG = 'Avant' | 'En cours' | 'Après';
type AccordSlot = '1er accord' | '2ème accord ou +';

type ObservationsTabProps = {
  dossierId: string;
  section: 'dossiers' | 'assignations-atg' | 'assignations-chiffrage';
  variant?: 'tab' | 'collapsible';
  /** Scope the panel to a planification phase. Filters list AND auto-tags
   *  new observations written from this panel. */
  contextPhase?: PhaseATG;
  /** Scope the panel to an accord context. Filters list AND auto-tags new
   *  observations written from this panel. */
  contextAccord?: AccordSlot;
};

export default function ObservationsTab({
  dossierId,
  section,
  variant = 'tab',
  contextPhase,
  contextAccord,
}: ObservationsTabProps) {
  const db = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { canWrite, profile } = useCurrentUser();
  const { toast } = useToast();
  // Q-5 → B: gestionnaire + admin + directeur family can validate.
  const role = profile?.role;
  const canValidate =
    section !== 'assignations-atg' &&
    (role === 'Gestionnaire' ||
      role === 'Admin' ||
      role === 'Directeur' ||
      role === 'Directeur des opérations' ||
      role === 'Directeur technique');
  // Validation + proof are mutually exclusive concerns:
  //   - Only Gestionnaire flips the "Valider le traitement" flag.
  //   - Anyone whose canAdd is true on this section may upload proofs once
  //     the observation has been validated (chiffreur from the chiffrage
  //     view, AT from the ATG view, gestionnaire / admin / dir anywhere).
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [uploadingProofFor, setUploadingProofFor] = useState<string | null>(null);
  const proofInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const canAdd = canWrite(section);

  const [selectedPreset, setSelectedPreset] = useState('');
  const [customText, setCustomText] = useState('');
  const [pendingProofs, setPendingProofs] = useState<File[]>([]);
  const newProofInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Collapsible variant defaults to CLOSED so observations don't dominate the
  // step's vertical space. Unread count below acts as the notification.
  const [isOpen, setIsOpen] = useState(false);

  // Persist the timestamp of the last time this user opened the observations
  // panel for this dossier+section, so a count of new observations since that
  // moment can drive a notification dot.
  const lastSeenStorageKey = `observations-${section}-${dossierId}-lastSeenAt`;
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = window.localStorage.getItem(lastSeenStorageKey);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  });

  // Mark as seen when the user opens the panel — clears the badge.
  useEffect(() => {
    if (!isOpen) return;
    const now = Date.now();
    setLastSeenAt(now);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(lastSeenStorageKey, String(now)); } catch { /* quota */ }
    }
  }, [isOpen, lastSeenStorageKey]);

  const { options: observationPresets, loading: presetsLoading } = useOptions('options_observations');
  const activePresets = useMemo(
    () => observationPresets.filter((o) => o.active !== false),
    [observationPresets]
  );

  const obsQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collection(db, 'dossiers', dossierId, 'observations'),
      orderBy('createdAt', 'desc')
    );
  }, [db, dossierId]);

  const { data: rawObservations, loading } = useCollection<Observation>(obsQuery as any);

  // Dynamic "à propos de quel accord" options — populated from every chiffrage
  // round assigned to this chiffreur on this dossier. Keys of
  // `structuredEditables` are the exact accord/proposition docType labels
  // ("Devis 2ème accord", "1ère proposition d'accord (devis)", …). Only
  // queried when the chiffrage compose form actually needs to render the
  // picker (chiffreur opens from the chiffrage list view).
  const needsChiffrageAccordPick = section === 'assignations-chiffrage' && !contextAccord;
  const chiffragesQuery = useMemo(() => {
    if (!db || !needsChiffrageAccordPick || !profile?.uid) return null;
    return query(
      collection(db, 'chiffrages'),
      where('dossierId', '==', dossierId),
      where('assignedChiffreurId', '==', profile.uid),
    );
  }, [db, dossierId, profile?.uid, needsChiffrageAccordPick]);
  const { data: myChiffrages } = useCollection<any>(chiffragesQuery as any);
  const dynamicAccordOptions = useMemo(() => {
    if (!myChiffrages) return [] as string[];
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const c of myChiffrages) {
      const struct = (c as any).structuredEditables || {};
      for (const key of Object.keys(struct)) {
        if (typeof key === 'string' && key.trim() && !seen.has(key)) {
          seen.add(key);
          ordered.push(key);
        }
      }
    }
    return ordered;
  }, [myChiffrages]);

  // Round 8 — context-driven visibility (REPLACES the round-7 cross-role
  // filter). Each observation can carry a `phaseATG` tag (planification
  // context) or an `accordSlot` tag (accord context). The panel's
  // contextPhase / contextAccord props determine which obs are visible.
  // Legacy obs (no tag) fall back per Q-4 → A.
  const observations = useMemo(() => {
    if (!rawObservations) return [];
    // F2 — Per-observation visibility scope filter. Applied BEFORE context
    // filtering so legacy/context logic below is untouched.
    const scoped = rawObservations.filter((o) =>
      canSeeObservation(o as any, profile?.role, profile?.email)
    );
    const filtered = scoped.filter((o) => {
      const oPhase = (o as any).phaseATG as PhaseATG | undefined;
      const oAccordRaw = (o as any).accordSlot as string | undefined;
      // accordSlot can be a coarse legacy slot ('1er accord' / '2ème accord
      // ou +') or a specific docType ('Devis 2ème accord', "1ère proposition
      // d'accord (devis)", …). Derive the coarse slot so the timeline panels
      // route both shapes correctly.
      const oAccordSlot = accordSlotFromValue(oAccordRaw);
      const isLegacy = !oPhase && !oAccordRaw;
      const isAllScope = !((o as any).visibilityScope) || (o as any).visibilityScope === 'all';

      if (contextPhase) {
        // Phase-scoped panel: show obs tagged with this exact phase plus
        // legacy AT/dossiers obs (no tag, no accord).
        if (oPhase === contextPhase) return true;
        if (isLegacy && (o.source === 'assignations-atg' || o.source === 'dossiers')) return true;
        return false;
      }
      if (contextAccord) {
        // Accord-scoped panel: show obs whose derived slot matches this
        // panel's contextAccord, plus legacy chiffreur/dossiers obs (only
        // for step 6 = '1er accord').
        if (oAccordSlot === contextAccord) return true;
        if (isLegacy && contextAccord === '1er accord' &&
            (o.source === 'assignations-chiffrage' || o.source === 'dossiers')) return true;
        return false;
      }
      // No explicit context — fall back to section-scoped views:
      //   - assignations-chiffrage list view: any accord-tagged obs + legacy chiffreur/dossiers
      //   - assignations-atg list view: any phase-tagged obs + legacy AT/dossiers
      //   - dossiers (no context): show everything (gestionnaire's main view never lands here today)
      if (section === 'assignations-chiffrage') {
        if (isAllScope) return true;
        if (oAccordRaw) return true;
        if (isLegacy && (o.source === 'assignations-chiffrage' || o.source === 'dossiers')) return true;
        return false;
      }
      if (section === 'assignations-atg') {
        if (isAllScope) return true;
        if (oPhase) return true;
        if (isLegacy && (o.source === 'assignations-atg' || o.source === 'dossiers')) return true;
        return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA;
    });
  }, [rawObservations, contextPhase, contextAccord, section, profile?.role, profile?.email]);

  // [observations] view-stamps — fire-and-forget per-observation write that
  // records the current viewer's email+name+timestamp on the observation
  // doc's `viewedBy` map. Author self-views are skipped. We track in-flight
  // ids in a ref so parent re-renders don't re-fire the write before the
  // Firestore snapshot echoes the new `viewedBy` entry back.
  const markedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!db) return;
    const email = profile?.email;
    if (!email) return;
    const emailKey = email.replace(/\./g, '_');
    const viewerName = profile?.nom || email;
    const viewerRole = profile?.role;
    for (const obs of observations) {
      if (markedRef.current.has(obs.id)) continue;
      if (obs.authorEmail === email) continue;
      if (obs.viewedBy && obs.viewedBy[emailKey]) continue;
      markedRef.current.add(obs.id);
      const payload: Record<string, any> = { name: viewerName, viewedAt: Timestamp.now() };
      if (viewerRole) payload.role = viewerRole;
      setDoc(
        doc(db, 'dossiers', dossierId, 'observations', obs.id),
        { viewedBy: { [emailKey]: payload } },
        { merge: true },
      ).catch((err) => {
        // Don't crash the UI; allow a future render to retry by clearing
        // the in-flight marker.
        console.error('view-stamp write failed', obs.id, err);
        markedRef.current.delete(obs.id);
      });
    }
  }, [db, dossierId, observations, profile?.email, profile?.nom, profile?.role]);

  // Count of observations newer than the last time the panel was opened by
  // this user on this device. While the panel is open we treat new docs as
  // already seen (lastSeenAt is bumped on open via the effect above).
  const unseenCount = useMemo(() => {
    if (!observations.length) return 0;
    if (isOpen) return 0;
    let n = 0;
    for (const o of observations) {
      const t = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : 0;
      if (t > lastSeenAt) n += 1;
    }
    return n;
  }, [observations, lastSeenAt, isOpen]);

  const presetFilled = selectedPreset.trim().length > 0;
  const customFilled = customText.trim().length > 0;
  // Exclusive OR — both filled means the gestionnaire must clear one before
  // sending. Matches round 7 Q-7 answer C (reject when both filled).
  const bothFilled = presetFilled && customFilled;

  // When the chiffreur writes from the chiffrage list view (no contextAccord
  // prop), they pick an accord context from a Select before submission. The
  // picked value — the specific docType label they were working on — becomes
  // the `accordSlot` tag on the observation. The list of options is
  // dynamicAccordOptions, computed above from their chiffrage rounds. If no
  // options exist (chiffreur has nothing on this dossier yet), the picker
  // hides and the observation is sent without a scope tag.
  const [chiffrageAccordChoice, setChiffrageAccordChoice] = useState<string>('');
  const chiffrageAccordMissing =
    needsChiffrageAccordPick && dynamicAccordOptions.length > 0 && !chiffrageAccordChoice;

  // Per-observation visibility scope — UI on entry; persisted alongside other
  // observation fields. Default 'all' is set here (not lazily) so no path can
  // produce undefined for new entries.
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScope>('all');

  const submitDisabled =
    (!presetFilled && !customFilled) ||
    bothFilled ||
    isSubmitting ||
    chiffrageAccordMissing ||
    pendingProofs.length === 0;

  const handleValidate = async (obsId: string) => {
    if (!db || !canValidate) return;
    setValidatingId(obsId);
    try {
      const userEmail = auth?.currentUser?.email || profile?.email || '';
      const userNom = profile?.nom || userEmail;
      await updateDoc(doc(db, 'dossiers', dossierId, 'observations', obsId), {
        traitementValideAt: serverTimestamp(),
        traitementValidePar: userEmail,
        traitementValideParNom: userNom,
      });
      toast({ title: 'Traitement validé' });
    } catch (err: any) {
      console.error('Validate observation error:', err);
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Impossible de valider.' });
    } finally {
      setValidatingId(null);
    }
  };

  const handleProofUpload = async (obsId: string, files: FileList) => {
    if (!db || !storage || files.length === 0) return;
    setUploadingProofFor(obsId);
    try {
      const userEmail = auth?.currentUser?.email || profile?.email || '';
      const userNom = profile?.nom || userEmail;
      const userRole = profile?.role || '';
      const uploaded: ProofFile[] = [];
      for (const file of Array.from(files)) {
        const path = `dossiers/${dossierId}/observations/${obsId}/${Date.now()}_${file.name}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, file);
        const url = await getDownloadURL(ref);
        uploaded.push({
          url,
          name: file.name,
          uploadedBy: userEmail,
          uploadedByNom: userNom,
          uploadedByRole: userRole,
          uploadedAt: new Date(),
        });
      }
      await updateDoc(doc(db, 'dossiers', dossierId, 'observations', obsId), {
        traitementProofs: arrayUnion(...uploaded),
      });
      toast({ title: `${uploaded.length} preuve(s) ajoutée(s)` });
    } catch (err: any) {
      console.error('Proof upload error:', err);
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Impossible d\'envoyer la preuve.' });
    } finally {
      setUploadingProofFor(null);
    }
  };

  const handleSubmit = async () => {
    if (!db || submitDisabled) return;
    setIsSubmitting(true);

    const userEmail = auth?.currentUser?.email || 'Admin';
    const userName = profile?.nom || userEmail;
    const userRole = profile?.role || 'Admin';
    const text = (customFilled ? customText : selectedPreset).trim();

    // Round 8 Q-1 + Q-2 + Q-3: writes carry the panel's context tag so the
    // observation is naturally scoped to where it was authored. For the
    // chiffrage list view (no contextAccord prop), the chiffreur picks via
    // an inline Select (chiffrageAccordChoice).
    const phaseTag = contextPhase ?? null;
    const accordTag = contextAccord ?? (needsChiffrageAccordPick ? (chiffrageAccordChoice || null) : null);

    try {
      if (pendingProofs.length === 0 || !storage) {
        await addObservation(
          db, dossierId, text, 'Général', userName, userEmail, userRole, section,
          phaseTag, accordTag, visibilityScope,
        );
      } else {
        // Pre-allocate the observation doc ID so storage paths can use it.
        const obsCollRef = collection(db, 'dossiers', dossierId, 'observations');
        const newObsRef = doc(obsCollRef);
        const obsId = newObsRef.id;

        const uploaded: ProofFile[] = [];
        for (const file of pendingProofs) {
          const path = `dossiers/${dossierId}/observations/${obsId}/${Date.now()}_${file.name}`;
          const sRef = storageRef(storage, path);
          await uploadBytes(sRef, file);
          const url = await getDownloadURL(sRef);
          uploaded.push({
            url,
            name: file.name,
            uploadedBy: userEmail,
            uploadedByNom: userName,
            uploadedByRole: userRole,
            uploadedAt: new Date(),
          });
        }

        const docPayload: Record<string, any> = {
          text,
          type: 'Général',
          author: userName,
          authorEmail: userEmail,
          authorRole: userRole,
          source: section,
          createdAt: serverTimestamp(),
          dossierId,
          visibilityScope,
        };
        if (phaseTag) docPayload.phaseATG = phaseTag;
        if (accordTag) docPayload.accordSlot = accordTag;
        docPayload.traitementProofs = uploaded;

        await setDoc(newObsRef, docPayload);
      }

      setSelectedPreset('');
      setCustomText('');
      setChiffrageAccordChoice('');
      setPendingProofs([]);
      setVisibilityScope('all');
      toast({ title: 'Observation ajoutée' });
    } catch (err: any) {
      console.error('Failed to add observation:', err);
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || "Impossible d'ajouter l'observation." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Compose area */}
      {canAdd && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Select
                value={selectedPreset}
                onValueChange={setSelectedPreset}
                disabled={presetsLoading || activePresets.length === 0 || customFilled}
              >
                <SelectTrigger className="text-sm pr-14">
                  <SelectValue
                    placeholder={
                      presetsLoading
                        ? 'Chargement…'
                        : activePresets.length === 0
                          ? 'Aucune observation disponible'
                          : 'Choisir une observation...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {activePresets.map((opt) => (
                    <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Round 8 item 008 — inline X clears the selected preset so the
                  user can switch to custom text. Positioned at right-9 to sit
                  clear of the Radix Select chevron (which lives at right-3
                  inside a ~28px hit area). Round 9 item 003 — fixed overlap. */}
              {presetFilled && (
                <button
                  type="button"
                  aria-label="Effacer la sélection"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedPreset(''); }}
                  className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm z-10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <OptionsManagerModal
              collectionName="options_observations"
              title="Observations"
              defaultValues={['Assuré injoignable', 'Véhicule hors ville d\'expertise', 'Autre']}
            />
          </div>
          {/* Chiffrage compose form: pick which accord/proposition this
              observation concerns. Options are the exact docType labels the
              chiffreur has been assigned on this dossier (deduped across
              their chiffrage rounds). Hidden when no rounds exist yet — the
              chiffreur can still send an untagged observation. Only rendered
              when the panel has no contextAccord prop (chiffrage list view,
              not a scoped dossier step). */}
          {needsChiffrageAccordPick && dynamicAccordOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={chiffrageAccordChoice} onValueChange={setChiffrageAccordChoice}>
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="À propos de quel accord ?" />
                </SelectTrigger>
                <SelectContent>
                  {dynamicAccordOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Ou écrivez une observation personnalisée…"
            rows={2}
            disabled={presetFilled}
            className="text-sm"
          />
          {bothFilled && (
            <p className="text-[11px] text-destructive">
              Choisissez une observation prédéfinie OU écrivez du texte personnalisé, pas les deux.
            </p>
          )}
          {chiffrageAccordMissing && (presetFilled || customFilled) && (
            <p className="text-[11px] text-destructive">
              Sélectionnez à propos de quel accord.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {/* Visibility scope — who sees this observation. Default 'all'.
                Persistence only for now; filter on read is deferred (F2). */}
            <Select
              value={visibilityScope}
              onValueChange={(v) => setVisibilityScope(v as VisibilityScope)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                className="h-8 w-[160px] text-xs"
                aria-label="Visibilité de l'observation"
              >
                <Eye className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Hide the current user's own role from the list — sending an
                    observation only to your own role is redundant. Admin/Directeur
                    roles aren't in ROLE_TO_SCOPE, so they see every option. */}
                {VISIBILITY_SCOPE_OPTIONS.filter((opt) => opt.value !== ROLE_TO_SCOPE[profile?.role ?? '']).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={newProofInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) setPendingProofs((prev) => [...prev, ...Array.from(e.target.files!)]);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => newProofInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attacher une preuve
            </Button>
            {pendingProofs.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {pendingProofs.length} fichier{pendingProofs.length > 1 ? 's' : ''} à joindre
              </span>
            )}
            {pendingProofs.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-destructive"
                onClick={() => setPendingProofs([])}
                disabled={isSubmitting}
              >
                <X className="h-3 w-3" />
                Annuler
              </Button>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className="h-8 text-xs gap-1.5"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Envoyer
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement...
        </div>
      ) : observations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Eye className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Aucune observation pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {observations.map((obs) => {
            const isValidated = !!obs.traitementValideAt;
            const proofs = obs.traitementProofs || [];
            // [observations] view-stamps — sort viewers by viewedAt ascending
            // (earliest first), keep the first 3 for the caption, and show
            // "+N autres" for the rest. Skip the caption entirely when no one
            // has viewed yet.
            const viewerEntries = Object.entries(obs.viewedBy || {})
              .map(([, v]) => v)
              .filter((v): v is { name: string; role?: string; viewedAt: any } => !!v && !!v.name)
              .sort((a, b) => {
                const ta = a.viewedAt?.toDate ? a.viewedAt.toDate().getTime() : 0;
                const tb = b.viewedAt?.toDate ? b.viewedAt.toDate().getTime() : 0;
                return ta - tb;
              });
            const firstViewers = viewerEntries.slice(0, 3);
            const extraViewers = Math.max(0, viewerEntries.length - 3);
            return (
              <div key={obs.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                    {(obs.author || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="text-sm font-semibold truncate">{obs.author || 'Inconnu'}</span>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', ROLE_BADGE_STYLES[obs.authorRole] || '')}>
                      {obs.authorRole || 'N/A'}
                    </Badge>
                    <Badge className={cn('text-[10px] px-1.5 py-0 border-0', TYPE_BADGE_STYLES[obs.type] || TYPE_BADGE_STYLES['Général'])}>
                      {obs.type}
                    </Badge>
                    {(obs as any).accordSlot && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-primary/40 text-primary"
                        title="À propos de"
                      >
                        {(obs as any).accordSlot}
                      </Badge>
                    )}
                    {obs.createdAt?.toDate && (
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {format(obs.createdAt.toDate(), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{obs.text}</p>

                  {/* Item 014 — gestionnaire-only "Valider le traitement" button.
                      Once flipped, item 015/016 show a green badge + proof
                      upload affordance for everyone with canAdd on the section. */}
                  {isValidated ? (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-700 dark:text-emerald-300">
                        Traitement validé
                        {obs.traitementValideParNom ? ` par ${obs.traitementValideParNom}` : ''}
                        {obs.traitementValideAt?.toDate ? ` — ${format(obs.traitementValideAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: fr })}` : ''}
                      </span>
                    </div>
                  ) : (
                    canValidate && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1.5 mt-1"
                        onClick={() => handleValidate(obs.id)}
                        disabled={validatingId === obs.id}
                      >
                        {validatingId === obs.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Valider le traitement
                      </Button>
                    )
                  )}

                  {/* Proofs list */}
                  {proofs.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {proofs.map((p, i) => (
                        <a
                          key={i}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-background hover:bg-accent transition-colors"
                          title={`${p.name} — ${p.uploadedByNom || p.uploadedBy}${p.uploadedAt?.toDate ? ` (${format(p.uploadedAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: fr })})` : ''}`}
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="truncate max-w-[140px]">{p.name}</span>
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Proof upload affordance — visible once validated, to any
                      role with canAdd (chiffreur from chiffrage view, AT from
                      ATG view, gestionnaire/admin/dir anywhere). */}
                  {isValidated && canAdd && (
                    <div className="mt-1.5">
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        className="hidden"
                        ref={(el) => { proofInputRefs.current[obs.id] = el; }}
                        onChange={(e) => e.target.files && handleProofUpload(obs.id, e.target.files)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] gap-1.5 px-2"
                        disabled={uploadingProofFor === obs.id}
                        onClick={() => proofInputRefs.current[obs.id]?.click()}
                      >
                        {uploadingProofFor === obs.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                        Ajouter une preuve
                      </Button>
                    </div>
                  )}

                  {/* [observations] view-stamps — subtle caption listing who
                      viewed this observation and when. Hidden entirely when
                      no one has viewed yet. */}
                  {firstViewers.length > 0 && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      Vu par{' '}
                      {firstViewers.map((v, i) => {
                        const d = v.viewedAt?.toDate ? v.viewedAt.toDate() : null;
                        const when = d ? format(d, 'd MMM HH:mm', { locale: fr }) : '';
                        return (
                          <span key={i}>
                            {i > 0 ? ', ' : ''}
                            {v.name}
                            {v.role ? ` — ${v.role}` : ''}
                            {when ? ` (${when})` : ''}
                          </span>
                        );
                      })}
                      {extraViewers > 0 && `, +${extraViewers} autre${extraViewers > 1 ? 's' : ''}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (variant === 'collapsible') {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Observations</span>
                {observations.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {observations.length}
                  </Badge>
                )}
                {unseenCount > 0 && (
                  <Badge className="text-[10px] h-5 px-1.5 bg-red-500 text-white hover:bg-red-500" aria-label={`${unseenCount} nouvelles observations`}>
                    {unseenCount} nouvelle{unseenCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              {content}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return content;
}
