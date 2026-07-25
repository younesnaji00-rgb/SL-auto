'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  FileText,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Rows2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFirestore, useStorage, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useT } from '@/i18n';

type Mode = 'photos' | 'documents';

interface ReferencePanelProps {
  dossierId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Overrides the default root classes (width/border). Default: "w-1/2 min-w-[300px] border-r". */
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
  const t = useT();
  const [split, setSplit] = useState(false);

  if (!isOpen) return null;

  return (
    <div className={cn('bg-card flex flex-col shrink-0', className ?? 'w-1/2 min-w-[300px] border-r')}>
      {/* Outer panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50 shrink-0">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('Comparaison')}</span>
        <div className="flex items-center gap-1">
          <Button
            variant={split ? 'default' : 'ghost'}
            size="icon"
            className="h-6 w-6"
            onClick={() => setSplit((s) => !s)}
            title={split ? t('Fermer le second panneau') : t('Diviser le panneau pour comparer 2 documents')}
            aria-pressed={split}
          >
            {split ? <Minimize2 className="h-3.5 w-3.5" /> : <Rows2 className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title={t('Fermer')}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Pane 1 */}
      <ReferencePane dossierId={dossierId} label={split ? 'Vue 1' : null} initialDocType={initialDocType} />

      {/* Pane 2 (split) */}
      {split && (
        <>
          <div className="border-t-2 border-primary/40 shrink-0" aria-hidden />
          <ReferencePane dossierId={dossierId} label="Vue 2" />
        </>
      )}
    </div>
  );
}

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
  const t = useT();
  const db = useFirestore();
  const storage = useStorage();
  const [mode, setMode] = useState<Mode>(initialDocType ? 'documents' : 'photos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const autoSelectedRef = useRef(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [photoSubTab, setPhotoSubTab] = useState<'avant' | 'en_cours' | 'apres'>('avant');

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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Pane mini-header: label (if any) + listOpen toggle */}
      <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/30 shrink-0">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {label ? t(label) : ''}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setListOpen((o) => !o)}
          title={listOpen ? t('Reduire la liste') : t('Afficher la liste')}
          aria-pressed={listOpen}
        >
          {listOpen ? <ChevronsUp className="h-3 w-3" /> : <ChevronsDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Mode toggle */}
      {listOpen && (
        <div className="flex border-b shrink-0">
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors',
              mode === 'photos' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/50'
            )}
            onClick={() => setMode('photos')}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {t('Photos')} ({photos?.length || 0})
          </button>
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors',
              mode === 'documents' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/50'
            )}
            onClick={() => setMode('documents')}
          >
            <FileText className="h-3.5 w-3.5" />
            {t('Documents')} ({documents?.length || 0})
          </button>
        </div>
      )}

      {/* Compact item selector */}
      {listOpen && mode === 'photos' && (
        <div className="shrink-0 border-b flex flex-col">
          <div className="flex border-b shrink-0">
            {(['avant', 'en_cours', 'apres'] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={cn(
                  'flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors',
                  photoSubTab === key
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
                onClick={() => setPhotoSubTab(key)}
              >
                {t(categoryLabels[key])} ({groupedPhotos[key].length})
              </button>
            ))}
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            {groupedPhotos[photoSubTab].length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground italic">{t('Aucune photo')}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-2">
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
        <div className="border-b max-h-[260px] overflow-auto">
          {(() => {
            if (!documents || documents.length === 0) {
              return <div className="px-3 py-4 text-center text-xs text-muted-foreground italic">{t('Aucun document')}</div>;
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
                    <div className="px-3 py-1 bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t(type)} ({items.length})
                    </div>
                    {items.map((d: any) => (
                      <button
                        key={d.id}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2',
                          selectedId === d.id && 'bg-primary/10 text-primary font-semibold'
                        )}
                        onClick={() => {
                          setSelectedId(d.id);
                          setListOpen(false);
                        }}
                        title={d.nom || d.name || t('Document')}
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="whitespace-nowrap">{d.nom || d.name || t('Document')}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Full-height viewer */}
      <div className="flex-1 min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {!selectedId ? (
          <div className="text-center p-6">
            <ChevronDown className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground italic">
              {t('Sélectionnez un élément ci-dessus pour le visualiser')}
            </p>
          </div>
        ) : isLoadingUrl ? (
          <div className="text-xs text-muted-foreground animate-pulse">{t('Chargement...')}</div>
        ) : viewerUrl ? (
          isImageFile(selectedItem?.name || selectedItem?.nom || '') ? (
            <ZoomableImage src={viewerUrl} alt={selectedItem?.name || t('Référence')} />
          ) : (
            <iframe
              src={viewerUrl}
              className="w-full h-full border-none"
              title={selectedItem?.nom || t('Document')}
            />
          )
        ) : (
          <p className="text-xs text-muted-foreground italic">{t('Impossible de charger le fichier')}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Image viewer with double-click zoom toggle (1x ↔ 2.5x) and mouse-drag pan
 * while zoomed. Pan resets on zoom-out and on image change.
 */
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  // Reset when image changes.
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [src]);

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
    <div
      className={cn(
        'w-full h-full flex items-center justify-center overflow-hidden select-none',
        zoom > 1 ? (draggingRef.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
      )}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-w-full max-h-full object-contain transition-transform duration-150 ease-out pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      />
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
  const t = useT();
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
        'relative aspect-square overflow-hidden rounded-md border bg-muted',
        'hover:ring-2 hover:ring-primary transition-shadow focus:outline-none',
        selected && 'ring-2 ring-primary'
      )}
      title={photo.name || t('Photo')}
    >
      {url ? (
        <img src={url} alt={photo.name || t('Photo')} className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-[10px] text-muted-foreground">…</div>
      )}
    </button>
  );
}
