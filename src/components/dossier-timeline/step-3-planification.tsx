'use client';

import React from 'react';
import type { DocumentReference } from 'firebase/firestore';

import PlanificationTab from '@/app/(app)/dossiers/[id]/planification-tab';

export interface Step3PlanificationProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
  onEditPlanification: (data: any) => void;
  onNewPlanification: (defaultType?: 'Avant' | 'En cours' | 'Après') => void;
  typeFilter?: 'Avant' | 'En cours' | 'Après';
  /** Replay: frozen planification list forwarded to PlanificationTab. */
  plansOverride?: any[];
}

export default function Step3Planification({
  dossierId,
  onEditPlanification,
  onNewPlanification,
  typeFilter,
  plansOverride,
}: Step3PlanificationProps) {
  // The existing PlanificationTab exposes an `onOpenHistory` prop that is
  // wired to a separate history modal on legacy screens. The timeline panel
  // does not currently surface that modal, so we pass a no-op. A future
  // task can surface an inline history trigger here if needed.
  const handleOpenHistory = React.useCallback(() => {
    /* no-op: history surface not wired into the timeline yet */
  }, []);

  return (
    <div className="space-y-6">
      <PlanificationTab
        dossierId={dossierId}
        onOpenHistory={handleOpenHistory}
        onEditPlanification={onEditPlanification}
        onNewPlanification={onNewPlanification}
        typeFilter={typeFilter}
        plansOverride={plansOverride}
      />
    </div>
  );
}
