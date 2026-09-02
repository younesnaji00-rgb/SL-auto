'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  FileText,
  Eye,
  ChevronsUp,
  ChevronsDown,
  Rows2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentPreviewLightbox } from '@/components/document-preview-lightbox';
import { cn } from '@/lib/utils';
import { useFirestore, useStorage, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

type Mode = 'photos' | 'documents';

interface ReferencePanelProps {
  dossierId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Overrides the default root classes (width/border). Default: "w-1/2 min-w-[300px] border-r border-hairline". */
  className?: string;
  /**
   * When provided, the first pane opens in `documents` mode and auto-selects
   * the first document whose `type` matches. Used by the chiffrage editor to
   * surface the scanned source devis/facture next to the table during the
   * post-scan review.
   */
  initialDocType?: string;
}

export default function ReferencePanel({ dossierId, isOpen, onClose, className, initialDocType }: ReferencePanelProps) {
  const [split, setSplit] = useState(false);

  if (!isOpen) return null;

  return (
    <div className={cn('flex shrink-0 flex-col bg-card', className ?? 'w-1/2 min-w-[300px] border-r border-hairline')}>
      {/* Panel header — element-specs §18 side panels (flat surface, not glass
          on glass) + §1: one `t-heading` naming the panel, tool icons
          (`ghost`, aria-pressed on the split toggle) at the right end. */}
      <div className="flex min-h-[40px] shrink-0 items-center justify-between gap-2 border-b border-hairline px-4 py-1.5">
        <h2 className="t-heading truncate">Comparaison</h2>
        <div className="flex items-center gap-1">
          <Button
            variant={split ? 'tonal' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setSplit((s) => !s)}
            title={split ? 'Fermer le second panneau' : 'Diviser le panneau pour comparer 2 documents'}
            aria-pressed={split}
          >
            {split ? <Minimize2 className="h-3.5 w-3.5" /> : <Rows2 className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fermer" aria-label="Fermer">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Pane 1 */}
      <ReferencePane dossierId={dossierId} label={split ? 'Vue 1' : null} initialDocType={initialDocType} />

      {/* Pane 2 (split) — hairline separation only (no coloured rule). */}
      {split && (
        <>
          <div className="shrink-0 border-t border-hairline-strong" aria-hidden />
          <ReferencePane dossierId={dossierId} label="Vue 2" />
        </>
      )}
    </div>
  );
}

/** Raised tab on a recessed track — addendum §2 (supersedes the underline
 *  idiom; NN/g Flat design: text-only controls get missed by new users —
 *  backgrounds/borders/shadows restore clickability; NN/g Tabs Used Right:
 *  "at least two selection indicators"): the tab list is a `surface-2` track
 *  (see PaneTabList), the active tab a raised `bg-card` card with `shadow-rim`
 *  + a 2 px accent bar, inactive tabs quiet ink-2 with a surface-3 hover.
 *  Mirrors `components/ui/tabs.tsx`; the compact photo sub-tabs pass their
 *  own height. */
function PaneTab({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        // Browser-tab shape (owner rulings 2026-09-02 + ter): `.tab-slope`
        // draws the sloped body + outward feet; aria-selected drives the
        // active card + rim, inactive tabs are grey surface-4.
        'tab-slope relative flex min-h-[32px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3.5 py-1 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink',
        className,
      )}
    >
      {children}
      {/* Accent bar (second indicator) — a real element because ::after
          now draws the tab feet. */}
      <span
        aria-hidden
        className={cn('pointer-events-none absolute inset-x-3 bottom-[3px] h-0.5 rounded-full bg-primary transition-opacity', active ? 'opacity-100' : 'opacity-0')}
      />
    </button>
  );
}

/** The recessed track the raised tabs sit on (addendum §2): hairline border,
 *  `surface-2` fill, rounded-lg — visibly a control. px-2 (8px) keeps the
 *  tabs' 7px outward feet inside the track. */
const PANE_TABLIST_CLASS =
  'flex shrink-0 items-end gap-1 rounded-lg border border-hairline bg-surface-2 px-2 pt-1';

function ReferencePane({
  dossierId,
  label,
  initialDocType,
}: {
  dossierId: string;
  /** When non-null, a small label is shown in the pane header to disambiguate split panes. */
  label: string | null;
  /** Optional doc type to auto-select on first load (forces `documents` mode). */
  initialDocType?: string;
}) {
  const db = useFirestore();
  const storage = useStorage();
  const [mode, setMode] = useState<Mode>(initialDocType ? 'documents' : 'photos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const autoSelectedRef = useRef(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [photoSubTab, setPhotoSubTab] = useState<'avant' | 'en_cours' | 'apres'>('avant');
  // Lightbox: the eye icon is the only way in (clicking the media does nothing).
  const [preview, setPreview] = useState<{ url: string; nom: string } | null>(null);

  // Fetch photos
  const photosQuery = useMemo(
    () => (db && dossierId ? collection(db, 'dossiers', dossierId, 'photos') : null),
    [db, dossierId]
  );
  const { data: photos } = useCollection<any>(photosQuery);

  // Fetch documents
  const docsQuery = useMemo(
    () => (db && dossierId ? collection(db, 'dossiers', dossierId, 'documents') : null),
    [db, dossierId]
  );
  const { data: documents } = useCollection<any>(docsQuery);

  // Group photos by category
  const groupedPhotos = useMemo(() => {
    if (!photos) return { avant: [], en_cours: [], apres: [] };
    const groups: Record<string, any[]> = { avant: [], en_cours: [], apres: [] };
    for (const p of photos) {
      const cat = p.category || 'avant';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [photos]);

  const categoryLabels: Record<string, string> = {
    avant: 'Avant',
    en_cours: 'En cours',
    apres: 'Après',
  };

  // Auto-select the first document matching `initialDocType` once the
  // documents collection arrives. Runs at most once (autoSelectedRef guard)
  // so the chiffreur can later switch to a different doc without us
  // re-clobbering the selection. Falls through silently if no doc matches.
  useEffect(() => {
    if (!initialDocType || autoSelectedRef.current) return;
    if (!documents || documents.length === 0) return;
    const match = documents.find((d: any) => (d.type || d.typeDocument) === initialDocType);
    if (match) {
      autoSelectedRef.current = true;
      setSelectedId(match.id);
      setListOpen(false);
    }
  }, [documents, initialDocType]);

  // Load the URL for the selected item
  useEffect(() => {
    if (!selectedId) {
      setViewerUrl(null);
      return;
    }

    const items = mode === 'photos' ? photos : documents;
    const item = items?.find((i: any) => i.id === selectedId);
    if (!item) {
      setViewerUrl(null);
      return;
    }

    if (item.url) {
      setViewerUrl(item.url);
      return;
    }

    if (item.storagePath && storage) {
      setIsLoadingUrl(true);
      getDownloadURL(ref(storage, item.storagePath))
        .then(url => setViewerUrl(url))
        .catch(() => setViewerUrl(null))
        .finally(() => setIsLoadingUrl(false));
    }
  }, [selectedId, mode, photos, documents, storage]);

  // Reset selection when switching mode
  useEffect(() => {
    setSelectedId(null);
    setViewerUrl(null);
  }, [mode]);

  const selectedItem = useMemo(() => {
    const items = mode === 'photos' ? photos : documents;
    return items?.find((i: any) => i.id === selectedId);
  }, [mode, photos, documents, selectedId]);

  const isImageFile = (name: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(name || '');
  const selectedName: string = selectedItem?.name || selectedItem?.nom || '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Pane mini-header: `t-label` (pane name · selected file) · eye button
          opening the DocumentPreviewLightbox (net-new, kept) · list toggle —
          `ghost` icon buttons with aria-pressed on the toggle (§18). */}
      <div className="flex min-h-[32px] shrink-0 items-center justify-between gap-2 border-b border-hairline px-3 py-0.5">
        <span className="t-label truncate">
          {label ?? ''}
          {selectedName && <span className="text-ink-2">{label ? ' · ' : ''}{selectedName}</span>}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-ink-3 hover:text-ink"
            onClick={() => viewerUrl && setPreview({ url: viewerUrl, nom: selectedName || 'document' })}
            disabled={!viewerUrl}
            title="Ouvrir en plein écran"
            aria-label="Ouvrir en plein écran"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-ink-3 hover:text-ink"
            onClick={() => setListOpen((o) => !o)}
            title={listOpen ? 'Reduire la liste' : 'Afficher la liste'}
            aria-pressed={listOpen}
          >
            {listOpen ? <ChevronsUp className="h-3.5 w-3.5" /> : <ChevronsDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Mode toggle — raised tabs on a recessed track (addendum §2) */}
      {listOpen && (
        <div className={cn(PANE_TABLIST_CLASS, 'mx-2 my-2')} role="tablist">
          <PaneTab active={mode === 'photos'} onClick={() => setMode('photos')}>
            <ImageIcon className="h-3.5 w-3.5" />
            Photos ({photos?.length || 0})
          </PaneTab>
          <PaneTab active={mode === 'documents'} onClick={() => setMode('documents')}>
            <FileText className="h-3.5 w-3.5" />
            Documents ({documents?.length || 0})
          </PaneTab>
        </div>
      )}

      {/* Compact item selector */}
      {listOpen && mode === 'photos' && (
        <div className="flex shrink-0 flex-col border-b border-hairline">
          <div className={cn(PANE_TABLIST_CLASS, 'mx-2 mb-2')} role="tablist">
            {(['avant', 'en_cours', 'apres'] as const).map((key) => (
              <PaneTab
                key={key}
                active={photoSubTab === key}
                onClick={() => setPhotoSubTab(key)}
                className="min-h-[28px] py-1 text-xs"
              >
                {categoryLabels[key]} ({groupedPhotos[key].length})
              </PaneTab>
            ))}
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            {groupedPhotos[photoSubTab].length === 0 ? (
              <div className="t-caption px-3 py-8 text-center">Aucune photo</div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3">
                {groupedPhotos[photoSubTab].map((p: any) => (
                  <PhotoThumb
                    key={p.id}
                    photo={p}
                    selected={selectedId === p.id}
                    onClick={() => {
                      setSelectedId(p.id);
                      setListOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {listOpen && mode === 'documents' && (
        <div className="max-h-[260px] overflow-auto border-b border-hairline">
          {(() => {
            if (!documents || documents.length === 0) {
              return <div className="t-caption px-3 py-4 text-center">Aucun document</div>;
            }
            const groups: Record<string, any[]> = {};
            for (const d of documents) {
              const type = d.type || d.typeDocument || 'Autre';
              if (!groups[type]) groups[type] = [];
              groups[type].push(d);
            }
            return (
              <div className="min-w-max">
                {Object.entries(groups).map(([type, items]) => (
                  <div key={type}>
                    {/* Group label: t-label on the surface-2 step (no uppercase band). */}
                    <div className="t-label bg-surface-2 px-3 py-1">
                      {type} ({items.length})
                    </div>
                    {items.map((d: any) => (
                      <button
                        key={d.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors duration-150 hover:bg-surface-2',
                          selectedId === d.id ? 'bg-surface-3 font-semibold text-ink' : 'text-ink-2'
                        )}
                        aria-pressed={selectedId === d.id}
                        onClick={() => {
                          setSelectedId(d.id);
                          setListOpen(false);
                        }}
                        title={d.nom || d.name || 'Document'}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                        <span className="whitespace-nowrap">{d.nom || d.name || 'Document'}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Full-height viewer — `bg-ink-solid` is the sanctioned functional
          backdrop for document media (Apple HIG materials: the content layer
          is not glass); the zoom pill inside ZoomableImage follows the owner's
          zoom ruling (−/%/+, 25 % steps, wheel ≈ ×1.3). */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-ink-solid">
        {!selectedId ? (
          <div className="p-6 text-center">
            <ChevronsUp className="mx-auto mb-2 h-6 w-6 text-on-ink/40" aria-hidden />
            <p className="text-xs text-on-ink/70">
              Sélectionnez un élément ci-dessus pour le visualiser
            </p>
          </div>
        ) : isLoadingUrl ? (
          <div className="animate-pulse text-xs text-on-ink/70">Chargement...</div>
        ) : viewerUrl ? (
          isImageFile(selectedName) ? (
            <ZoomableImage src={viewerUrl} alt={selectedItem?.name || 'Référence'} />
          ) : (
            <iframe
              src={viewerUrl}
              className="h-full w-full border-none"
              title={selectedItem?.nom || 'Document'}
            />
          )
        ) : (
          <p className="text-xs text-on-ink/70">Impossible de charger le fichier</p>
        )}
      </div>

      <DocumentPreviewLightbox doc={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

const IMG_ZOOM_MIN = 1;
const IMG_ZOOM_MAX = 4;

/**
 * Image viewer following the lightbox rules (document-preview-lightbox):
 * on-canvas − / % / + pill (25 % steps, % = fit), wheel = one notch ≈ +30 %
 * (deltaY accumulated to 100 px so multi-event wheels count once),
 * double-click toggles 1x ↔ 2.5x, mouse-drag pans while zoomed. Pan resets
 * on zoom-out and on image change. Clicking the image does nothing.
 */
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reset when image changes.
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [src]);

  const applyZoom = (next: number) => {
    const clamped = Math.min(IMG_ZOOM_MAX, Math.max(IMG_ZOOM_MIN, +next.toFixed(3)));
    setZoom(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  };

  // Wheel notch gate (native listener: React wheel events are passive).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) < 100) return;
      const direction = acc < 0 ? 1 : -1;
      acc = 0;
      setZoom((prev) => {
        const next = Math.min(IMG_ZOOM_MAX, Math.max(IMG_ZOOM_MIN, +(direction > 0 ? prev * 1.3 : prev / 1.3).toFixed(3)));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (zoom === 1) {
      setZoom(2.5);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom === 1) return;
    draggingRef.current = true;
    lastRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current || !lastRef.current) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    lastRef.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const stopDrag = () => {
    draggingRef.current = false;
    lastRef.current = null;
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <div
        className={cn(
          'flex h-full w-full select-none items-center justify-center overflow-hidden',
          zoom > 1 ? (draggingRef.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        )}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="pointer-events-none max-h-full max-w-full object-contain transition-transform duration-150 ease-standard motion-reduce:transition-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        />
      </div>
      {/* Zoom pill — same anatomy as the lightbox ZoomControls. */}
      <div
        className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-card/95 px-1 py-0.5 shadow-raised ring-1 ring-hairline"
        role="group"
        aria-label="Zoom"
        title="Molette pour zoomer progressivement, double-clic pour agrandir"
      >
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyZoom(zoom - 0.25)} aria-label="Zoom arrière" disabled={zoom <= IMG_ZOOM_MIN}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <button type="button" className="t-caption min-w-[3.25rem] rounded px-1 text-center tabular-nums hover:bg-surface-2" onClick={() => applyZoom(1)} aria-label={`Zoom ${Math.round(zoom * 100)} % — réinitialiser`}>
          {Math.round(zoom * 100)} %
        </button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyZoom(zoom + 0.25)} aria-label="Zoom avant" disabled={zoom >= IMG_ZOOM_MAX}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PhotoThumb({
  photo,
  selected,
  onClick,
}: {
  photo: any;
  selected: boolean;
  onClick: () => void;
}) {
  const storage = useStorage();
  const [url, setUrl] = useState<string | null>(photo.url || null);
  useEffect(() => {
    if (photo.url) {
      setUrl(photo.url);
      return;
    }
    if (!photo.storagePath || !storage) return;
    getDownloadURL(ref(storage, photo.storagePath))
      .then((u) => setUrl(u))
      .catch(() => setUrl(null));
  }, [photo.url, photo.storagePath, storage]);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative aspect-square overflow-hidden rounded-md bg-surface-2 ring-1 ring-hairline transition-[box-shadow] duration-150',
        'hover:ring-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'ring-2 ring-ring hover:ring-ring'
      )}
      aria-pressed={selected}
      title={photo.name || 'Photo'}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={photo.name || 'Photo'} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] text-ink-4">…</div>
      )}
    </button>
  );
}
