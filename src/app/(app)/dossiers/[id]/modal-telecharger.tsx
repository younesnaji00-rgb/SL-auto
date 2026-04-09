'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { generateRapportPDF } from '@/lib/generate-rapport-pdf';

type DocumentType = 'Rapport' | 'Photos' | 'Devis';

const documentTypes: { id: DocumentType; label: string; description: string }[] = [
  {
    id: 'Rapport',
    label: 'Rapport de Chiffrage',
    description: 'PDF complet avec vehicule, assure, diagrammes de choc, pieces, M.O., recapitulatif et photos',
  },
  {
    id: 'Photos',
    label: 'Photos uniquement',
    description: 'Export ZIP des photos du vehicule (bientot disponible)',
  },
  {
    id: 'Devis',
    label: 'Devis simplifie',
    description: 'Resume des couts sans detail technique (bientot disponible)',
  },
];

type ModalTelechargerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
};

export default function ModalTelecharger({
  open,
  onOpenChange,
  dossierId,
}: ModalTelechargerProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<DocumentType>>(new Set(['Rapport']));
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(documentTypes.map((dt) => dt.id)) : new Set());
  };

  const handleSelectOne = (id: DocumentType, checked: boolean) => {
    const next = new Set(selected);
    checked ? next.add(id) : next.delete(id);
    setSelected(next);
  };

  const allSelected = selected.size === documentTypes.length;

  const handleDownload = async () => {
    if (selected.size === 0) {
      toast({ variant: 'destructive', title: 'Selectionnez au moins un document.' });
      return;
    }
    setIsLoading(true);
    try {
      if (selected.has('Rapport')) {
        await generateRapportPDF(db, dossierId);
        toast({ title: 'Rapport PDF exporte avec succes.' });
      }
      if (selected.has('Photos')) {
        toast({ title: 'Photos - Export ZIP bientot disponible.' });
      }
      if (selected.has('Devis')) {
        toast({ title: 'Devis simplifie - bientot disponible.' });
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({
        variant: 'destructive',
        title: "Erreur lors de l'exportation",
        description: error?.message ?? 'Veuillez reessayer.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Telecharger les documents</DialogTitle>
        </DialogHeader>

        {/* Select All */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={(c) => handleSelectAll(c as boolean)}
          />
          <Label htmlFor="select-all" className="font-semibold cursor-pointer">
            Tout selectionner
          </Label>
        </div>

        {/* Options */}
        <div className="space-y-3 py-2">
          {documentTypes.map((docType) => (
            <div
              key={docType.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                selected.has(docType.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
              onClick={() => handleSelectOne(docType.id, !selected.has(docType.id))}
            >
              <Checkbox
                id={docType.id}
                checked={selected.has(docType.id)}
                onCheckedChange={(c) => handleSelectOne(docType.id, c as boolean)}
                onClick={(e) => e.stopPropagation()}
              />
              <div>
                <Label htmlFor={docType.id} className="font-medium cursor-pointer">
                  {docType.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{docType.description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleDownload} disabled={isLoading || selected.size === 0}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generation en cours...
              </>
            ) : (
              `Telecharger (${selected.size})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
