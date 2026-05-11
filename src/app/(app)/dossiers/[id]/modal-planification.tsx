
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Clock } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format, startOfToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logHistorique, logWorkflow } from './log-historique';
import { addObservation } from './log-observation';
import { useOptions, type Option } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAgentTerrainWorkload } from '@/hooks/use-workload-counts';
import { deriveStatus } from '@/lib/status-machine';

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

type ModalPlanificationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  dossierId: string;
  dossierData?: { refExpert?: string; assure?: any; compagnie?: string; expertRank?: string; dateMissionAgentTerrain?: any };
  defaultTypeMission?: 'Avant' | 'En cours' | 'Après';
};

export default function ModalPlanification({ open, onOpenChange, initialData, dossierId, dossierData, defaultTypeMission }: ModalPlanificationProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { profile } = useCurrentUser();
  const [loading, setLoading] = useState(false);

  const { options: dbRDVTypes } = useOptions('options_types_rdv');
  const rdvTypes = useMemo(() => dbRDVTypes.filter(o => o.active !== false), [dbRDVTypes]);

  const { options: dbAgents } = useOptions('options_agents');
  const agents = useMemo<Option[]>(() => dbAgents.filter(o => o.active !== false), [dbAgents]);
  const agentWorkload = useAgentTerrainWorkload();

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
  });

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
      });
    } else if (open) {
      setFormData({ agentTerrain: '', typeMission: defaultTypeMission ?? 'Avant', dateRDV: null, timeRDV: '09:00', adresse: '', observation: '' });
    }
  }, [initialData, open, defaultTypeMission]);

  const handleSave = async () => {
    if (!db) return;
    setLoading(true);
    const userEmail = auth?.currentUser?.email || 'Admin';
    const userId = auth?.currentUser?.uid || 'Admin';

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

      const payload: Record<string, any> = {
        agentTerrain: formData.agentTerrain,
        typeMission: formData.typeMission,
        dateRDV: finalRDV,
        zone: derivedZone,
        adresse: formData.adresse,
        observation: formData.observation,
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

      if (initialData?.id) {
        await updateDoc(doc(db, 'dossiers', dossierId, 'planifications', initialData.id), payload);
        await logHistorique(db, dossierId, 'Planification modifiée', userEmail, `Mission ${formData.typeMission} mise à jour pour ${formData.agentTerrain}.`, 'planification', profile?.nom);
        await logWorkflow(db, dossierId, 'Planification modifiée', userEmail, userId, 'done', { dossierRef: dossierData?.refExpert || dossierId, details: `Mission ${formData.typeMission} mise à jour pour ${formData.agentTerrain}` }, profile?.nom);
        toast({ title: "Planification mise à jour" });
      } else {
        await addDoc(collection(db, 'dossiers', dossierId, 'planifications'), { ...payload, dossierId, createdAt: serverTimestamp(), active: true });
        // Set dateMissionAgentTerrain only if not already set (first planification = mission date)
        if (!dossierData?.dateMissionAgentTerrain) {
          await setDoc(doc(db, 'dossiers', dossierId), { dateMissionAgentTerrain: serverTimestamp() }, { merge: true });
        }
        const typeFieldMap: Record<string, string> = {
          'Avant': 'dateDemandeExpertiseAvant',
          'En cours': 'dateDemandeExpertiseEnCours',
          'Après': 'dateDemandeExpertiseApres',
        };
        const typeField = typeFieldMap[formData.typeMission];
        if (typeField && !(dossierData as Record<string, any> | undefined)?.[typeField]) {
          await setDoc(doc(db, 'dossiers', dossierId), { [typeField]: serverTimestamp() }, { merge: true });
        }
        await logHistorique(db, dossierId, 'Planification ajoutée', userEmail, `Nouvelle mission ${formData.typeMission} créée pour ${formData.agentTerrain}.`, 'planification', profile?.nom);
        await logWorkflow(db, dossierId, 'Création de planification', userEmail, userId, 'done', { dossierRef: dossierData?.refExpert || dossierId, details: `Mission ${formData.typeMission} pour ${formData.agentTerrain}` }, profile?.nom);
        toast({ title: "Nouvelle planification créée" });
      }

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

      // Persist observation to subcollection for history
      if (formData.observation) {
        await addObservation(db, dossierId, formData.observation, 'Planification', profile?.nom || userEmail, userEmail, profile?.role || 'Gestionnaire', 'dossiers');
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Planification save error:', error);
      toast({ variant: 'destructive', title: 'Erreur lors de la sauvegarde' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Modifier la Planification' : 'Nouvelle Planification'}</DialogTitle>
          <DialogDescription>Remplissez les informations pour programmer la mission de terrain.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className={defaultTypeMission ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Agent de Terrain</Label>
                <OptionsManagerModal collectionName="options_agents" title="Agents de terrain" />
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
                  <SelectValue placeholder="Filtrer par zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les zones</SelectItem>
                  {availableAgentZones.length === 0 && (
                    <div className="px-2 py-1.5 text-[11px] italic text-muted-foreground">
                      Aucune zone définie. Renseignez la zone via Agents de terrain.
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
                <SelectTrigger><SelectValue placeholder="Choisir un agent" /></SelectTrigger>
                <SelectContent>
                  {filteredAgents.map(agent => {
                    const rawCount = agentWorkload[agent.label] || 0;
                    // When editing, the current planification is itself counted
                    // in `rawCount` for its currently-assigned agent. Exclude
                    // it so agents don't appear artificially over-loaded.
                    const isEditingThisAgent =
                      !!initialData?.id &&
                      (initialData.agentTerrain || '').trim() === agent.label;
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
                              : <span className="italic">Zone non définie</span>}
                            {' · '}
                            <span className="tabular-nums">{count} planifs actives</span>
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {!defaultTypeMission && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Type de RDV</Label>
                  <OptionsManagerModal collectionName="options_types_rdv" title="Types de RDV" />
                </div>
                <Select value={formData.typeMission} onValueChange={(v) => setFormData({...formData, typeMission: v})}>
                  <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                  <SelectContent>
                    {rdvTypes.map(type => (
                      <SelectItem key={type.id} value={type.label}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date RDV</Label>
              <DatePicker
                value={formData.dateRDV}
                onChange={(d) => setFormData({...formData, dateRDV: d})}
                disabledDates={(date) => date < startOfToday()}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure RDV</Label>
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
            <Label>Adresse complète</Label>
            <Input 
              placeholder="Adresse du rendez-vous..." 
              className="h-10"
              value={formData.adresse} 
              onChange={(e) => setFormData({...formData, adresse: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <Label>Observation</Label>
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
                        ? 'Chargement…'
                        : activeObservationPresets.length === 0
                          ? 'Aucune observation disponible'
                          : 'Aucune observation'
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
                title="Observations"
                defaultValues={['Assuré injoignable', 'Véhicule hors ville d\'expertise', 'Autre']}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
