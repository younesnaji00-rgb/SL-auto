'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileDown, Loader2 } from 'lucide-react';
import type { RapportType } from '@/lib/generate-rapport-shared';

interface RapportTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (type: RapportType) => Promise<void> | void;
  isGenerating?: boolean;
}

export function RapportTypeDialog({
  open,
  onOpenChange,
  onConfirm,
  isGenerating = false,
}: RapportTypeDialogProps) {
  const [selected, setSelected] = useState<RapportType>('preliminaire');

  const handleConfirm = async () => {
    await onConfirm(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Générer le rapport</DialogTitle>
          <DialogDescription>
            Choisissez le type de rapport à générer.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selected}
          onValueChange={(v) => setSelected(v as RapportType)}
          className="space-y-2 py-2"
        >
          <label
            htmlFor="rapport-type-preliminaire"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
          >
            <RadioGroupItem
              value="preliminaire"
              id="rapport-type-preliminaire"
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="rapport-type-preliminaire"
                className="cursor-pointer text-sm font-semibold"
              >
                Rapport préliminaire
              </Label>
              <p className="text-xs text-muted-foreground">
                Annexe 4 contradictoire — position 1er / 2ème expert.
              </p>
            </div>
          </label>

          <label
            htmlFor="rapport-type-reforme"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
          >
            <RadioGroupItem
              value="reforme"
              id="rapport-type-reforme"
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="rapport-type-reforme"
                className="cursor-pointer text-sm font-semibold"
              >
                Rapport de réforme
              </Label>
              <p className="text-xs text-muted-foreground">
                Rapport complet avec conclusions, fournitures et main d&apos;oeuvre.
              </p>
            </div>
          </label>
        </RadioGroup>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Générer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
