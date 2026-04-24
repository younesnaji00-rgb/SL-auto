'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Task #33 — post-scan warning dialog.
 *
 * Shown once after `runExtraction` succeeds. While the dialog is open (and
 * until the chiffreur confirms via "J'ai vérifié"), the editor gates every
 * edit affordance behind `scanReviewed=false`. Cancelling simply closes the
 * dialog; the chiffreur can either confirm later or use the toolbar
 * `Modifications` toggle to bypass the lock.
 *
 * The optional `calculationErrors` list is populated by task #34 (scan
 * response shape) and wired through in #35. Each string renders as its own
 * bullet below the primary body copy.
 */
export interface ScanWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Task #34 — list of detected calculation mismatches, one per bullet. */
  calculationErrors?: string[];
  /** "J'ai vérifié" — confirms the review and unlocks editing. */
  onConfirm: () => void;
  /** Optional — fired from the Cancel button if provided. */
  onCancel?: () => void;
}

export function ScanWarningDialog({
  open,
  onOpenChange,
  calculationErrors,
  onConfirm,
  onCancel,
}: ScanWarningDialogProps) {
  const hasErrors = Array.isArray(calculationErrors) && calculationErrors.length > 0;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vérification du scan</AlertDialogTitle>
          <AlertDialogDescription>
            Le scan est sujet à des erreurs. Merci de vérifier manuellement chaque ligne. Une fois terminé, cliquez sur "J'ai vérifié".
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasErrors && (
          <ul className="list-disc pl-5 text-xs text-destructive space-y-1">
            {calculationErrors!.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onCancel?.()}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm()}>J'ai vérifié</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
