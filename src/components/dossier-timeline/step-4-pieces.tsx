'use client';

import React from 'react';
import type { DocumentReference } from 'firebase/firestore';
import { Camera, FileText, FolderOpen, Upload } from 'lucide-react';

import DocumentsTab from '@/app/(app)/dossiers/[id]/documents-tab';
import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';
import TypedDocumentsGrid from './typed-documents-grid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface Step4PiecesProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
}

export default function Step4Pieces({ dossierId }: Step4PiecesProps) {
  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Documents</h3>
        </div>
        <Tabs defaultValue="browse" className="w-full">
          <TabsList>
            <TabsTrigger value="browse" className="gap-1.5">
              <FolderOpen className="h-4 w-4" /> Documents
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5">
              <Upload className="h-4 w-4" /> Importer un document
            </TabsTrigger>
          </TabsList>
          <TabsContent value="browse" className="mt-4">
            <DocumentsTab dossierId={dossierId} />
          </TabsContent>
          <TabsContent value="import" className="mt-4">
            <TypedDocumentsGrid dossierId={dossierId} />
          </TabsContent>
        </Tabs>
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
