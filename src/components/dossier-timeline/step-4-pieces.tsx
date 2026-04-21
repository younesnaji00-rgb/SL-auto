'use client';

import React from 'react';
import type { DocumentReference } from 'firebase/firestore';
import { Camera, FileText } from 'lucide-react';

import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';
import TypedDocumentsGrid from './typed-documents-grid';

export interface Step4PiecesProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
}

export default function Step4Pieces({ dossierId }: Step4PiecesProps) {
  // Thin wrapper that stacks the existing Documents and Photos tabs as
  // sub-sections (no inner tabs) so the timeline keeps its scroll-first
  // reading flow. Only `dossierId` is forwarded; both child tabs pull
  // everything else from their own Firestore subscriptions.
  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Documents</h3>
        </div>
        <TypedDocumentsGrid dossierId={dossierId} />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Photos</h3>
        </div>
        <PhotosTab dossierId={dossierId} />
      </section>
    </div>
  );
}
