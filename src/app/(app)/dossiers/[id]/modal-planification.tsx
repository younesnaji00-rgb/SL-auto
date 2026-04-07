
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
import { Loader2, MapPin, Clock } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logHistorique } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { DatePicker } from '@/components/ui/date-picker';

const defaultMissionTypes = ['Expertise', 'Constat', 'Contre-expertise', 'Visite technique'];
const defaultAgents = ['Agent 1', 'Agent 2'];

type ModalPlanificationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  dossierId: string;
};

export default function ModalPlanification({ open, onOpenChange, initialData, dossierId }: ModalPlanificationProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { options: dbMissionTypes } = useOptions('options_types_mission', defaultMissionTypes);
  const missionTypes = useMemo(() => dbMissionTypes.length > 0 ? dbMissionTypes : defaultMissionTypes.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbMissionTypes]);

  const { options: dbAgents } = useOptions('options_agents', defaultAgents);
  const agents = useMemo(() => dbAgents.length > 0 ? dbAgents : defaultAgents.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbAgents]);

  const [formData, setFormData] = useState({
    agentTerrain: '',
    typeMission: '',
    dateRDV: null as Date | null,
    timeRDV: '09:00',
    zone: '',
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
        typeMission: initialData.typeMission || 'Expertise',
        dateRDV,
        timeRDV,
        zone: initialData.zone || '',
        adresse: initialData.adresse || '',
        observation: initialData.observation || '',
      });
    } else if (open) {
      setFormData({ agentTerrain: '', typeMission: 'Expertise', dateRDV: null, timeRDV: '09:00', zone: '', adresse: '', observation: '' });
    }
  }, [initialData, open]);

  const handleSave = async () => {
    if (!db) return;
    setLoading(true);
    const userEmail = auth?.currentUser?.email || 'Admin';

    try {
      let finalRDV = null;
      if (formData.dateRDV) {
        const timeParts = formData.timeRDV.split(':');
        const d = new Date(formData.dateRDV);
        d.setHours(parseInt(timeParts[0] || '0'), parseInt(timeParts[1] || '0'), 0, 0);
        finalRDV = Timestamp.fromDate(d);
      }

      const payload = {
        agentTerrain: formData.agentTerrain,
        typeMission: formData.typeMission,
        dateRDV: finalRDV,
        zone: formData.zone,
        adresse: formData.adresse,
        observation: formData.observation,
        modifiedAt: serverTimestamp(),
        modifiedBy: auth?.currentUser?.uid || 'Admin',
        modifiedByName: userEmail,
      };

      if (initialData?.id) {
        await updateDoc(doc(db, 'dossiers', dossierId, 'planifications', initialData.id), payload);
        await logHistorique(db, dossierId, 'Planification modifiée', userEmail, `Mission ${formData.typeMission} mise à jour pour ${formData.agentTerrain}.`, 'planification');
        toast({ title: "Planification mise à jour" });
      } else {
        await addDoc(collection(db, 'dossiers', dossierId, 'planifications'), { ...payload, createdAt: serverTimestamp(), active: true });
        await logHistorique(db, dossierId, 'Planification ajoutée', userEmail, `Nouvelle mission ${formData.typeMission} créée pour ${formData.agentTerrain}.`, 'planification');
        toast({ title: "Nouvelle planification créée" });
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Agent de Terrain</Label>
                <OptionsManagerModal collectionName="options_agents" title="Agents de terrain" defaultValues={defaultAgents} />
              </div>
              <Select value={formData.agentTerrain} onValueChange={(v) => setFormData({...formData, agentTerrain: v})}>
                <SelectTrigger><SelectValue placeholder="Choisir un agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.label}>
                      {agent.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Type de mission</Label>
                <OptionsManagerModal collectionName="options_types_mission" title="Types de mission" defaultValues={defaultMissionTypes} />
              </div>
              <Select value={formData.typeMission} onValueChange={(v) => setFormData({...formData, typeMission: v})}>
                <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                <SelectContent>
                  {missionTypes.map(type => (
                    <SelectItem key={type.id} value={type.label}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date RDV</Label>
              <DatePicker 
                value={formData.dateRDV} 
                onChange={(d) => setFormData({...formData, dateRDV: d})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Heure RDV</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-blue-600 dark:text-blue-400" />
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
            <Label>Zone</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-blue-600 dark:text-blue-400" />
              <Input 
                placeholder="Ex: Casablanca Anfa" 
                className="pl-10 h-10"
                value={formData.zone} 
                onChange={(e) => setFormData({...formData, zone: e.target.value})} 
              />
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
            <Textarea 
              placeholder="Notes ou instructions pour l'agent..." 
              rows={3} 
              value={formData.observation} 
              onChange={(e) => setFormData({...formData, observation: e.target.value})} 
            />
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
