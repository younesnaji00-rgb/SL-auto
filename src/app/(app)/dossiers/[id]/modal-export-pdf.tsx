'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useFirestore, useDoc } from '@/firebase';
import { doc, collection, getDocs, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { generateRapportPDF } from '@/lib/generate-rapport-pdf';
import { cn } from '@/lib/utils';

interface ModalExportPdfProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
}

interface ChiffrageFileItem {
  index: number;
  name: string;
  pdfUrl?: string;
}

export default function ModalExportPdf({ open, onOpenChange, dossierId }: ModalExportPdfProps) {
  const db = useFirestore();
  const { toast } = useToast();

  const dossierRef = useMemo(() => (db && dossierId ? doc(db, 'dossiers', dossierId) : null), [db, dossierId]);
  const { data: dossier } = useDoc(dossierRef);

  const [isExporting, setIsExporting] = useState(false);

  // Section selections
  const [exportInformations, setExportInformations] = useState(true);
  const [exportRapport, setExportRapport] = useState(true);
  const [exportChiffrage, setExportChiffrage] = useState(false);

  // Chiffrage file selection
  const [chiffrageFiles, setChiffrageFiles] = useState<ChiffrageFileItem[]>([]);
  const [selectedChiffrageFiles, setSelectedChiffrageFiles] = useState<Set<number>>(new Set());
  const [chiffrageExpanded, setChiffrageExpanded] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Load chiffrage files when modal opens or chiffrage is toggled
  useEffect(() => {
    if (!open || !db || !dossierId || !dossier?.currentChiffrageId) {
      setChiffrageFiles([]);
      return;
    }

    setLoadingFiles(true);
    getDoc(doc(db, 'chiffrages', dossier.currentChiffrageId))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          const files: ChiffrageFileItem[] = (data.files || []).map((f: any, i: number) => ({
            index: i,
            name: f.name || `Fichier ${i + 1}`,
            pdfUrl: f.pdfUrl || null,
          }));
          setChiffrageFiles(files);
          setSelectedChiffrageFiles(new Set(files.map(f => f.index)));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFiles(false));
  }, [open, db, dossierId, dossier?.currentChiffrageId]);

  const toggleChiffrageFile = (index: number) => {
    setSelectedChiffrageFiles(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const hasSelection = exportInformations || exportRapport || (exportChiffrage && selectedChiffrageFiles.size > 0);

  const handleExport = async () => {
    if (!db || !dossierId || !hasSelection) return;
    setIsExporting(true);

    try {
      // Export rapport (includes informations section)
      if (exportInformations || exportRapport) {
        await generateRapportPDF(db, dossierId);
        toast({ title: 'Rapport PDF exporté' });
      }

      // Export chiffrage files
      if (exportChiffrage && selectedChiffrageFiles.size > 0) {
        for (const file of chiffrageFiles) {
          if (!selectedChiffrageFiles.has(file.index)) continue;
          if (file.pdfUrl) {
            const a = document.createElement('a');
            a.href = file.pdfUrl;
            a.download = `Chiffrage_${file.name}`;
            a.target = '_blank';
            a.click();
          }
        }
        toast({ title: `${selectedChiffrageFiles.size} fichier(s) de chiffrage téléchargé(s)` });
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast({ variant: 'destructive', title: "Erreur d'exportation", description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Exporter en PDF</DialogTitle>
          <DialogDescription>
            Sélectionnez les sections à inclure dans l'export PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informations */}
          <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
            <Checkbox
              checked={exportInformations}
              onCheckedChange={(v) => setExportInformations(!!v)}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">Informations</p>
              <p className="text-xs text-muted-foreground">Données du dossier, assuré, véhicule</p>
            </div>
          </label>

          {/* Rapport */}
          <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
            <Checkbox
              checked={exportRapport}
              onCheckedChange={(v) => setExportRapport(!!v)}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">Rapport</p>
              <p className="text-xs text-muted-foreground">Pièces, main d'oeuvre, points de choc</p>
            </div>
          </label>

          {/* Chiffrage */}
          <div className="rounded-lg border overflow-hidden">
            <label className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors">
              <Checkbox
                checked={exportChiffrage}
                onCheckedChange={(v) => {
                  setExportChiffrage(!!v);
                  if (v) setChiffrageExpanded(true);
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Chiffrage</p>
                <p className="text-xs text-muted-foreground">Documents corrigés par le chiffreur</p>
              </div>
              {exportChiffrage && chiffrageFiles.length > 0 && (
                <button
                  onClick={(e) => { e.preventDefault(); setChiffrageExpanded(v => !v); }}
                  className="p-1"
                >
                  {chiffrageExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
            </label>

            {/* Chiffrage file list */}
            {exportChiffrage && chiffrageExpanded && (
              <div className="border-t bg-muted/20">
                {loadingFiles ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Chargement...
                  </div>
                ) : chiffrageFiles.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground italic">
                    {dossier?.currentChiffrageId ? 'Aucun fichier de chiffrage' : 'Aucun chiffrage en cours'}
                  </div>
                ) : (
                  chiffrageFiles.map(file => (
                    <label
                      key={file.index}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-accent cursor-pointer text-xs border-t"
                    >
                      <Checkbox
                        checked={selectedChiffrageFiles.has(file.index)}
                        onCheckedChange={() => toggleChiffrageFile(file.index)}
                      />
                      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{file.name}</span>
                      {!file.pdfUrl && (
                        <span className="text-[10px] text-amber-600 ml-auto">Pas de PDF</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>Annuler</Button>
          <Button onClick={handleExport} disabled={isExporting || !hasSelection}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exporter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
