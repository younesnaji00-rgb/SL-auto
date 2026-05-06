'use client';

import React from 'react';
import type { DocumentReference } from 'firebase/firestore';
import { Camera, ChevronDown, FileText, FolderOpen, Send, Upload } from 'lucide-react';

import DocumentsTab from '@/app/(app)/dossiers/[id]/documents-tab';
import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';
import TypedDocumentsGrid from './typed-documents-grid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Step4PiecesProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
  onSendToChiffrage?: () => void;
  hidePhotos?: boolean;
}

function useSectionOpen(dossierId: string, key: 'documents' | 'photos'): [boolean, (v: boolean) => void] {
  const storageKey = `pieces-${dossierId}-${key}-open`;
  const [open, setOpen] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try { const v = window.localStorage.getItem(storageKey); return v === null ? true : v === 'true'; }
    catch { return true; }
  });
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(storageKey, String(open)); } catch {}
  }, [open, storageKey]);
  return [open, setOpen];
}

export default function Step4Pieces({ dossierId, readOnly, onSendToChiffrage, hidePhotos }: Step4PiecesProps) {
  const [docsOpen, setDocsOpen] = useSectionOpen(dossierId, 'documents');
  const [photosOpen, setPhotosOpen] = useSectionOpen(dossierId, 'photos');

  return (
    <div className="space-y-8">
      <Collapsible open={docsOpen} onOpenChange={setDocsOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 mb-3 w-full">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">Documents</h3>
            <ChevronDown className={cn('h-4 w-4 ml-auto transition-transform', !docsOpen && '-rotate-90')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Tabs defaultValue="browse" className="w-full">
            <div className="flex items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="browse" className="gap-1.5">
                  <FolderOpen className="h-4 w-4" /> Documents
                </TabsTrigger>
                <TabsTrigger value="import" className="gap-1.5">
                  <Upload className="h-4 w-4" /> Importer un document
                </TabsTrigger>
              </TabsList>
              {!readOnly && onSendToChiffrage && (
                <Button size="sm" onClick={onSendToChiffrage} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Envoyer vers chiffrage
                </Button>
              )}
            </div>
            <TabsContent value="browse" className="mt-4">
              <DocumentsTab dossierId={dossierId} />
            </TabsContent>
            <TabsContent value="import" className="mt-4">
              <TypedDocumentsGrid dossierId={dossierId} />
            </TabsContent>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>

      {!hidePhotos && (
        <Collapsible open={photosOpen} onOpenChange={setPhotosOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex items-center gap-2 mb-3 w-full">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">Photos</h3>
              <ChevronDown className={cn('h-4 w-4 ml-auto transition-transform', !photosOpen && '-rotate-90')} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <PhotosTab dossierId={dossierId} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
