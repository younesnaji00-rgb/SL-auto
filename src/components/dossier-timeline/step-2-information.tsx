'use client';

/**
 * Audit (task #18): required fields flagged to the user via the banner below.
 * Cross-referenced with checkEmptyFields in the deleted
 * src/app/(app)/dossiers/new/creation-form.tsx prior to its removal in task #16.
 * The list is now inlined here (see REQUIRED_FIELDS) so the banner remains
 * self-contained after the wizard deletion.
 *
 * - Compagnie                  -> dossier.compagnie
 * - Nature du dossier          -> dossier.nature
 * - Marque vehicule            -> dossier.vehicule.marque / dossier.vehicule.brand
 * - Matricule vehicule         -> dossier.matricule
 *                                 / dossier.vehicule.immatriculation
 *                                 / dossier.vehicule.registration
 * - Nom de l'assure            -> dossier.assure.nom
 *                                 / dossier.assure (legacy string form)
 * - Date sinistre              -> dossier.dateSinistre
 * - Date requete               -> dossier.dateRequete
 *
 * Editable inputs live in src/app/(app)/dossiers/[id]/information-tab.tsx.
 * This wrapper only surfaces the warning banner and the optional side-by-side
 * scan comparer; it does not add per-field asterisks.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Columns2, X } from 'lucide-react';
import { collection, type DocumentReference } from 'firebase/firestore';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

import InformationTab from '@/app/(app)/dossiers/[id]/information-tab';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirestore } from '@/firebase';

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

// Fields that were required at creation time (legacy soft-warning list from
// the retired creation wizard). Each entry maps a human-readable French label
// to the Firestore dossier path where the value is stored.
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

  const [showCompare, setShowCompare] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const db = useFirestore();
  const docsQuery = useMemo(
    () => (db ? collection(db, 'dossiers', dossierId, 'documents') : null),
    [db, dossierId],
  );
  const { data: allDocs } = useCollection<any>(docsQuery);
  // The comparer only mirrors the document that was dropped in for AI scanning
  // / data extraction — i.e. Step 1's "Document source du pré-remplissage"
  // (dossier.importDocId). Other attachments (propositions d'accord, devis,
  // pièces jointes) must not appear here.
  const importDocId: string | undefined = dossier?.importDocId || undefined;
  const scanDocs = useMemo(
    () =>
      importDocId
        ? (allDocs ?? []).filter((d: any) => d.id === importDocId)
        : [],
    [allDocs, importDocId],
  );

  useEffect(() => {
    if (
      showCompare &&
      scanDocs.length > 0 &&
      !scanDocs.find((d: any) => d.id === selectedScanId)
    ) {
      setSelectedScanId(scanDocs[0].id);
    }
  }, [showCompare, scanDocs, selectedScanId]);

  // One-line notice (state + reason); the labels wrap inline instead of a
  // bullet list so the banner costs a single row.
  const banner = missing.length > 0 && (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-status-danger-fg/30 bg-status-danger-bg px-4 py-2.5 text-sm text-status-danger-fg">
      <span className="flex items-center gap-2 font-medium">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> Champs requis manquants
      </span>
      <span className="min-w-0 text-[13px]">{missing.join(' · ')}</span>
    </div>
  );

  // The comparer toggle rides in the identity block header next to Modifier,
  // so it no longer costs a row of its own.
  const toggleButton = (
    <Button
      type="button"
      variant={showCompare ? 'default' : 'outline'}
      size="sm"
      onClick={() => setShowCompare((v) => !v)}
      className="h-7 gap-1.5 px-2.5 text-xs"
    >
      {showCompare ? (
        <X className="h-3.5 w-3.5" />
      ) : (
        <Columns2 className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{showCompare ? 'Fermer la comparaison' : 'Comparer'}</span>
      <span className="sm:hidden">{showCompare ? 'Fermer' : 'Comparer'}</span>
    </Button>
  );

  const informationContent = (
    <InformationTab
      dossier={dossier}
      dossierRef={dossierRef}
      dossierId={dossierId}
      onEditPlanification={onEditPlanification}
      onNewPlanification={onNewPlanification}
      headerActions={toggleButton}
    />
  );

  if (!showCompare) {
    return (
      <div className="space-y-4">
        {banner}
        {informationContent}
      </div>
    );
  }

  const selectedScan = scanDocs.find((d: any) => d.id === selectedScanId);
  const selectedName = (selectedScan?.nom || selectedScan?.fileName || '')
    .toString()
    .toLowerCase();
  const isImage = /\.(jpe?g|png|gif|webp|bmp)$/i.test(selectedName);

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <div className="min-w-0 space-y-4">
        {banner}
        {informationContent}
      </div>
      <aside className="hidden lg:block">
        <Card
          variant="outline"
          className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col gap-3 overflow-hidden p-3"
        >
          <Select
            value={selectedScanId ?? undefined}
            onValueChange={(v) => setSelectedScanId(v)}
            disabled={scanDocs.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  scanDocs.length === 0
                    ? 'Aucun scan disponible'
                    : 'Sélectionner un scan'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {scanDocs.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {(d.nom || d.fileName || d.id) as string}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1 min-h-0 rounded-md border border-hairline bg-surface-2 overflow-hidden">
            {selectedScan && selectedScan.url ? (
              isImage ? (
                <TransformWrapper
                  minScale={1}
                  maxScale={5}
                  doubleClick={{ mode: 'zoomIn', step: 0.7 }}
                  wheel={{ step: 0.2 }}
                >
                  <TransformComponent
                    wrapperClass="!w-full !h-full"
                    contentClass="!w-full !h-full flex items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedScan.url}
                      alt={(selectedScan.nom || selectedScan.fileName || 'scan') as string}
                      className="max-w-full max-h-full object-contain select-none"
                      draggable={false}
                    />
                  </TransformComponent>
                </TransformWrapper>
              ) : (
                <iframe
                  src={selectedScan.url}
                  title={(selectedScan.nom || selectedScan.fileName || 'scan') as string}
                  className="w-full h-full border-0"
                />
              )
            ) : (
              <div className="t-caption flex h-full items-center justify-center p-6 text-center">
                {scanDocs.length === 0
                  ? 'Aucun scan dans ce dossier.'
                  : 'Sélectionnez un scan pour le visualiser.'}
              </div>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
