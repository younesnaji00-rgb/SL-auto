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

/** The rapport templates the user can generate. */
const RAPPORT_OPTIONS: Array<{ value: RapportType; title: string; description: string }> = [
  {
    value: 'preliminaire',
    title: 'Rapport préliminaire',
    description: "Rapport d'expertise préliminaire contradictoire — minute des deux experts (1er / 2ème).",
  },
  {
    value: 'final',
    title: 'Rapport final',
    description: "Rapport d'expertise contradictoire — conclusions, détail fournitures et main d'oeuvre.",
  },
  {
    value: 'estimatif',
    title: 'Rapport estimatif',
    description: "Rapport d'expertise estimatif (forfait) — détail fournitures et main d'oeuvre par choc.",
  },
  {
    value: 'reforme',
    title: 'Rapport de réforme',
    description: 'Rapport de réforme — évaluation des dommages, valeur vénale / épave et indemnisation.',
  },
];

export function RapportTypeDialog({
  open,
  onOpenChange,
  onConfirm,
  isGenerating = false,
}: RapportTypeDialogProps) {
  const [selected, setSelected] = useState<RapportType>('final');

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
          {RAPPORT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`rapport-type-${opt.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
            >
              <RadioGroupItem
                value={opt.value}
                id={`rapport-type-${opt.value}`}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor={`rapport-type-${opt.value}`}
                  className="cursor-pointer text-sm font-semibold"
                >
                  {opt.title}
                </Label>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
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
