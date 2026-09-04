'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Download, Type, Minus,
  MousePointer2, Trash2, ZoomIn, ZoomOut, Eraser,
  RotateCw, RotateCcw, Columns2, Stamp, Plus, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import ReferencePanel from './reference-panel';
import { useFirestore, useStorage } from '@/firebase';
import { doc, updateDoc, serverTimestamp, getDoc, collection, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { enqueueUpload } from '@/lib/offline/upload-queue';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

// ── Types ────────────────────────────────────────────────────────────────────
type Tool = 'select' | 'line' | 'text' | 'stamp';

interface Annotation {
  id: string;
  type: 'line' | 'text' | 'stamp';
  /** page index (0-based) */
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

interface SavedStamp {
  id: string;
  name: string;
  dataUrl: string;
}

// DOCUMENT ink, not UI colour: these hexes are what the user draws on the
// page and they are burned into the exported PDF (pdf-lib), so they are
// deliberately outside the token system. The one named constant every swatch
// and stroke reads from.
const DOCUMENT_INK_COLORS = [
  { name: 'Rouge', value: '#dc2626' },
  { name: 'Bleu', value: '#2563eb' },
  { name: 'Noir', value: '#000000' },
  { name: 'Vert', value: '#16a34a' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Violet', value: '#7c3aed' },
];

// Lightbox zoom rules (document-preview-lightbox): 25 % button steps, % = fit,
// wheel one notch ≈ ×1.3.
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

const STAMPS_STORAGE_KEY = 'editor-custom-stamps';

type ToolButtonProps = Omit<React.ComponentProps<typeof Button>, 'variant' | 'size'> & {
  /** Tooltip text — names the ACTION, not the icon (M3 icon buttons); doubles as the aria-label. */
  label: string;
  /** Optional shortcut hint rendered as a <Kbd> chip in the tooltip. */
  kbd?: string;
  /** Toggle state: pressed = tonal fill + aria-pressed (two cues, never colour alone). */
  active?: boolean;
};

/**
 * Toolbar icon button — element-specs §18 (Apple HIG toolbars: prefer
 * symbols with a tooltip) + Material 3 icon buttons ("on hover, the icon
 * button displays a tooltip describing its action"; selection shown by a
 * fill, not colour alone): 36 px `ghost`, `tonal` when pressed.
 */
const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(function ToolButton(
  { label, kbd, active, className, children, ...props },
  ref,
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant={active ? 'tonal' : 'ghost'}
          size="icon"
          className={cn('h-9 w-9', className)}
          aria-label={label}
          aria-pressed={active}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        <span>{label}</span>
        {kbd ? <Kbd>{kbd}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
});

function loadStamps(): SavedStamp[] {
  try {
    const raw = localStorage.getItem(STAMPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveStamps(stamps: SavedStamp[]) {
  localStorage.setItem(STAMPS_STORAGE_KEY, JSON.stringify(stamps));
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EditorPage() {
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
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState(DOCUMENT_INK_COLORS[0].value);
  const [fontSize, setFontSize] = useState(16);
  const [lineThickness, setLineThickness] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [rotation, setRotation] = useState(0);

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }[]>([]);
  const [isImage, setIsImage] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 794, height: 1123 });

  // Drag state
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Line drawing state
  const [lineStart, setLineStart] = useState<{ x: number; y: number; page: number } | null>(null);
  const [linePreview, setLinePreview] = useState<{ x: number; y: number; width: number } | null>(null);

  // Stamp state
  const [savedStamps, setSavedStamps] = useState<SavedStamp[]>([]);
  const [activeStampUrl, setActiveStampUrl] = useState<string | null>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  // Drag-over ring for the stamp picker button (it is also the drop target).
  const [stampDragOver, setStampDragOver] = useState(false);

  // Load stamps from localStorage on mount
  useEffect(() => {
    setSavedStamps(loadStamps());
  }, []);

  // ── Load PDF.js (promise-based to avoid polling) ────────────────────────────
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

  // ── Load chiffrage files + dossier documents/photos (once) ──────────────────
  useEffect(() => {
    if (!db || !chiffrageId) return;
    const loadFilesList = async () => {
      // Load chiffrage files
      const snap = await getDoc(doc(db, 'chiffrages', chiffrageId));
      const chiffrageFiles: typeof allFiles = [];
      if (snap.exists()) {
        const data = snap.data();
        if (data.files?.length) {
          chiffrageFiles.push(...data.files.map((f: any) => ({ ...f, source: 'chiffrage' as const })));
        }
      }

      // Also load dossier documents and photos for browsing
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

  // ── Load current file data ────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !storage || !chiffrageId || allFiles.length === 0) return;
    const file = allFiles[currentFileIndex];
    if (!file) return;

    // Reset state for new file
    setLoading(true);
    setFileUrl('');
    setPdfDoc(null);
    setPageCount(0);
    setPageDimensions([]);
    setAnnotations([]);
    setSelectedId(null);
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
          // Wait for pdf.js to load (promise-based, no polling)
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

  // ── Render PDF pages (debounced re-render when zooming for performance) ──
  const renderScale = Math.max(1.5, zoom * 1.5);
  const renderScaleRef = useRef(renderScale);
  renderScaleRef.current = renderScale;
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef(true);

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

    // First render is immediate; subsequent zoom changes are debounced
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

  // ── Ctrl/⌘ + wheel zoom ───────────────────────────────────────────────────
  // One notch (100 px of accumulated deltaY, so multi-event wheels and
  // trackpads count once) = ×1.3 / ÷1.3. A plain wheel keeps scrolling the
  // pages. Native listener because React wheel events are passive. Pattern:
  // dossier-timeline/step-2-information.tsx compare pane.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) < 100) return;
      const direction = acc < 0 ? 1 : -1;
      acc = 0;
      setZoom((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(direction > 0 ? prev * 1.3 : prev / 1.3).toFixed(3))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [loading]);

  // ── Get position relative to a page ────────────────────────────────────────
  const getPagePos = useCallback((e: React.MouseEvent, pageIndex: number) => {
    const pageEl = document.getElementById(`editor-page-${pageIndex}`);
    if (!pageEl) return { x: 0, y: 0 };
    const rect = pageEl.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [zoom]);

  // ── Mouse handlers (per page) ──────────────────────────────────────────────
  const handlePageMouseDown = (e: React.MouseEvent, pageIndex: number) => {
    if ((e.target as HTMLElement).closest('[data-annotation]')) return;

    const pos = getPagePos(e, pageIndex);

    if (tool === 'select') {
      setSelectedId(null);
      return;
    }

    if (tool === 'line') {
      setLineStart({ ...pos, page: pageIndex });
      setLinePreview({ x: pos.x, y: pos.y, width: 0 });
      return;
    }

    if (tool === 'text') {
      const newA: Annotation = {
        id: crypto.randomUUID(),
        type: 'text',
        page: pageIndex,
        x: pos.x,
        y: pos.y,
        text: '',
        color,
        fontSize,
      };
      setAnnotations(prev => [...prev, newA]);
      setSelectedId(newA.id);
      setTool('select'); // auto-switch back to select
    }

    if (tool === 'stamp' && activeStampUrl) {
      const stampW = 120;
      const stampH = 120;
      const newA: Annotation = {
        id: crypto.randomUUID(),
        type: 'stamp',
        page: pageIndex,
        x: pos.x - stampW / 2,
        y: pos.y - stampH / 2,
        width: stampW,
        height: stampH,
        color: '',
        stampUrl: activeStampUrl,
      };
      setAnnotations(prev => [...prev, newA]);
      setSelectedId(newA.id);
    }
  };

  // Throttled mouse move — only update state once per animation frame
  const rafRef = useRef<number | null>(null);
  const handlePageMouseMove = useCallback((e: React.MouseEvent, pageIndex: number) => {
    if (!lineStart && !dragState) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (lineStart && tool === 'line' && lineStart.page === pageIndex) {
        const pageEl = document.getElementById(`editor-page-${pageIndex}`);
        if (!pageEl) return;
        const rect = pageEl.getBoundingClientRect();
        const posX = (clientX - rect.left) / zoom;
        setLinePreview({ x: lineStart.x, y: lineStart.y, width: posX - lineStart.x });
        return;
      }

      if (dragState) {
        const dx = (clientX - dragState.startX) / zoom;
        const dy = (clientY - dragState.startY) / zoom;
        setAnnotations(prev =>
          prev.map(a =>
            a.id === dragState.id
              ? { ...a, x: dragState.origX + dx, y: dragState.origY + dy }
              : a
          )
        );
      }
    });
  }, [lineStart, dragState, tool, zoom]);

  const handlePageMouseUp = () => {
    if (lineStart && linePreview && tool === 'line') {
      const w = linePreview.width;
      if (Math.abs(w) > 5) {
        const newA: Annotation = {
          id: crypto.randomUUID(),
          type: 'line',
          page: lineStart.page,
          x: w >= 0 ? lineStart.x : lineStart.x + w,
          y: lineStart.y,
          width: Math.abs(w),
          thickness: lineThickness,
          color,
        };
        setAnnotations(prev => [...prev, newA]);
      }
      setLineStart(null);
      setLinePreview(null);
      setTool('select'); // auto-switch back to select
      return;
    }

    if (dragState) setDragState(null);
  };

  // ── Annotation interaction ─────────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent, a: Annotation) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    setSelectedId(a.id);
    setDragState({
      id: a.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: a.x,
      origY: a.y,
    });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setAnnotations(prev => prev.filter(a => a.id !== selectedId));
    setSelectedId(null);
  };

  const clearAll = () => {
    setAnnotations([]);
    setSelectedId(null);
  };

  const updateSelected = (patch: Partial<Annotation>) => {
    if (!selectedId) return;
    setAnnotations(prev =>
      prev.map(a => (a.id === selectedId ? { ...a, ...patch } : a))
    );
  };

  // ── Stamp helpers ─────────────────────────────────────────────────────────
  // Shared by the file input (click) and the picker button's drop handler.
  const importStampFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) return;
    const newStamps: SavedStamp[] = [];
    for (const file of images) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      newStamps.push({
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        dataUrl,
      });
    }
    const updated = [...savedStamps, ...newStamps];
    setSavedStamps(updated);
    saveStamps(updated);
    // Auto-select the last imported stamp
    const last = newStamps[newStamps.length - 1];
    if (last) {
      setActiveStampUrl(last.dataUrl);
      setTool('stamp');
    }
  };

  const handleImportStamp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await importStampFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const handleDeleteStamp = (stampId: string) => {
    const updated = savedStamps.filter(s => s.id !== stampId);
    setSavedStamps(updated);
    saveStamps(updated);
    if (activeStampUrl && savedStamps.find(s => s.id === stampId)?.dataUrl === activeStampUrl) {
      setActiveStampUrl(null);
      if (tool === 'stamp') setTool('select');
    }
  };

  const handleSelectStamp = (dataUrl: string) => {
    setActiveStampUrl(dataUrl);
    setTool('stamp');
  };

  // ── Switch file (auto-save current first) ──────────────────────────────────
  const handleFileSwitch = async (newIndex: number) => {
    if (newIndex === currentFileIndex) return;
    // Auto-save current annotations before switching (only for chiffrage files)
    const currentFile = allFiles[currentFileIndex];
    if (db && chiffrageId && annotations.length > 0 && currentFile?.source === 'chiffrage') {
      try {
        const docRef = doc(db, 'chiffrages', chiffrageId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const updatedFiles = [...(data.files || [])];
          const chiffrageIdx = allFiles.slice(0, currentFileIndex + 1).filter(f => f.source === 'chiffrage').length - 1;
          if (updatedFiles[chiffrageIdx]) {
            updatedFiles[chiffrageIdx].annotations = annotations;
            updatedFiles[chiffrageIdx].status = 'done';
            await updateDoc(docRef, { files: updatedFiles, updatedAt: serverTimestamp() });
          }
        }
      } catch {
        // Silent — don't block switching
      }
    }
    setCurrentFileIndex(newIndex);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const isChiffrageFile = allFiles[currentFileIndex]?.source === 'chiffrage';

  const handleSave = async () => {
    if (!db || !chiffrageId || !isChiffrageFile) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'chiffrages', chiffrageId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const updatedFiles = [...(data.files || [])];
        // Find the correct chiffrage file index (allFiles may include dossier files)
        const chiffrageFileIndex = allFiles.slice(0, currentFileIndex + 1).filter(f => f.source === 'chiffrage').length - 1;
        if (updatedFiles[chiffrageFileIndex]) {
          updatedFiles[chiffrageFileIndex].annotations = annotations;
          updatedFiles[chiffrageFileIndex].status = 'done';
          await updateDoc(docRef, { files: updatedFiles, updatedAt: serverTimestamp() });
          toast({ title: t('Sauvegardé avec succès') });
        }
      }
    } catch {
      toast({ variant: 'destructive', title: t('Erreur de sauvegarde') });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export PDF (original + annotations) ────────────────────────────────────
  const handleExport = async () => {
    if (!fileUrl) return;
    setIsExporting(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      let exportPdf: Awaited<ReturnType<typeof PDFDocument.create>>;

      if (isImage) {
        // Create a new PDF with the image
        exportPdf = await PDFDocument.create();
        const response = await fetch(fileUrl);
        const imgBytes = new Uint8Array(await response.arrayBuffer());
        const isJpg = fileName.match(/\.(jpg|jpeg)$/i);
        const img = isJpg
          ? await exportPdf.embedJpg(imgBytes)
          : await exportPdf.embedPng(imgBytes);
        const page = exportPdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      } else {
        // Load the original PDF
        const response = await fetch(fileUrl);
        const pdfBytes = new Uint8Array(await response.arrayBuffer());
        exportPdf = await PDFDocument.load(pdfBytes);
      }

      const font = await exportPdf.embedFont(StandardFonts.Helvetica);
      const pages = exportPdf.getPages();

      // Draw annotations onto each page
      for (const a of annotations) {
        const pageIdx = a.page || 0;
        if (pageIdx >= pages.length) continue;
        const page = pages[pageIdx];
        const { width: pageW, height: pageH } = page.getSize();

        // The rendered canvas scale is 1.5x for PDF pages
        const scale = isImage ? 1 : 1.5;
        // Convert screen coords to PDF coords (PDF origin is bottom-left)
        const pdfX = (a.x / scale);
        const pdfY = pageH - (a.y / scale);

        // Parse hex color to rgb
        const hexToRgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          return rgb(r, g, b);
        };

        if (a.type === 'line') {
          const lineW = (a.width || 0) / scale;
          const thickness = a.thickness || 3;
          page.drawRectangle({
            x: pdfX,
            y: pdfY - thickness / 2,
            width: lineW,
            height: thickness / scale,
            color: hexToRgb(a.color),
          });
        } else if (a.type === 'text' && a.text) {
          const fs = (a.fontSize || 16) / scale;
          page.drawText(a.text, {
            x: pdfX,
            y: pdfY - fs,
            size: fs,
            font,
            color: hexToRgb(a.color),
          });
        } else if (a.type === 'stamp' && a.stampUrl) {
          try {
            const stampW = (a.width || 120) / scale;
            const stampH = (a.height || 120) / scale;
            // Fetch the stamp image data
            const stampResponse = await fetch(a.stampUrl);
            const stampBytes = new Uint8Array(await stampResponse.arrayBuffer());
            const isPng = a.stampUrl.includes('png') || a.stampUrl.startsWith('data:image/png');
            const stampImg = isPng
              ? await exportPdf.embedPng(stampBytes)
              : await exportPdf.embedJpg(stampBytes);
            page.drawImage(stampImg, {
              x: pdfX,
              y: pdfY - stampH,
              width: stampW,
              height: stampH,
            });
          } catch (stampErr) {
            console.warn('Could not embed stamp in PDF:', stampErr);
          }
        }
      }

      const finalBytes = await exportPdf.save();
      const pdfBlob = new Blob([finalBytes], { type: 'application/pdf' });

      // Upload to storage (with offline fallback)
      if (storage && db) {
        const storagePath = `chiffrages/${chiffrageId}/correction_${Date.now()}.pdf`;

        if (navigator.onLine) {
          try {
            const storageRef = ref(storage!, storagePath);
            await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
            const exportUrl = await getDownloadURL(storageRef);

            const docRef = doc(db, 'chiffrages', chiffrageId);
            const snap = await getDoc(docRef);
            if (snap.exists() && isChiffrageFile) {
              const data = snap.data();
              const updatedFiles = [...(data.files || [])];
              const chiffrageIdx = allFiles.slice(0, currentFileIndex + 1).filter(f => f.source === 'chiffrage').length - 1;
              if (updatedFiles[chiffrageIdx]) {
                updatedFiles[chiffrageIdx] = {
                  ...updatedFiles[chiffrageIdx],
                  pdfUrl: exportUrl,
                  status: 'done',
                  annotations,
                };
              }
              await updateDoc(docRef, { files: updatedFiles, status: 'done', updatedAt: serverTimestamp() });
            }
          } catch {
            // Network failed mid-upload — queue for later
            await enqueueUpload({
              fileBlob: pdfBlob,
              fileName: `correction_${Date.now()}.pdf`,
              fileSize: pdfBlob.size,
              contentType: 'application/pdf',
              storagePath,
              firestoreDocPath: `chiffrages`,
              firestoreMetadata: { _chiffrageId: chiffrageId, _fileIndex: currentFileIndex, _type: 'chiffrage-correction', annotations },
            });
            toast({ title: t('Fichier mis en file d\'attente'), description: t('Il sera synchronisé une fois en ligne.') });
          }
        } else {
          await enqueueUpload({
            fileBlob: pdfBlob,
            fileName: `correction_${Date.now()}.pdf`,
            fileSize: pdfBlob.size,
            contentType: 'application/pdf',
            storagePath,
            firestoreDocPath: `chiffrages`,
            firestoreMetadata: { _chiffrageId: chiffrageId, _fileIndex: currentFileIndex, _type: 'chiffrage-correction', annotations },
          });
          toast({ title: t('Fichier mis en file d\'attente'), description: t('Il sera synchronisé une fois en ligne.') });
        }
      }

      // Download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdfBlob);
      a.download = `Correction_${fileName.split('.')[0]}.pdf`;
      a.click();

      toast({ title: t('PDF exporté avec succès') });
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: t("Erreur d'exportation"), description: e.message });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Selected annotation ref ────────────────────────────────────────────────
  const selectedAnnotation = annotations.find(a => a.id === selectedId);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      // Skeleton §15 (NN/g: mirror the final layout) — the two restored bars,
      // the dark canvas with one page, the status strip.
      <div className="flex h-screen flex-col bg-background" aria-busy="true">
        <div className="flex min-h-[48px] shrink-0 items-center gap-2 glass-bar border-b border-hairline px-4 sm:px-6">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[220px] rounded-md" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="flex min-h-[40px] shrink-0 items-center gap-2 glass-bar border-b border-hairline px-4 sm:px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-md" />
          ))}
          <div className="h-6 w-px bg-hairline" />
          <Skeleton className="h-4 w-40" />
          <div className="flex-1" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
        <div className="flex flex-1 items-start justify-center overflow-hidden bg-ink-solid p-8">
          <Skeleton className="h-[calc(70vh/var(--app-zoom))] w-full max-w-3xl rounded-sm bg-card/80" />
        </div>
        <div className="h-8 glass-bar border-t border-hairline" />
      </div>
    );
  }

  const toolLabel = tool === "select" ? t("Sélection") : tool === "text" ? t("Texte") : tool === "stamp" ? t("Tampon") : t("Ligne");

  return (
    <div className="flex h-screen select-none flex-col bg-background">
      {/* ── Bar 1: navigation · file · actions ───────────────────────────────
          Original 3d5629a layout restored: TWO sibling bars. Element-specs §18
          (Apple HIG toolbars: leading = navigation, centre = the view's
          controls, trailing = the important items; "prefer symbols… except
          for actions like edit" → the back button keeps its « Retour » label)
          and §23 (the two bars together are this page's one sticky chrome:
          ≤ 48 px + ≤ 40 px, `.glass-bar` + hairline, gutters 16/24). ONE
          filled button (Exporter PDF) at the right end; Enregistrer is
          `outline` and visible at every width. */}
      <div className="z-40 flex min-h-[48px] shrink-0 flex-wrap items-center gap-2 glass-bar border-b border-hairline px-4 sm:px-6">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> {t("Retour")}
        </Button>

        <Separator orientation="vertical" className="h-6" aria-hidden />

        {/* Type filter */}
        <Select value={selectedDocType || '__all__'} onValueChange={(v) => setSelectedDocType(v === '__all__' ? null : v)}>
          <SelectTrigger className="h-9 w-[150px] text-xs" aria-label={t("Type de document")} data-tour="edp-doc-filter">
            <SelectValue placeholder={t("Type de document")} />
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
        <Select value={String(currentFileIndex)} onValueChange={(v) => handleFileSwitch(Number(v))}>
          <SelectTrigger className="h-9 w-[220px] text-xs" aria-label={t("Fichier")} data-tour="edp-file-switcher">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filteredFileIndices.map((i) => (
              <SelectItem key={i} value={String(i)}>
                <span className="flex items-center gap-1.5 truncate">
                  {allFiles[i].source === 'dossier' && <span className="shrink-0 rounded bg-surface-3 px-1 text-[11px] font-medium text-ink-2">{t("Dossier")}</span>}
                  {allFiles[i].name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pageCount > 0 && (
          <span className="t-caption whitespace-nowrap tabular-nums">({pageCount} p.)</span>
        )}
        {/* Read-only chip — §11 status pair + label (read-only IS the exception). */}
        {!isChiffrageFile && (
          <Badge variant="warning" className="shrink-0" title={t("Fichier du dossier : les annotations ne sont pas enregistrées")}>
            {t("Lecture seule")}
          </Badge>
        )}

        <Separator orientation="vertical" className="h-6" aria-hidden />

        {/* Comparison toggle — outline ⇄ tonal, aria-pressed (two cues). */}
        {dossierId && (
          <Button
            variant={comparisonOpen ? 'tonal' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setComparisonOpen(v => !v)}
            aria-pressed={comparisonOpen}
            data-tour="edp-comparison"
          >
            <Columns2 className="h-4 w-4" />
            {t("Comparaison")}
          </Button>
        )}

        <div className="flex-1" />

        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSave} loading={isSaving} disabled={!isChiffrageFile} title={!isChiffrageFile ? t("Lecture seule (fichier dossier)") : undefined} data-tour="edp-save">
          {isSaving ? null : <Save className="h-4 w-4" />}
          {t("Enregistrer")}
        </Button>
        <Button variant="default" size="sm" className="gap-1.5" onClick={handleExport} loading={isExporting} data-tour="edp-export">
          {isExporting ? null : <Download className="h-4 w-4" />}
          {t("Exporter PDF")}
        </Button>
      </div>

      {/* ── Bar 2: tools ─────────────────────────────────────────────────────
          §18: ≤ 3 groups separated by hairline Separators — [tools] | [ink:
          colour · text size · line weight] · spacer · [trailing: delete ·
          clear · zoom · rotation]. Icon buttons are 36 px `ghost` with
          tooltips (M3 icon buttons: the tooltip names the action; pressed =
          tonal fill + aria-pressed — two cues, never colour alone). */}
      <TooltipProvider delayDuration={300}>
        <div className="z-30 flex min-h-[40px] shrink-0 flex-wrap items-center gap-2 glass-bar border-b border-hairline px-4 py-0.5 sm:px-6">
          <div className="flex items-center gap-0.5" role="group" aria-label={t("Outils")}>
            <ToolButton label={t("Sélectionner / déplacer")} active={tool === "select"} onClick={() => setTool("select")} data-tour="edp-tool-select">
              <MousePointer2 className="h-4 w-4" />
            </ToolButton>
            <ToolButton label={t("Ajouter du texte")} active={tool === "text"} onClick={() => setTool("text")} data-tour="edp-tool-text">
              <Type className="h-4 w-4" />
            </ToolButton>
            <ToolButton label={t("Tracer une ligne")} active={tool === "line"} onClick={() => setTool("line")} data-tour="edp-tool-line">
              <Minus className="h-4 w-4" />
            </ToolButton>
            <Popover>
              <PopoverTrigger asChild>
                <ToolButton label={t("Tampon")} active={tool === "stamp"} data-tour="edp-tool-stamp">
                  <Stamp className="h-4 w-4" />
                </ToolButton>
              </PopoverTrigger>
              {/* Stamp popover — §13-lite: `glass-strong` (the PopoverContent
                  default), `t-label` heading, 3-col tiles per §21 (raised
                  tiles, 10 px radius, hover-revealed delete), and ONE plain
                  « Ajouter un tampon » button that is also the drop target
                  (blueprint §6 file-picker rule: ring on drag-over, no banner,
                  no dashed panel). Empty = one line + that action (§12). */}
              <PopoverContent className="w-64 p-4" align="start">
                <div className="space-y-3">
                  <p className="t-label">{t("Tampons")}</p>
                  {savedStamps.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {savedStamps.map(s => {
                        const active = activeStampUrl === s.dataUrl && tool === 'stamp';
                        return (
                          <div
                            key={s.id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={active}
                            className={cn(
                              'group relative flex aspect-square cursor-pointer items-center justify-center rounded-[10px] bg-card p-1 shadow-rim transition-[box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              active && 'ring-2 ring-ring'
                            )}
                            onClick={() => handleSelectStamp(s.dataUrl)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectStamp(s.dataUrl); } }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={s.dataUrl} alt={s.name} className="max-h-full max-w-full object-contain" draggable={false} />
                            <button
                              type="button"
                              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-rim-filled transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                              onClick={(e) => { e.stopPropagation(); handleDeleteStamp(s.id); }}
                              aria-label={`${t('Supprimer le tampon')} ${s.name}`}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                            <span className="absolute inset-x-0 bottom-0 truncate px-0.5 text-center text-[11px] text-ink-3">{s.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="t-caption py-2 text-center">{t("Aucun tampon importé")}</p>
                  )}
                  <input
                    ref={stampInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImportStamp}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn('w-full gap-1.5', stampDragOver && 'ring-2 ring-ring')}
                    onClick={() => stampInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setStampDragOver(true); }}
                    onDragLeave={() => setStampDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setStampDragOver(false);
                      void importStampFiles(Array.from(e.dataTransfer.files));
                    }}
                  >
                    <Plus className="h-4 w-4" /> {t("Ajouter un tampon")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Separator orientation="vertical" className="h-6" aria-hidden />

          {/* Ink settings. Colour swatches — Apple HIG colour wells ("the
              colour well updates to show the new colour") + M3 toggle icon
              buttons (selection by two cues: ring + aria-pressed); the hexes
              are DOCUMENT ink (see DOCUMENT_INK_COLORS), not UI colour. Sliders — M3
              sliders (a label, immediate effect, the current value shown
              beside the handle): `t-label` + live tabular readout. */}
          <div className="flex flex-wrap items-center gap-3" role="group" aria-label={t("Encre")}>
            <div className="flex items-center gap-1.5" role="group" aria-label={t("Couleur")} data-tour="edp-colors">
              {DOCUMENT_INK_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setColor(c.value);
                    if (selectedId) updateSelected({ color: c.value });
                  }}
                  className={cn(
                    'h-5 w-5 rounded-full shadow-rim transition-[box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    color === c.value && 'ring-2 ring-ring ring-offset-2 ring-offset-card'
                  )}
                  style={{ backgroundColor: c.value }}
                  title={t(c.name)}
                  aria-label={t(c.name)}
                  aria-pressed={color === c.value}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span id="editor-text-size-label" className="t-label">{t("Texte")}</span>
              <Slider
                value={[selectedAnnotation?.type === 'text' ? (selectedAnnotation.fontSize || 16) : fontSize]}
                onValueChange={([v]) => {
                  setFontSize(v);
                  if (selectedId && selectedAnnotation?.type === 'text') updateSelected({ fontSize: v });
                }}
                min={10}
                max={48}
                step={1}
                className="w-20"
                aria-labelledby="editor-text-size-label"
              />
              <span className="w-5 text-right text-xs tabular-nums text-ink-2">
                {selectedAnnotation?.type === 'text' ? (selectedAnnotation.fontSize || 16) : fontSize}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span id="editor-line-weight-label" className="t-label">{t("Trait")}</span>
              <Slider
                value={[selectedAnnotation?.type === 'line' ? (selectedAnnotation.thickness || lineThickness) : lineThickness]}
                onValueChange={([v]) => {
                  setLineThickness(v);
                  if (selectedId && selectedAnnotation?.type === 'line') updateSelected({ thickness: v });
                }}
                min={1}
                max={8}
                step={1}
                className="w-14"
                aria-labelledby="editor-line-weight-label"
              />
              <span className="w-3 text-xs tabular-nums text-ink-2">
                {selectedAnnotation?.type === 'line' ? (selectedAnnotation.thickness || lineThickness) : lineThickness}
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Trailing group: delete / clear (restored Trash2 + Eraser, 3d5629a),
              then the zoom pill (owner ruling: −/%/+, 25 % steps, % = fit,
              Ctrl + wheel ≈ ×1.3 per notch) and rotation. */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5" role="group" aria-label={t("Annotations")}>
              <ToolButton label={t("Supprimer la sélection")} className="text-ink-3 hover:text-destructive" onClick={deleteSelected} disabled={!selectedId}>
                <Trash2 className="h-4 w-4" />
              </ToolButton>
              <ToolButton label={t("Tout effacer")} className="text-ink-3 hover:text-destructive" onClick={clearAll} disabled={annotations.length === 0}>
                <Eraser className="h-4 w-4" />
              </ToolButton>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 rounded-md bg-surface-2 px-0.5" role="group" aria-label={t("Zoom")} data-tour="edp-zoom">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))} disabled={zoom <= ZOOM_MIN} aria-label={t("Zoom arrière")}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <button type="button" className="t-caption min-w-[3rem] rounded px-1 text-center tabular-nums hover:bg-surface-3" onClick={() => setZoom(1)} aria-label={`${t('Zoom')} ${Math.round(zoom * 100)} % — ${t('réinitialiser')}`}>
                    {Math.round(zoom * 100)} %
                  </button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))} disabled={zoom >= ZOOM_MAX} aria-label={t("Zoom avant")}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>{t("Zoom — cliquer le % pour réinitialiser")}</span>
                <Kbd>Ctrl</Kbd><span>{t("+ molette")}</span>
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-0.5" role="group" aria-label={t("Rotation")}>
              <ToolButton label={t("Rotation −90°")} onClick={() => setRotation(r => (r - 90 + 360) % 360)}>
                <RotateCcw className="h-4 w-4" />
              </ToolButton>
              <span className="t-caption w-7 text-center tabular-nums">{rotation}°</span>
              <ToolButton label={t("Rotation +90°")} onClick={() => setRotation(r => (r + 90) % 360)}>
                <RotateCw className="h-4 w-4" />
              </ToolButton>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* ── Main content area (comparison panel + canvas) ───────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Reference panel for side-by-side comparison */}
        {comparisonOpen && dossierId && (
          <ReferencePanel
            dossierId={dossierId}
            isOpen={comparisonOpen}
            onClose={() => setComparisonOpen(false)}
          />
        )}

        {/* Canvas area — dark functional backdrop (lightbox media area); all pages stacked */}
        <div
          ref={containerRef}
          className="flex flex-1 flex-col items-center gap-6 overflow-auto bg-ink-solid p-8"
        >
          {/* Image file — single page */}
          {isImage && fileUrl && (
            <PageWrapper
              key={0}
              pageIndex={0}
              width={imageDimensions.width}
              height={imageDimensions.height}
              zoom={zoom}
              rotation={rotation}
              tool={tool}
              annotations={annotations.filter(a => (a.page || 0) === 0)}
              selectedId={selectedId}
              lineThickness={lineThickness}
              linePreview={lineStart?.page === 0 ? linePreview : null}
              lineColor={color}
              onMouseDown={e => handlePageMouseDown(e, 0)}
              onMouseMove={e => handlePageMouseMove(e, 0)}
              onMouseUp={handlePageMouseUp}
              onAnnotationMouseDown={startDrag}
              onAnnotationClick={id => setSelectedId(id)}
              onAnnotationTextChange={(id, text) =>
                setAnnotations(prev => prev.map(a => (a.id === id ? { ...a, text } : a)))
              }
              onDeleteSelected={deleteSelected}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={fileName}
                className="h-full w-full object-contain"
                crossOrigin="anonymous"
                draggable={false}
              />
            </PageWrapper>
          )}

          {/* PDF pages */}
          {!isImage && pageDimensions.map((dim, i) => (
            <PageWrapper
              key={i}
              pageIndex={i}
              width={dim.width}
              height={dim.height}
              zoom={zoom}
              rotation={rotation}
              tool={tool}
              annotations={annotations.filter(a => (a.page || 0) === i)}
              selectedId={selectedId}
              lineThickness={lineThickness}
              linePreview={lineStart?.page === i ? linePreview : null}
              lineColor={color}
              onMouseDown={e => handlePageMouseDown(e, i)}
              onMouseMove={e => handlePageMouseMove(e, i)}
              onMouseUp={handlePageMouseUp}
              onAnnotationMouseDown={startDrag}
              onAnnotationClick={id => setSelectedId(id)}
              onAnnotationTextChange={(id, text) =>
                setAnnotations(prev => prev.map(a => (a.id === id ? { ...a, text } : a)))
              }
              onDeleteSelected={deleteSelected}
            >
              <canvas
                ref={el => { if (el) pageCanvasRefs.current.set(i, el); }}
                style={{ display: 'block' }}
              />
              {/* Page number label */}
              <div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[11px] tabular-nums text-ink-4">
                Page {i + 1} / {pageCount}
              </div>
            </PageWrapper>
          ))}
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between glass-bar border-t border-hairline px-4 py-1.5 text-xs text-ink-3" data-tour="edp-status">
        <div className="flex items-center gap-4">
          <span className="tabular-nums">{annotations.length} {annotations.length !== 1 ? t('éléments') : t('élément')}</span>
          {selectedId && <span className="font-semibold text-ink">{t('1 sélectionné — glissez pour déplacer')}</span>}
        </div>
        <div className="flex items-center gap-4 tabular-nums">
          <span>{t('Outil :')} {toolLabel}</span>
          {!isChiffrageFile && <span className="font-semibold text-status-warning-fg">{t('Lecture seule')}</span>}
          <span>{t('Zoom :')} {Math.round(zoom * 100)}%</span>
          {rotation !== 0 && <span>{t('Rotation :')} {rotation}°</span>}
        </div>
      </div>
    </div>
  );
}

// ── Page wrapper component ─────────────────────────────────────────────────
interface PageWrapperProps {
  pageIndex: number;
  width: number;
  height: number;
  zoom: number;
  rotation: number;
  tool: Tool;
  annotations: Annotation[];
  selectedId: string | null;
  lineThickness: number;
  linePreview: { x: number; y: number; width: number } | null;
  lineColor: string;
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onAnnotationMouseDown: (e: React.MouseEvent, a: Annotation) => void;
  onAnnotationClick: (id: string) => void;
  onAnnotationTextChange: (id: string, text: string) => void;
  onDeleteSelected: () => void;
}

const PageWrapper = memo(function PageWrapper({
  pageIndex, width, height, zoom, rotation, tool, annotations, selectedId,
  lineThickness, linePreview, lineColor, children,
  onMouseDown, onMouseMove, onMouseUp,
  onAnnotationMouseDown, onAnnotationClick, onAnnotationTextChange, onDeleteSelected,
}: PageWrapperProps) {
  // Calculate bounding box when rotated for proper spacing
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
    {/* The page is the document (white by nature), raised off the dark backdrop. */}
    <div
      id={`editor-page-${pageIndex}`}
      className={cn(
        'relative bg-white shadow-raised',
        tool === 'text' && 'cursor-crosshair',
        tool === 'line' && 'cursor-crosshair',
        tool === 'stamp' && 'cursor-copy',
        tool === 'select' && 'cursor-default'
      )}
      style={{
        width,
        height,
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        position: 'absolute',
        left: (rotW * zoom - width) / 2,
        top: (rotH * zoom - height) / 2,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {children}

      {/* Line preview */}
      {linePreview && tool === 'line' && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: linePreview.width >= 0 ? linePreview.x : linePreview.x + linePreview.width,
            top: linePreview.y - lineThickness / 2,
            width: Math.abs(linePreview.width),
            height: lineThickness,
            backgroundColor: lineColor,
            opacity: 0.5,
          }}
        />
      )}

      {/* Annotations for this page */}
      {annotations.map(a => (
        <AnnotationElement
          key={a.id}
          annotation={a}
          isSelected={selectedId === a.id}
          tool={tool}
          onMouseDown={e => onAnnotationMouseDown(e, a)}
          onClick={() => onAnnotationClick(a.id)}
          onTextChange={text => onAnnotationTextChange(a.id, text)}
          onDelete={onDeleteSelected}
        />
      ))}
    </div>
    </div>
  );
});

// ── Single annotation element ──────────────────────────────────────────────
interface AnnotationElementProps {
  annotation: Annotation;
  isSelected: boolean;
  tool: Tool;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
}

const AnnotationElement = memo(function AnnotationElement({ annotation: a, isSelected, tool, onMouseDown, onClick, onTextChange, onDelete }: AnnotationElementProps) {
  const t = useT();
  const textRef = useRef<HTMLDivElement>(null);

  // Auto-focus when newly created (empty text)
  useEffect(() => {
    if (isSelected && a.type === 'text' && a.text === '' && textRef.current) {
      textRef.current.focus();
    }
  }, [isSelected, a.type, a.text]);

  const thickness = a.thickness || 3;
  // Lines get a bigger invisible hit area (min 20px tall) for easier hover/click
  const hitPadding = a.type === 'line' ? Math.max(10, (20 - thickness) / 2) : 0;

  return (
    <div
      data-annotation
      className={cn(
        'absolute group',
        tool === 'select' && 'cursor-move',
      )}
      style={{
        left: a.x,
        top: a.type === 'line' ? a.y - thickness / 2 - hitPadding : a.y,
        width: a.type === 'line' ? a.width : a.type === 'stamp' ? (a.width || 120) : 'auto',
        // For lines: visible line + invisible padding above and below
        height: a.type === 'line' ? thickness + hitPadding * 2 : a.type === 'stamp' ? (a.height || 120) : 'auto',
        zIndex: isSelected ? 1000 : 100,
      }}
      onMouseDown={onMouseDown}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      {a.type === 'line' && (
        <>
          {/* The visible line */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: hitPadding,
              height: thickness,
              backgroundColor: a.color,
            }}
          />
          {/* Hover / selection highlight — the focus ring is the selection cue */}
          <div
            className={cn(
              'absolute inset-0 rounded transition-colors duration-150',
              isSelected ? 'bg-accent/40 ring-2 ring-ring' : 'hover:bg-accent/25'
            )}
          />
        </>
      )}

      {a.type === 'text' && (
        <div
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onTextChange(e.currentTarget.innerText)}
          onMouseDown={e => { if (isSelected) e.stopPropagation(); }}
          className={cn(
            'px-1 py-0.5 font-semibold whitespace-pre-wrap outline-none',
            isSelected ? 'border border-dashed rounded' : 'border border-transparent'
          )}
          style={{
            color: a.color,
            fontSize: `${a.fontSize || 16}px`,
            lineHeight: 1.3,
            borderColor: isSelected ? a.color : 'transparent',
            minWidth: 20,
            minHeight: (a.fontSize || 16) * 1.3,
            background: 'transparent',
            caretColor: a.color,
          }}
        >
          {a.text}
        </div>
      )}

      {a.type === 'stamp' && a.stampUrl && (
        <div className={cn(
          'w-full h-full',
          isSelected ? 'ring-2 ring-ring ring-offset-1' : ''
        )}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.stampUrl}
            alt={t('tampon')}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>
      )}

      {/* Delete button — visible on hover or selection */}
      {(isSelected || a.type === 'line' || a.type === 'stamp') && (
        <button
          type="button"
          className={cn(
            'absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground shadow-rim-filled transition-opacity duration-150',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={e => { e.stopPropagation(); onDelete(); }}
          aria-label={t("Supprimer l'annotation")}
        >
          ×
        </button>
      )}
    </div>
  );
});
