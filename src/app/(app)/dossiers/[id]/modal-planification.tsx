
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, Clock, TriangleAlert } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, setDoc, serverTimestamp, Timestamp, query, where, limit } from 'firebase/firestore';
import { getDocs } from '@/lib/firestore-logged';
import { useFirestore, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format, startOfToday, formatDistanceToNow } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { logHistorique, logWorkflow } from './log-historique';
import { addObservation } from './log-observation';
import { PLANIFICATIONS_SAVED_EVENT } from './planification-tab';
import { useOptions, type Option } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAgentTerrainWorkload } from '@/hooks/use-workload-counts';
import { deriveStatus } from '@/lib/status-machine';
import { useAtgFeasibility } from '@/hooks/use-atg-feasibility';
import { useAgentLiveLocation } from '@/hooks/use-agent-live-location';
import { useDestinationCity } from '@/hooks/use-destination-city';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDurationFr } from '@/lib/atg-feasibility';
import { MapPin } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { tourDialogGuard } from '@/lib/tutorial/dialog-guard';
import { cn } from '@/lib/utils';
import { INPUT_ADDRESS } from '@/lib/input-attrs';
import { FormErrorSummary, useFormErrors, type FieldRule } from '@/components/ui/form';
import { useTutorialMode } from '@/lib/tutorial/use-tutorial-mode';
import { normalizeTypeMission } from '@/lib/type-mission';
import { logFrontend } from '@/lib/debug-log';

/** If `input` is a Google Maps URL with embedded coordinates, returns {lat,lng}; else null. */
function parseMapsCoords(input: string): { lat: number; lng: number } | null {
  if (!input || !input.startsWith('http')) return null;
  const patterns: RegExp[] = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = input.match(re);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

type ModalPlanificationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  dossierId: string;
  dossierData?: { refExpert?: string; assure?: any; compagnie?: string; expertRank?: string; dateMissionAgentTerrain?: any };
  defaultTypeMission?: 'Avant' | 'En cours' | 'Après';
  defaultAgentTerrain?: string;
};

export default function ModalPlanification({ open, onOpenChange, initialData, dossierId, dossierData, defaultTypeMission, defaultAgentTerrain }: ModalPlanificationProps) {
  const t = useT();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { profile } = useCurrentUser();
  const isCurrentUserAT = profile?.role === 'Agent de Terrain';
  // Tutorial mode (demo brand, or a guided tour running for an allowed
  // role): the user's own browser position plays the field
  // agent's live GPS (disclosed in the UI) — the demo agents have no
  // connected phone, and the feature deserves to be SEEN.
  const tutorialMode = useTutorialMode();
  const demoSelfAsAgent = tutorialMode && !isCurrentUserAT;
  const [loading, setLoading] = useState(false);
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [selfLocation, setSelfLocation] = useState<{ lat: number; lng: number; updatedAtMs: number } | null>(null);
  const [selfLocationPending, setSelfLocationPending] = useState(false);

  // Field agents planning their OWN mission: their position is the subject of
  // the form, so it is read as soon as the dialog opens.
  useEffect(() => {
    if (!open || !isCurrentUserAT) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setSelfLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAtMs: Date.now() });
      },
      () => { /* permission denied — silently leave null */ },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
    return () => { cancelled = true; };
  }, [open, isCurrentUserAT]);

  // Demo brand: the demo user's browser position stands in for the agent's
  // live GPS — but ONLY once they explicitly ask for it. Merely opening the
  // appointment dialog must never raise a browser permission prompt.
  const requestSelfLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setSelfLocationPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelfLocationPending(false);
        setSelfLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAtMs: Date.now() });
      },
      () => setSelfLocationPending(false),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const { options: dbRDVTypes } = useOptions('options_types_rdv');
  const rdvTypes = useMemo(() => dbRDVTypes.filter(o => o.active !== false), [dbRDVTypes]);

  const { options: dbAgents } = useOptions('options_agents');
  const agents = useMemo<Option[]>(() => dbAgents.filter(o => o.active !== false), [dbAgents]);

  const { options: dbObservationPresets, loading: observationPresetsLoading } = useOptions('options_observations');
  const activeObservationPresets = useMemo(
    () => dbObservationPresets.filter((o) => o.active !== false),
    [dbObservationPresets],
  );

  const [agentZoneFilter, setAgentZoneFilter] = useState('');

  const availableAgentZones = useMemo(() => {
    const zones = new Set<string>();
    for (const agent of agents) {
      const z = agent.zone?.trim();
      if (z) zones.add(z);
    }
    return Array.from(zones).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [agents]);

  const filteredAgents = useMemo(() => {
    if (agentZoneFilter === '') return agents;
    return agents.filter((a) => (a.zone?.trim() || '') === agentZoneFilter);
  }, [agents, agentZoneFilter]);

  const [formData, setFormData] = useState({
    agentTerrain: '',
    typeMission: '',
    dateRDV: null as Date | null,
    timeRDV: '09:00',
    adresse: '',
    observation: '',
    observationCustomText: '',
  });

  // Unsaved-work guard (§2.5): « × » / Escape / scrim / Android back on a
  // touched form ask « Abandonner les modifications ? ». The baseline is
  // whatever the form held when the dialog last opened (a fresh dialog, or the
  // planification being edited).
  const [baseline, setBaseline] = useState('');
  const isDirty = baseline !== '' && JSON.stringify(formData) !== baseline;
  useEffect(() => {
    if (!open) return;
    // One frame after the hydrate effects have run.
    const id = window.setTimeout(() => setBaseline(JSON.stringify(formData)), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  // No « ma position » control on the address field any more (QA bug 044):
  // the rendez-vous address is the INSURED's, typed by the gestionnaire; a
  // button that swapped it for the gestionnaire's own GPS had no use here and
  // once overwrote typed addresses silently (QA bug 018). The agent's live
  // position is read on its own for the feasibility check.

  // Agent workload scoped to the RDV date currently selected, so each agent's
  // count reflects only that day's active planifications. Falls back to the
  // all-days total when no date has been picked yet.
  const agentWorkload = useAgentTerrainWorkload(formData.dateRDV);

  // Start-of-day millis of the selected RDV date (null when none selected).
  const selectedDayStartMs = useMemo(() => {
    if (!formData.dateRDV) return null;
    const s = new Date(formData.dateRDV);
    s.setHours(0, 0, 0, 0);
    return s.getTime();
  }, [formData.dateRDV]);

  // In day-scoped mode the planification being edited is only part of the
  // count when its saved RDV falls on the selected day.
  const editedPlanifOnSelectedDay = useMemo(() => {
    if (!initialData?.id || selectedDayStartMs == null) return false;
    const raw = initialData.dateRDV;
    if (!raw) return false;
    const d = typeof raw.toDate === 'function' ? raw.toDate() : new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() === selectedDayStartMs;
  }, [initialData, selectedDayStartMs]);

  useEffect(() => {
    if (initialData && open) {
      let dateRDV = null;
      let timeRDV = '09:00';
      if (initialData.dateRDV) {
        const d = initialData.dateRDV.toDate ? initialData.dateRDV.toDate() : new Date(initialData.dateRDV);
        dateRDV = d;
        timeRDV = format(d, 'HH:mm');
      }
      setFormData({
        agentTerrain: initialData.agentTerrain || '',
        typeMission: initialData.typeMission || 'Avant',
        dateRDV,
        timeRDV,
        adresse: initialData.adresse || '',
        observation: initialData.observation || '',
        observationCustomText: initialData?.observationCustomText || '',
      });
    } else if (open) {
      setFormData({ agentTerrain: defaultAgentTerrain ?? '', typeMission: defaultTypeMission ?? 'Avant', dateRDV: null, timeRDV: '09:00', adresse: '', observation: '', observationCustomText: initialData?.observationCustomText || '' });
    }
  }, [initialData, open, defaultTypeMission, defaultAgentTerrain]);

  const agentLive = useAgentLiveLocation(formData.agentTerrain);
  // Demo brand: fall back to the demo user's own position when the agent
  // has no fresh GPS fix (always the case for the seeded demo agents).
  const demoSelfLocationActive =
    demoSelfAsAgent && !agentLive.isFresh && !!selfLocation;
  const effectiveLocation = isCurrentUserAT
    ? selfLocation
    : demoSelfLocationActive
      ? selfLocation
      : agentLive.location;
  const effectiveIsFresh = isCurrentUserAT
    ? !!selfLocation
    : demoSelfLocationActive || agentLive.isFresh;

  // True when an agent is selected but their fresh GPS position is not
  // available (denied / no last-known location / no UID match). Drives the
  // "Position non disponible" alert with the « Demander la localisation »
  // request button.
  // NOT gated on `agentLive.agentUid`: when the dropdown label matches no
  // user account (seeded « Agent 1 », a renamed agent…) the uid stays null
  // and the whole block used to vanish on switching agents. Now it stays and
  // explains why the position cannot be requested.
  const isAgentLocationUnavailable =
    !!formData.agentTerrain && !agentLive.isFresh && !demoSelfLocationActive;

  // A self-location obtained for one agent (demo/tour stand-in) must not
  // silently pose as the next agent's position.
  useEffect(() => {
    if (isCurrentUserAT) return;
    setSelfLocation(null);
    setSelfLocationPending(false);
  }, [formData.agentTerrain, isCurrentUserAT]);

  // Resolve the displayed coords (the agent's live position, or — when the
  // current user is the AT — their own browser position) to a human-readable
  // address via the server-side Nominatim proxy. `apiFetch` attaches the
  // Firebase ID token the route's `requireAuth` requires; a plain `fetch`
  // would 401 and silently fall back to raw coordinates. Reset on every coord
  // change so the previous address doesn't flash while the new lookup runs.
  useEffect(() => {
    setAgentAddress(null);
    if (!effectiveIsFresh || !effectiveLocation) return;
    const { lat, lng } = effectiveLocation;
    let cancelled = false;
    apiFetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.formatted === 'string' && data.formatted) {
          logFrontend('modal-planification ← /api/reverse-geocode (position agent)', { agentAddress: data.formatted });
          setAgentAddress(data.formatted);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [effectiveIsFresh, effectiveLocation?.lat, effectiveLocation?.lng]);

  const {
    conflicts: feasibilityConflicts,
    unavailable: feasibilityUnavailable,
    pastRdv: feasibilityPastRdv,
  } = useAtgFeasibility({
    agentName: formData.agentTerrain,
    dateRDV: formData.dateRDV,
    timeRDV: formData.timeRDV,
    adresse: formData.adresse,
    excludeId: initialData?.id ?? null,
    agentLiveLocation: effectiveLocation,
  });

  // « Destination hors de Casablanca / hors de Fès » (owner request
  // 2026-09-25): the account's sites (Utilisateurs → « Sites ») against the
  // city Google resolves the address to. A warning only — saving stays
  // possible — and an account with no site set sees nothing.
  const accountSites = profile?.sites ?? [];
  const destinationCity = useDestinationCity(formData.adresse, accountSites);
  const outsideSites = !!destinationCity && destinationCity.insideSites.length === 0;

  // Validation timing (§2.6): required-empty errors ONLY on submit, then per
  // keystroke on the fields that failed; a summary at the top of the body with
  // links that move focus (GOV.UK error summary); the primary is never
  // disabled (Smashing: "Keep buttons enabled. Validate on submission.").
  const rules = React.useMemo<FieldRule<typeof formData>[]>(() => {
    const list: FieldRule<typeof formData>[] = [];
    if (!defaultTypeMission) {
      list.push({ id: 'plan-type', label: t('Type de RDV'), validate: (v) => (v.typeMission ? null : t('Choisissez un type de RDV.')) });
    }
    if (!isCurrentUserAT) {
      list.push({ id: 'plan-agent-select', label: t('Agent de Terrain'), validate: (v) => (v.agentTerrain ? null : t('Choisissez un agent de terrain.')) });
    }
    list.push({ id: 'plan-date-field', label: t('Date RDV'), validate: (v) => (v.dateRDV ? null : t('Choisissez la date du rendez-vous.')) });
    list.push({ id: 'plan-heure', label: t('Heure RDV'), validate: (v) => (v.timeRDV ? null : t("Renseignez l'heure du rendez-vous.")) });
    list.push({ id: 'plan-adresse', label: t('Adresse complète'), validate: (v) => (v.adresse.trim() ? null : t("Renseignez l'adresse du rendez-vous.")) });
    return list;
  }, [defaultTypeMission, isCurrentUserAT, t]);
  const formErrors = useFormErrors(formData, rules, { open });

  /** Inline message under a field — icon + 13 px danger text (§2.6). */
  const fieldError = (id: string) =>
    formErrors.errors[id] ? (
      <p id={`${id}-error`} className="flex items-start gap-1.5 text-[13px] font-medium leading-snug text-status-danger-fg">
        <AlertCircle aria-hidden className="mt-px h-4 w-4 shrink-0" />
        <span className="min-w-0">{formErrors.errors[id]}</span>
      </p>
    ) : null;

  const handleSave = async () => {
    if (!db) return;
    if (!formErrors.validateAll()) return;
    setLoading(true);
    const userEmail = auth?.currentUser?.email || 'Admin';
    const userId = auth?.currentUser?.uid || 'Admin';
    const resolvedObservation =
      formData.observation === 'Autre' && formData.observationCustomText.trim()
        ? formData.observationCustomText.trim()
        : formData.observation;

    try {
      let finalRDV = null;
      if (formData.dateRDV) {
        const timeParts = formData.timeRDV.split(':');
        const d = new Date(formData.dateRDV);
        d.setHours(parseInt(timeParts[0] || '0'), parseInt(timeParts[1] || '0'), 0, 0);
        finalRDV = Timestamp.fromDate(d);
      }

      const selectedAgent = agents.find((a) => a.label === formData.agentTerrain);
      const derivedZone = selectedAgent?.zone?.trim() || '';

      // Resolve agent UID at write time so a future Cloud Function can address
      // the agent directly via FCM without having to re-derive the name→uid
      // mapping. Mirrors the lookup in use-agent-live-location.ts.
      let agentTerrainUid: string | null = null;
      const trimmedAgentName = formData.agentTerrain.trim();
      if (trimmedAgentName) {
        try {
          const snap = await getDocs(
            query(collection(db, 'users'), where('nom', '==', trimmedAgentName), limit(1)),
          );
          agentTerrainUid = snap.docs[0]?.id ?? null;
        } catch (err) {
          console.warn('[modal-planification] agentUid lookup failed:', err);
          agentTerrainUid = null;
        }
      }

      const payload: Record<string, any> = {
        agentTerrain: formData.agentTerrain,
        agentTerrainUid,
        // Stored in its canonical spelling: the type list is editable, and a
        // « Visite avant » / « avant » variant used to save fine, toast
        // « créée », then never match the step's exact filter (QA bug 046).
        typeMission: normalizeTypeMission(formData.typeMission) ?? formData.typeMission,
        dateRDV: finalRDV,
        zone: derivedZone,
        adresse: formData.adresse,
        observation: resolvedObservation,
        modifiedAt: serverTimestamp(),
        modifiedBy: auth?.currentUser?.uid || 'Admin',
        modifiedByName: profile?.nom || userEmail,
        dossierNom: dossierData?.refExpert || '',
        assureNom: `${dossierData?.assure?.nom || ''} ${dossierData?.assure?.prenom || ''}`.trim(),
        compagnie: dossierData?.compagnie || '',
        expertRank: dossierData?.expertRank || '',
      };

      // Track observation authorship when observation is provided
      if (formData.observation) {
        payload.observationUpdatedAt = serverTimestamp();
        payload.observationUpdatedBy = profile?.nom || userEmail;
        payload.observationSource = 'Gestionnaire';
      }

      console.debug('[modal-planification] saving', {
        isEdit: !!initialData?.id,
        planifId: initialData?.id,
        dossierId,
        payload,
        agentsLoaded: agents.length,
      });

      if (initialData?.id) {
        // PRIMARY WRITE: update the planification doc itself. Any subsequent
        // side-effect (logs, statut bump) is wrapped in its own try/catch so
        // a downstream failure can't make the primary update look like it
        // didn't happen.
        await updateDoc(doc(db, 'dossiers', dossierId, 'planifications', initialData.id), payload);
        console.debug('[modal-planification] updateDoc OK', initialData.id);
        try {
          await logHistorique(db, dossierId, 'Planification modifiée', userEmail, `Mission ${formData.typeMission} mise à jour pour ${formData.agentTerrain}.`, 'planification', profile?.nom);
          await logWorkflow(db, dossierId, 'Planification modifiée', userEmail, userId, 'done', { dossierRef: dossierData?.refExpert || dossierId, details: `Mission ${formData.typeMission} mise à jour pour ${formData.agentTerrain}` }, profile?.nom);
        } catch (logErr) {
          console.warn('[modal-planification] history/workflow logging failed (non-fatal):', logErr);
        }
        toast({ title: t('Planification mise à jour') });
      } else {
        await addDoc(collection(db, 'dossiers', dossierId, 'planifications'), {
          ...payload,
          dossierId,
          createdAt: serverTimestamp(),
          active: true,
          createdBy: profile?.uid || userId,
          createdByName: profile?.nom || userEmail,
          createdByRole: profile?.role || 'Gestionnaire',
        });
        console.debug('[modal-planification] addDoc OK');
        // Set dateMissionAgentTerrain only if not already set (first planification = mission date)
        if (!dossierData?.dateMissionAgentTerrain) {
          try {
            await setDoc(doc(db, 'dossiers', dossierId), { dateMissionAgentTerrain: serverTimestamp() }, { merge: true });
          } catch (e) { console.warn('[modal-planification] dateMissionAgentTerrain set failed:', e); }
        }
        const typeFieldMap: Record<string, string> = {
          'Avant': 'dateDemandeExpertiseAvant',
          'En cours': 'dateDemandeExpertiseEnCours',
          'Après': 'dateDemandeExpertiseApres',
        };
        const typeField = typeFieldMap[formData.typeMission];
        if (typeField && !(dossierData as Record<string, any> | undefined)?.[typeField]) {
          try {
            await setDoc(doc(db, 'dossiers', dossierId), { [typeField]: serverTimestamp() }, { merge: true });
          } catch (e) { console.warn('[modal-planification] type-date set failed:', e); }
        }
        try {
          await logHistorique(db, dossierId, 'Planification ajoutée', userEmail, `Nouvelle mission ${formData.typeMission} créée pour ${formData.agentTerrain}.`, 'planification', profile?.nom);
          await logWorkflow(db, dossierId, 'Création de planification', userEmail, userId, 'done', { dossierRef: dossierData?.refExpert || dossierId, details: `Mission ${formData.typeMission} pour ${formData.agentTerrain}` }, profile?.nom);
        } catch (logErr) {
          console.warn('[modal-planification] history/workflow logging failed (non-fatal):', logErr);
        }
        toast({ title: t('Nouvelle planification créée') });
      }

      // Dossier statut bump — best-effort, isolated from the primary save so
      // a rules-block here doesn't make the planification update appear lost.
      try {
        const normalizedTypeMission = normalizeTypeMission(formData.typeMission);
        if (normalizedTypeMission) {
          const plannedStatus = deriveStatus({ kind: 'planification', typeMission: normalizedTypeMission });
          await updateDoc(doc(db, 'dossiers', dossierId), { statut: plannedStatus });
          await logHistorique(
            db,
            dossierId,
            plannedStatus,
            userEmail,
            `Statut mis à jour automatiquement par la planification (${formData.typeMission}).`,
            'statut',
            profile?.nom,
          );
        }
      } catch (statutErr) {
        console.warn('[modal-planification] dossier statut bump failed (non-fatal):', statutErr);
      }

      // Persist observation to subcollection for history
      if (resolvedObservation) {
        await addObservation(db, dossierId, resolvedObservation, 'Planification', profile?.nom || userEmail, userEmail, profile?.role || 'Gestionnaire', 'dossiers');
      }

      // The list re-subscribes, so the saved visit is shown for certain.
      window.dispatchEvent(new CustomEvent(PLANIFICATIONS_SAVED_EVENT, { detail: { dossierId } }));
      onOpenChange(false);
    } catch (error: any) {
      console.error('Planification save error:', error);
      toast({ variant: 'destructive', title: t('Erreur lors de la sauvegarde') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // > 3 controls, three Selects and a textarea → the full-screen phone
        // form (D §2 / research §2.4), never a 92 dvh sheet with popovers.
        fullScreen
        primary={{
          label: loading ? t('Enregistrement…') : t('Enregistrer'),
          onClick: handleSave,
          loading,
        }}
        dirty={isDirty}
        className="sm:max-w-[550px] max-h-[88vh] overflow-y-auto"
        data-tour="plan-dialog"
        {...tourDialogGuard()}
      >
        <DialogHeader>
          <DialogTitle>{initialData ? t('Modifier la Planification') : t('Nouvelle Planification')}</DialogTitle>
          <DialogDescription>{t('Remplissez les informations pour programmer la mission de terrain.')}</DialogDescription>
        </DialogHeader>
        {/* Phone: ONE column in the researched order — Type → Agent →
            Date | Heure → Adresse (+ « Ma position ») → Zone → Observation
            (§2.4). The desktop grid is untouched: the blocks that move are
            `max-md:contents` wrappers, so only the flex order changes. */}
        <div className="grid gap-6 py-4 max-md:flex max-md:flex-col">
          <FormErrorSummary errors={formErrors.summary} className="max-md:order-none" />
          <div className={cn((defaultTypeMission || isCurrentUserAT) ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4", "max-md:contents")}>
            {!isCurrentUserAT && (
            <div className="space-y-2 max-md:contents">
              {/* Zone: a pre-filter on a desk; on touch the agent list is a
                  searchable sheet, so the filter drops below the address. */}
              <div className="space-y-2 max-md:order-6">
                <Label htmlFor="plan-zone">{t('Zone')}</Label>
                <Select
                  value={agentZoneFilter === '' ? '__all__' : agentZoneFilter}
                  onValueChange={(v) => {
                    const next = v === '__all__' ? '' : v;
                    setAgentZoneFilter(next);
                    const stillVisible =
                      next === ''
                        ? true
                        : agents.some(
                            (a) =>
                              a.label === formData.agentTerrain &&
                              (a.zone?.trim() || '') === next,
                          );
                    if (!stillVisible && formData.agentTerrain) {
                      setFormData((prev) => ({ ...prev, agentTerrain: '' }));
                    }
                  }}
                >
                  <SelectTrigger id="plan-zone" className="h-8 max-md:h-12 text-xs max-md:text-base text-muted-foreground max-md:text-ink" aria-label={t('Zone')}>
                    <SelectValue placeholder={t('Filtrer par zone')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('Toutes les zones')}</SelectItem>
                    {availableAgentZones.length === 0 && (
                      <div className="px-2 py-1.5 text-[11px] italic text-muted-foreground">
                        {t('Aucune zone définie. Renseignez la zone via Agents de terrain.')}
                      </div>
                    )}
                    {availableAgentZones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 max-md:order-2">
              <Label>{t('Agent de Terrain')}</Label>
              <Select value={formData.agentTerrain} onValueChange={(v) => setFormData((prev) => ({ ...prev, agentTerrain: v }))}>
                <SelectTrigger id="plan-agent-select" data-tour="plan-agent" aria-label={t('Agent de Terrain')} {...formErrors.fieldProps('plan-agent-select')}><SelectValue placeholder={t('Choisir un agent')} /></SelectTrigger>
                <SelectContent>
                  {filteredAgents.map(agent => {
                    const rawCount = agentWorkload[agent.label] || 0;
                    // When editing, the current planification is itself counted
                    // in `rawCount` for its currently-assigned agent. Exclude
                    // it so agents don't appear artificially over-loaded. In
                    // day-scoped mode it only counts when its saved RDV is on
                    // the selected day.
                    const isEditingThisAgent =
                      !!initialData?.id &&
                      (initialData.agentTerrain || '').trim() === agent.label &&
                      (selectedDayStartMs == null || editedPlanifOnSelectedDay);
                    const count = isEditingThisAgent && rawCount > 0 ? rawCount - 1 : rawCount;
                    const zone = agent.zone?.trim();
                    return (
                      <SelectItem key={agent.id} value={agent.label}>
                        <span className="flex items-center gap-2">
                          <span>{agent.label}</span>
                          <span className="text-xs text-muted-foreground">
                            &mdash;{' '}
                            {zone
                              ? zone
                              : <span className="italic">{t('Zone non définie')}</span>}
                            {' · '}
                            {selectedDayStartMs != null ? (
                              <span className="tabular-nums">
                                {count} {count > 1 ? t('planifs') : t('planif')} {t('le')} {format(formData.dateRDV!, 'dd/MM')}
                              </span>
                            ) : (
                              <span className="italic">{t('sélectionnez une date')}</span>
                            )}
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {fieldError('plan-agent-select')}
              </div>
            </div>
            )}
            {!defaultTypeMission && (
              <div className="space-y-2 max-md:order-1">
                <div className="flex items-center justify-between">
                  <Label>{t('Type de RDV')}</Label>
                  <OptionsManagerModal collectionName="options_types_rdv" title={t('Types de RDV')} />
                </div>
                {/* 3 types → a segmented control on touch (Select's own tier
                    rule): every option visible, zero taps to see them. */}
                <Select value={formData.typeMission} onValueChange={(v) => setFormData((prev) => ({ ...prev, typeMission: v }))}>
                  <SelectTrigger id="plan-type" aria-label={t('Type de RDV')} {...formErrors.fieldProps('plan-type')}><SelectValue placeholder={t('Choisir un type')} /></SelectTrigger>
                  <SelectContent>
                    {rdvTypes.map(type => (
                      <SelectItem key={type.id} value={type.label}>{t(type.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError('plan-type')}
              </div>
            )}
          </div>

          {/* Date | Heure share a row at every width: one entity, and §2.1
              allows exactly this pair. */}
          <div className="grid grid-cols-2 gap-4 max-md:order-3">
            <div className="space-y-2" data-tour="plan-date">
              <Label>{t('Date RDV')}</Label>
              {/* A RDV is always within days — the near horizon: sheet
                  calendar with « Aujourd'hui · Demain · Lundi prochain ». */}
              <DatePicker
                horizon="near"
                id="plan-date-field"
                label={t('Date RDV')}
                value={formData.dateRDV}
                // Functional updates throughout (QA bug 047): a late picker
                // callback closing over an older `formData` could put the
                // previous hour or address back just before « Enregistrer ».
                onChange={(d) => setFormData((prev) => ({ ...prev, dateRDV: d }))}
                disabledDates={(date) => date < startOfToday()}
                triggerProps={formErrors.fieldProps('plan-date-field')}
              />
              {fieldError('plan-date-field')}
            </div>
            <div className="space-y-2" data-tour="plan-time">
              <Label htmlFor="plan-heure">{t('Heure RDV')}</Label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-primary max-md:top-4" aria-hidden />
                <Input
                  id="plan-heure"
                  type="time"
                  // Clicking anywhere on the field opens the OS picker where the
                  // browser supports it (Chrome/Edge); Firefox/Safari keep their
                  // inline behaviour. Guarded: showPicker throws without a user gesture.
                  onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* not supported */ } }}
                  // Native time input, quarter-hour steps (Apple HIG pickers:
                  // "quarter-hour intervals"); the OS wheel/keypad is the one
                  // touch time control nobody has to learn.
                  step={900}
                  className="pl-10 h-10 max-md:h-12"
                  value={formData.timeRDV}
                  onChange={(e) => { const v = e.target.value; setFormData((prev) => ({ ...prev, timeRDV: v })); }}
                  {...formErrors.fieldProps('plan-heure')}
                />
              </div>
              {fieldError('plan-heure')}
            </div>
          </div>

          <div className="space-y-2 max-md:order-4" data-tour="plan-adresse">
            <Label htmlFor="plan-adresse">{t('Adresse complète')}</Label>
            <div className="relative">
            <Input
              id="plan-adresse"
              {...INPUT_ADDRESS}
              enterKeyHint="next"
              placeholder={t('Adresse du rendez-vous...')}
              className="h-10 max-md:h-12 pr-11"
              value={formData.adresse}
              onChange={(e) => { const v = e.target.value; setFormData((prev) => ({ ...prev, adresse: v })); }}
              {...formErrors.fieldProps('plan-adresse')}
              onPaste={async (e) => {
                const pasted = e.clipboardData.getData('text');
                const coords = parseMapsCoords(pasted);
                if (!coords) return; // not a Maps URL — let default paste happen
                e.preventDefault();
                const tempValue = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
                setFormData((prev) => ({ ...prev, adresse: tempValue }));
                try {
                  const res = await apiFetch(`/api/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`);
                  if (!res.ok) return;
                  const data = await res.json();
                  if (!data?.formatted) return;
                  logFrontend('modal-planification ← /api/reverse-geocode (carte)', { adresse: data.formatted });
                  setFormData((prev) => prev.adresse === tempValue ? { ...prev, adresse: data.formatted } : prev);
                } catch {
                  /* silent — leaves the lat,lng value in place */
                }
              }}
            />
            {/* One trailing control: the map-pin opens the TYPED address in
                Google Maps (what the gestionnaire reaches for when checking
                the mission site). The « remplacer par ma position » crosshair
                that sat beside it is gone (QA bug 044). */}
            <div className="absolute right-0 top-0 flex h-full items-center">
              <button
                type="button"
                onClick={() => {
                  const q = formData.adresse.trim();
                  if (!q) return;
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
                }}
                disabled={!formData.adresse.trim()}
                aria-label={t('Ouvrir cette adresse dans Google Maps')}
                title={t('Ouvrir cette adresse dans Google Maps')}
                className="flex h-full w-11 items-center justify-center rounded-r-md text-ink-3 transition-colors hover:text-ink disabled:opacity-40"
              >
                <MapPin className="h-4 w-4" />
              </button>
            </div>
            </div>
            {fieldError('plan-adresse')}
            {outsideSites && destinationCity && (
              <p role="status" className="flex items-start gap-1.5 rounded-md bg-status-warning-bg px-2.5 py-1.5 text-[13px] font-medium leading-snug text-status-warning-fg">
                <TriangleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  {accountSites.length === 1
                    ? `${t('Destination hors de')} ${accountSites[0]}`
                    : `${t('Destination hors de vos sites')} (${accountSites.join(', ')})`}
                  {' — '}{t('l’adresse se situe à')} {destinationCity.locality}
                  {destinationCity.nearest
                    ? `, ${t('à')} ${Math.max(1, Math.round(destinationCity.nearest.meters / 1000))} km ${t('de')} ${destinationCity.nearest.site}`
                    : ''}
                  .
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2 max-md:order-7" data-tour="plan-observation">
            <Label>{t('Observation')}</Label>
            <div className="flex items-center gap-2">
              <Select
                value={formData.observation}
                onValueChange={(v) => setFormData({ ...formData, observation: v })}
                disabled={observationPresetsLoading || activeObservationPresets.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      observationPresetsLoading
                        ? t('Chargement…')
                        : activeObservationPresets.length === 0
                          ? t('Aucune observation disponible')
                          : t('Aucune observation')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {activeObservationPresets.map((opt) => (
                    <SelectItem key={opt.id} value={opt.label}>{t(opt.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <OptionsManagerModal
                collectionName="options_observations"
                title={t('Observations')}
                defaultValues={['Assuré injoignable', 'Véhicule hors ville d\'expertise', 'Autre']}
              />
            </div>
          </div>

          {/* « Autre » is the only preset that asks for free text, so the
              field appears only then (owner ruling 2026-09-09). One field,
              one stored value — the always-visible duplicate that used to
              sit below wrote an `observationPersonnalisee` nothing read. */}
          {formData.observation === 'Autre' && (
            <div className="space-y-2 max-md:order-8">
              <Label htmlFor="plan-observation-autre">{t('Observation personnalisée')}</Label>
              <Textarea
                id="plan-observation-autre"
                value={formData.observationCustomText}
                onChange={(e) => setFormData({ ...formData, observationCustomText: e.target.value })}
                placeholder={t('Écrivez une observation personnalisée…')}
                rows={2}
                className="text-sm"
              />
            </div>
          )}

          {feasibilityPastRdv && (
            <Alert variant="warning" className="max-md:order-9">
              <AlertTitle>{t('RDV déjà passé')}</AlertTitle>
              <AlertDescription>
                {t("L'heure de RDV")} ({formData.timeRDV}) {t("est déjà dépassée. L'agent ne pourra pas s'y rendre à temps.")}
              </AlertDescription>
            </Alert>
          )}

          {(isCurrentUserAT || formData.agentTerrain) && effectiveIsFresh && effectiveLocation && (
            <Alert variant="info" data-tour="plan-agent-loc" className="max-md:order-9">
              <AlertTitle>{isCurrentUserAT ? t('Votre position actuelle') : t("Position actuelle de l'agent")}</AlertTitle>
              <AlertDescription>
                {agentAddress ? (
                  <p className="text-sm">{agentAddress}</p>
                ) : (
                  <p className="font-mono text-sm">
                    {effectiveLocation.lat.toFixed(5)}, {effectiveLocation.lng.toFixed(5)}
                  </p>
                )}
                {demoSelfLocationActive && (
                  <p className="text-sm italic text-muted-foreground mt-1">
                    {t('Démo : la position affichée est celle de votre navigateur — en production, celle du téléphone de l’agent.')}
                  </p>
                )}
                {!isCurrentUserAT && !demoSelfLocationActive && agentLive.location && (
                  <p className="text-sm italic text-muted-foreground mt-1">
                    {t('Mise à jour')} {formatDistanceToNow(new Date(agentLive.location.updatedAtMs), { addSuffix: true, locale: dateFnsLocale() })}
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${effectiveLocation.lat},${effectiveLocation.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline mt-2"
                >
                  <MapPin className="h-3 w-3" />
                  {t('Voir sur Google Maps')}
                </a>
              </AlertDescription>
            </Alert>
          )}

          {!isCurrentUserAT && isAgentLocationUnavailable && (
            <Alert variant="info" data-tour="plan-agent-loc" className="max-md:order-9">
              <AlertTitle>{t("Position de l'agent non disponible")}</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  {t('Aucune position récente de')} {formData.agentTerrain}. {t("La vérification d'itinéraire ne peut pas tenir compte de sa position actuelle.")}
                </p>
                {/* Demo: the agents have no connected phone, so this button
                    stands in the demo user's own browser position — and the
                    permission prompt only fires on this explicit click. */}
                {!demoSelfAsAgent && !agentLive.agentUid ? (
                  <p className="text-sm italic text-muted-foreground">
                    {t('Aucun compte utilisateur ne porte ce nom — la position ne peut pas être demandée. Vérifiez le nom de l’agent dans Utilisateurs.')}
                  </p>
                ) : demoSelfAsAgent ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={selfLocationPending}
                    onClick={requestSelfLocation}
                  >
                    {selfLocationPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-1" />
                    )}
                    {t("Demander la localisation de l'AT")}
                  </Button>
                ) : agentLive.requestState === 'idle' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void agentLive.requestLocation()}
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    {t("Demander la localisation de l'AT")}
                  </Button>
                ) : null}
                {(agentLive.requestState === 'pending' || agentLive.requestState === 'sent') && (
                  <span className="text-sm italic">
                    <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                    {t('Demande envoyée — en attente de la position…')}
                  </span>
                )}
                {agentLive.requestState === 'error' && (
                  <span className="text-sm text-destructive">
                    {t("Échec de l'envoi de la demande. Réessayez.")}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {feasibilityUnavailable && (
            <Alert variant="warning" className="max-md:order-9">
              <AlertTitle>{t("Vérification d'itinéraire indisponible")}</AlertTitle>
              <AlertDescription>
                {t("Impossible de vérifier la faisabilité du planning de l'agent pour cette journée. La sauvegarde reste possible.")}
              </AlertDescription>
            </Alert>
          )}

          {feasibilityConflicts.length > 0 && (
            <Alert variant="warning" className="max-md:order-9">
              <AlertTitle>{t('Conflit de planning détecté')}</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  {t('Le planning de')} {formData.agentTerrain || t("l'agent")} {t('pour cette journée est mathématiquement infaisable :')}
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {feasibilityConflicts.map((c, i) => (
                    <li key={i}>
                      {c.fromIsOrigin ? (
                        <>
                          {t('RDV')} {c.toLabel} : {t("depuis la position actuelle de l'agent, arrivée prévue à")} <strong>{format(new Date(c.arrivalMs), 'HH:mm')}</strong>
                          {' '}({formatDurationFr(c.travelSeconds)} {t('de trajet')}).
                          {' '}{t('Retard de')} {formatDurationFr(c.shortfallSeconds)} {t('sur le RDV.')}
                        </>
                      ) : (
                        <>
                          {t('RDV')} {c.toLabel} : {t('arrivée prévue à')} <strong>{format(new Date(c.arrivalMs), 'HH:mm')}</strong>
                          {c.sameStop ? (
                            <>{' '}— {t('même adresse :')} {formatDurationFr(c.serviceSeconds)} {t('sur place pour le véhicule précédent.')}</>
                          ) : (
                            <>{' '}— {formatDurationFr(c.serviceSeconds)} {t('sur place à')} {c.fromAddress} + {formatDurationFr(c.travelSeconds)} {t('de trajet.')}</>
                          )}
                          {' '}{t('Retard de')} {formatDurationFr(c.shortfallSeconds)} {t('sur le RDV.')}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
        {/* Phones keep a 48 px full-width primary at the END of the body as
            well as the one in the 56 px header (the reader who scrolled);
            « Annuler » is the header « × » there, not a second 170 px target
            next to the primary (§2.5). */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="max-md:hidden">
            {t('Annuler')}
          </Button>
          <Button onClick={handleSave} disabled={loading} data-tour="plan-save" className="max-md:h-12 max-md:text-[15px] max-md:font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t('Enregistrer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
