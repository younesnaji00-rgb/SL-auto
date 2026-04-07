'use client';

import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const requiredFields: Record<string, string> = {
  company: 'Compagnie',
  nature: 'Nature',
  dossierType: 'Type Dossier',
  insuredName: 'Assuré',
  brand: 'Marque',
  registration: 'Matricule',
  dateOfLoss: 'Date Sinistre',
  dateOfRequest: 'Date Requête',
  intermediaryName: 'Intermédiaire',
};

const SummaryField = ({ label, value, required }: { label: string; value?: any; required?: boolean }) => {
  const isEmpty = !value && typeof value !== 'number';
  const displayValue = !isEmpty
    ? value instanceof Date
      ? format(value, "d LLL, y", { locale: fr })
      : String(value)
    : null;

  return (
    <div className={`flex justify-between items-start py-2 px-3 rounded-md ${isEmpty && required ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
      <span className={`text-sm ${isEmpty && required ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {isEmpty ? (
        <span className={`text-sm italic ${required ? 'text-red-500 dark:text-red-400 font-medium flex items-center gap-1' : 'text-muted-foreground/50'}`}>
          {required && <AlertCircle className="h-3.5 w-3.5" />}
          {required ? 'Requis' : 'Non renseigné'}
        </span>
      ) : (
        <span className="text-sm font-medium text-right max-w-[250px] break-words flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          {displayValue}
        </span>
      )}
    </div>
  );
};

export default function Step4() {
  const { getValues } = useFormContext();
  const data = getValues();

  // Count missing required fields
  const missingCount = Object.keys(requiredFields).filter(key => {
    const val = (data as any)[key];
    return !val && typeof val !== 'number';
  }).length;

  const totalRequired = Object.keys(requiredFields).length;
  const filledCount = totalRequired - missingCount;

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
          <p className="text-xs text-muted-foreground mt-1">Vérifiez les informations avant de créer le dossier</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Informations Générales */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Informations générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
              <SummaryField label="Rang de l'expert" value={data.expertRank} />
              {data.expertRank === '2eme expert' && <SummaryField label="Nom 2ème expert" value={data.secondExpertName} />}
              {data.expertRank === '2eme expert' && <SummaryField label="Compagnie 2ème expert" value={data.secondExpertCompany} />}
              <SummaryField label="Type Dossier" value={data.dossierType} required />
              <SummaryField label="Nature" value={data.nature} required />
              <SummaryField label="Mode dossier" value={data.dossierMode} />
              <SummaryField label="Compagnie" value={data.company} required />
              <SummaryField label="Date Requête" value={data.dateOfRequest} required />
              <SummaryField label="Ref Expert" value={data.refExpert} />
            </div>
          </div>

          <Separator />

          {/* Intermédiaire & Références */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Intermédiaire & Références</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
              <SummaryField label="Intermédiaire" value={data.intermediaryName} required />
              <SummaryField label="E-mail Intermédiaire" value={data.intermediaryEmail} />
              <SummaryField label="Ref Compagnie" value={data.companyRef} />
              <SummaryField label="N° de Police" value={data.policyNumber} />
              <SummaryField label="Réparateur" value={data.repairerType} />
              <SummaryField label="Nom Garage" value={data.garageName} />
            </div>
          </div>

          <Separator />

          {/* Assuré & Véhicule */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Véhicule & Assuré</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
              <SummaryField label="Assuré" value={data.insuredName} required />
              <SummaryField label="Téléphone" value={data.insuredPhone} />
              <SummaryField label="WhatsApp" value={data.insuredWhatsapp} />
              <SummaryField label="Autre Tel" value={data.insuredOtherPhone} />
              <SummaryField label="Marque" value={data.brand} required />
              <SummaryField label="Modèle" value={data.model} />
              <SummaryField label="Matricule" value={data.registration} required />
              <SummaryField label="Matricule W" value={data.registrationW} />
              <SummaryField label="Date Sinistre" value={data.dateOfLoss} required />
              <SummaryField label="Date de MEC" value={data.dateOfMEC} />
            </div>
          </div>

          {/* Adversaire (conditional) */}
          {(data.adversaireAssure || data.adversaireMatricule || data.adversaireMarque || data.adversairePolice || data.adversaireCompagnie) ? (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Information Adversaire</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
                  <SummaryField label="Assuré Adversaire" value={data.adversaireAssure} />
                  <SummaryField label="Matricule Adversaire" value={data.adversaireMatricule} />
                  <SummaryField label="Marque Adversaire" value={data.adversaireMarque} />
                  <SummaryField label="N° Police Adversaire" value={data.adversairePolice} />
                  <SummaryField label="Compagnie Adversaire" value={data.adversaireCompagnie} />
                </div>
              </div>
            </>
          ) : (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">Information Adversaire</h3>
                <p className="text-xs text-muted-foreground/50 italic">Aucune information adversaire renseignée</p>
              </div>
            </>
          )}

          {/* Expert designations (conditional) */}
          {(data.designation1erExpert || data.designation2emeExpert || data.designationExpertArbitrage) ? (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Information Expert</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
                  <SummaryField label="Désignation 1er Expert" value={data.designation1erExpert} />
                  <SummaryField label="Désignation 2ème Expert" value={data.designation2emeExpert} />
                  <SummaryField label="Désignation Expert Arbitrage" value={data.designationExpertArbitrage} />
                </div>
              </div>
            </>
          ) : (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">Information Expert</h3>
                <p className="text-xs text-muted-foreground/50 italic">Aucune désignation expert renseignée</p>
              </div>
            </>
          )}

          {/* Planification (conditional) */}
          {(data.planAgentTerrain || data.planDateRDV || data.planZone) ? (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Planification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
                  <SummaryField label="Agent de Terrain" value={data.planAgentTerrain} />
                  <SummaryField label="Type de mission" value={data.planTypeMission} />
                  <SummaryField label="Date RDV" value={data.planDateRDV} />
                  <SummaryField label="Heure RDV" value={data.planTimeRDV} />
                  <SummaryField label="Zone" value={data.planZone} />
                  <SummaryField label="Adresse" value={data.planAdresse} />
                  <SummaryField label="Observation" value={data.planObservation} />
                </div>
              </div>
            </>
          ) : (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">Planification</h3>
                <p className="text-xs text-muted-foreground/50 italic">Aucune planification programmée</p>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        En cliquant sur "Créer le dossier", vous confirmez que toutes les informations ci-dessus sont exactes.
      </p>
    </div>
  );
}
