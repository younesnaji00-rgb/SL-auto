'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  doc as firestoreDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type DocumentReference,
} from 'firebase/firestore';
import { Eye, FileIcon, FileText, Loader2, ScanSearch, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage, useAuth, useDoc } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { logHistorique, logWorkflow } from '@/app/(app)/dossiers/[id]/log-historique';
import { cn } from '@/lib/utils';

export interface Step1ImportProps {
  dossierId: string;
  dossier: Record<string, any> | null | undefined;
  dossierRef: DocumentReference;
  readOnly?: boolean;
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

function formatDate(ts: any): string {
  if (!ts) return '';
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return '';
  }
}

export default function Step1Import({
  dossierId,
  dossier,
  dossierRef,
  readOnly,
}: Step1ImportProps) {
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const { canWrite } = useCurrentUser();
  const { toast } = useToast();

  const canEdit = !readOnly && canWrite('dossiers');

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastFilledCount, setLastFilledCount] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nom: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1 shows ONLY the one document that produced the AI pre-fill. Other
  // uploads live in Step 4 (Pièces jointes). The reference is stored on the
  // dossier as `importDocId`.
  const importDocId: string | undefined = dossier?.importDocId || undefined;

  const importDocRef = useMemo(() => {
    if (!db || !dossierId || !importDocId) return null;
    return firestoreDoc(db, 'dossiers', dossierId, 'documents', importDocId);
  }, [db, dossierId, importDocId]);
  const { data: importDoc, loading: importDocLoading } = useDoc<any>(importDocRef);

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

        const response = await fetch('/api/scan-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: payload }),
        });

        if (!response.ok) throw new Error('Erreur lors du scan');
        const { data, fieldsFound } = await response.json();

        if (!data || !fieldsFound) {
          toast({
            title: 'Aucune donnée extraite',
            description:
              "L'IA n'a pas pu extraire d'informations de ce document.",
          });
          setLastFilledCount(0);
          // Still mark this as the scan source so Step 1 shows which document
          // was inspected by the AI (even if nothing could be extracted).
          if (sourceDocId) {
            try {
              await updateDoc(dossierRef, {
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

        // Build a merge-style update that only writes fields that are
        // currently empty on the dossier — never overwrite user input.
        const updates: Record<string, any> = {};
        let written = 0;

        for (const [scanKey, rawValue] of Object.entries(data)) {
          const target = FIELD_MAP[scanKey];
          if (!target) continue;
          if (rawValue === null || rawValue === undefined) continue;
          if (typeof rawValue === 'string' && rawValue.trim() === '') continue;

          const existing = readPath(dossier, target);
          if (!isEmpty(existing)) continue;

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

          updates[target] = finalValue;
          written += 1;
        }

        // Record the scanned document as Step 1's single source, whether or
        // not any field was actually written (user may have pre-filled
        // everything by hand — the doc is still the AI-scan entry point).
        if (sourceDocId) {
          updates.importDocId = sourceDocId;
          updates.importDocScannedAt = serverTimestamp();
        }

        if (written > 0 || sourceDocId) {
          updates.updatedAt = serverTimestamp();
          await updateDoc(dossierRef, updates);
          if (db && written > 0) {
            await logHistorique(
              db,
              dossierId,
              'Import document IA',
              userEmail,
              `${written} champ(s) pré-rempli(s) par l'IA depuis les documents importés.`,
              'document'
            );
          }
        }
        setLastFilledCount(written);
        toast({
          title: 'Scan terminé',
          description:
            written > 0
              ? `${written} champ(s) vide(s) pré-rempli(s). Vérifiez à l'étape Information.`
              : "Aucun champ vide n'a pu être pré-rempli (champs déjà saisis).",
        });
      } catch (err: any) {
        console.error('[Step1Import] scan error:', err);
        toast({
          variant: 'destructive',
          title: 'Erreur de scan',
          description: err?.message || 'Impossible de scanner le document.',
        });
      } finally {
        setIsScanning(false);
      }
    },
    [db, dossier, dossierId, dossierRef, toast]
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!canEdit || files.length === 0) return;
      if (!db || !storage) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Services Firebase non disponibles.',
        });
        return;
      }
      const userEmail = auth?.currentUser?.email || 'Admin';
      const userId = auth?.currentUser?.uid || 'unknown';

      setIsUploading(true);
      // The id of the FIRST successfully-uploaded doc becomes the scan source.
      // Step 1 shows a single source document; additional files (rare in this
      // step, but possible via multi-select) will simply land in the
      // dossier's documents collection and be visible from Step 4.
      let firstDocId: string | undefined;
      try {
        for (const file of files) {
          const timestamp = Date.now();
          const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${file.name}`;
          const result = await uploadFileWithOfflineSupport({
            storage,
            db,
            file,
            fileName: file.name,
            storagePath,
            firestoreDocPath: `dossiers/${dossierId}/documents`,
            firestoreMetadata: {
              nom: file.name,
              type: 'Import',
              taille: file.size,
              uploadePar: userEmail,
              storagePath,
              _localCreatedAt: timestamp,
            },
          });
          if (!firstDocId && result.docId) firstDocId = result.docId;
          await logHistorique(
            db,
            dossierId,
            'Upload document',
            userEmail,
            `Document "${file.name}" importé via l'étape 1.`,
            'document'
          );
          await logWorkflow(
            db,
            dossierId,
            'Import document',
            userEmail,
            userId,
            'done',
            { details: `Document "${file.name}" ajouté` }
          );
        }

        toast({
          title:
            files.length === 1
              ? 'Document importé'
              : `${files.length} documents importés`,
        });

        // Scan all uploaded files in one go. Pass the first uploaded doc id
        // so the merge step can stamp it as Step 1's source document.
        await runScanAndMerge(files, userEmail, firstDocId);
      } catch (err: any) {
        console.error('[Step1Import] upload error:', err);
        toast({
          variant: 'destructive',
          title: "Erreur lors de l'import",
          description: err?.message || 'Une erreur inconnue est survenue.',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [auth, canEdit, db, dossierId, runScanAndMerge, storage, toast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!canEdit) return;
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) void handleFiles(files);
    },
    [canEdit, handleFiles]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (canEdit) setIsDragging(true);
    },
    [canEdit]
  );

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) void handleFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFiles]
  );

  const busy = isUploading || isScanning;
  const hasImportDoc = Boolean(importDocId);
  // Drop zone is shown only when the user hasn't yet scanned a document.
  // After the first successful scan, Step 1 becomes a display-only panel
  // (attachments are managed in Step 4).
  const showDropZone = canEdit && !hasImportDoc;

  return (
    <div className="space-y-4">
      {showDropZone && (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-lg p-8 text-center transition-colors',
                isDragging
                  ? 'bg-primary/5 border-primary'
                  : 'bg-muted/20 hover:bg-muted/30',
                busy && 'opacity-60 pointer-events-none'
              )}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {isScanning ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : isUploading ? (
                  <Upload className="h-6 w-6 text-primary animate-pulse" />
                ) : (
                  <ScanSearch className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {isScanning
                    ? "Analyse du document par l'IA..."
                    : isUploading
                    ? 'Import en cours...'
                    : 'Déposez un document à importer'}
                </p>
                <p className="text-xs text-muted-foreground max-w-md">
                  Lettre de mission, constat, capture de portail assurance,
                  carte grise, etc. PDF ou image. L&apos;IA pré-remplira
                  l&apos;étape Information.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" /> Choisir un fichier
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                onChange={onFileInputChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {lastFilledCount !== null && lastFilledCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/20">
          <ScanSearch className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-amber-700 dark:text-amber-400">
            <strong>{lastFilledCount} champ(s)</strong> pré-rempli(s) par
            l&apos;IA. Vérifiez à l&apos;étape <em>Information</em>.
          </span>
        </div>
      )}

      {/* Summary card — Step 1 only shows the single AI-scan source document.
          All other attachments live in Step 4 (Pièces jointes). */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Document source du pré-remplissage
            </h3>
            {hasImportDoc && (
              <Badge variant="secondary" className="text-[10px]">
                1
              </Badge>
            )}
          </div>

          {!hasImportDoc ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm italic text-muted-foreground">
                Aucun document importé. Déposez votre lettre de mission,
                constat ou document d&apos;assurance pour lancer le
                pré-remplissage par l&apos;IA.
              </p>
            </div>
          ) : importDocLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !importDoc ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm italic text-muted-foreground">
                Le document source est introuvable (il a peut-être été
                supprimé depuis l&apos;étape Pièces jointes).
              </p>
            </div>
          ) : (
            <ul className="divide-y rounded-md border">
              {(() => {
                const d: any = importDoc;
                const name = d.nom || d.fileName || 'document';
                const by = d.uploadePar || d.uploadedBy || '—';
                const when = formatDate(d.dateUpload || d.uploadedAt);
                const url: string | undefined = d.url || undefined;
                const canPreview = Boolean(url) && !d.pendingUpload;
                return (
                  <li
                    key={d.id || importDocId}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" title={name}>
                        {name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {by}
                        {when ? ` · ${when}` : ''}
                      </p>
                    </div>
                    {d.pendingUpload && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-300 bg-amber-50 text-[9px] text-amber-700"
                      >
                        En attente
                      </Badge>
                    )}
                    {canPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setPreviewDoc({ url: url as string, nom: name })}
                        title="Aperçu"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                );
              })()}
            </ul>
          )}

          {hasImportDoc && (
            <p className="mt-3 text-[11px] italic text-muted-foreground">
              Les autres pièces jointes sont gérées dans l&apos;étape 4
              « Pièces jointes ».
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-sm truncate">{previewDoc?.nom}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-800">
            {previewDoc && (/\.(jpe?g|png|gif|webp|bmp)$/i.test(previewDoc.nom) ? (
              <img
                src={previewDoc.url}
                alt={previewDoc.nom}
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={previewDoc.url}
                className="w-full h-full border-none"
                title={previewDoc.nom}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
