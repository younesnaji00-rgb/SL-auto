'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Download, Loader2, Type, Minus,
  MousePointer2, Trash2, ZoomIn, ZoomOut, Eraser,
  RotateCw, RotateCcw, Columns2, Stamp, Plus, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ReferencePanel from './reference-panel';
import { useFirestore, useStorage } from '@/firebase';
import { doc, updateDoc, serverTimestamp, getDoc, collection, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { enqueueUpload } from '@/lib/offline/upload-queue';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

const COLORS = [
  { name: 'Rouge', value: '#dc2626' },
  { name: 'Bleu', value: '#2563eb' },
  { name: 'Noir', value: '#000000' },
  { name: 'Vert', value: '#16a34a' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Violet', value: '#7c3aed' },
];

const STAMPS_STORAGE_KEY = 'editor-custom-stamps';

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
  const [color, setColor] = useState(COLORS[0].value);
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
        toast({ variant: 'destructive', title: 'Erreur de chargement du fichier' });
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
  const handleImportStamp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newStamps: SavedStamp[] = [];
    for (const file of files) {
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
          toast({ title: 'Sauvegardé avec succès' });
        }
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde' });
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
            toast({ title: 'Fichier mis en file d\'attente', description: 'Il sera synchronisé une fois en ligne.' });
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
          toast({ title: 'Fichier mis en file d\'attente', description: 'Il sera synchronisé une fois en ligne.' });
        }
      }

      // Download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdfBlob);
      a.download = `Correction_${fileName.split('.')[0]}.pdf`;
      a.click();

      toast({ title: 'PDF exporté avec succès' });
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: "Erreur d'exportation", description: e.message });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Selected annotation ref ────────────────────────────────────────────────
  const selectedAnnotation = annotations.find(a => a.id === selectedId);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="border-b bg-card px-3 py-2 flex items-center gap-3">
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-px bg-border" />
          <div className="h-7 w-[180px] animate-pulse rounded bg-muted" />
          <div className="flex-1" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-200 dark:bg-slate-800 p-8">
          <div className="h-[calc(70vh/var(--app-zoom))] w-full max-w-3xl animate-pulse rounded-lg bg-white dark:bg-slate-700 shadow-lg" />
        </div>
        <div className="bg-card border-t px-4 py-1.5 h-7" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 select-none">
      {/* ── Top toolbar — Row 1: Navigation & Files ─────────────────────────── */}
      <div className="bg-card border-b px-3 py-1.5 flex items-center gap-2 shrink-0 z-50 shadow-sm">
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" onClick={() => router.back()}>
          <ArrowLeft className="h-3 w-3" /> Retour
        </Button>

        <div className="h-5 w-px bg-border" />

        {/* Type filter — always visible */}
        <Select value={selectedDocType || '__all__'} onValueChange={(v) => setSelectedDocType(v === '__all__' ? null : v)}>
          <SelectTrigger className="h-7 w-[150px] text-xs">
            <SelectValue placeholder="Type de document" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les types ({allFiles.length})</SelectItem>
            {Object.entries(fileTypeGroups).map(([key, group]) => (
              <SelectItem key={key} value={key}>
                {group.label} ({group.indices.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* File switcher */}
        <Select value={String(currentFileIndex)} onValueChange={(v) => handleFileSwitch(Number(v))}>
          <SelectTrigger className="h-7 w-[200px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filteredFileIndices.map((i) => (
              <SelectItem key={i} value={String(i)}>
                <span className="flex items-center gap-1.5 truncate">
                  {allFiles[i].source === 'dossier' && <span className="text-[11px] bg-muted px-1 rounded font-semibold text-muted-foreground shrink-0">Dossier</span>}
                  {allFiles[i].name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pageCount > 0 && (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">({pageCount} p.)</span>
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
            Comparaison
          </Button>
        )}

        <div className="flex-1" />

        {/* Save & Export */}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={handleSave} loading={isSaving} disabled={!isChiffrageFile} title={!isChiffrageFile ? 'Lecture seule (fichier dossier)' : ''}>
          {isSaving ? null : <Save className="h-3 w-3" />}
          Enregistrer
        </Button>
        <Button variant="default" size="sm" className="h-7 text-xs gap-1 px-2" onClick={handleExport} loading={isExporting}>
          {isExporting ? null : <Download className="h-3 w-3" />}
          Exporter PDF
        </Button>
      </div>

      {/* ── Top toolbar — Row 2: Tools ──────────────────────────────────────── */}
      <div className="bg-card border-b px-3 py-1 flex items-center gap-2 shrink-0 z-40">
        {/* Tools */}
        <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-md">
          <Button variant={tool === 'select' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setTool('select')} title="Sélectionner / Déplacer">
            <MousePointer2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant={tool === 'text' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setTool('text')} title="Ajouter du texte">
            <Type className="h-3.5 w-3.5" />
          </Button>
          <Button variant={tool === 'line' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setTool('line')} title="Tracer une ligne">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={tool === 'stamp' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" title="Tampon">
                <Stamp className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tampons</p>
                {savedStamps.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {savedStamps.map(s => (
                      <div
                        key={s.id}
                        className={cn(
                          'relative group rounded-lg border-2 p-1 cursor-pointer hover:border-primary transition-colors aspect-square flex items-center justify-center bg-muted/30',
                          activeStampUrl === s.dataUrl && tool === 'stamp' ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                        )}
                        onClick={() => handleSelectStamp(s.dataUrl)}
                      >
                        <img src={s.dataUrl} alt={s.name} className="max-w-full max-h-full object-contain" draggable={false} />
                        <button
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[11px] opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          onClick={(e) => { e.stopPropagation(); handleDeleteStamp(s.id); }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                        <span className="absolute bottom-0 inset-x-0 text-[10px] text-center truncate px-0.5 text-muted-foreground">{s.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-3">Aucun tampon importé</p>
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
                  className="w-full h-7 text-xs gap-1.5"
                  onClick={() => stampInputRef.current?.click()}
                >
                  <Plus className="h-3 w-3" /> Ajouter un tampon
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => {
                setColor(c.value);
                if (selectedId) updateSelected({ color: c.value });
              }}
              className={cn(
                'w-5 h-5 rounded-full border-2 transition-all hover:scale-110',
                color === c.value ? 'border-foreground scale-110 ring-2 ring-primary/30' : 'border-transparent'
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Font size */}
        <div className="flex items-center gap-1.5">
          <Type className="h-3 w-3 text-muted-foreground" />
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
          />
          <span className="text-[11px] font-mono text-muted-foreground w-5 text-right">
            {selectedAnnotation?.type === 'text' ? (selectedAnnotation.fontSize || 16) : fontSize}
          </span>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Line thickness */}
        <div className="flex items-center gap-1.5">
          <Minus className="h-3 w-3 text-muted-foreground" />
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
          />
          <span className="text-[11px] font-mono text-muted-foreground w-3">
            {selectedAnnotation?.type === 'line' ? (selectedAnnotation.thickness || lineThickness) : lineThickness}
          </span>
        </div>

        <div className="flex-1" />

        {/* Delete / Clear */}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={deleteSelected} disabled={!selectedId} title="Supprimer">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={clearAll} disabled={annotations.length === 0} title="Tout effacer">
          <Eraser className="h-3.5 w-3.5" />
        </Button>

        <div className="h-5 w-px bg-border" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-md px-1 py-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-[11px] font-bold w-8 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(3, z + 0.1))}>
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Rotation */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-md px-1 py-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRotation(r => (r - 90 + 360) % 360)} title="Rotation -90°">
            <RotateCcw className="h-3 w-3" />
          </Button>
          <span className="text-[11px] font-bold w-6 text-center">{rotation}°</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRotation(r => (r + 90) % 360)} title="Rotation +90°">
            <RotateCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── Main content area (comparison panel + canvas) ───────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Reference panel for side-by-side comparison */}
        {comparisonOpen && dossierId && (
          <ReferencePanel
            dossierId={dossierId}
            isOpen={comparisonOpen}
            onClose={() => setComparisonOpen(false)}
          />
        )}

        {/* Canvas area — all pages stacked */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex flex-col items-center gap-6 p-8 bg-slate-200 dark:bg-slate-800"
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
              <img
                src={fileUrl}
                alt={fileName}
                className="w-full h-full object-contain"
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
              <div className="absolute bottom-2 right-3 text-[11px] text-slate-400 font-mono pointer-events-none">
                Page {i + 1} / {pageCount}
              </div>
            </PageWrapper>
          ))}
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div className="bg-card border-t px-4 py-1.5 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          <span>{annotations.length} élément{annotations.length !== 1 ? 's' : ''}</span>
          {selectedId && <span className="text-primary font-semibold">1 sélectionné — glissez pour déplacer</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>Outil : {tool === 'select' ? 'Sélection' : tool === 'text' ? 'Texte' : tool === 'stamp' ? 'Tampon' : 'Ligne'}</span>
          {!isChiffrageFile && <span className="text-amber-500 font-semibold">Lecture seule</span>}
          <span>Zoom : {Math.round(zoom * 100)}%</span>
          {rotation !== 0 && <span>Rotation : {rotation}°</span>}
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
    <div
      id={`editor-page-${pageIndex}`}
      className={cn(
        'relative bg-white shadow-2xl',
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
          {/* Hover highlight */}
          <div
            className={cn(
              'absolute inset-0 rounded transition-colors',
              isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-primary/5'
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
          isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
        )}>
          <img
            src={a.stampUrl}
            alt="tampon"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>
      )}

      {/* Delete button — visible on hover or selection */}
      {(isSelected || a.type === 'line' || a.type === 'stamp') && (
        <button
          className={cn(
            'absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-lg hover:scale-110 transition-all',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={e => { e.stopPropagation(); onDelete(); }}
        >
          ×
        </button>
      )}
    </div>
  );
});
