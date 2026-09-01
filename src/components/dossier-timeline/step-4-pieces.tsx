'use client';

import React, { useMemo } from 'react';
import { collection, type DocumentReference } from 'firebase/firestore';
import { Camera, ChevronDown, Send } from 'lucide-react';

import DocumentsTab from '@/app/(app)/dossiers/[id]/documents-tab';
import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';
import TypedDocumentsGrid from './typed-documents-grid';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { materializeMissing2emeSlots } from '@/lib/cardinal-materialize';
import { computeRequiredDocsStatus } from '@/lib/required-docs';
import SmartInbox from './smart-inbox';

/**
 * Pièces step.
 *
 * Default (merged) surface, top → bottom:
 *   1. Boîte de dépôt (`SmartInbox`) — the import path (AI filing).
 *   2. Documents browser (`DocumentsTab`) — type list with Reçu / À déposer
 *      chips, requirement summary, thumbnail grid, manual typed Importer,
 *      and the single primary "Envoyer vers chiffrage".
 *   3. Photos collapsible.
 *
 * `onlyImportTab` keeps the slot board (`TypedDocumentsGrid`) for the accord /
 * réforme contexts (steps 6 and 11). The slot-board props below are forwarded
 * ONLY in that mode; in the merged surface they are accepted but unused.
 */
export interface Step4PiecesProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
  onSendToChiffrage?: () => void;
  hidePhotos?: boolean;
  /** Slot board only (`onlyImportTab`). No-op in the merged surface. */
  hideAccordSlots?: boolean;
  /** Slot board only (`onlyImportTab`). No-op in the merged surface. */
  showOnlyAccordSlots?: boolean;
  /**
   * When true, the cardinal `+` pimple button on devis/facture accord slots
   * is not rendered. Forwarded to `TypedDocumentsGrid` (`onlyImportTab`).
   * Used by step 6 to lock the cardinal chain to the current revision.
   */
  hideCardinalPlus?: boolean;
  /**
   * When true, render only the typed-documents grid directly (no Documents
   * browser, no Boîte de dépôt). Used in steps 6 / 11 (Accord) to surface the
   * import cards as the primary affordance.
   */
  onlyImportTab?: boolean;
  /**
   * Forwarded to TypedDocumentsGrid → FamilyRow (`onlyImportTab`). Also drives
   * the 2ème-slot materialisation before sending to chiffrage.
   */
  cardinalFilter?: 'all' | '1-only' | '2-plus';
  /** Slot board only (`onlyImportTab`). No-op in the merged surface. */
  showBaseGarageSlots?: boolean;
  /** Slot board only (`onlyImportTab`). No-op in the merged surface. */
  hideOtherSlots?: boolean;
  /** Slot board only (`onlyImportTab`). No-op in the merged surface. */
  showAllNonAccordSlots?: boolean;
  /**
   * When true, the "Assigner au chiffrage" button (in `onlyImportTab` mode) is
   * disabled until at least one filled 1er accord doc AND one filled 1er
   * proposition doc exist on the dossier (regardless of family). Used in
   * step 11 (2ème accord et +) so the gestionnaire can't escalate before the
   * first round is in.
   */
  requireFirstAccordFilled?: boolean;
  /** Slot board only (`onlyImportTab`). No-op in the merged surface. */
  showReformeSlots?: boolean;
  /**
   * When true, the merged surface does NOT render its own `SmartInbox` drop
   * box. Used by step 1's Documents tab, where `Step1Import` already shows
   * the drop box with AI pre-fill above.
   */
  hideInbox?: boolean;
}

function useSectionOpen(dossierId: string, key: 'photos'): [boolean, (v: boolean) => void] {
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

export default function Step4Pieces({ dossierId, dossier, readOnly, onSendToChiffrage, hidePhotos, hideAccordSlots, showOnlyAccordSlots, hideCardinalPlus, onlyImportTab, cardinalFilter, showBaseGarageSlots, hideOtherSlots, showAllNonAccordSlots, requireFirstAccordFilled, showReformeSlots, hideInbox }: Step4PiecesProps) {
  const [photosOpen, setPhotosOpen] = useSectionOpen(dossierId, 'photos');

  // Subscribe to documents so we can gate the "Envoyer / Assigner au
  // chiffrage" button on (a) the required source slots being filled (item
  // 023) and (b) when `requireFirstAccordFilled` is set, at least one 1er
  // accord/proposition.
  const db = useFirestore();
  const auth = useAuth();
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
  // Item 023 — shared predicate with the documents browser (`lib/required-docs`).
  const { missingRequired, garageFilled, allRequiredFilled } = useMemo(
    () => computeRequiredDocsStatus(docs ?? null),
    [docs],
  );
  const assignerDisabled = (!!requireFirstAccordFilled && !firstRoundFilled) || !allRequiredFilled;

  const handleSendToChiffrage = async () => {
    if (!onSendToChiffrage) return;
    if (cardinalFilter === '2-plus' && db && docs) {
      try {
        const uid = auth?.currentUser?.uid || 'unknown';
        await materializeMissing2emeSlots(db, dossierId, docs as any, uid);
      } catch (e) {
        console.warn('[step-4] materialize 2eme slots failed (non-fatal)', e);
      }
    }
    onSendToChiffrage();
  };

  // Why the gate is closed — shared by both surfaces.
  const gateReason = !allRequiredFilled ? (
    <>
      {missingRequired.length > 0 && (
        <>Documents requis manquants&nbsp;: {missingRequired.join(', ')}.</>
      )}
      {missingRequired.length > 0 && !garageFilled && <br />}
      {!garageFilled && (
        <>Au moins un Devis Garage ou une Facture Garage est requis.</>
      )}
    </>
  ) : (
    <>Au moins un 1er accord ou une 1ère proposition doit être rempli avant d&apos;assigner.</>
  );

  const gatedButton = (label: string) => {
    const node = (
      <Button size="sm" onClick={handleSendToChiffrage} disabled={assignerDisabled} className="gap-1.5">
        <Send className="h-3.5 w-3.5" /> {label}
      </Button>
    );
    if (!assignerDisabled) return node;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{node}</span>
          </TooltipTrigger>
          <TooltipContent>{gateReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (onlyImportTab) {
    const showAssigner = !readOnly && !!onSendToChiffrage;
    return (
      <div className="space-y-4">
        {showAssigner && (
          <div className="flex justify-end">{gatedButton('Assigner au chiffrage')}</div>
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
          showReformeSlots={showReformeSlots}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!readOnly && !hideInbox && (
        <SmartInbox
          buttonLabel="Ajouter des pièces"
          dossierId={dossierId}
          dossier={dossier}
          readOnly={readOnly}
          title="Déposez vos pièces ici"
          description="Devis, factures, PV, carte grise, attestation, photos… chaque fichier est reconnu par l'IA et rangé sous le bon type ci-dessous."
        />
      )}

      <DocumentsTab
        dossierId={dossierId}
        primaryAction={!readOnly && onSendToChiffrage ? gatedButton('Envoyer vers chiffrage') : undefined}
      />

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
