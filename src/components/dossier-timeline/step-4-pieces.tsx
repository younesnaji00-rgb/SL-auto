'use client';

import React, { useMemo } from 'react';
import { collection, type DocumentReference } from 'firebase/firestore';
import { Camera, ChevronDown, FileText, FolderOpen, Send, Upload } from 'lucide-react';

import DocumentsTab from '@/app/(app)/dossiers/[id]/documents-tab';
import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';
import TypedDocumentsGrid, { REQUIRED_SOURCE_SLOTS } from './typed-documents-grid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore } from '@/firebase';
import { parseAccordDocType } from '@/lib/docType-accorde';

export interface Step4PiecesProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
  onSendToChiffrage?: () => void;
  hidePhotos?: boolean;
  hideAccordSlots?: boolean;
  showOnlyAccordSlots?: boolean;
  /**
   * When true, the cardinal `+` pimple button on devis/facture accord slots
   * is not rendered. Forwarded to `TypedDocumentsGrid`. Used by step 6 to
   * lock the cardinal chain to the current revision.
   */
  hideCardinalPlus?: boolean;
  /**
   * When true, render only the typed-documents grid directly (no Documents
   * collapsible header, no Documents/Importer tabs, no DocumentsTab browser).
   * Used in step 6 (Accord) to surface the import cards as the primary affordance.
   */
  onlyImportTab?: boolean;
  /** Forwarded to TypedDocumentsGrid → FamilyRow to filter slots by cardinal ordinal. */
  cardinalFilter?: 'all' | '1-only' | '2-plus';
  /** Forwarded to TypedDocumentsGrid — render base devis/facture display-only slots. */
  showBaseGarageSlots?: boolean;
  /** Forwarded to TypedDocumentsGrid — suppress "Autres documents" section (step 1). */
  hideOtherSlots?: boolean;
  /**
   * Forwarded to TypedDocumentsGrid — surface Rapport / Réforme / "Autres
   * documents" sections in addition to the gated default flow. Used in step 1
   * (Création de mission) to expose every non-accord document type.
   */
  showAllNonAccordSlots?: boolean;
  /**
   * When true, the "Assigner au chiffrage" button (in `onlyImportTab` mode) is
   * disabled until at least one filled 1er accord doc AND one filled 1er
   * proposition doc exist on the dossier (regardless of family). Used in
   * step 11 (2ème accord et +) so the gestionnaire can't escalate before the
   * first round is in.
   */
  requireFirstAccordFilled?: boolean;
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

export default function Step4Pieces({ dossierId, readOnly, onSendToChiffrage, hidePhotos, hideAccordSlots, showOnlyAccordSlots, hideCardinalPlus, onlyImportTab, cardinalFilter, showBaseGarageSlots, hideOtherSlots, showAllNonAccordSlots, requireFirstAccordFilled }: Step4PiecesProps) {
  const [docsOpen, setDocsOpen] = useSectionOpen(dossierId, 'documents');
  const [photosOpen, setPhotosOpen] = useSectionOpen(dossierId, 'photos');

  // Subscribe to documents so we can gate the "Assigner au chiffrage" button
  // on (a) the 7 required source slots being filled (item 023) and (b) when
  // `requireFirstAccordFilled` is set, at least one 1er accord/proposition.
  const db = useFirestore();
  const docsQuery = useMemo(() => {
    if (!db || !dossierId) return null;
    return collection(db, 'dossiers', dossierId, 'documents');
  }, [db, dossierId]);
  const { data: docs } = useCollection<any>(docsQuery);
  const firstRoundFilled = useMemo(() => {
    if (!requireFirstAccordFilled) return true;
    if (!docs) return false;
    // Any single 1er accord OR 1er proposition (across either family) is
    // enough to enable the button.
    for (const d of docs) {
      if (!d?.url || d.pendingUpload) continue;
      const type = (d.type || d.typeDocument || '').trim();
      const parsed = parseAccordDocType(type);
      if (!parsed || parsed.ordinal !== 1) continue;
      if (parsed.kind === 'accord' || parsed.kind === 'proposition-accord') return true;
    }
    return false;
  }, [docs, requireFirstAccordFilled]);
  // Item 023 — the 7 source-doc slots must each have a non-pending document
  // before the gestionnaire can send the dossier to chiffrage. "Autre" is
  // intentionally excluded (optional slot).
  const missingRequired = useMemo<string[]>(() => {
    if (!docs) return [...REQUIRED_SOURCE_SLOTS];
    const filled = new Set<string>();
    for (const d of docs) {
      if (!d?.url || d.pendingUpload) continue;
      const type = (d.type || d.typeDocument || '').trim();
      if (type) filled.add(type);
    }
    return REQUIRED_SOURCE_SLOTS.filter((slot) => !filled.has(slot));
  }, [docs]);
  const allRequiredFilled = missingRequired.length === 0;
  const assignerDisabled = (!!requireFirstAccordFilled && !firstRoundFilled) || !allRequiredFilled;

  if (onlyImportTab) {
    const showAssigner = !readOnly && !!onSendToChiffrage;
    const buttonNode = (
      <Button
        size="sm"
        onClick={onSendToChiffrage}
        disabled={assignerDisabled}
        className="gap-1.5"
      >
        <Send className="h-3.5 w-3.5" /> Assigner au chiffrage
      </Button>
    );
    return (
      <div className="space-y-4">
        {showAssigner && (
          <div className="flex justify-end">
            {assignerDisabled ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>{buttonNode}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!allRequiredFilled ? (
                      <>
                        Documents requis manquants : {missingRequired.join(', ')}.
                      </>
                    ) : (
                      <>Au moins un 1er accord ou une 1ère proposition doit être rempli avant d'assigner.</>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              buttonNode
            )}
          </div>
        )}
        <TypedDocumentsGrid
          dossierId={dossierId}
          hideAccordSlots={hideAccordSlots}
          showOnlyAccordSlots={showOnlyAccordSlots}
          hideCardinalPlus={hideCardinalPlus}
          cardinalFilter={cardinalFilter}
          showBaseGarageSlots={showBaseGarageSlots}
          hideOtherSlots={hideOtherSlots}
          showAllNonAccordSlots={showAllNonAccordSlots}
        />
      </div>
    );
  }

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
                assignerDisabled ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button size="sm" disabled className="gap-1.5">
                            <Send className="h-3.5 w-3.5" /> Envoyer vers chiffrage
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Documents requis manquants : {missingRequired.join(', ')}.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button size="sm" onClick={onSendToChiffrage} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" /> Envoyer vers chiffrage
                  </Button>
                )
              )}
            </div>
            <TabsContent value="browse" className="mt-4">
              <DocumentsTab dossierId={dossierId} />
            </TabsContent>
            <TabsContent value="import" className="mt-4">
              <TypedDocumentsGrid dossierId={dossierId} hideAccordSlots={hideAccordSlots} showOnlyAccordSlots={showOnlyAccordSlots} hideCardinalPlus={hideCardinalPlus} cardinalFilter={cardinalFilter} showBaseGarageSlots={showBaseGarageSlots} hideOtherSlots={hideOtherSlots} showAllNonAccordSlots={showAllNonAccordSlots} />
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
