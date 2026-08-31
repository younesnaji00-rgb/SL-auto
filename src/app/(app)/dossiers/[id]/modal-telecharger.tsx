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
import { Loader2, FileText } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { generateRapportPDF } from '@/lib/generate-rapport-pdf';

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
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      await generateRapportPDF(db, dossierId);
      toast({ title: 'Rapport PDF exporté avec succès.' });
      onOpenChange(false);
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({
        variant: 'destructive',
        title: "Erreur lors de l'exportation",
        description: error?.message ?? 'Veuillez réessayer.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Télécharger le rapport</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <div className="flex items-start gap-3 rounded-lg bg-surface-2 p-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
            <div>
              <p className="text-sm font-medium text-ink">Rapport de Chiffrage</p>
              <p className="t-caption mt-0.5">
                PDF avec véhicule, assuré, diagrammes de choc, pièces, main d'œuvre, récapitulatif et observation.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleDownload} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              'Télécharger'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
