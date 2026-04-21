'use client';

import React from 'react';
import type { DocumentReference } from 'firebase/firestore';

import RapportTab from '@/app/(app)/dossiers/[id]/rapport-tab';

export interface Step6RapportProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
}

export default function Step6Rapport({ dossierId }: Step6RapportProps) {
  // Thin wrapper over the existing RapportTab which generates the final
  // rapport PDF for the dossier. RapportTab only consumes `dossierId` and
  // subscribes to Firestore itself for everything else.
  return (
    <div className="space-y-6">
      <RapportTab dossierId={dossierId} />
    </div>
  );
}
