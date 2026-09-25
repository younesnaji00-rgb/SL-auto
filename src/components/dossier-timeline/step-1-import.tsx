'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc as firestoreDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
  type DocumentReference,
} from 'firebase/firestore';
import { deleteObject, ref as storageRef } from 'firebase/storage';
import { Check, Eye, FileIcon, FileText, Loader2, RefreshCw, ScanSearch, Trash2, Upload } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentPreviewLightbox } from '@/components/document-preview-lightbox';
import { useToast } from '@/hooks/use-toast';
import { useT, dateFnsLocale } from '@/i18n';
import { useFirestore, useStorage, useAuth, useDoc, useCollection } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { apiFetch } from '@/lib/api-fetch';
import { logHistorique, logWorkflow } from '@/app/(app)/dossiers/[id]/log-historique';
import { useDossierDocWrite } from '@/app/(app)/dossiers/[id]/rappel-draft';
import { cn } from '@/lib/utils';
import { useReplayHighlight, highlightClass, ChangeBadge } from '@/components/dossier-timeline/replay-highlight';
import SmartInbox from './smart-inbox';
import { emitPrefillFlash } from '@/hooks/use-prefill-flash';
import { findDossierWithRefExpert, normalizeRefExpert } from '@/lib/ref-expert-unique';
import { logFrontend } from '@/lib/debug-log';

export interface Step1ImportProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
  /**
   * One-row mode for the "Création de mission" step: the SmartInbox picker
   * plus a one-line status (no card, no thumbnail — the Informations pane
   * shows the source document beside the form). Default `false` keeps the
   * full card for other callers.
   */
  compact?: boolean;
  /**
   * Replay (« Avant » pane of the rappel comparison): the frozen import
   * document to render instead of subscribing to the live one. `undefined`
   * keeps the live behaviour (default); `null` means no import document
   * existed at snapshot time.
   */
  importDocOverride?: any | null;
}

// Date fields that must be stored as Firestore Timestamps to stay consistent
// with the rest of the dossier document.
const DATE_FIELDS: Record<string, 'timestamp' | 'iso'> = {
  dateOfLoss: 'timestamp',
  dateOfRequest: 'timestamp',
  dateOfMEC: 'iso',
  insuranceValidUntil: 'timestamp',
};

// Maps AI scan keys (defined in /api/scan-document) to the Firestore dossier
// field names used across the app. Nested targets use dotted paths so
// updateDoc can merge-write into the sub-object without clobbering siblings.
const FIELD_MAP: Record<string, string> = {
  // Flat dossier fields
  company: 'compagnie',
  dossierType: 'typeDossier',
  nature: 'nature',
  registration: 'matricule',
  policyNumber: 'policeNumber',
  companyRef: 'referenceCompagnie',
  repairerType: 'repairerType',
  garageName: 'garageName',
  dateOfLoss: 'dateSinistre',
  dateOfRequest: 'dateRequete',
  intermediaryName: 'intermediaireNom',
  intermediaryEmail: 'intermediaireEmail',
  refExpert: 'refExpert',
  product: 'produit',
  insuranceValidUntil: 'dateValiditeAssurance',
  // Assuré (nested)
  insuredName: 'assure.nom',
  insuredPhone: 'assure.telephone',
  insuredSubscriber: 'assure.souscripteur',
  insuredCardHolder: 'assure.titulaireCarteGrise',
  insuredAddress: 'assure.adresse',
  // Véhicule (nested)
  brand: 'vehicule.marque',
  model: 'vehicule.modele',
  chassisNumber: 'vehicule.serie',
  fuelType: 'vehicule.energie',
  fiscalPower: 'vehicule.puissance',
  dateOfMEC: 'vehicule.mec',
  mileage: 'vehicule.km',
  vehicleNewValue: 'vehicule.valeurNeuf',
  vehicleUsage: 'vehicule.usage',
  // Partie adverse (nested)
  adversaireAssure: 'partieAdverse.assure',
  adversaireMatricule: 'partieAdverse.matricule',
  adversaireMarque: 'partieAdverse.marque',
  adversairePolice: 'partieAdverse.police',
  adversaireCompagnie: 'partieAdverse.compagnie',
};

// Reads a possibly-dotted path from a plain object.
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

// True if the value is empty-ish for our "don't overwrite populated field" rule.
function isEmpty(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

function formatDate(ts: any, pattern = 'dd/MM/yyyy HH:mm'): string {
  if (!ts) return '';
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, pattern, { locale: dateFnsLocale() });
  } catch {
    return '';
  }
}

export default function Step1Import({
  dossierId,
  dossier,
  dossierRef,
  readOnly,
  compact = false,
  importDocOverride,
}: Step1ImportProps) {
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const { canWrite, canDelete, profile } = useCurrentUser();
  const isPhone = useIsPhone();
  const { toast } = useToast();
  const t = useT();

  const canEdit = !readOnly && canWrite('dossiers');
  // Inert on the live page; tints the import source doc in the rappel replica.
  const hl = useReplayHighlight();
  // Rappel session: the AI pre-fill writes onto the dossier are buffered
  // until « Sauvegarder » (the uploaded file itself is stored immediately).
  const { write: writeDossierDoc, buffered, draft } = useDossierDocWrite(dossierId);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isDeletingImport, setIsDeletingImport] = useState(false);
  const [lastFilledCount, setLastFilledCount] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nom: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1 shows ONLY the one document that produced the AI pre-fill. Other
  // uploads live in Step 4 (Pièces jointes). The reference is stored on the
  // dossier as `importDocId`.
  const importDocId: string | undefined = dossier?.importDocId || undefined;

  // Every stored document: a drop-list row whose document was deleted
  // elsewhere leaves the list (SmartInbox `storedDocIds`, QA bug 041).
  const storedDocsQuery = useMemo(
    () => (db && dossierId && importDocOverride === undefined ? collection(db, 'dossiers', dossierId, 'documents') : null),
    [db, dossierId, importDocOverride],
  );
  const { data: storedDocs } = useCollection<any>(storedDocsQuery);
  const storedDocIds = useMemo(
    () => (storedDocs ? new Set<string>(storedDocs.map((d: any) => String(d.id))) : null),
    [storedDocs],
  );
  const importDocRef = useMemo(() => {
    if (importDocOverride !== undefined) return null; // replay: frozen data, no live read
    if (!db || !dossierId || !importDocId) return null;
    return firestoreDoc(db, 'dossiers', dossierId, 'documents', importDocId);
  }, [db, dossierId, importDocId, importDocOverride]);
  const { data: liveImportDoc, loading: liveImportDocLoading } = useDoc<any>(importDocRef);
  const importDoc = importDocOverride !== undefined ? importDocOverride : liveImportDoc;
  const importDocLoading = importDocOverride !== undefined ? false : liveImportDocLoading;

  const runScanAndMerge = useCallback(
    async (
      files: File[],
      userEmail: string,
      sourceDocId: string | undefined
    ) => {
      setIsScanning(true);
      try {
        const payload = await Promise.all(
          files.map(async (file) => {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
              reader.onload = () =>
                resolve((reader.result as string).split(',')[1] || '');
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            return { fileBase64: base64, contentType: file.type };
          })
        );

        const response = await apiFetch('/api/scan-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: payload }),
        });

        if (!response.ok) throw new Error(t('Erreur lors du scan'));
        const { data, fieldsFound } = await response.json();

        if (!data || !fieldsFound) {
          toast({
            title: t('Aucune donnée extraite'),
            description:
              t("L'IA n'a pas pu extraire d'informations de ce document."),
          });
          setLastFilledCount(0);
          // Still mark this as the scan source so Step 1 shows which document
          // was inspected by the AI (even if nothing could be extracted).
          if (sourceDocId) {
            try {
              await writeDossierDoc({
                importDocId: sourceDocId,
                importDocScannedAt: serverTimestamp(),
              });
            } catch (markErr) {
              console.warn(
                '[Step1Import] failed to record importDocId after empty scan:',
                markErr
              );
            }
          }
          return;
        }

        // Build the update. Every extracted value is written: empty fields
        // are filled, populated fields are overwritten. The previous values
        // of overwritten fields are stored on the dossier under
        // `lastImportOverwrites` so the user can see what changed.
        const updates: Record<string, any> = {};
        const filledFields: string[] = [];
        const overwrittenFields: { field: string; previousValue: any }[] = [];
        // QA bug 002: a scanned Réf. expert that another dossier already
        // carries is NOT copied — the same mission letter scanned twice must
        // not produce two dossiers with one reference.
        let duplicateRef: string | null = null;

        for (const [scanKey, rawValue] of Object.entries(data)) {
          const target = FIELD_MAP[scanKey];
          if (!target) continue;
          if (rawValue === null || rawValue === undefined) continue;
          if (typeof rawValue === 'string' && rawValue.trim() === '') continue;

          let finalValue: any = rawValue;
          const dateKind = DATE_FIELDS[scanKey];
          if (dateKind && typeof rawValue === 'string') {
            const parsed = new Date(rawValue);
            if (Number.isNaN(parsed.getTime())) continue;
            finalValue =
              dateKind === 'iso'
                ? parsed.toISOString()
                : Timestamp.fromDate(parsed);
          } else if (typeof rawValue === 'string') {
            finalValue = rawValue.trim();
          }

          if (target === 'refExpert' && db) {
            const ref = String(finalValue).trim();
            const current = String(dossier?.refExpert || '').trim();
            if (ref && ref !== current && (await findDossierWithRefExpert(db, ref, dossierId))) {
              duplicateRef = ref;
              continue;
            }
          }
          const existing = readPath(dossier, target);
          updates[target] = finalValue;
          // The reference travels with its normalised key (QA bug 002).
          if (target === 'refExpert') updates.refExpertKey = normalizeRefExpert(finalValue);
          // Mark provenance for the two date fields the Dates clés UI uses to
          // gate read-only display (see historique-tab.tsx AI_SOURCED_DATE_FIELDS).
          if (target === 'dateSinistre' || target === 'dateRequete') {
            updates[`${target}Source`] = 'ai';
          }
          if (isEmpty(existing)) {
            filledFields.push(target);
          } else {
            overwrittenFields.push({ field: target, previousValue: existing ?? null });
          }
        }

        const written = filledFields.length + overwrittenFields.length;

        logFrontend('step-1-import ← /api/scan-document', {
          fieldsFound,
          written,
          filledFields,
          overwrittenFields,
          duplicateRef,
          ...updates,
        });

        if (overwrittenFields.length > 0) {
          updates.lastImportOverwrites = overwrittenFields;
          updates.lastImportOverwriteAt = serverTimestamp();
        } else {
          updates.lastImportOverwrites = deleteField();
          updates.lastImportOverwriteAt = deleteField();
        }
        // Fields the scan created from nothing — « Retirer » on the source
        // document empties these and restores the overwritten ones above.
        updates.lastImportFilled = filledFields.length > 0 ? filledFields : deleteField();

        // Record the scanned document as Step 1's single source, whether or
        // not any field was actually written (user may have pre-filled
        // everything by hand — the doc is still the AI-scan entry point).
        if (sourceDocId) {
          updates.importDocId = sourceDocId;
          updates.importDocScannedAt = serverTimestamp();
        }

        if (written > 0 || sourceDocId) {
          updates.updatedAt = serverTimestamp();
          await writeDossierDoc(updates);
          if (db && written > 0) {
            const parts = [
              filledFields.length > 0
                ? `${filledFields.length} champ(s) pré-rempli(s)`
                : null,
              overwrittenFields.length > 0
                ? `${overwrittenFields.length} champ(s) écrasé(s) (${overwrittenFields
                    .map((o) => o.field)
                    .join(', ')})`
                : null,
            ].filter(Boolean);
            const logArgs = [
              'Import document IA',
              userEmail,
              `${parts.join(' ; ')} par l'IA depuis les documents importés.`,
              'document',
              profile?.nom,
            ];
            if (buffered) {
              draft.bufferLog({ kind: 'historique', args: logArgs });
            } else {
              // Not awaited: the fields are already on screen, and holding
              // the spinner for the audit entry's acknowledgement read as a
              // scan that never finished (QA 042).
              logHistorique(db, dossierId, ...(logArgs as [string, string, string, string, string | undefined]))
                .catch((e) => console.error('[Step1Import] historique:', e));
            }
          }
        }
        if (duplicateRef) {
          toast({
            variant: 'destructive',
            title: t('Réf. expert déjà utilisée'),
            description: `« ${duplicateRef} » ${t('appartient déjà à un autre dossier — la référence n’a pas été reprise.')}`,
          });
        }
        setLastFilledCount(written);
        // Teal value-change fade on every field the scan just wrote
        // (owner option B1; motion-spec §8).
        emitPrefillFlash(dossierId, [
          ...filledFields,
          ...overwrittenFields.map((o) => o.field),
        ]);
        const toastParts = [
          filledFields.length > 0
            ? `${filledFields.length} ${t('champ(s) pré-rempli(s)')}`
            : null,
          overwrittenFields.length > 0
            ? `${overwrittenFields.length} ${t('écrasé(s)')}`
            : null,
        ].filter(Boolean);
        toast({
          title: t('Scan terminé'),
          description:
            written > 0
              ? `${toastParts.join(', ')}. ${t("Vérifiez à l'étape Information.")}${buffered ? ` ${t('(Publié après « Sauvegarder » — rappel en cours.)')}` : ''}`
              : t("Aucune valeur extraite par l'IA."),
        });
      } catch (err: any) {
        console.error('[Step1Import] scan error:', err);
        toast({
          variant: 'destructive',
          title: t('Erreur de scan'),
          description: err?.message || t('Impossible de scanner le document.'),
        });
      } finally {
        setIsScanning(false);
      }
    },
    [db, dossier, dossierId, dossierRef, toast, writeDossierDoc, buffered, draft, profile?.nom, t]
  );

  const handleDeleteImportDoc = useCallback(async () => {
    if (!importDocRef || !db) return;
    if (
      !window.confirm(
        t('Supprimer ce document et permettre un nouveau scan ?')
      )
    )
      return;
    const userEmail = auth?.currentUser?.email || 'Utilisateur';
    setIsDeletingImport(true);
    try {
      // The file goes too: « Retirer » removes the source altogether.
      const sourcePath: string | undefined = (importDoc as any)?.storagePath || undefined;
      if (sourcePath && storage) {
        await deleteObject(storageRef(storage, sourcePath)).catch((err) =>
          console.warn('[Step1Import] source file already missing or blocked by rules:', err),
        );
      }
      await deleteDoc(importDocRef);
      // Undo what the scan wrote: values it overwrote go back to their
      // previous state, values it created are cleared. Removing the source
      // used to leave every AI-filled field in place as if the document were
      // still there (QA bug 011).
      const revert: Record<string, any> = {
        importDocId: deleteField(),
        importDocScannedAt: deleteField(),
        lastImportOverwrites: deleteField(),
        lastImportOverwriteAt: deleteField(),
        lastImportFilled: deleteField(),
      };
      const overwrites: { field: string; previousValue: any }[] = Array.isArray(dossier?.lastImportOverwrites) ? dossier.lastImportOverwrites : [];
      for (const o of overwrites) {
        if (!o?.field) continue;
        revert[o.field] = o.previousValue === undefined ? null : o.previousValue;
      }
      const filled: string[] = Array.isArray(dossier?.lastImportFilled) ? dossier.lastImportFilled : [];
      for (const field of filled) {
        if (typeof field !== 'string' || !field) continue;
        revert[field] = deleteField();
      }
      for (const field of [...overwrites.map((o) => o?.field), ...filled]) {
        if (field === 'dateSinistre' || field === 'dateRequete') revert[`${field}Source`] = deleteField();
      }
      await writeDossierDoc(revert);
      setLastFilledCount(null);
      if (buffered) {
        draft.bufferLog({
          kind: 'historique',
          args: ['Suppression document source IA', userEmail, 'Document source supprimé pour nouveau scan', 'document', profile?.nom],
        });
      } else {
        await logHistorique(
          db,
          dossierId,
          'Suppression document source IA',
          userEmail,
          'Document source supprimé pour nouveau scan',
          'document',
          profile?.nom,
        );
      }
      toast({
        title: t('Document source supprimé'),
        description: t('Les champs pré-remplis depuis ce document ont été rétablis.'),
      });
    } catch (err: any) {
      console.error('[Step1Import] delete import doc error:', err);
      toast({
        variant: 'destructive',
        title: t('Erreur lors de la suppression'),
        description: err?.message || t('Impossible de supprimer le document.'),
      });
    } finally {
      setIsDeletingImport(false);
    }
  }, [db, storage, dossierId, dossierRef, importDocRef, importDoc, toast, auth, writeDossierDoc, buffered, draft, profile?.nom, t]);

  // ✕ in the drop list deletes the document altogether (owner ruling
  // 2026-09-25): the file and its record — and, for the document the pre-fill
  // ran from, the values the scan wrote (the « Retirer » path above). No
  // « Pré-remplir depuis « … » » is left pointing at it.
  const deleteDroppedDoc = useCallback(
    async ({ docId, storagePath, name }: { docId: string; storagePath?: string; name: string }) => {
      if (!db || !dossierId || !docId) return;
      if (docId === importDocId) {
        await handleDeleteImportDoc();
        return;
      }
      const userEmail = auth?.currentUser?.email || 'Utilisateur';
      try {
        if (storagePath && storage) {
          await deleteObject(storageRef(storage, storagePath)).catch((err) =>
            console.warn('[Step1Import] file already missing or blocked by rules:', err),
          );
        }
        await deleteDoc(firestoreDoc(db, 'dossiers', dossierId, 'documents', docId));
      } catch (err: any) {
        console.error('[Step1Import] delete dropped doc error:', err);
        toast({
          variant: 'destructive',
          title: t('Erreur lors de la suppression'),
          description: err?.message || t('Impossible de supprimer le document.'),
        });
        return;
      }
      toast({ title: t('Document supprimé'), description: name });
      const details = `Document "${name}" supprimé.`;
      if (buffered) {
        draft.bufferLog({ kind: 'historique', args: ['Suppression document', userEmail, details, 'document', profile?.nom] });
      } else {
        await logHistorique(db, dossierId, 'Suppression document', userEmail, details, 'document', profile?.nom).catch((err) =>
          console.warn('[Step1Import] history log failed (non-fatal):', err),
        );
      }
    },
    [db, storage, dossierId, importDocId, handleDeleteImportDoc, auth, buffered, draft, profile?.nom, toast, t],
  );

  const busy = isUploading || isScanning;

  // Re-run the AI pre-fill from the source document already in Storage
  // (« Pré-remplir à nouveau »).
  const scanStoredDoc = useCallback(async (d: any) => {
    const url: string | undefined = d?.url || undefined;
    if (!url || d?.pendingUpload || !d?.id) return;
    const userEmail = auth?.currentUser?.email || 'Admin';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const name: string = d?.nom || d?.fileName || 'document';
      const file = new File([blob], name, { type: blob.type || d?.contentType || 'application/octet-stream' });
      await runScanAndMerge([file], userEmail, d.id);
    } catch (err: any) {
      console.error('[Step1Import] stored-doc scan error:', err);
      toast({
        variant: 'destructive',
        title: t('Erreur de scan'),
        description: err?.message || t('Impossible de relire le document source.'),
      });
    }
  }, [auth, runScanAndMerge, toast, t]);
  const handleRescanImportDoc = useCallback(() => scanStoredDoc({ ...(importDoc as any), id: importDocId }), [scanStoredDoc, importDoc, importDocId]);
  const hasImportDoc = Boolean(importDocId);

  const lightbox = (
    <DocumentPreviewLightbox
      doc={previewDoc}
      dataTour="dosd-import-preview"
      onClose={() => setPreviewDoc(null)}
      onDelete={() => {
        handleDeleteImportDoc();
        setPreviewDoc(null);
      }}
    />
  );

  if (compact) {
    const d: any = importDoc;
    const name: string = d?.nom || d?.fileName || 'document';
    const day = formatDate(d?.dateUpload || d?.uploadedAt, 'dd/MM/yyyy');
    const url: string | undefined = d?.url || undefined;
    const canPreview = Boolean(url) && !d?.pendingUpload;
    return (
      <div className="flex flex-wrap items-center gap-3">
        {canEdit && (
          <SmartInbox
            // Phone (Phone.dc.html): always the tonal, full-width button —
            // the filled primary is reserved for the bottom action bar.
            className="min-w-0 flex-[1_1_20rem] max-md:w-full max-md:[&>div>button]:w-full"
            dossierId={dossierId}
            dossier={dossier}
            readOnly={readOnly}
            prefilling={isScanning}
            buttonLabel={t('Pré-remplir depuis un document')}
            emphasis={isPhone || hasImportDoc ? 'tonal' : 'primary'}
            icon={null}
            storedDocIds={storedDocIds}
            onRemove={deleteDroppedDoc}
            onPrefill={async (files, sourceDocId) => {
              const userEmail = auth?.currentUser?.email || 'Admin';
              await runScanAndMerge(files, userEmail, sourceDocId);
            }}
          />
        )}
        {!hasImportDoc ? (
          // Only the drop list pre-fills (owner ruling 2026-09-25): a document
          // already stored — a pièce, or a source removed from the list — is
          // never offered here as « Pré-remplir depuis « … » ».
          <span className="t-caption text-ink-3">
            {t('Déposez la lettre de mission pour pré-remplir les informations.')}
          </span>
        ) : importDocLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-3" aria-label={t('Chargement du document source')} />
        ) : !importDoc ? (
          <span className="t-caption text-ink-3">{t('Document source introuvable.')}</span>
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Check className="h-4 w-4 shrink-0 text-status-success-fg" aria-hidden />
            <span className="t-caption truncate" title={name}>
              {t('Pré-rempli depuis')} {name}
              {day ? ` · ${day}` : ''}
            </span>
            {d?.pendingUpload && (
              <span className="rounded-full bg-status-warning-bg px-1.5 py-0.5 text-[11px] text-status-warning-fg">{t('En attente')}</span>
            )}
            {canPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-ink-3 hover:text-ink max-md:h-11 max-md:px-3 max-md:text-[14px]"
                onClick={() => setPreviewDoc({ url: url as string, nom: name })}
              >
                <Eye className="h-3.5 w-3.5" /> {t('Aperçu')}
              </Button>
            )}
            {canPreview && canEdit && !readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-ink-3 hover:text-ink max-md:h-11 max-md:px-3 max-md:text-[14px]"
                onClick={handleRescanImportDoc}
                disabled={busy || isDeletingImport}
                title={t('Relancer le pré-remplissage depuis ce document')}
              >
                {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {t('Pré-remplir à nouveau')}
              </Button>
            )}
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-ink-3 hover:text-destructive max-md:h-11 max-md:px-3 max-md:text-[14px]"
                onClick={handleDeleteImportDoc}
                disabled={isDeletingImport || busy}
                title={t('Supprimer pour nouveau scan')}
              >
                {isDeletingImport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {t('Retirer')}
              </Button>
            )}
          </div>
        )}
        {lightbox}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        // `dosd-import-drop` (tour anchor) used to sit on the dashed drop
        // Card; the « Boîte de dépôt » picker replaced it, so the anchor
        // rides the picker.
        <div data-tour="dosd-import-drop">
          <SmartInbox
            dossierId={dossierId}
            dossier={dossier}
            readOnly={readOnly}
            prefilling={isScanning}
            storedDocIds={storedDocIds}
            onRemove={deleteDroppedDoc}
            onPrefill={async (files, sourceDocId) => {
              const userEmail = auth?.currentUser?.email || 'Admin';
              await runScanAndMerge(files, userEmail, sourceDocId);
            }}
          />
        </div>
      )}

      {lastFilledCount !== null && lastFilledCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-status-warning-bg p-3 text-sm text-status-warning-fg">
          <ScanSearch className="h-4 w-4 shrink-0" />
          <span>
            <strong>{lastFilledCount} {t('champ(s)')}</strong>{' '}
            {t("pré-rempli(s) par l'IA. Vérifiez à l'étape Information.")}
          </span>
        </div>
      )}

      {/* Summary card — Step 1 only shows the single AI-scan source document.
          All other attachments live in Step 4 (Pièces jointes). */}
      {/* Step 1 lives inside the active-step paper (timeline.tsx), so this is
          a hairline-separated block rather than a nested tonal card. */}
      <Card variant="outline">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="t-heading flex items-center gap-2">
              {t('Document source du pré-remplissage')}
              {hasImportDoc && (
                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-2">1</span>
              )}
            </h3>
          </div>

          {!hasImportDoc ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <FileText className="h-10 w-10 text-ink-4" />
              <p className="t-heading">{t('Aucun document importé')}</p>
              <p className="t-caption max-w-[48ch]">
                {t("Déposez votre lettre de mission, constat ou document d'assurance pour lancer le pré-remplissage par l'IA.")}
              </p>
            </div>
          ) : importDocLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
            </div>
          ) : !importDoc ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <FileText className="h-8 w-8 text-ink-4" />
              <p className="t-heading">{t('Document source introuvable')}</p>
              <p className="t-caption max-w-[48ch]">
                {t("Il a peut-être été supprimé depuis l'étape Pièces jointes.")}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {(() => {
                const d: any = importDoc;
                const name = d.nom || d.fileName || 'document';
                const by = d.uploadePar || d.uploadedBy || '—';
                const when = formatDate(d.dateUpload || d.uploadedAt);
                const url: string | undefined = d.url || undefined;
                const canPreview = Boolean(url) && !d.pendingUpload;
                const replayStatus = hl.statusForEntry('documents', d.id || importDocId || '');
                return (
                  <li
                    key={d.id || importDocId}
                    className={cn("flex items-center gap-3 rounded-md px-1 py-2 text-sm", highlightClass(replayStatus))}
                  >
                    <FileIcon className="h-4 w-4 shrink-0 text-ink-3" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-medium text-ink" title={name}>
                        <span className="truncate">{name}</span>
                        <ChangeBadge status={replayStatus} className="shrink-0" />
                      </p>
                      <p className="t-caption truncate">
                        {by}
                        {when ? ` · ${when}` : ''}
                      </p>
                    </div>
                    {d.pendingUpload && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-transparent bg-status-warning-bg text-[11px] text-status-warning-fg"
                      >
                        {t('En attente')}
                      </Badge>
                    )}
                    {canPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-ink-3 hover:text-ink max-md:h-11 max-md:w-11"
                        data-tour="dosd-import-eye"
                        aria-label={t('Aperçu')}
                        onClick={() => setPreviewDoc({ url: url as string, nom: name })}
                        title={t('Aperçu')}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive max-md:h-11 max-md:w-11"
                        aria-label={t('Supprimer pour nouveau scan')}
                        onClick={handleDeleteImportDoc}
                        disabled={isDeletingImport}
                        title={t('Supprimer pour nouveau scan')}
                      >
                        {isDeletingImport ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </li>
                );
              })()}
            </ul>
          )}

          {hasImportDoc && (
            <p className="t-caption mt-4">
              {t("Les autres pièces jointes sont gérées dans l'étape 4 « Pièces jointes ».")}
            </p>
          )}
        </CardContent>
      </Card>

      {lightbox}
    </div>
  );
}
