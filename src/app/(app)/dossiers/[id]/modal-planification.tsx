
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
import { Loader2, Clock } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, setDoc, serverTimestamp, Timestamp, getDocs, query, where, limit } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format, startOfToday, formatDistanceToNow } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { logHistorique, logWorkflow } from './log-historique';
import { addObservation } from './log-observation';
import { useOptions, type Option } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAgentTerrainWorkload } from '@/hooks/use-workload-counts';
import { deriveStatus } from '@/lib/status-machine';
import { useAtgFeasibility } from '@/hooks/use-atg-feasibility';
import { useAgentLiveLocation } from '@/hooks/use-agent-live-location';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDurationFr } from '@/lib/atg-feasibility';
import { MapPin } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

/** Narrows a free-form typeMission string to the canonical tri-state, or null. */
function normalizeTypeMission(
  typeMission: string,
): 'Avant' | 'En cours' | 'Après' | null {
  const t = (typeMission || '').trim().toLowerCase();
  if (t === 'avant') return 'Avant';
  if (t === 'en cours') return 'En cours';
  if (t === 'après' || t === 'apres') return 'Après';
  return null;
}

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
  const [loading, setLoading] = useState(false);
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [selfLocation, setSelfLocation] = useState<{ lat: number; lng: number; updatedAtMs: number } | null>(null);

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
    observationPersonnalisee: '',
    agentLocationManuel: '',
  });

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
        observationPersonnalisee: initialData.observationPersonnalisee || '',
        agentLocationManuel: initialData.agentLocationManuel || '',
      });
    } else if (open) {
      setFormData({ agentTerrain: defaultAgentTerrain ?? '', typeMission: defaultTypeMission ?? 'Avant', dateRDV: null, timeRDV: '09:00', adresse: '', observation: '', observationCustomText: initialData?.observationCustomText || '', observationPersonnalisee: '', agentLocationManuel: '' });
    }
  }, [initialData, open, defaultTypeMission, defaultAgentTerrain]);

  const agentLive = useAgentLiveLocation(formData.agentTerrain);
  const effectiveLocation = isCurrentUserAT ? selfLocation : agentLive.location;
  const effectiveIsFresh = isCurrentUserAT ? !!selfLocation : agentLive.isFresh;

  // True when an agent is selected but their fresh GPS position is not
  // available (denied / no last-known location / no UID match). Drives both
  // the existing "Position non disponible" alert and the manual fallback
  // <Input> row that lets the gestionnaire type a location by hand.
  const isAgentLocationUnavailable =
    !!formData.agentTerrain && !agentLive.isFresh && !!agentLive.agentUid;

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

  const handleSave = async () => {
    if (!db) return;
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
        typeMission: formData.typeMission,
        dateRDV: finalRDV,
        zone: derivedZone,
        adresse: formData.adresse,
        observation: resolvedObservation,
        observationPersonnalisee: formData.observationPersonnalisee,
        agentLocationManuel: formData.agentLocationManuel,
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
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{initialData ? t('Modifier la Planification') : t('Nouvelle Planification')}</DialogTitle>
          <DialogDescription>{t('Remplissez les informations pour programmer la mission de terrain.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className={(defaultTypeMission || isCurrentUserAT) ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
            {!isCurrentUserAT && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('Agent de Terrain')}</Label>
                <OptionsManagerModal collectionName="options_agents" title={t('Agents de terrain')} />
              </div>
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
                <SelectTrigger className="h-8 text-xs text-muted-foreground">
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
              <Select value={formData.agentTerrain} onValueChange={(v) => setFormData({...formData, agentTerrain: v})}>
                <SelectTrigger><SelectValue placeholder={t('Choisir un agent')} /></SelectTrigger>
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
            </div>
            )}
            {!defaultTypeMission && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('Type de RDV')}</Label>
                  <OptionsManagerModal collectionName="options_types_rdv" title={t('Types de RDV')} />
                </div>
                <Select value={formData.typeMission} onValueChange={(v) => setFormData({...formData, typeMission: v})}>
                  <SelectTrigger><SelectValue placeholder={t('Choisir un type')} /></SelectTrigger>
                  <SelectContent>
                    {rdvTypes.map(type => (
                      <SelectItem key={type.id} value={type.label}>{t(type.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Date RDV')}</Label>
              <DatePicker
                value={formData.dateRDV}
                onChange={(d) => setFormData({...formData, dateRDV: d})}
                disabledDates={(date) => date < startOfToday()}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Heure RDV')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-primary" />
                <Input 
                  type="time" 
                  className="pl-10 h-10" 
                  value={formData.timeRDV} 
                  onChange={(e) => setFormData({...formData, timeRDV: e.target.value})} 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('Adresse complète')}</Label>
            <Input
              placeholder={t('Adresse du rendez-vous...')}
              className="h-10"
              value={formData.adresse}
              onChange={(e) => setFormData({...formData, adresse: e.target.value})}
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
                  setFormData((prev) => prev.adresse === tempValue ? { ...prev, adresse: data.formatted } : prev);
                } catch {
                  /* silent — leaves the lat,lng value in place */
                }
              }}
            />
          </div>

          <div className="space-y-2">
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
                    <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <OptionsManagerModal
                collectionName="options_observations"
                title={t('Observations')}
                defaultValues={['Assuré injoignable', 'Véhicule hors ville d\'expertise', 'Autre']}
              />
            </div>
            {formData.observation === 'Autre' && (
              <Textarea
                value={formData.observationCustomText}
                onChange={(e) => setFormData({ ...formData, observationCustomText: e.target.value })}
                placeholder={t('Écrivez une observation personnalisée…')}
                rows={2}
                className="text-sm"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('Observation personnalisée')}</Label>
            <Textarea
              placeholder={t('Ajouter une observation personnalisée (facultatif)…')}
              value={formData.observationPersonnalisee}
              onChange={(e) => setFormData({ ...formData, observationPersonnalisee: e.target.value })}
            />
          </div>

          {feasibilityPastRdv && (
            <Alert variant="warning">
              <AlertTitle>{t('RDV déjà passé')}</AlertTitle>
              <AlertDescription>
                {t("L'heure de RDV")} ({formData.timeRDV}) {t("est déjà dépassée. L'agent ne pourra pas s'y rendre à temps.")}
              </AlertDescription>
            </Alert>
          )}

          {(isCurrentUserAT || formData.agentTerrain) && effectiveIsFresh && effectiveLocation && (
            <Alert variant="info">
              <AlertTitle>{isCurrentUserAT ? t('Votre position actuelle') : t("Position actuelle de l'agent")}</AlertTitle>
              <AlertDescription>
                {agentAddress ? (
                  <p className="text-sm">{agentAddress}</p>
                ) : (
                  <p className="font-mono text-sm">
                    {effectiveLocation.lat.toFixed(5)}, {effectiveLocation.lng.toFixed(5)}
                  </p>
                )}
                {!isCurrentUserAT && agentLive.location && (
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
            <Alert variant="info">
              <AlertTitle>{t("Position de l'agent non disponible")}</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  {t('Aucune position récente de')} {formData.agentTerrain}. {t("La vérification d'itinéraire ne peut pas tenir compte de sa position actuelle.")}
                </p>
                {agentLive.requestState === 'idle' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void agentLive.requestLocation()}
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    {t("Demander la localisation de l'AT")}
                  </Button>
                )}
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

          {!isCurrentUserAT && isAgentLocationUnavailable && (
            <div className="space-y-2">
              <Label htmlFor="agent-location-manuel">
                {t("Localisation de l'agent (manuelle)")}
              </Label>
              <Input
                id="agent-location-manuel"
                placeholder={t('Saisir une localisation à la main (facultatif)…')}
                className="h-10"
                value={formData.agentLocationManuel}
                onChange={(e) =>
                  setFormData({ ...formData, agentLocationManuel: e.target.value })
                }
              />
            </div>
          )}

          {feasibilityUnavailable && (
            <Alert variant="warning">
              <AlertTitle>{t("Vérification d'itinéraire indisponible")}</AlertTitle>
              <AlertDescription>
                {t("Impossible de vérifier la faisabilité du planning de l'agent pour cette journée. La sauvegarde reste possible.")}
              </AlertDescription>
            </Alert>
          )}

          {feasibilityConflicts.length > 0 && (
            <Alert variant="warning">
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
                          {' '}— {t('30 min sur place à')} {c.fromAddress} + {formatDurationFr(c.travelSeconds)} {t('de trajet.')}
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('Annuler')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t('Enregistrer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
