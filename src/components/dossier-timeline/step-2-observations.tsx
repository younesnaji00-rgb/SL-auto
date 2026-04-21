'use client';

import React from 'react';
import ObservationsTab from '@/components/observations-tab';

export interface Step2ObservationsProps {
  dossierId: string;
}

export default function Step2Observations({ dossierId }: Step2ObservationsProps) {
  return (
    <div className="space-y-4">
      <ObservationsTab dossierId={dossierId} section="dossiers" />
    </div>
  );
}
