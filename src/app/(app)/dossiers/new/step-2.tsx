'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { marques as defaultMarques } from '@/lib/dossiers-data';

interface Step2Props {
  autoFilledFields?: Set<string>;
}

export default function Step2({ autoFilledFields }: Step2Props) {
  const { control } = useFormContext();

  const af = autoFilledFields || new Set();
  const aS = (f: string) => af.has(f) ? 'ring-2 ring-amber-400/60 bg-amber-50/30 dark:bg-amber-950/20' : '';
  const aL = (f: string) => af.has(f) ? <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold align-middle">AUTO</span> : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in-0 duration-500">
      <Card>
        <CardHeader><CardTitle>Informations Assuré</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField control={control} name="insuredName" render={({ field }) => (
            <FormItem>
              <FormLabel>Assuré <span className="text-red-500">*</span> {aL('insuredName')}</FormLabel>
              <FormControl><Input placeholder="Nom et prénom" className={aS('insuredName')} {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={control} name="insuredPhone" render={({ field }) => (
            <FormItem>
              <FormLabel>Tel Assuré {aL('insuredPhone')}</FormLabel>
              <FormControl>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm border border-r-0 rounded-l-md bg-muted text-muted-foreground">+212</span>
                  <Input placeholder="6 00 00 00 00" className={`rounded-l-none ${aS('insuredPhone')}`} {...field} />
                </div>
              </FormControl>
            </FormItem>
          )} />
          <FormField control={control} name="insuredWhatsapp" render={({ field }) => (
            <FormItem>
              <FormLabel>Tel Whatsapp</FormLabel>
              <FormControl><Input placeholder="+212 6 00 00 00 00" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={control} name="insuredOtherPhone" render={({ field }) => (
            <FormItem>
              <FormLabel>Autre Tel</FormLabel>
              <FormControl><Input placeholder="Autre numéro" {...field} /></FormControl>
            </FormItem>
          )} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Informations Véhicule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField control={control} name="brand" render={({ field }) => (
            <FormItem>
              <FormLabel>Marque <span className="text-red-500">*</span> {aL('brand')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger className={aS('brand')}><SelectValue placeholder="Sélectionnez un élément" /></SelectTrigger></FormControl>
                <SelectContent>{defaultMarques.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={control} name="model" render={({ field }) => (
            <FormItem>
              <FormLabel>Modèle {aL('model')}</FormLabel>
              <FormControl><Input placeholder="ex: Clio" className={aS('model')} {...field} /></FormControl>
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={control} name="registration" render={({ field }) => (
              <FormItem>
                <FormLabel>Matricule <span className="text-red-500">*</span> {aL('registration')}</FormLabel>
                <FormControl><Input placeholder="12345 | A | 1" className={aS('registration')} {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={control} name="registrationW" render={({ field }) => (
              <FormItem>
                <FormLabel>Matricule W {aL('registrationW')}</FormLabel>
                <FormControl>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm border border-r-0 rounded-l-md bg-muted text-muted-foreground font-semibold">WW</span>
                    <Input placeholder="" className={`rounded-l-none ${aS('registrationW')}`} {...field} />
                  </div>
                </FormControl>
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={control} name="dateOfLoss" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date Sinistre <span className="text-red-500">*</span> {aL('dateOfLoss')}</FormLabel>
                <FormControl><DatePicker value={field.value} onChange={field.onChange} className={aS('dateOfLoss')} /></FormControl>
              </FormItem>
            )} />
            <FormField control={control} name="dateOfMEC" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date de MEC {aL('dateOfMEC')}</FormLabel>
                <FormControl><DatePicker value={field.value} onChange={field.onChange} className={aS('dateOfMEC')} /></FormControl>
              </FormItem>
            )} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
