'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  updateDoc,
  serverTimestamp,
  collection,
  Timestamp,
  type DocumentReference,
} from 'firebase/firestore';
import { FileIcon, FileText, Loader2, ScanSearch, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage, useAuth, useCollection } from '@/firebase';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live list of documents already uploaded on this dossier.
  const docsQuery = useMemo(() => {
    if (!db || !dossierId) return null;
    return collection(db, 'dossiers', dossierId, 'documents');
  }, [db, dossierId]);
  const { data: documents, loading: docsLoading } = useCollection<any>(docsQuery);

  const sortedDocs = useMemo(() => {
    if (!documents) return [];
    return [...documents].sort((a: any, b: any) => {
      const tsA = a.dateUpload || a.uploadedAt;
      const tsB = b.dateUpload || b.uploadedAt;
      const dateA = tsA?.toDate ? tsA.toDate().getTime() : tsA || 0;
      const dateB = tsB?.toDate ? tsB.toDate().getTime() : tsB || 0;
      return dateB - dateA;
    });
  }, [documents]);

  const runScanAndMerge = useCallback(
    async (files: File[], userEmail: string) => {
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

        if (written > 0) {
          updates.updatedAt = serverTimestamp();
          await updateDoc(dossierRef, updates);
          if (db) {
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
      try {
        for (const file of files) {
          const timestamp = Date.now();
          const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${file.name}`;
          await uploadFileWithOfflineSupport({
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

        // Scan all uploaded files in one go.
        await runScanAndMerge(files, userEmail);
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
  const hasDocs = sortedDocs.length > 0;

  return (
    <div className="space-y-4">
      {canEdit && (
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

      {/* Summary card */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Documents importés</h3>
            <Badge variant="secondary" className="text-[10px]">
              {sortedDocs.length}
            </Badge>
          </div>

          {docsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !hasDocs ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm italic text-muted-foreground">
                Aucun document importé. Déposez votre lettre de mission,
                constat ou document d&apos;assurance.
              </p>
            </div>
          ) : (
            <ul className="divide-y rounded-md border">
              {sortedDocs.map((d: any) => {
                const name = d.nom || d.fileName || 'document';
                const by = d.uploadePar || d.uploadedBy || '—';
                const when = formatDate(d.dateUpload || d.uploadedAt);
                return (
                  <li
                    key={d.id}
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
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
