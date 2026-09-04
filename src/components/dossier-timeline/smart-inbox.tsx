'use client';

/**
 * Boîte de dépôt — ONE drop zone for every file of a dossier.
 *
 * Drop any number of PDFs/images: each file is uploaded, classified by the AI
 * (/api/classify-document, which retrieves previously corrected examples),
 * filed into the matching document slot, and post-processed like a manual
 * upload would be (devis/facture extraction, carte grise scan).
 *
 * Learning loop: changing the class of a file (select, or drag it onto a
 * class chip) records a correction; "Tout valider" records confirmations;
 * dropping a file directly on a class chip records a manual label. All of it
 * feeds /api/classify-feedback → ai_examples, which the classifier reads back.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { arrayUnion, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  Check,
  FileText,
  ImageIcon,
  Loader2,
  ScanSearch,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api-fetch';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { extractAndPersistChiffrageDevis, extractAndPersistDossierDoc } from '@/lib/devis-extract';
import { scanAndPersistCarteGrise } from '@/lib/scan-carte-grise';
import { isEditableDocType } from '@/lib/devis-schema';
import { logHistorique, logWorkflow } from '@/app/(app)/dossiers/[id]/log-historique';
import { DOC_CLASSES, DOC_CLASS_LABELS, PREFILL_DOC_CLASSES, UNCLASSIFIED_LABEL, confidenceBand } from '@/lib/doc-classes';
import { useTutorialMode } from '@/lib/tutorial/use-tutorial-mode';
import { cn } from '@/lib/utils';

type ItemStatus = 'uploading' | 'classifying' | 'ready' | 'error';

interface InboxItem {
  id: string;
  file: File;
  previewUrl?: string;
  status: ItemStatus;
  docId?: string;
  storagePath?: string;
  type: string;
  aiType?: string | null;
  confidence?: number | null;
  rationale?: string;
  summary?: string;
  keyText?: string;
  examplesUsed?: number;
  corrected?: boolean;
  confirmed?: boolean;
  error?: string;
}

export interface SmartInboxProps {
  dossierId: string;
  dossier?: Record<string, any> | null;
  readOnly?: boolean;
  /** Called with the files (and the first uploaded doc id) the user chose to pre-fill from. */
  onPrefill?: (files: File[], sourceDocId?: string) => Promise<void> | void;
  prefilling?: boolean;
  className?: string;
  title?: string;
  description?: string;
  /** Label of the picker button — name it by purpose (« Pré-remplir depuis un document », « Ajouter des pièces »). */
  buttonLabel?: string;
  /**
   * GOV.UK "the primary is the next thing to do": `primary` (solid teal)
   * while the tab's job is not done, `tonal` (teal tint) once it is.
   */
  emphasis?: 'primary' | 'tonal';
  /** Leading icon — defaults to an upload arrow; pass `null` for none. */
  icon?: React.ReactNode;
}

const MAX_BYTES = 15 * 1024 * 1024;
const CONCURRENCY = 3;
const DRAG_MIME = 'application/x-sl-inbox-item';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string) || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** HTML is accepted ONLY in tutorial mode: the demo kit's electronic mission
 *  order is an .html file, and the guided tour asks the user to import it.
 *  (Merge 2026-09-04 — the old dashed drop-zone widened its `accept` the same
 *  way; SmartInbox replaced it and the allowance had to come along.) */
function isAccepted(f: File, allowHtml = false): boolean {
  if (allowHtml && (/\.html?$/i.test(f.name) || f.type === 'text/html')) return true;
  return f.type.startsWith('image/') || f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
}

async function runPool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  const queue = items.slice();
  await Promise.all(
    Array.from({ length: Math.min(n, queue.length) }, async () => {
      while (queue.length) {
        const next = queue.shift()!;
        await fn(next);
      }
    }),
  );
}

export default function SmartInbox({ dossierId, dossier, readOnly, onPrefill, prefilling, className, buttonLabel = 'Choisir des fichiers', emphasis = 'tonal', icon }: SmartInboxProps) {
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const { canWrite, profile } = useCurrentUser();
  const { toast } = useToast();
  const canEdit = !readOnly && canWrite('dossiers');
  // Tutorial mode widens the picker to the demo kit's .html mission order.
  const tutorialMode = useTutorialMode();

  const [items, setItems] = useState<InboxItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [chipOver, setChipOver] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const userEmail = auth?.currentUser?.email || profile?.email || 'Admin';
  const userId = auth?.currentUser?.uid || 'unknown';
  const userName = profile ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || userEmail : userEmail;
  const hints = useMemo(
    () => ({ compagnie: dossier?.compagnie || undefined, refExpert: dossier?.refExpert || undefined, matricule: dossier?.matricule || undefined }),
    [dossier?.compagnie, dossier?.refExpert, dossier?.matricule],
  );

  const patch = useCallback((id: string, p: Partial<InboxItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }, []);

  // ── Post-processing identical to a manual slot upload ────────────────
  const postProcess = useCallback(
    async (type: string, storagePath: string, file: File) => {
      if (!db || !storage) return;
      if (isEditableDocType(type)) {
        extractAndPersistDossierDoc({ db, storage, dossierId, docType: type, storagePath, name: file.name }).catch((e) =>
          console.error('[smart-inbox] pre-extraction failed', e),
        );
        // Keep an in-flight chiffrage in sync (same rule as the typed grid).
        try {
          const snap = await getDoc(doc(db, 'dossiers', dossierId));
          const currentChiffrageId = (snap.data() as any)?.currentChiffrageId;
          if (currentChiffrageId) {
            const chiffrageRef = doc(db, 'chiffrages', currentChiffrageId);
            await updateDoc(chiffrageRef, {
              files: arrayUnion({ name: file.name, storagePath, type: 'rapport', docType: type, status: 'pending', recognizedText: null, pdfUrl: null }),
              updatedAt: serverTimestamp(),
            });
            extractAndPersistChiffrageDevis({ db, storage, chiffrageId: currentChiffrageId, docType: type as any }).catch((e) =>
              console.error('[smart-inbox] chiffrage extraction failed', e),
            );
          }
        } catch (err) {
          console.warn('[smart-inbox] chiffrage sync failed (non-fatal)', err);
        }
      }
      if (type === 'Carte grise') {
        scanAndPersistCarteGrise({ db, storage, dossierId, storagePath, contentType: file.type }).catch((e) =>
          console.error('[smart-inbox] carte-grise scan failed', e),
        );
      }
    },
    [db, storage, dossierId],
  );

  const sendFeedback = useCallback(
    async (it: InboxItem, corrected: string, kind: 'correction' | 'confirmation' | 'manual') => {
      try {
        await apiFetch('/api/classify-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dossierId,
            docId: it.docId,
            fileName: it.file.name,
            summary: it.summary || '',
            keyText: it.keyText || '',
            predicted: it.aiType ?? null,
            corrected,
            confidence: it.confidence ?? null,
            kind,
            compagnie: hints.compagnie ?? null,
          }),
        });
      } catch (err) {
        console.warn('[smart-inbox] feedback failed (non-fatal)', err);
      }
    },
    [dossierId, hints.compagnie],
  );

  const classify = useCallback(
    async (file: File): Promise<Partial<InboxItem>> => {
      const fileBase64 = await fileToBase64(file);
      const res = await apiFetch('/api/classify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, contentType: file.type || 'application/pdf', fileName: file.name, hints }),
      });
      if (!res.ok) throw new Error('Classification impossible');
      const data = await res.json();
      return {
        aiType: data.docType,
        confidence: typeof data.confidence === 'number' ? data.confidence : null,
        rationale: data.rationale,
        summary: data.summary,
        keyText: data.keyText,
        examplesUsed: data.examplesUsed,
      };
    },
    [hints],
  );

  // ── Ingest files: upload → classify → file into slot → post-process ───
  const ingest = useCallback(
    async (files: File[], forcedType?: string) => {
      if (!canEdit || !db || !storage) return;
      const accepted = files.filter((f) => isAccepted(f, tutorialMode)).filter((f) => f.size <= MAX_BYTES);
      const rejected = files.length - accepted.length;
      if (rejected > 0) toast({ variant: 'destructive', title: `${rejected} fichier(s) ignoré(s)`, description: 'PDF ou image, 15 Mo maximum.' });
      if (accepted.length === 0) return;

      const newItems: InboxItem[] = accepted.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        status: 'uploading',
        type: forcedType ?? UNCLASSIFIED_LABEL,
      }));
      setItems((prev) => [...newItems, ...prev]);

      let okCount = 0;
      await runPool(newItems, CONCURRENCY, async (it) => {
        try {
          const timestamp = Date.now() + Math.floor(Math.random() * 1000);
          const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${it.file.name}`;
          const result = await uploadFileWithOfflineSupport({
            storage,
            db,
            file: it.file,
            fileName: it.file.name,
            storagePath,
            firestoreDocPath: `dossiers/${dossierId}/documents`,
            firestoreMetadata: {
              nom: it.file.name,
              type: forcedType ?? UNCLASSIFIED_LABEL,
              taille: it.file.size,
              uploadePar: userEmail,
              uploadedBy: userId,
              uploadedByName: userName,
              storagePath,
              _localCreatedAt: timestamp,
              classifiedBy: forcedType ? 'user' : 'pending',
            },
          });
          const docId = result.docId as string | undefined;
          patch(it.id, { status: forcedType ? 'ready' : 'classifying', docId, storagePath });

          // Always ask the AI for a summary (needed as a learning example), even
          // when the user chose the class by dropping on a chip.
          let ai: Partial<InboxItem> = {};
          try {
            ai = await classify(it.file);
          } catch (err) {
            if (!forcedType) throw err;
          }
          const finalType = forcedType ?? (ai.aiType as string) ?? UNCLASSIFIED_LABEL;
          if (docId) {
            await updateDoc(doc(db, 'dossiers', dossierId, 'documents', docId), {
              type: finalType,
              aiSuggestedType: ai.aiType ?? null,
              aiConfidence: ai.confidence ?? null,
              aiSummary: ai.summary ?? null,
              classifiedBy: forcedType ? 'user' : 'ai',
              classifiedAt: serverTimestamp(),
            });
          }
          const merged: InboxItem = { ...it, ...ai, docId, storagePath, type: finalType, status: 'ready' };
          patch(it.id, { ...ai, type: finalType, status: 'ready' });
          if (forcedType) void sendFeedback(merged, forcedType, 'manual');
          if (finalType !== UNCLASSIFIED_LABEL) await postProcess(finalType, storagePath, it.file);
          okCount++;
        } catch (err: any) {
          console.error('[smart-inbox] ingest failed', err);
          patch(it.id, { status: 'error', error: err?.message || 'Échec' });
        }
      });

      if (okCount > 0 && db) {
        try {
          await logHistorique(db, dossierId, 'Upload documents', userEmail, `${okCount} document(s) déposé(s) et classé(s) par l'IA.`, 'document', profile?.nom);
          await logWorkflow(db, dossierId, 'Nouveau document ajouté', userEmail, userId, 'done', { details: `${okCount} document(s) via la boîte de dépôt` }, profile?.nom);
        } catch (err) {
          console.warn('[smart-inbox] log failed', err);
        }
      }
    },
    [canEdit, db, storage, toast, dossierId, userEmail, userId, userName, patch, classify, sendFeedback, postProcess, profile?.nom],
  );

  // ── Correction: change the class of an already-filed document ────────
  const reclassify = useCallback(
    async (it: InboxItem, newType: string) => {
      if (!db || !it.docId || newType === it.type) return;
      try {
        await updateDoc(doc(db, 'dossiers', dossierId, 'documents', it.docId), {
          type: newType,
          classifiedBy: 'user',
          classifiedAt: serverTimestamp(),
        });
        patch(it.id, { type: newType, corrected: true, confirmed: false });
        void sendFeedback(it, newType, 'correction');
        if (it.storagePath && newType !== UNCLASSIFIED_LABEL) await postProcess(newType, it.storagePath, it.file);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Correction impossible', description: err?.message });
      }
    },
    [db, dossierId, patch, sendFeedback, postProcess, toast],
  );

  const validateAll = useCallback(async () => {
    setValidating(true);
    try {
      const pending = items.filter((it) => it.status === 'ready' && !it.corrected && !it.confirmed && it.aiType && it.type === it.aiType);
      await Promise.all(pending.map((it) => sendFeedback(it, it.type, 'confirmation')));
      setItems((prev) => prev.map((it) => (pending.some((p) => p.id === it.id) ? { ...it, confirmed: true } : it)));
      toast({ title: 'Classement validé', description: pending.length > 0 ? `${pending.length} classement(s) confirmé(s) — l'IA s'en souviendra.` : 'Rien à confirmer.' });
    } finally {
      setValidating(false);
    }
  }, [items, sendFeedback, toast]);

  const prefillCandidates = useMemo(
    () => items.filter((it) => it.status === 'ready' && PREFILL_DOC_CLASSES.includes(it.type)),
    [items],
  );

  const handlePrefill = useCallback(async () => {
    if (!onPrefill || prefillCandidates.length === 0) return;
    const mission = prefillCandidates.find((it) => it.type === 'Lettre de mission') ?? prefillCandidates[0];
    await onPrefill(prefillCandidates.map((it) => it.file), mission.docId);
  }, [onPrefill, prefillCandidates]);

  const removeFromList = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  // ── Drag & drop plumbing ─────────────────────────────────────────────
  const onZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!canEdit) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) void ingest(files);
  };
  const onChipDrop = (e: React.DragEvent, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    setChipOver(null);
    setDragging(false);
    if (!canEdit) return;
    const itemId = e.dataTransfer.getData(DRAG_MIME);
    if (itemId) {
      const it = items.find((x) => x.id === itemId);
      if (it) void reclassify(it, label);
      setDraggingItemId(null);
      return;
    }
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) void ingest(files, label);
  };

  const busy = items.some((it) => it.status === 'uploading' || it.status === 'classifying');
  const ready = items.filter((it) => it.status === 'ready');
  const unconfirmed = ready.filter((it) => !it.confirmed && !it.corrected && it.aiType && it.type === it.aiType).length;

  if (!canEdit) return null;

  return (
    <section className={cn('space-y-4', className)} aria-label="Boîte de dépôt des documents">
      {/* File picker — ONE button, no banner / dashed panel / copy (user
          ruling), but it must command attention (user ruling 2026-09-01):
          full size, bold, leading icon, solid teal until the job is done.
          Still a drop target: dragging files over it lights it up. */}
      <div>
        <Button
          type="button"
          variant={emphasis === 'primary' ? 'default' : 'tonal'}
          className={cn('h-10 gap-2 px-4 font-semibold', dragging && 'ring-2 ring-primary/50')}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!draggingItemId) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onZoneDrop}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (icon === undefined ? <Upload className="h-4 w-4" /> : icon)}
          {busy ? 'Analyse en cours…' : buttonLabel}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={tutorialMode ? '.pdf,image/*,.html,.htm' : '.pdf,image/*'}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) void ingest(files);
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
      </div>

      {/* Class chips — drop targets for corrections and manual labelling.
          Only shown while there is something to classify (keeps the idle
          footprint to the single strip above). */}
      {(items.length > 0 || draggingItemId) && (
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Classes de documents">
        <span className="t-label mr-1">
          {draggingItemId ? 'Déposez sur la bonne classe' : 'Glissez un fichier sur une classe pour le classer vous-même'}
        </span>
        {DOC_CLASSES.map((c) => (
          <button
            key={c.label}
            type="button"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setChipOver(c.label); }}
            onDragLeave={() => setChipOver((v) => (v === c.label ? null : v))}
            onDrop={(e) => onChipDrop(e, c.label)}
            onClick={() => inputRef.current?.click()}
            title={c.description}
            className={cn(
              'h-7 rounded-full border px-2.5 text-xs transition-colors',
              chipOver === c.label ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground',
              draggingItemId && 'border-dashed',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      )}

      {/* Queue */}
      {items.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-card">
          <ul className="divide-y divide-border/70">
            {items.map((it) => {
              const band = confidenceBand(it.confidence);
              const isImg = it.file.type.startsWith('image/');
              return (
                <li
                  key={it.id}
                  draggable={it.status === 'ready'}
                  onDragStart={(e) => { e.dataTransfer.setData(DRAG_MIME, it.id); e.dataTransfer.effectAllowed = 'move'; setDraggingItemId(it.id); }}
                  onDragEnd={() => setDraggingItemId(null)}
                  className={cn('flex items-center gap-3 px-3 py-2', it.status === 'ready' && 'cursor-grab active:cursor-grabbing', it.status === 'error' && 'bg-status-danger-bg/40')}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {it.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
                    ) : isImg ? (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={it.file.name}>{it.file.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {it.status === 'uploading' && 'Envoi…'}
                      {it.status === 'classifying' && "Analyse par l'IA…"}
                      {it.status === 'error' && (it.error || 'Échec')}
                      {it.status === 'ready' && (it.rationale || (it.aiType ? `Proposé : ${it.aiType}` : 'Classé manuellement'))}
                      {it.status === 'ready' && typeof it.examplesUsed === 'number' && it.examplesUsed > 0 && ` · ${it.examplesUsed} exemple(s) appris utilisé(s)`}
                    </p>
                  </div>
                  {it.status === 'ready' && (
                    <>
                      {it.confidence != null && !it.corrected && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                'hidden h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium sm:inline-flex',
                                band === 'high' && 'bg-status-success-bg text-status-success-fg',
                                band === 'medium' && 'bg-status-warning-bg text-status-warning-fg',
                                band === 'low' && 'bg-status-danger-bg text-status-danger-fg',
                              )}
                            >
                              {band === 'low' && <AlertTriangle className="h-3 w-3" />}
                              {band === 'high' ? 'Sûr' : band === 'medium' ? 'À vérifier' : 'Incertain'}
                              <span className="tabular-nums opacity-70">{Math.round((it.confidence ?? 0) * 100)}%</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Confiance de l&apos;IA. Corrigez la classe si nécessaire — elle s&apos;en souviendra.</TooltipContent>
                        </Tooltip>
                      )}
                      {it.corrected && (
                        <span className="hidden h-6 shrink-0 items-center rounded-full bg-status-info-bg px-2 text-[11px] font-medium text-status-info-fg sm:inline-flex">Corrigé</span>
                      )}
                      {it.confirmed && <Check className="h-4 w-4 shrink-0 text-status-success-fg" aria-label="Confirmé" />}
                      <Select value={DOC_CLASS_LABELS.includes(it.type) ? it.type : UNCLASSIFIED_LABEL} onValueChange={(v) => reclassify(it, v)}>
                        <SelectTrigger className="h-8 w-[200px] shrink-0 text-xs" aria-label={`Classe de ${it.file.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {!DOC_CLASS_LABELS.includes(it.type) && <SelectItem value={UNCLASSIFIED_LABEL}>{UNCLASSIFIED_LABEL}</SelectItem>}
                          {DOC_CLASSES.map((c) => (
                            <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  {(it.status === 'uploading' || it.status === 'classifying') && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={() => removeFromList(it.id)} aria-label="Retirer de la liste" title="Retirer de la liste (le document reste dans le dossier)">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {ready.length} document{ready.length > 1 ? 's' : ''} classé{ready.length > 1 ? 's' : ''}
              {unconfirmed > 0 && ` · ${unconfirmed} à confirmer`}
            </p>
            <div className="flex items-center gap-2">
              {onPrefill && (
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" disabled={prefillCandidates.length === 0 || !!prefilling || busy} onClick={handlePrefill}>
                  {prefilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
                  Pré-remplir les informations{prefillCandidates.length > 0 ? ` (${prefillCandidates.length})` : ''}
                </Button>
              )}
              <Button type="button" size="sm" className="h-8 gap-1.5" disabled={unconfirmed === 0 || validating || busy} onClick={validateAll}>
                {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Tout valider
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
