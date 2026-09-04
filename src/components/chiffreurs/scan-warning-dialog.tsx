'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useT } from '@/i18n';

/**
 * Task #33 — post-scan warning dialog.
 *
 * Shown once after `runExtraction` succeeds. The dialog is informational only:
 * dismissing it (via the close button or `Annuler`) leaves the table locked
 * for editing. The chiffreur unlocks the table by clicking the toolbar
 * `J'ai vérifié` button, which sits next to `Comparer` and is the single
 * canonical confirmation entry-point.
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
  /** Optional — fired from the Cancel button if provided. */
  onCancel?: () => void;
}

export function ScanWarningDialog({
  open,
  onOpenChange,
  calculationErrors,
  onCancel,
}: ScanWarningDialogProps) {
  const t = useT();
  const hasErrors = Array.isArray(calculationErrors) && calculationErrors.length > 0;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Vérification du scan')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("Le scan est sujet à des erreurs. Merci de vérifier manuellement chaque ligne. Une fois terminé, cliquez sur le bouton « J'ai vérifié » dans la barre d'outils pour déverrouiller le tableau.")}
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
          <AlertDialogCancel onClick={() => onCancel?.()}>{t('Annuler')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
