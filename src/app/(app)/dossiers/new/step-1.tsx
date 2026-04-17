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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { natures as defaultNatures, compagnies as defaultCompagnies, marques as defaultMarques } from '@/lib/dossiers-data';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Car, Users, Swords, Award, Pencil } from 'lucide-react';

const dossierTypes = ['Normale', 'Classique', 'Agrée', 'Forfait'];
interface Step1Props {
  autoFilledFields?: Set<string>;
  onReopenExpertModal?: () => void;
}

export default function Step1({ autoFilledFields, onReopenExpertModal }: Step1Props) {
  const { control, watch } = useFormContext();
  const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);
  const { options: dbNatures } = useOptions('options_natures', defaultNatures);
  const { options: dbIntermediaires } = useOptions('options_intermediaires', []);

  const compagnies = useMemo(() => dbCompagnies.length > 0 ? dbCompagnies : defaultCompagnies.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbCompagnies]);
  const natures = useMemo(() => dbNatures.length > 0 ? dbNatures : defaultNatures.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbNatures]);
  const intermediaires = useMemo(() => dbIntermediaires.length > 0 ? dbIntermediaires : [], [dbIntermediaires]);

  const expertRank = watch('expertRank');
  const af = autoFilledFields || new Set();
  const aS = (f: string) => af.has(f) ? 'ring-2 ring-amber-400/60 bg-amber-50/30 dark:bg-amber-950/20' : '';
  const aL = (f: string) => af.has(f) ? <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold align-middle">AUTO</span> : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Expert Rank (read-only, set via modal) */}
      <Card className="border">
        <CardHeader className="bg-heading-bg border-b py-3">
          <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Type d&apos;expert</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">{expertRank || '1er expert'}</Badge>
              {expertRank === '2eme expert' && watch('secondExpertName') && (
                <span className="text-sm text-muted-foreground">
                  1er expert : <span className="font-medium text-foreground">{watch('secondExpertName')}</span>
                  {watch('secondExpertCompany') && <> &mdash; {watch('secondExpertCompany')}</>}
                </span>
              )}
            </div>
            {onReopenExpertModal && (
              <Button type="button" variant="ghost" size="sm" onClick={onReopenExpertModal} className="gap-1.5 text-muted-foreground">
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dossier & Intermédiaire - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Dossier info */}
        <Card className="border">
          <CardHeader className="bg-heading-bg border-b py-3">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Informations Dossier</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <FormField control={control} name="dossierType" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Type Dossier <span className="text-red-500">*</span> {aL('dossierType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className={aS('dossierType')}><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl>
                  <SelectContent>{dossierTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={control} name="nature" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <div className="flex items-center justify-between">
                  <FormLabel>Nature du dossier <span className="text-red-500">*</span> {aL('nature')}</FormLabel>
                  <OptionsManagerModal collectionName="options_natures" title="Natures" defaultValues={defaultNatures} />
                </div>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className={aS('nature')}><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl>
                  <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.label}>{n.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
<FormField control={control} name="company" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <div className="flex items-center justify-between">
                  <FormLabel>Compagnie {aL('company')}</FormLabel>
                  <OptionsManagerModal collectionName="compagnies" title="Compagnies" />
                </div>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className={aS('company')}><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl>
                  <SelectContent>{compagnies.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={control} name="dateOfRequest" render={({ field }) => (
              <FormItem className="flex flex-col p-3 rounded-md border bg-background">
                <FormLabel>Date Requête <span className="text-red-500">*</span></FormLabel>
                <FormControl><DatePicker value={field.value} onChange={field.onChange} disabled={true} className={aS('dateOfRequest')} /></FormControl>
              </FormItem>
            )} />
            <FormField control={control} name="refExpert" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Ref Expert {aL('refExpert')}</FormLabel>
                <FormControl><Input placeholder="Référence expert" className={aS('refExpert')} {...field} /></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* RIGHT: Intermédiaire & Refs */}
        <Card className="border">
          <CardHeader className="bg-heading-bg border-b py-3">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Intermédiaire & Références</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <FormField control={control} name="intermediaryName" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <div className="flex items-center justify-between">
                  <FormLabel>Intermédiaire <span className="text-red-500">*</span> {aL('intermediaryName')}</FormLabel>
                  <OptionsManagerModal collectionName="options_intermediaires" title="Intermédiaires" />
                </div>
                {intermediaires.length > 0 ? (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className={aS('intermediaryName')}><SelectValue placeholder="Sélectionnez un élément" /></SelectTrigger></FormControl>
                    <SelectContent>{intermediaires.map(i => <SelectItem key={i.id} value={i.label}>{i.label}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <FormControl><Input placeholder="Nom de l'intermédiaire" className={aS('intermediaryName')} {...field} /></FormControl>
                )}
              </FormItem>
            )} />
            <FormField control={control} name="intermediaryEmail" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>E-mail Intermédiaire {aL('intermediaryEmail')}</FormLabel>
                <FormControl><Input placeholder="email@example.com" className={aS('intermediaryEmail')} {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={control} name="companyRef" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Ref Compagnie {aL('companyRef')}</FormLabel>
                <FormControl><Input placeholder="Référence compagnie" className={aS('companyRef')} {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={control} name="policyNumber" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>N° de Police {aL('policyNumber')}</FormLabel>
                <FormControl><Input placeholder="Numéro de police" className={aS('policyNumber')} {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={control} name="repairerType" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Réparateur <span className="text-red-500">*</span> {aL('repairerType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className={cn("h-10", aS('repairerType'))}><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Agréé">Agréé</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={control} name="garageName" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Nom Garage {aL('garageName')}</FormLabel>
                <FormControl><Input placeholder="Nom du garage" className={aS('garageName')} {...field} value={field.value ?? ''} /></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>
      </div>

      {/* Véhicule & Assuré */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border">
          <CardHeader className="bg-heading-bg border-b py-3">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Informations Assuré</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <FormField control={control} name="insuredName" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Assuré <span className="text-red-500">*</span> {aL('insuredName')}</FormLabel>
                <FormControl><Input placeholder="Nom et prénom" className={aS('insuredName')} {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={control} name="insuredPhone" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
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
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Tel Whatsapp</FormLabel>
                <FormControl><Input placeholder="+212 6 00 00 00 00" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={control} name="insuredOtherPhone" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Autre Tel</FormLabel>
                <FormControl><Input placeholder="Autre numéro" {...field} /></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="bg-heading-bg border-b py-3">
            <CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4 text-primary" /> Informations Véhicule</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <FormField control={control} name="brand" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Marque <span className="text-red-500">*</span> {aL('brand')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className={aS('brand')}><SelectValue placeholder="Sélectionnez un élément" /></SelectTrigger></FormControl>
                  <SelectContent>{defaultMarques.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={control} name="model" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel>Modèle {aL('model')}</FormLabel>
                <FormControl><Input placeholder="ex: Clio" className={aS('model')} {...field} /></FormControl>
              </FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={control} name="registration" render={({ field }) => (
                <FormItem className="p-3 rounded-md border bg-background">
                  <FormLabel>Matricule <span className="text-red-500">*</span> {aL('registration')}</FormLabel>
                  <FormControl><Input placeholder="12345 | A | 1" className={aS('registration')} {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={control} name="registrationW" render={({ field }) => (
                <FormItem className="p-3 rounded-md border bg-background">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={control} name="dateOfLoss" render={({ field }) => (
                <FormItem className="flex flex-col p-3 rounded-md border bg-background">
                  <FormLabel>Date Sinistre <span className="text-red-500">*</span> {aL('dateOfLoss')}</FormLabel>
                  <FormControl><DatePicker value={field.value} onChange={field.onChange} className={aS('dateOfLoss')} /></FormControl>
                </FormItem>
              )} />
              <FormField control={control} name="dateOfMEC" render={({ field }) => (
                <FormItem className="flex flex-col p-3 rounded-md border bg-background">
                  <FormLabel>Date de MEC {aL('dateOfMEC')}</FormLabel>
                  <FormControl><DatePicker value={field.value} onChange={field.onChange} className={aS('dateOfMEC')} /></FormControl>
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Adversaire */}
      <Card className="border">
        <CardHeader className="bg-heading-bg border-b py-3">
          <CardTitle className="text-sm flex items-center gap-2"><Swords className="h-4 w-4 text-primary" /> Information Adversaire</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField control={control} name="adversaireAssure" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background"><FormLabel className="text-xs font-semibold">Assuré Adversaire</FormLabel><FormControl><Input className={aS('adversaireAssure')} {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name="adversaireMatricule" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background"><FormLabel className="text-xs font-semibold">Matricule Adversaire</FormLabel><FormControl><Input className={aS('adversaireMatricule')} {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name="adversaireMarque" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel className="text-xs font-semibold">Marque Adversaire</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className={aS('adversaireMarque')}><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl>
                  <SelectContent>{defaultMarques.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={control} name="adversairePolice" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background"><FormLabel className="text-xs font-semibold">N° Police</FormLabel><FormControl><Input className={aS('adversairePolice')} {...field} /></FormControl></FormItem>
            )} />
            <FormField control={control} name="adversaireCompagnie" render={({ field }) => (
              <FormItem className="p-3 rounded-md border bg-background">
                <FormLabel className="text-xs font-semibold">Compagnie Adversaire</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className={aS('adversaireCompagnie')}><SelectValue placeholder="" /></SelectTrigger></FormControl>
                  <SelectContent>{defaultCompagnies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>
        </CardContent>
      </Card>

      {/* Information Expert */}
      <Card className="border">
        <CardHeader className="bg-heading-bg border-b py-3">
          <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Information Expert</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-muted/20 border">
              <CardHeader className="pb-2 border-b"><CardTitle className="text-sm text-blue-600 dark:text-blue-400">1er Expert</CardTitle></CardHeader>
              <CardContent className="p-3">
                <FormField control={control} name="designation1erExpert" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Désignation 1er Expert</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="Expert 1">Expert 1</SelectItem><SelectItem value="Expert 2">Expert 2</SelectItem><SelectItem value="Expert 3">Expert 3</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
            <Card className="bg-muted/20 border">
              <CardHeader className="pb-2 border-b"><CardTitle className="text-sm text-blue-600 dark:text-blue-400">2eme Expert</CardTitle></CardHeader>
              <CardContent className="p-3">
                <FormField control={control} name="designation2emeExpert" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Désignation 2ème Expert</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="Expert 1">Expert 1</SelectItem><SelectItem value="Expert 2">Expert 2</SelectItem><SelectItem value="Expert 3">Expert 3</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
            <Card className="bg-muted/20 border">
              <CardHeader className="pb-2 border-b"><CardTitle className="text-sm text-blue-600 dark:text-blue-400">Expert Arbitre</CardTitle></CardHeader>
              <CardContent className="p-3">
                <FormField control={control} name="designationExpertArbitrage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Désignation Expert Arbitrage</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="Expert 1">Expert 1</SelectItem><SelectItem value="Expert 2">Expert 2</SelectItem><SelectItem value="Expert 3">Expert 3</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
