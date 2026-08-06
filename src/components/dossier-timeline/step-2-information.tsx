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
 * Editable inputs live in src/app/(app)/dossiers/[id]/information-tab.tsx
 * (frozen by task #18 — do not modify). This wrapper only surfaces the
 * warning banner; it does not add per-field asterisks.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Columns2, X } from 'lucide-react';
import { collection, type DocumentReference } from 'firebase/firestore';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

import InformationTab from '@/app/(app)/dossiers/[id]/information-tab';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirestore } from '@/firebase';
import { useT } from '@/i18n';

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
  const t = useT();
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

  const banner = missing.length > 0 && (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
      <div className="flex items-center gap-2 text-red-800 font-medium">
        <AlertCircle className="h-4 w-4" /> {t('Champs requis manquants')}
      </div>
      <ul className="mt-2 list-disc pl-5 text-red-700 text-xs">
        {missing.map((label) => (
          <li key={label}>{t(label)}</li>
        ))}
      </ul>
    </div>
  );

  const informationContent = (
    <div data-tour="dosd-info-form">
      <InformationTab
        dossier={dossier}
        dossierRef={dossierRef}
        dossierId={dossierId}
        onEditPlanification={onEditPlanification}
        onNewPlanification={onNewPlanification}
      />
    </div>
  );

  const toggleButton = (
    <div className="flex justify-end">
      <Button
        variant={showCompare ? 'default' : 'outline'}
        size="sm"
        onClick={() => setShowCompare((v) => !v)}
        className="gap-1.5"
      >
        {showCompare ? (
          <X className="h-3.5 w-3.5" />
        ) : (
          <Columns2 className="h-3.5 w-3.5" />
        )}
        {showCompare ? t('Fermer la comparaison') : t('Comparer')}
      </Button>
    </div>
  );

  if (!showCompare) {
    return (
      <div className="space-y-6">
        {toggleButton}
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
    <div className="space-y-6">
      {toggleButton}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6 min-w-0">
          {banner}
          {informationContent}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col gap-3 rounded-md border bg-card p-3">
            <Select
              value={selectedScanId ?? undefined}
              onValueChange={(v) => setSelectedScanId(v)}
              disabled={scanDocs.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    scanDocs.length === 0
                      ? t('Aucun scan disponible')
                      : t('Sélectionner un scan')
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
            <div className="flex-1 min-h-0 rounded-md border bg-muted/30 overflow-hidden">
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
                <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
                  {scanDocs.length === 0
                    ? t('Aucun scan dans ce dossier.')
                    : t('Sélectionnez un scan pour le visualiser.')}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
