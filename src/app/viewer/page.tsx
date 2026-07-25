'use client';

import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ZoomIn, ZoomOut, Columns2, RotateCw, RotateCcw, Loader2, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReferencePanel from '../editor/reference-panel';
import { useFirestore, useStorage } from '@/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

interface Annotation {
  id: string;
  type: 'line' | 'text' | 'stamp';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  thickness?: number;
  fontSize?: number;
  text?: string;
  color: string;
  stampUrl?: string;
}

export default function ViewerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const t = useT();

  const chiffrageId = searchParams.get('chiffrageId') || '';
  const dossierId = searchParams.get('dossierId') || '';
  const initialFileIndex = parseInt(searchParams.get('fileIndex') || '0', 10);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // Multi-file state
  const [allFiles, setAllFiles] = useState<{ name: string; storagePath: string; type: string; docType?: string; category?: string; status: string; annotations?: any[]; pdfUrl?: string; source: 'chiffrage' | 'dossier' }[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(initialFileIndex);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);

  // Group files by document type
  const fileTypeGroups = useMemo(() => {
    const groups: Record<string, { label: string; indices: number[] }> = {};
    allFiles.forEach((f, i) => {
      let key: string;
      let label: string;
      if (f.type === 'photo') {
        const cat = f.category || 'avant';
        const catLabels: Record<string, string> = { avant: 'Photos - Avant', en_cours: 'Photos - En cours', apres: 'Photos - Après' };
        key = `photo_${cat}`;
        label = catLabels[cat] || `Photos - ${cat}`;
      } else {
        key = `doc_${f.docType || 'Autre'}`;
        label = f.docType || 'Documents - Autre';
      }
      if (!groups[key]) groups[key] = { label, indices: [] };
      groups[key].indices.push(i);
    });
    return groups;
  }, [allFiles]);

  const filteredFileIndices = useMemo(() => {
    if (!selectedDocType || selectedDocType === '__all__') return allFiles.map((_, i) => i);
    return fileTypeGroups[selectedDocType]?.indices || [];
  }, [selectedDocType, fileTypeGroups, allFiles]);

  // State
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [rotation, setRotation] = useState(0);

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }[]>([]);
  const [isImage, setIsImage] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 794, height: 1123 });

  // PDF.js loading
  const pdfJsRef = useRef<any>(null);
  const pdfJsPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    if (!pdfJsPromiseRef.current) {
      pdfJsPromiseRef.current = import('pdfjs-dist').then(pdfjsLib => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        pdfJsRef.current = pdfjsLib;
        return pdfjsLib;
      });
    }
  }, []);

  // Load chiffrage files + dossier documents/photos
  useEffect(() => {
    if (!db || !chiffrageId) return;
    const loadFilesList = async () => {
      const snap = await getDoc(doc(db, 'chiffrages', chiffrageId));
      const chiffrageFiles: typeof allFiles = [];
      if (snap.exists()) {
        const data = snap.data();
        if (data.files?.length) {
          chiffrageFiles.push(...data.files.map((f: any) => ({ ...f, source: 'chiffrage' as const })));
        }
      }

      const dossierFiles: typeof allFiles = [];
      if (dossierId) {
        try {
          const [photosSnap, docsSnap] = await Promise.all([
            getDocs(collection(db, 'dossiers', dossierId, 'photos')),
            getDocs(collection(db, 'dossiers', dossierId, 'documents')),
          ]);
          photosSnap.docs.forEach(d => {
            const data = d.data();
            if (data.storagePath && !chiffrageFiles.some(cf => cf.storagePath === data.storagePath)) {
              dossierFiles.push({
                name: data.name || 'photo.jpg',
                storagePath: data.storagePath,
                type: 'photo',
                category: data.category || 'avant',
                status: 'readonly',
                source: 'dossier',
              });
            }
          });
          docsSnap.docs.forEach(d => {
            const data = d.data();
            if (data.storagePath && !chiffrageFiles.some(cf => cf.storagePath === data.storagePath)) {
              dossierFiles.push({
                name: data.nom || data.name || 'document.pdf',
                storagePath: data.storagePath,
                type: 'rapport',
                docType: data.type || data.typeDocument || '',
                status: 'readonly',
                source: 'dossier',
              });
            }
          });
        } catch (e) {
          console.warn('Could not load dossier files for browsing:', e);
        }
      }

      setAllFiles([...chiffrageFiles, ...dossierFiles]);
    };
    loadFilesList();
  }, [db, chiffrageId, dossierId]);

  // Load current file data
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (!db || !storage || !chiffrageId || allFiles.length === 0) return;
    const file = allFiles[currentFileIndex];
    if (!file) return;

    setLoading(true);
    setFileUrl('');
    setPdfDoc(null);
    setPageCount(0);
    setPageDimensions([]);
    setAnnotations([]);
    setRotation(0);
    pageCanvasRefs.current.clear();
    isFirstRenderRef.current = true;

    const load = async () => {
      try {
        setFileName(file.name || '');
        if (file.annotations?.length) setAnnotations(file.annotations);
        const url = await getDownloadURL(ref(storage, file.storagePath));
        setFileUrl(url);

        const isPdfFile = (file.name || '').toLowerCase().endsWith('.pdf');
        setIsImage(!isPdfFile);

        if (isPdfFile) {
          if (pdfJsPromiseRef.current) await pdfJsPromiseRef.current;
          if (pdfJsRef.current) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const pdfDocument = await pdfJsRef.current.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(pdfDocument);
            setPageCount(pdfDocument.numPages);

            const dims: { width: number; height: number }[] = [];
            for (let i = 1; i <= pdfDocument.numPages; i++) {
              const page = await pdfDocument.getPage(i);
              const viewport = page.getViewport({ scale: 1.5 });
              dims.push({ width: viewport.width, height: viewport.height });
            }
            setPageDimensions(dims);
          }
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            setPageCount(1);
            setPageDimensions([{ width: img.naturalWidth, height: img.naturalHeight }]);
          };
          img.src = url;
        }
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: t('Erreur de chargement du fichier') });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [db, storage, chiffrageId, allFiles, currentFileIndex]);

  // Render PDF pages
  const renderScale = Math.max(1.5, zoom * 1.5);
  const renderScaleRef = useRef(renderScale);
  renderScaleRef.current = renderScale;
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pdfDoc || isImage) return;

    const renderPages = async () => {
      const scale = renderScaleRef.current;
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const baseViewport = page.getViewport({ scale: 1.5 });
        const hiresViewport = page.getViewport({ scale });
        const canvas = pageCanvasRefs.current.get(i - 1);
        if (!canvas) continue;
        canvas.width = hiresViewport.width;
        canvas.height = hiresViewport.height;
        canvas.style.width = `${baseViewport.width}px`;
        canvas.style.height = `${baseViewport.height}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport: hiresViewport }).promise;
      }
    };

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      renderPages();
      return;
    }

    if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    renderTimeoutRef.current = setTimeout(renderPages, 250);

    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [pdfDoc, isImage, pageCount, pageDimensions.length, renderScale]);

  // Loading state
  if (loading && allFiles.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-slate-100 dark:bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('Chargement du document...')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 select-none">
      {/* Toolbar */}
      <div className="bg-card border-b px-3 py-1.5 flex items-center gap-2 shrink-0 z-50 shadow-sm">
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" onClick={() => router.back()}>
          <ArrowLeft className="h-3 w-3" /> {t('Retour')}
        </Button>

        <div className="h-5 w-px bg-border" />

        {/* Type filter */}
        <Select value={selectedDocType || '__all__'} onValueChange={(v) => setSelectedDocType(v === '__all__' ? null : v)}>
          <SelectTrigger className="h-7 w-[150px] text-xs">
            <SelectValue placeholder={t('Type de document')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('Tous les types')} ({allFiles.length})</SelectItem>
            {Object.entries(fileTypeGroups).map(([key, group]) => (
              <SelectItem key={key} value={key}>
                {t(group.label)} ({group.indices.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* File switcher */}
        <Select value={String(currentFileIndex)} onValueChange={(v) => setCurrentFileIndex(Number(v))}>
          <SelectTrigger className="h-7 w-[200px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filteredFileIndices.map((i) => (
              <SelectItem key={i} value={String(i)}>
                <span className="flex items-center gap-1.5 truncate">
                  {allFiles[i].source === 'dossier' && <span className="text-[9px] bg-muted px-1 rounded font-semibold text-muted-foreground shrink-0">{t('Dossier')}</span>}
                  {allFiles[i].name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pageCount > 0 && (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">({pageCount} p.)</span>
        )}

        <div className="h-5 w-px bg-border" />

        {/* Comparison toggle */}
        {dossierId && (
          <Button
            variant={comparisonOpen ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs gap-1 px-2"
            onClick={() => setComparisonOpen(v => !v)}
          >
            <Columns2 className="h-3 w-3" />
            {t('Comparaison')}
          </Button>
        )}

        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} disabled={zoom <= 0.5}>
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-[10px] font-mono w-8 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.min(2, z + 0.25))} disabled={zoom >= 2}>
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Rotation */}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRotation(r => r - 90)}>
          <RotateCcw className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRotation(r => r + 90)}>
          <RotateCw className="h-3 w-3" />
        </Button>

        {/* Read-only indicator */}
        <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-50/80 dark:bg-amber-900/30 px-2 py-1 rounded">
          <Eye className="h-3 w-3" /> {t('Lecture seule')}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {comparisonOpen && dossierId && (
          <ReferencePanel
            dossierId={dossierId}
            isOpen={comparisonOpen}
            onClose={() => setComparisonOpen(false)}
          />
        )}

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex flex-col items-center gap-6 p-8 bg-slate-200 dark:bg-slate-800"
        >
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Image file */}
          {!loading && isImage && fileUrl && (
            <ReadOnlyPageWrapper
              pageIndex={0}
              width={imageDimensions.width}
              height={imageDimensions.height}
              zoom={zoom}
              rotation={rotation}
              annotations={annotations.filter(a => (a.page || 0) === 0)}
            >
              <img
                src={fileUrl}
                alt={fileName}
                className="w-full h-full object-contain"
                crossOrigin="anonymous"
                draggable={false}
              />
            </ReadOnlyPageWrapper>
          )}

          {/* PDF pages */}
          {!loading && !isImage && pageDimensions.map((dim, i) => (
            <ReadOnlyPageWrapper
              key={i}
              pageIndex={i}
              width={dim.width}
              height={dim.height}
              zoom={zoom}
              rotation={rotation}
              annotations={annotations.filter(a => (a.page || 0) === i)}
            >
              <canvas
                ref={el => { if (el) pageCanvasRefs.current.set(i, el); }}
                style={{ display: 'block' }}
              />
              <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-mono pointer-events-none">
                Page {i + 1} / {pageCount}
              </div>
            </ReadOnlyPageWrapper>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-card border-t px-4 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          <span>{annotations.length} annotation{annotations.length !== 1 ? 's' : ''}</span>
          <span>{fileName}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-amber-500 font-semibold">{t('Lecture seule')}</span>
          <span>{t('Zoom :')} {Math.round(zoom * 100)}%</span>
          {rotation !== 0 && <span>{t('Rotation :')} {rotation}deg</span>}
        </div>
      </div>
    </div>
  );
}

// Read-only page wrapper — renders document with annotations but no interactivity
interface ReadOnlyPageWrapperProps {
  pageIndex: number;
  width: number;
  height: number;
  zoom: number;
  rotation: number;
  annotations: Annotation[];
  children: React.ReactNode;
}

const ReadOnlyPageWrapper = memo(function ReadOnlyPageWrapper({
  pageIndex, width, height, zoom, rotation, annotations, children,
}: ReadOnlyPageWrapperProps) {
  const rad = (rotation * Math.PI) / 180;
  const rotW = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
  const rotH = Math.abs(width * Math.sin(rad)) + Math.abs(height * Math.cos(rad));

  return (
    <div
      style={{
        width: rotW * zoom,
        height: rotH * zoom,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        className="relative bg-white shadow-2xl cursor-default"
        style={{
          width,
          height,
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          position: 'absolute',
          left: (rotW * zoom - width) / 2,
          top: (rotH * zoom - height) / 2,
        }}
      >
        {children}

        {/* Annotations (read-only) */}
        {annotations.map(a => (
          <ReadOnlyAnnotation key={a.id} annotation={a} />
        ))}
      </div>
    </div>
  );
});

const ReadOnlyAnnotation = memo(function ReadOnlyAnnotation({ annotation: a }: { annotation: Annotation }) {
  const t = useT();
  const thickness = a.thickness || 3;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: a.x,
        top: a.type === 'line' ? a.y - thickness / 2 : a.y,
        width: a.type === 'line' ? a.width : a.type === 'stamp' ? (a.width || 120) : 'auto',
        height: a.type === 'line' ? thickness : a.type === 'stamp' ? (a.height || 120) : 'auto',
        zIndex: 100,
      }}
    >
      {a.type === 'line' && (
        <div
          style={{
            width: '100%',
            height: thickness,
            backgroundColor: a.color,
          }}
        />
      )}

      {a.type === 'text' && (
        <div
          className="px-1 py-0.5 font-semibold whitespace-pre-wrap"
          style={{
            color: a.color,
            fontSize: `${a.fontSize || 16}px`,
            lineHeight: 1.3,
            minWidth: 20,
            minHeight: (a.fontSize || 16) * 1.3,
            background: 'transparent',
          }}
        >
          {a.text}
        </div>
      )}

      {a.type === 'stamp' && a.stampUrl && (
        <div className="w-full h-full">
          <img
            src={a.stampUrl}
            alt={t('tampon')}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
});
