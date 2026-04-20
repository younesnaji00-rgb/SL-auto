'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, FileText, ChevronDown, ChevronRight, ChevronsUp, ChevronsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFirestore, useStorage, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

type Mode = 'photos' | 'documents';

interface ReferencePanelProps {
  dossierId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Overrides the default root classes (width/border). Default: "w-1/2 min-w-[300px] border-r". */
  className?: string;
}

export default function ReferencePanel({ dossierId, isOpen, onClose, className }: ReferencePanelProps) {
  const db = useFirestore();
  const storage = useStorage();
  const [mode, setMode] = useState<Mode>('photos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [listOpen, setListOpen] = useState(true);

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

  if (!isOpen) return null;

  return (
    <div className={cn('bg-card flex flex-col shrink-0', className ?? 'w-1/2 min-w-[300px] border-r')}>


      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comparaison</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setListOpen((o) => !o)}
            title={listOpen ? 'Reduire la liste' : 'Afficher la liste'}
          >
            {listOpen ? <ChevronsUp className="h-3.5 w-3.5" /> : <ChevronsDown className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Fermer">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
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
          Photos ({photos?.length || 0})
        </button>
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors',
            mode === 'documents' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/50'
          )}
          onClick={() => setMode('documents')}
        >
          <FileText className="h-3.5 w-3.5" />
          Documents ({documents?.length || 0})
        </button>
      </div>
      )}

      {/* Compact item selector */}
      {listOpen && (
      <div className="shrink-0 border-b max-h-[160px] overflow-y-auto">
        {mode === 'photos' ? (
          <div>
            {Object.entries(groupedPhotos).map(([cat, items]) => (
              items.length > 0 && (
                <div key={cat}>
                  <div className="px-3 py-1 bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {categoryLabels[cat] || cat} ({items.length})
                  </div>
                  {items.map((p: any) => (
                    <button
                      key={p.id}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2',
                        selectedId === p.id && 'bg-primary/10 text-primary font-semibold'
                      )}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <ImageIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.name || 'Photo'}</span>
                    </button>
                  ))}
                </div>
              )
            ))}
            {(!photos || photos.length === 0) && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground italic">Aucune photo</div>
            )}
          </div>
        ) : (
          <div>
            {(() => {
              if (!documents || documents.length === 0) {
                return <div className="px-3 py-4 text-center text-xs text-muted-foreground italic">Aucun document</div>;
              }
              const groups: Record<string, any[]> = {};
              for (const d of documents) {
                const type = d.type || d.typeDocument || 'Autre';
                if (!groups[type]) groups[type] = [];
                groups[type].push(d);
              }
              return Object.entries(groups).map(([type, items]) => (
                <div key={type}>
                  <div className="px-3 py-1 bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {type} ({items.length})
                  </div>
                  {items.map((d: any) => (
                    <button
                      key={d.id}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2',
                        selectedId === d.id && 'bg-primary/10 text-primary font-semibold'
                      )}
                      onClick={() => setSelectedId(d.id)}
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate flex-1">{d.nom || d.name || 'Document'}</span>
                    </button>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}
      </div>
      )}

      {/* Full-height viewer */}
      <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {!selectedId ? (
          <div className="text-center p-6">
            <ChevronDown className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground italic">
              Sélectionnez un élément ci-dessus pour le visualiser
            </p>
          </div>
        ) : isLoadingUrl ? (
          <div className="text-xs text-muted-foreground animate-pulse">Chargement...</div>
        ) : viewerUrl ? (
          isImageFile(selectedItem?.name || selectedItem?.nom || '') ? (
            <ZoomableImage src={viewerUrl} alt={selectedItem?.name || 'Référence'} />
          ) : (
            <iframe
              src={viewerUrl}
              className="w-full h-full border-none"
              title={selectedItem?.nom || 'Document'}
            />
          )
        ) : (
          <p className="text-xs text-muted-foreground italic">Impossible de charger le fichier</p>
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
