'use client';

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Clock, MapPin, User, Info } from 'lucide-react';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';

const defaultRDVTypes = ['Avant', 'En cours', 'Après'];
const defaultAgents = ['Agent 1', 'Agent 2'];

export default function StepPlanification() {
  const { control } = useFormContext();

  const { options: dbRDVTypes } = useOptions('options_types_rdv', defaultRDVTypes);
  const rdvTypes = useMemo(() => dbRDVTypes.length > 0 ? dbRDVTypes : defaultRDVTypes.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbRDVTypes]);

  const { options: dbAgents } = useOptions('options_agents', defaultAgents);
  const agents = useMemo(() => dbAgents.length > 0 ? dbAgents : defaultAgents.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbAgents]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Planification de la mission
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Programmez le rendez-vous pour l'expertise. Cette étape est optionnelle et peut être complétée plus tard.
        </p>
      </div>

      <Card className="border">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <Calendar className="h-4 w-4" /> Détails du rendez-vous
          </CardTitle>
          <CardDescription>Remplissez les informations pour programmer la mission de terrain.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Agent & Type RDV */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={control} name="planAgentTerrain" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-primary" /> Agent de Terrain</FormLabel>
                  <OptionsManagerModal collectionName="options_agents" title="Agents de terrain" defaultValues={defaultAgents} />
                </div>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Choisir un agent" /></SelectTrigger></FormControl>
                  <SelectContent>{agents.map(a => <SelectItem key={a.id} value={a.label}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={control} name="planTypeMission" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <div className="flex items-center justify-between">
                  <FormLabel>Type de RDV</FormLabel>
                  <OptionsManagerModal collectionName="options_types_rdv" title="Types de RDV" defaultValues={defaultRDVTypes} />
                </div>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger></FormControl>
                  <SelectContent>{rdvTypes.map(t => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={control} name="planDateRDV" render={({ field }) => (
              <FormItem className="flex flex-col p-3 rounded-md border bg-background">
                <FormLabel className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" /> Date RDV</FormLabel>
                <FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={control} name="planTimeRDV" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> Heure RDV</FormLabel>
                <FormControl>
                  <Input type="time" className="h-10" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Zone & Address */}
          <FormField control={control} name="planZone" render={({ field }) => (
            <FormItem className="p-3 rounded-md border bg-background">
              <FormLabel className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> Zone</FormLabel>
              <FormControl><Input placeholder="Ex: Casablanca Anfa" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={control} name="planAdresse" render={({ field }) => (
            <FormItem className="p-3 rounded-md border bg-background">
              <FormLabel>Adresse complète</FormLabel>
              <FormControl><Input placeholder="Adresse du rendez-vous..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Observation */}
          <FormField control={control} name="planObservation" render={({ field }) => (
            <FormItem className="p-3 rounded-md border bg-background">
              <FormLabel className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-primary" /> Observation</FormLabel>
              <FormControl><Textarea placeholder="Notes ou instructions pour l'agent..." rows={3} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </CardContent>
      </Card>
    </div>
  );
}
