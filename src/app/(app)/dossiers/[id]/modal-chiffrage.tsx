'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChiffreurDialog } from '@/components/modals/chiffreur-dialog';
import { useFirestore, useAuth, useDoc, useStorage } from '@/firebase';
import { doc, collection, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { logHistorique, logWorkflow } from './log-historique';
import { Loader2, Send, ImageIcon, FileText } from 'lucide-react';
import { sendToChiffrage, ChiffrageFile } from '@/lib/send-to-chiffrage';
import { extractAndPersistChiffrageDevis } from '@/lib/devis-extract';
import { isEditableDocType, type EditableDocType } from '@/lib/devis-schema';
import { useChiffreurs } from '@/hooks/use-chiffreurs';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

type ModalChiffrageProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
};

interface FileItem {
  id: string;
  name: string;
  storagePath: string;
  type: 'photo' | 'rapport';
  category?: string;
  docType?: string;
  devisVariant?: 'original' | 'counter';
  counterRoundLabel?: string;
  counterRoundOrder?: number;
}

export default function ModalChiffrage({ open, onOpenChange, dossierId }: ModalChiffrageProps) {
  const db = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();
  const { profile } = useCurrentUser();
  const { chiffreurs, loading: loadingChiffreurs } = useChiffreurs();

  const dossierRef = useMemo(() => (db && dossierId ? doc(db, 'dossiers', dossierId) : null), [db, dossierId]);
  const { data: dossier } = useDoc(dossierRef);

  const [selectedChiffreurId, setSelectedChiffreurId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Files
  const [availablePhotos, setAvailablePhotos] = useState<FileItem[]>([]);
  const [availableDocs, setAvailableDocs] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Load available files when modal opens
  useEffect(() => {
    if (!open || !db || !dossierId) return;
    setLoadingFiles(true);
    Promise.all([
      getDocs(collection(db, 'dossiers', dossierId, 'photos')),
      getDocs(collection(db, 'dossiers', dossierId, 'documents')),
    ]).then(([photosSnap, docsSnap]) => {
      const photos: FileItem[] = photosSnap.docs.map(d => {
        const data = d.data();
        return { id: d.id, name: data.name || 'photo.jpg', storagePath: data.storagePath || '', type: 'photo', category: data.category };
      });
      const docs: FileItem[] = docsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.nom || data.name || 'document.pdf',
          storagePath: data.storagePath || '',
          type: 'rapport',
          docType: data.type || data.typeDocument || '',
          ...(data.devisVariant ? { devisVariant: data.devisVariant as 'original' | 'counter' } : {}),
          ...(data.counterRoundLabel ? { counterRoundLabel: data.counterRoundLabel as string } : {}),
          ...(typeof data.counterRoundOrder === 'number' ? { counterRoundOrder: data.counterRoundOrder as number } : {}),
        };
      });
      setAvailablePhotos(photos);
      setAvailableDocs(docs);
    }).catch(() => {
      toast({ variant: 'destructive', title: 'Erreur de chargement des fichiers' });
    }).finally(() => setLoadingFiles(false));
  }, [open, db, dossierId]);

  const totalFileCount = availablePhotos.length + availableDocs.length;

  const handleAssign = async () => {
    if (loadingChiffreurs || isSubmitting || !db || !dossierId) return;

    if (!selectedChiffreurId) {
      toast({ variant: 'destructive', title: "Sélection requise", description: "Veuillez choisir un chiffreur dans la liste." });
      return;
    }

    if (totalFileCount === 0) {
      toast({ variant: 'destructive', title: "Aucun fichier disponible", description: "Ce dossier ne contient aucun fichier à envoyer." });
      return;
    }

    const chiffreur = chiffreurs.find(c => c.id === selectedChiffreurId);
    const user = auth?.currentUser;

    if (!chiffreur) {
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de procéder. Données du chiffreur manquantes." });
      return;
    }

    setIsSubmitting(true);
    const userEmail = user?.email || 'admin@dashflow.com';
    const userId = user?.uid || 'admin-guest';

    try {
      const allItems = [...availablePhotos, ...availableDocs];
      const selectedFiles: ChiffrageFile[] = allItems
        .map(f => ({
          name: f.name,
          storagePath: f.storagePath,
          type: f.type,
          ...(f.docType ? { docType: f.docType } : {}),
          ...(f.category ? { category: f.category } : {}),
          ...(f.devisVariant ? { devisVariant: f.devisVariant } : {}),
          ...(f.counterRoundLabel ? { counterRoundLabel: f.counterRoundLabel } : {}),
          ...(typeof f.counterRoundOrder === 'number' ? { counterRoundOrder: f.counterRoundOrder } : {}),
        }));

      const chiffrageId = await sendToChiffrage({
        db,
        dossierId,
        dossierNom: dossier?.refExpert || dossierId,
        assignedChiffreurId: chiffreur.id,
        assignedChiffreurNom: chiffreur.nom,
        files: selectedFiles,
        sentByUid: userId,
        sentByEmail: userEmail,
        sentByNom: profile?.nom || userEmail,
        // Seed the new chiffrage with whatever the dossier-side eager
        // extraction has already produced, so the chiffreur opens to a
        // ready-to-edit view instead of waiting on background scans.
        seedStructuredEditables: (dossier as any)?.structuredEditables ?? undefined,
        // Reuse the existing chiffrage when one is already attached so a
        // re-assign (e.g. for a 2ème cardinal round) keeps the same mission
        // row and the chiffreur opens straight into their prior editor.
        existingChiffrageId: (dossier as any)?.currentChiffrageId ?? null,
      });

      if (dossierRef) {
        // NB: `sendToChiffrage` already sets `statut = 'Chiffrage en cours'`
        // (canonical, task #11). We intentionally do NOT re-write `statut`
        // here — follow-up #46, executed under #41.
        updateDoc(dossierRef, {
          currentChiffrageId: chiffrageId,
          updatedAt: serverTimestamp()
        });
      }

      await logHistorique(db, dossierId, 'Assignation Chiffrage', userEmail, `Dossier envoyé au chiffreur : ${chiffreur.nom} (${selectedFiles.length} fichiers)`, 'assignation', profile?.nom);
      await logWorkflow(db, dossierId, 'Dossier envoyé vers chiffrage', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: `Envoyé au chiffreur : ${chiffreur.nom} (${selectedFiles.length} fichiers)` }, profile?.nom);

      // Fire-and-forget background extraction, one call per editable doc type
      // that has at least one file in this chiffrage. Iterates over the
      // distinct docTypes actually present so numbered extras
      // (`Devis Garage 2`, `Facture Garage 3`, …) are scanned, not just the
      // two base slots. Each result lands in
      // chiffrage.structuredEditables[docType]; idempotent by design.
      if (storage) {
        const editableDocTypes = new Set<EditableDocType>();
        for (const f of selectedFiles) {
          if (f.docType && isEditableDocType(f.docType)) editableDocTypes.add(f.docType);
        }
        editableDocTypes.forEach((docType) => {
          extractAndPersistChiffrageDevis({ db, storage, chiffrageId, docType })
            .catch((e) => console.error(`[modal-chiffrage] ${docType} extraction failed`, e));
        });
      }

      toast({ title: "Dossier envoyé", description: `${selectedFiles.length} fichier(s) transmis au chiffreur.` });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Assignment error:', error);
      toast({ variant: 'destructive', title: "Erreur lors de l'envoi", description: error.message || "Une erreur est survenue." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Envoyer vers Chiffrage</DialogTitle>
          <DialogDescription>
            Sélectionnez le chiffreur et les fichiers à transmettre.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 flex-1 overflow-hidden">
          {/* Chiffreur selection */}
          <div className="space-y-2">
            <Label>Chiffreur responsable</Label>
            <ChiffreurDialog
              selectedId={selectedChiffreurId}
              onSelectId={setSelectedChiffreurId}
            />
          </div>

          {/* File summary */}
          <div className="space-y-2">
            <Label>Fichiers à envoyer</Label>
            <div className="space-y-2 rounded-lg bg-surface-2 p-3">
              {loadingFiles ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-ink-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des fichiers...
                </div>
              ) : totalFileCount === 0 ? (
                <p className="t-caption py-4 text-center">
                  Aucun fichier disponible dans ce dossier.
                </p>
              ) : (
                <div className="flex items-center gap-4 text-sm text-ink">
                  {availablePhotos.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-ink-3" />
                      <span>{availablePhotos.length} photo{availablePhotos.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {availableDocs.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-ink-3" />
                      <span>{availableDocs.length} document{availableDocs.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <span className="t-caption ml-auto">Tous les fichiers seront envoyés</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Annuler</Button>
          <Button onClick={handleAssign} disabled={isSubmitting || !selectedChiffreurId || loadingChiffreurs || totalFileCount === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Envoyer ({totalFileCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
