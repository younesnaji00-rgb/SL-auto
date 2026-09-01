'use client';

/**
 * Informations step: the editable form (information-tab.tsx) with the
 * required-fields banner and a side-by-side "Document source" pane.
 *
 * Why a pane and not a tab (NN/g): checking AI-extracted values against the
 * lettre de mission is a simultaneous task — the user needs both at once —
 * so the source document sits BESIDE the form and opens by default at ≥ lg
 * whenever a scanned source exists. Tabs are reserved for independent facets
 * (Informations | Pièces).
 *
 * Required-field list + helper live in `lib/required-fields.ts` (shared with
 * the step-tab badge). This wrapper does not add per-field asterisks.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { setFocusMode } from '@/hooks/use-focus-mode';
import { usePresence } from '@/hooks/use-presence';
import { cn } from '@/lib/utils';
import { AlertCircle, Columns2, Eye, X, ZoomIn, ZoomOut } from 'lucide-react';
import { collection, type DocumentReference } from 'firebase/firestore';

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
import { PdfThumbnail } from '@/components/common/pdf-thumbnail';
import { DocumentPreviewLightbox } from '@/components/document-preview-lightbox';
import { useCollection, useFirestore } from '@/firebase';
import { getMissingRequiredFields } from '@/lib/required-fields';

// Back-compat: callers that imported the helper from this module keep working.
export { getMissingRequiredFields } from '@/lib/required-fields';


export interface Step2InformationProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
  onEditPlanification: (data: any) => void;
  onNewPlanification: () => void;
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
  // Comparing is a focus task: ask the page to retract sidebar, steps rail and
  // context column so the form and the document can split the width 50/50.
  useEffect(() => {
    setFocusMode(showCompare);
    return () => setFocusMode(false);
  }, [showCompare]);
  // Once the user toggles the pane by hand, stop auto-opening it.
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; nom: string } | null>(null);
  // Width of the source pane → render the PDF page at that width.
  const paneRef = useRef<HTMLDivElement>(null);
  const [paneWidth, setPaneWidth] = useState(480);
  // Viewer zoom: 1 = fit to pane width. Reset whenever another scan is shown.
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    setZoom(1);
  }, [selectedScanId]);
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

  // The comparison pane never opens on its own (user ruling): only the
  // « Comparer » button opens it.

  // Track the pane width so the PDF page is rasterised at the right size.
  useEffect(() => {
    if (!showCompare) return;
    const el = paneRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      if (w > 0) setPaneWidth(w);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showCompare]);

  const toggleCompare = () => {
    setShowCompare((v) => !v);
  };

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
      onClick={toggleCompare}
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

  // Keep the pane mounted while it animates out; the columns animate from
  // 0fr to 1fr and back (grid-template-columns is animatable), the pane
  // fades/slides in after the layout has made room (Material choreography:
  // outgoing first, then layout, then incoming).
  const { mounted: paneMounted, shown: paneShown } = usePresence(showCompare, 300);

  if (!paneMounted) {
    return (
      <div className="space-y-4">
        {banner}
        {informationContent}
      </div>
    );
  }

  const selectedScan = scanDocs.find((d: any) => d.id === selectedScanId);
  const selectedFileName = (selectedScan?.nom || selectedScan?.fileName || '') as string;
  const isImage = /\.(jpe?g|png|gif|webp|bmp)$/i.test(selectedFileName.toLowerCase());
  const selectedUrl: string | undefined = selectedScan?.url || undefined;

  return (
    <div
      className={cn(
        'grid transition-[grid-template-columns,gap] duration-300 ease-standard motion-reduce:transition-none',
        paneShown ? 'gap-6 lg:grid-cols-[minmax(0,1fr)_1fr]' : 'gap-0 lg:grid-cols-[minmax(0,1fr)_0fr]',
      )}
    >
      <div className="min-w-0 space-y-4">
        {banner}
        {informationContent}
      </div>
      <aside
        className={cn(
          'relative hidden min-w-0 overflow-clip transition-[opacity,transform] duration-200 ease-standard motion-reduce:transition-none lg:block',
          paneShown ? 'translate-x-0 opacity-100 delay-150' : 'translate-x-3 opacity-0',
        )}
        aria-hidden={!paneShown || undefined}
      >
        {/* The pane is absolutely positioned so it never adds height of its
            own: it fills the step's row (whose height the form drives) and
            hugs the document when that is shorter — a landscape scan gives a
            short wide window, a portrait scan a tall one. Documents taller
            than the row scroll inside; zooming past fit-width adds the
            horizontal scrollbar. */}
        <Card
          variant="outline"
          className="absolute inset-x-0 top-0 flex max-h-full flex-col gap-2 overflow-hidden p-3"
        >
          {/* Pane header — label + file name · zoom · eye (lightbox) · close. */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="t-label">Document source</p>
              {selectedFileName && (
                <p className="t-caption truncate" title={selectedFileName}>{selectedFileName}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Zoom">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-ink-3 hover:text-ink" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} disabled={!selectedUrl || zoom <= 0.5} aria-label="Zoom arrière">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <button type="button" className="t-caption min-w-[3rem] rounded px-1 text-center tabular-nums hover:bg-surface-2" onClick={() => setZoom(1)} title="Ajuster à la largeur" aria-label={`Zoom ${Math.round(zoom * 100)} % — ajuster à la largeur`}>
                {Math.round(zoom * 100)} %
              </button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-ink-3 hover:text-ink" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} disabled={!selectedUrl || zoom >= 4} aria-label="Zoom avant">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-1 h-7 w-7 text-ink-3 hover:text-ink"
                onClick={() => selectedUrl && setPreview({ url: selectedUrl, nom: selectedFileName || 'scan' })}
                disabled={!selectedUrl}
                aria-label="Ouvrir en plein écran"
                title="Ouvrir en plein écran"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-ink-3 hover:text-ink"
                onClick={toggleCompare}
                aria-label="Fermer la comparaison"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {scanDocs.length > 1 && (
            <Select value={selectedScanId ?? undefined} onValueChange={(v) => setSelectedScanId(v)}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="Sélectionner un scan" />
              </SelectTrigger>
              <SelectContent>
                {scanDocs.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {(d.nom || d.fileName || d.id) as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div
            ref={paneRef}
            className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-md border border-hairline bg-surface-2 scrollbar-thin"
          >
            {selectedUrl ? (
              // Inline viewer. Zoom 100 % = fit to the pane width; beyond it
              // the document overflows and scrolls on both axes. Clicking the
              // document does nothing — the eye icon opens the lightbox.
              <div style={{ width: `${zoom * 100}%` }} className="min-w-full">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedUrl}
                    alt={selectedFileName || 'scan'}
                    className="block h-auto w-full select-none"
                    draggable={false}
                  />
                ) : (
                  <PdfThumbnail
                    url={selectedUrl}
                    width={Math.round(paneWidth * zoom)}
                    lazy={false}
                    className="block h-auto min-h-[12rem] w-full object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="t-caption flex h-full min-h-[12rem] items-center justify-center p-6 text-center">
                {scanDocs.length === 0
                  ? 'Aucun document source dans ce dossier.'
                  : 'Sélectionnez un scan pour le visualiser.'}
              </div>
            )}
          </div>
        </Card>
      </aside>

      <DocumentPreviewLightbox doc={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
