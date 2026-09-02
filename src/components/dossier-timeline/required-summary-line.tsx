'use client';

/**
 * One-line required-items summary — the « N pièces requises manquantes » /
 * « N champs requis manquants » treatment. ONE component so the Pièces tab
 * (`app/(app)/dossiers/[id]/documents-tab.tsx`) and the Informations step
 * (`components/dossier-timeline/step-2-information.tsx`) stay byte-for-byte
 * identical (owner ruling 2026-09-02: both warnings share the same style).
 *
 * Anatomy: caption type, status colour carried by the TEXT (no boxed alert,
 * no background), small leading icon aligned to the first line. Callers put
 * the bold count phrase + the list of labels in `children`.
 */

import * as React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RequiredSummaryLine({
  state,
  className,
  children,
}: {
  /** `missing` = warning pair + triangle · `ok` = success pair + check. */
  state: 'missing' | 'ok';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        't-caption flex items-start gap-2',
        state === 'missing' ? 'text-status-warning-fg' : 'text-status-success-fg',
        className,
      )}
    >
      {state === 'missing' ? (
        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <Check className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span>{children}</span>
    </div>
  );
}
