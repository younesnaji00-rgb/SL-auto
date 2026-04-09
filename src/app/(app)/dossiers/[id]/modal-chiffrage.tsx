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
import { Checkbox } from '@/components/ui/checkbox';
import { ChiffreurDialog } from '@/components/modals/chiffreur-dialog';
import { useFirestore, useAuth, useDoc } from '@/firebase';
import { doc, collection, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { logHistorique, logWorkflow } from './log-historique';
import { Loader2, Send, ImageIcon, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { sendToChiffrage, ChiffrageFile } from '@/lib/send-to-chiffrage';
import { useChiffreurs } from '@/hooks/use-chiffreurs';
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
}

export default function ModalChiffrage({ open, onOpenChange, dossierId }: ModalChiffrageProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { chiffreurs, loading: loadingChiffreurs } = useChiffreurs();

  const dossierRef = useMemo(() => (db && dossierId ? doc(db, 'dossiers', dossierId) : null), [db, dossierId]);
  const { data: dossier } = useDoc(dossierRef);

  const [selectedChiffreurId, setSelectedChiffreurId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File selection
  const [availablePhotos, setAvailablePhotos] = useState<FileItem[]>([]);
  const [availableDocs, setAvailableDocs] = useState<FileItem[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(true);
  const [docsExpanded, setDocsExpanded] = useState(true);

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
        return { id: d.id, name: data.nom || data.name || 'document.pdf', storagePath: data.storagePath || '', type: 'rapport', docType: data.type || data.typeDocument || '' };
      });
      setAvailablePhotos(photos);
      setAvailableDocs(docs);
      // Select all by default
      const allIds = new Set([...photos.map(p => p.id), ...docs.map(d => d.id)]);
      setSelectedFileIds(allIds);
    }).catch(() => {
      toast({ variant: 'destructive', title: 'Erreur de chargement des fichiers' });
    }).finally(() => setLoadingFiles(false));
  }, [open, db, dossierId]);

  const toggleFile = (id: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPhotos = () => {
    const allSelected = availablePhotos.every(p => selectedFileIds.has(p.id));
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      availablePhotos.forEach(p => {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  };

  const toggleAllDocs = () => {
    const allSelected = availableDocs.every(d => selectedFileIds.has(d.id));
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      availableDocs.forEach(d => {
        if (allSelected) next.delete(d.id);
        else next.add(d.id);
      });
      return next;
    });
  };

  const selectedCount = selectedFileIds.size;
  const selectedPhotosCount = availablePhotos.filter(p => selectedFileIds.has(p.id)).length;
  const selectedDocsCount = availableDocs.filter(d => selectedFileIds.has(d.id)).length;

  const handleAssign = async () => {
    if (loadingChiffreurs || isSubmitting || !db || !dossierId) return;

    if (!selectedChiffreurId) {
      toast({ variant: 'destructive', title: "Sélection requise", description: "Veuillez choisir un chiffreur dans la liste." });
      return;
    }

    if (selectedCount === 0) {
      toast({ variant: 'destructive', title: "Aucun fichier sélectionné", description: "Veuillez sélectionner au moins un fichier à envoyer." });
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
        .filter(f => selectedFileIds.has(f.id))
        .map(f => ({ name: f.name, storagePath: f.storagePath, type: f.type, ...(f.docType ? { docType: f.docType } : {}), ...(f.category ? { category: f.category } : {}) }));

      if (selectedFiles.length === 0) {
        throw new Error("Aucun fichier sélectionné.");
      }

      const chiffrageId = await sendToChiffrage({
        db,
        dossierId,
        dossierNom: dossier?.refExpert || dossierId,
        assignedChiffreurId: chiffreur.id,
        assignedChiffreurNom: chiffreur.nom,
        files: selectedFiles,
        sentByUid: userId,
        sentByEmail: userEmail,
      });

      if (dossierRef) {
        updateDoc(dossierRef, {
          statut: 'Assigné au chiffrage',
          currentChiffrageId: chiffrageId,
          updatedAt: serverTimestamp()
        });
      }

      await logHistorique(db, dossierId, 'Assignation Chiffrage', userEmail, `Dossier envoyé au chiffreur : ${chiffreur.nom} (${selectedFiles.length} fichiers)`, 'assignation');
      await logWorkflow(db, dossierId, 'Assignation Chiffrage', userEmail, userId, 'done');

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

          {/* File selection */}
          <div className="space-y-2">
            <Label>Fichiers à envoyer ({selectedCount} sélectionné{selectedCount > 1 ? 's' : ''})</Label>
            <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des fichiers...
                </div>
              ) : (
                <>
                  {/* Photos section */}
                  {availablePhotos.length > 0 && (
                    <div>
                      <button
                        onClick={() => setPhotosExpanded(v => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        {photosExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <ImageIcon className="h-3 w-3" />
                        Photos ({selectedPhotosCount}/{availablePhotos.length})
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); toggleAllPhotos(); }}
                          className="ml-auto text-[10px] text-primary hover:underline font-medium normal-case cursor-pointer"
                        >
                          {availablePhotos.every(p => selectedFileIds.has(p.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </span>
                      </button>
                      {photosExpanded && availablePhotos.map(p => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer text-xs border-t"
                        >
                          <Checkbox
                            checked={selectedFileIds.has(p.id)}
                            onCheckedChange={() => toggleFile(p.id)}
                          />
                          <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{p.name}</span>
                          {p.category && (
                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{p.category}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Documents section — grouped by type */}
                  {availableDocs.length > 0 && (
                    <div>
                      <button
                        onClick={() => setDocsExpanded(v => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted text-xs font-bold uppercase tracking-wider text-muted-foreground border-t"
                      >
                        {docsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <FileText className="h-3 w-3" />
                        Documents ({selectedDocsCount}/{availableDocs.length})
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); toggleAllDocs(); }}
                          className="ml-auto text-[10px] text-primary hover:underline font-medium normal-case cursor-pointer"
                        >
                          {availableDocs.every(d => selectedFileIds.has(d.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </span>
                      </button>
                      {docsExpanded && (() => {
                        const grouped: Record<string, FileItem[]> = {};
                        for (const d of availableDocs) {
                          const type = d.docType || 'Autre';
                          if (!grouped[type]) grouped[type] = [];
                          grouped[type].push(d);
                        }
                        return Object.entries(grouped).map(([type, items]) => (
                          <div key={type}>
                            <div className="px-4 py-1 bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t">
                              {type} ({items.filter(d => selectedFileIds.has(d.id)).length}/{items.length})
                            </div>
                            {items.map(d => (
                              <label
                                key={d.id}
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer text-xs border-t"
                              >
                                <Checkbox
                                  checked={selectedFileIds.has(d.id)}
                                  onCheckedChange={() => toggleFile(d.id)}
                                />
                                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{d.name}</span>
                              </label>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  )}

                  {availablePhotos.length === 0 && availableDocs.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground italic">
                      Aucun fichier disponible dans ce dossier.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Annuler</Button>
          <Button onClick={handleAssign} disabled={isSubmitting || !selectedChiffreurId || loadingChiffreurs || selectedCount === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Envoyer ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
