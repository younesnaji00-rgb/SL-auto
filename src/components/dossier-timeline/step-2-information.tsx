'use client';

import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import type { DocumentReference } from 'firebase/firestore';

import InformationTab from '@/app/(app)/dossiers/[id]/information-tab';

export interface Step2InformationProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
  onEditPlanification: (data: any) => void;
  onNewPlanification: () => void;
}

// Helper: read a possibly-dotted path from an object.
function readPath(obj: any, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function isEmpty(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

// Fields that were required at creation time (mirrors the `checkEmptyFields`
// soft-warning list in `src/app/(app)/dossiers/new/creation-form.tsx`).
// Each entry maps a human-readable French label to the Firestore dossier
// path where the value is stored.
const REQUIRED_FIELDS: { label: string; paths: string[] }[] = [
  { label: 'Compagnie', paths: ['compagnie'] },
  { label: 'Nature du dossier', paths: ['nature'] },
  { label: 'Marque véhicule', paths: ['vehicule.marque', 'vehicule.brand'] },
  {
    label: 'Matricule véhicule',
    paths: ['matricule', 'vehicule.immatriculation', 'vehicule.registration'],
  },
  {
    label: "Nom de l'assuré",
    paths: ['assure.nom', 'assure'],
  },
  { label: 'Date sinistre', paths: ['dateSinistre'] },
  { label: 'Date requête', paths: ['dateRequete'] },
];

export function getMissingRequiredFields(dossier: any): string[] {
  if (!dossier) return [];
  const missing: string[] = [];
  for (const { label, paths } of REQUIRED_FIELDS) {
    const hasValue = paths.some((p) => {
      const v = readPath(dossier, p);
      // `assure` alone may be a legacy string — accept it if non-empty.
      if (p === 'assure' && typeof v === 'string') return !isEmpty(v);
      return !isEmpty(v);
    });
    if (!hasValue) missing.push(label);
  }
  return missing;
}

export default function Step2Information({
  dossierId,
  dossier,
  dossierRef,
  readOnly,
  onEditPlanification,
  onNewPlanification,
}: Step2InformationProps) {
  const missing = useMemo(() => getMissingRequiredFields(dossier), [dossier]);

  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
          <div className="flex items-center gap-2 text-red-800 font-medium">
            <AlertCircle className="h-4 w-4" /> Champs requis manquants
          </div>
          <ul className="mt-2 list-disc pl-5 text-red-700 text-xs">
            {missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}

      <InformationTab
        dossier={dossier}
        dossierRef={dossierRef}
        dossierId={dossierId}
        onEditPlanification={onEditPlanification}
        onNewPlanification={onNewPlanification}
      />
    </div>
  );
}
