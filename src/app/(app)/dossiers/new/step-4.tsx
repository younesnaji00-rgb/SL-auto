'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { useOptions } from '@/hooks/use-options';
import { natures as defaultNatures, compagnies as defaultCompagnies, marques as defaultMarques } from '@/lib/dossiers-data';

const requiredFields: Record<string, string> = {
  company: 'Compagnie',
  nature: 'Nature du dossier',
  dossierType: 'Type Dossier',
  insuredName: 'Assuré',
  brand: 'Marque',
  registration: 'Matricule',
  dateOfLoss: 'Date Sinistre',
  dateOfRequest: 'Date Requête',
  intermediaryName: 'Intermédiaire',
};

const EditableSummaryField = ({
  fieldName,
  label,
  required,
  type = 'text',
  options,
}: {
  fieldName: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'date' | 'select';
  options?: string[];
}) => {
  const { watch, setValue } = useFormContext();
  const value = watch(fieldName);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEmpty = !value && typeof value !== 'number';
  const displayValue = !isEmpty
    ? value instanceof Date
      ? format(value, 'd LLL, y', { locale: fr })
      : String(value)
    : null;

  useEffect(() => {
    if (isEditing && type === 'text' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, type]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(fieldName, e.target.value, { shouldValidate: true, shouldDirty: true });
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setValue(fieldName, date, { shouldValidate: true, shouldDirty: true });
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex justify-between items-center py-1.5 px-3 rounded-md bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20 transition-all duration-200">
        <span className="text-sm text-muted-foreground shrink-0 mr-3">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {type === 'date' ? (
          <DatePicker
            value={value instanceof Date ? value : value ? new Date(value) : null}
            onChange={handleDateChange}
          />
        ) : type === 'select' && options ? (
          <Select
            value={typeof value === 'string' ? value : ''}
            onValueChange={(val) => {
              setValue(fieldName, val, { shouldValidate: true, shouldDirty: true });
              setIsEditing(false);
            }}
          >
            <SelectTrigger className="h-7 text-sm w-full max-w-[250px] min-w-0">
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            ref={inputRef}
            value={typeof value === 'string' ? value : value ? String(value) : ''}
            onChange={handleTextChange}
            onBlur={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm w-full max-w-[250px] min-w-0 text-right"
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`group flex justify-between items-center py-2 px-3 rounded-md cursor-pointer transition-all duration-200 hover:bg-accent/50 ${isEmpty && required ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
    >
      <span className={`text-sm ${isEmpty && required ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="flex items-center gap-1.5">
        {isEmpty ? (
          <span className={`text-sm italic ${required ? 'text-red-500 dark:text-red-400 font-medium flex items-center gap-1' : 'text-muted-foreground/50'}`}>
            {required && <AlertCircle className="h-3.5 w-3.5" />}
            {required ? 'Cliquez pour remplir' : 'Non renseigné'}
          </span>
        ) : (
          <>
            <span className="text-sm font-medium text-right max-w-[250px] min-w-0 truncate flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              {displayValue}
            </span>
          </>
        )}
        <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-all duration-200 shrink-0 ml-1" />
      </span>
    </div>
  );
};

const EmptySection = ({
  title,
  message,
  scrollTarget,
}: {
  title: string;
  message: string;
  scrollTarget: string;
}) => {
  const handleAdd = () => {
    const el = document.getElementById(scrollTarget);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <Separator />
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">{title}</h3>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Plus className="h-3 w-3" />
            Ajouter
          </button>
        </div>
        <p className="text-xs text-muted-foreground/50 italic">{message}</p>
      </div>
    </>
  );
};

const FieldWrapper = ({ fieldName, children }: { fieldName: string; children: React.ReactNode }) => (
  <div data-field={fieldName}>{children}</div>
);

const dossierTypes = ['Normale', 'Classique', 'Agrée', 'Forfait'];
const expertRanks = ['1er expert', '2eme expert', 'Arbitre'];
const repairerTypes = ['Agréé', 'Normal'];

export default function Step4() {
  const { watch } = useFormContext();
  const data = watch();

  const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);
  const { options: dbNatures } = useOptions('options_natures', defaultNatures);
  const { options: dbAgents } = useOptions('options_agents', ['Agent 1', 'Agent 2']);
  const { options: dbRDVTypes } = useOptions('options_types_rdv', ['Avant', 'En cours', 'Après']);

  const compagnieLabels = useMemo(() => dbCompagnies.length > 0 ? dbCompagnies.map(c => c.label) : defaultCompagnies, [dbCompagnies]);
  const natureLabels = useMemo(() => dbNatures.length > 0 ? dbNatures.map(n => n.label) : defaultNatures, [dbNatures]);
  const agentLabels = useMemo(() => dbAgents.map(a => a.label), [dbAgents]);
  const rdvTypeLabels = useMemo(() => dbRDVTypes.length > 0 ? dbRDVTypes.map(t => t.label) : ['Avant', 'En cours', 'Après'], [dbRDVTypes]);

  const missingCount = Object.keys(requiredFields).filter(key => {
    const val = (data as any)[key];
    return !val && typeof val !== 'number';
  }).length;

  const totalRequired = Object.keys(requiredFields).length;
  const filledCount = totalRequired - missingCount;

  const hasAdversaire = data.adversaireAssure || data.adversaireMatricule || data.adversaireMarque || data.adversairePolice || data.adversaireCompagnie;
  const hasExpert = data.designation1erExpert || data.designation2emeExpert || data.designationExpertArbitrage;
  const hasPlanification = data.planAgentTerrain || data.planDateRDV || data.planZone;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Completion Summary Bar */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${missingCount === 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'}`}>
        {missingCount === 0 ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-semibold ${missingCount === 0 ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {missingCount === 0
              ? 'Tous les champs requis sont remplis'
              : `${missingCount} champ(s) requis manquant(s)`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{filledCount}/{totalRequired} champs obligatoires remplis</p>
        </div>
        {/* Progress bar */}
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${missingCount === 0 ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${(filledCount / totalRequired) * 100}%` }}
          />
        </div>
      </div>

      {/* Document-style summary */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        {/* Header band */}
        <div className="bg-primary/5 dark:bg-primary/10 px-6 py-4 border-b">
          <h2 className="text-base font-bold text-foreground">Récapitulatif du dossier</h2>
          <p className="text-xs text-muted-foreground mt-1">Cliquez sur n&apos;importe quel champ pour le modifier directement.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Informations Générales */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Informations générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5 min-w-0">
              <FieldWrapper fieldName="expertRank">
                <EditableSummaryField fieldName="expertRank" label="Type d'expert" type="select" options={expertRanks} />
              </FieldWrapper>
              {data.expertRank === '2eme expert' && (
                <FieldWrapper fieldName="secondExpertName">
                  <EditableSummaryField fieldName="secondExpertName" label="Nom du 1er expert" />
                </FieldWrapper>
              )}
              {data.expertRank === '2eme expert' && (
                <FieldWrapper fieldName="secondExpertCompany">
                  <EditableSummaryField fieldName="secondExpertCompany" label="Compagnie du 1er expert" />
                </FieldWrapper>
              )}
              <FieldWrapper fieldName="dossierType">
                <EditableSummaryField fieldName="dossierType" label="Type Dossier" required type="select" options={dossierTypes} />
              </FieldWrapper>
              <FieldWrapper fieldName="nature">
                <EditableSummaryField fieldName="nature" label="Nature du dossier" required type="select" options={natureLabels} />
              </FieldWrapper>
              <FieldWrapper fieldName="company">
                <EditableSummaryField fieldName="company" label="Compagnie" required type="select" options={compagnieLabels} />
              </FieldWrapper>
              <FieldWrapper fieldName="dateOfRequest">
                <div className="flex justify-between items-center py-2 px-3 rounded-md">
                  <span className="text-sm text-muted-foreground">Date Requête <span className="text-red-500 ml-0.5">*</span></span>
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    {data.dateOfRequest instanceof Date
                      ? format(data.dateOfRequest, 'd LLL, y', { locale: fr })
                      : data.dateOfRequest ? format(new Date(data.dateOfRequest), 'd LLL, y', { locale: fr }) : 'Aujourd\'hui'}
                  </span>
                </div>
              </FieldWrapper>
              <FieldWrapper fieldName="refExpert">
                <EditableSummaryField fieldName="refExpert" label="Ref Expert" />
              </FieldWrapper>
            </div>
          </div>

          <Separator />

          {/* Intermédiaire & Références */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Intermédiaire & Références</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5 min-w-0">
              <FieldWrapper fieldName="intermediaryName">
                <EditableSummaryField fieldName="intermediaryName" label="Intermédiaire" required />
              </FieldWrapper>
              <FieldWrapper fieldName="intermediaryEmail">
                <EditableSummaryField fieldName="intermediaryEmail" label="E-mail Intermédiaire" />
              </FieldWrapper>
              <FieldWrapper fieldName="companyRef">
                <EditableSummaryField fieldName="companyRef" label="Ref Compagnie" />
              </FieldWrapper>
              <FieldWrapper fieldName="policyNumber">
                <EditableSummaryField fieldName="policyNumber" label="N° de Police" />
              </FieldWrapper>
              <FieldWrapper fieldName="repairerType">
                <EditableSummaryField fieldName="repairerType" label="Réparateur" type="select" options={repairerTypes} />
              </FieldWrapper>
              <FieldWrapper fieldName="garageName">
                <EditableSummaryField fieldName="garageName" label="Nom Garage" />
              </FieldWrapper>
            </div>
          </div>

          <Separator />

          {/* Assuré & Véhicule */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Véhicule & Assuré</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5 min-w-0">
              <FieldWrapper fieldName="insuredName">
                <EditableSummaryField fieldName="insuredName" label="Assuré" required />
              </FieldWrapper>
              <FieldWrapper fieldName="insuredPhone">
                <EditableSummaryField fieldName="insuredPhone" label="Téléphone" />
              </FieldWrapper>
              <FieldWrapper fieldName="insuredWhatsapp">
                <EditableSummaryField fieldName="insuredWhatsapp" label="WhatsApp" />
              </FieldWrapper>
              <FieldWrapper fieldName="insuredOtherPhone">
                <EditableSummaryField fieldName="insuredOtherPhone" label="Autre Tel" />
              </FieldWrapper>
              <FieldWrapper fieldName="brand">
                <EditableSummaryField fieldName="brand" label="Marque" required type="select" options={defaultMarques} />
              </FieldWrapper>
              <FieldWrapper fieldName="model">
                <EditableSummaryField fieldName="model" label="Modèle" />
              </FieldWrapper>
              <FieldWrapper fieldName="registration">
                <EditableSummaryField fieldName="registration" label="Matricule" required />
              </FieldWrapper>
              <FieldWrapper fieldName="registrationW">
                <EditableSummaryField fieldName="registrationW" label="Matricule W" />
              </FieldWrapper>
              <FieldWrapper fieldName="dateOfLoss">
                <EditableSummaryField fieldName="dateOfLoss" label="Date Sinistre" required type="date" />
              </FieldWrapper>
              <FieldWrapper fieldName="dateOfMEC">
                <EditableSummaryField fieldName="dateOfMEC" label="Date de MEC" type="date" />
              </FieldWrapper>
            </div>
          </div>

          {/* Adversaire (conditional) */}
          {hasAdversaire ? (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Information Adversaire</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5 min-w-0">
                  <FieldWrapper fieldName="adversaireAssure">
                    <EditableSummaryField fieldName="adversaireAssure" label="Assuré Adversaire" />
                  </FieldWrapper>
                  <FieldWrapper fieldName="adversaireMatricule">
                    <EditableSummaryField fieldName="adversaireMatricule" label="Matricule Adversaire" />
                  </FieldWrapper>
                  <FieldWrapper fieldName="adversaireMarque">
                    <EditableSummaryField fieldName="adversaireMarque" label="Marque Adversaire" type="select" options={defaultMarques} />
                  </FieldWrapper>
                  <FieldWrapper fieldName="adversairePolice">
                    <EditableSummaryField fieldName="adversairePolice" label="N° Police Adversaire" />
                  </FieldWrapper>
                  <FieldWrapper fieldName="adversaireCompagnie">
                    <EditableSummaryField fieldName="adversaireCompagnie" label="Compagnie Adversaire" type="select" options={compagnieLabels} />
                  </FieldWrapper>
                </div>
              </div>
            </>
          ) : (
            <EmptySection
              title="Information Adversaire"
              message="Aucune information adversaire renseignée"
              scrollTarget="step-2"
            />
          )}

          {/* Expert designations (conditional) */}
          {hasExpert ? (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Information Expert</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5 min-w-0">
                  <FieldWrapper fieldName="designation1erExpert">
                    <EditableSummaryField fieldName="designation1erExpert" label="Désignation 1er Expert" />
                  </FieldWrapper>
                  <FieldWrapper fieldName="designation2emeExpert">
                    <EditableSummaryField fieldName="designation2emeExpert" label="Désignation 2ème Expert" />
                  </FieldWrapper>
                  <FieldWrapper fieldName="designationExpertArbitrage">
                    <EditableSummaryField fieldName="designationExpertArbitrage" label="Désignation Expert Arbitrage" />
                  </FieldWrapper>
                </div>
              </div>
            </>
          ) : (
            <EmptySection
              title="Information Expert"
              message="Aucune désignation expert renseignée"
              scrollTarget="step-2"
            />
          )}

          {/* Planification (conditional) */}
          {hasPlanification ? (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Planification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5 min-w-0">
                  <FieldWrapper fieldName="planAgentTerrain">
                    <EditableSummaryField fieldName="planAgentTerrain" label="Agent de Terrain" type="select" options={agentLabels} />
                  </FieldWrapper>
                  <FieldWrapper fieldName="planTypeMission">
                    <EditableSummaryField fieldName="planTypeMission" label="Type de mission" type="select" options={rdvTypeLabels} />
                  </FieldWrapper>
                  <FieldWrapper fieldName="planDateRDV">
                    <EditableSummaryField fieldName="planDateRDV" label="Date RDV" type="date" />
                  </FieldWrapper>
                  <FieldWrapper fieldName="planTimeRDV">
                    <EditableSummaryField fieldName="planTimeRDV" label="Heure RDV" />
                  </FieldWrapper>
                  <FieldWrapper fieldName="planZone">
                    <EditableSummaryField fieldName="planZone" label="Zone" />
                  </FieldWrapper>
                  <FieldWrapper fieldName="planAdresse">
                    <EditableSummaryField fieldName="planAdresse" label="Adresse" />
                  </FieldWrapper>
                  <FieldWrapper fieldName="planObservation">
                    <EditableSummaryField fieldName="planObservation" label="Observation" />
                  </FieldWrapper>
                </div>
              </div>
            </>
          ) : (
            <EmptySection
              title="Planification"
              message="Aucune planification programmée"
              scrollTarget="step-3"
            />
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        En cliquant sur &quot;Créer le dossier&quot;, vous confirmez que toutes les informations ci-dessus sont exactes.
      </p>
    </div>
  );
}
