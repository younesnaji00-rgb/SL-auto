'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileWarning } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { DevisEditor } from '@/components/chiffreurs/devis-editor';
import { isEditableDocType, type EditableDocType } from '@/lib/devis-schema';

function DevisEditorInner() {
  const searchParams = useSearchParams();
  const chiffrageId = searchParams.get('chiffrageId') || '';
  const docTypeRaw = searchParams.get('docType') || 'Devis Garage';
  const docType: EditableDocType = isEditableDocType(docTypeRaw) ? docTypeRaw : 'Devis Garage';
  const accordSlot = searchParams.get('accordSlot') || undefined;

  if (!chiffrageId) {
    return (
      <div className="mx-auto max-w-screen-lg py-10">
        <EmptyState
          role="alert"
          icon={<FileWarning />}
          title="Paramètres manquants"
          description="Paramètres manquants : chiffrageId est requis."
        />
      </div>
    );
  }

  return <DevisEditor chiffrageId={chiffrageId} docType={docType} accordSlot={accordSlot} />;
}

export default function DevisEditorPage() {
  return (
    <Suspense fallback={<PageLoader label="Chargement de l'éditeur…" />}>
      <DevisEditorInner />
    </Suspense>
  );
}
