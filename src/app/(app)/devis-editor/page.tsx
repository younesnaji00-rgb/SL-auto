'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DevisEditor } from '@/components/chiffreurs/devis-editor';
import { isEditableDocType, type EditableDocType } from '@/lib/devis-schema';

function DevisEditorInner() {
  const searchParams = useSearchParams();
  const chiffrageId = searchParams.get('chiffrageId') || '';
  const docTypeRaw = searchParams.get('docType') || 'Devis';
  const docType: EditableDocType = isEditableDocType(docTypeRaw) ? docTypeRaw : 'Devis';

  if (!chiffrageId) {
    return (
      <div className="max-w-screen-lg mx-auto px-6 py-10 text-sm text-muted-foreground">
        Parametres manquants : chiffrageId est requis.
      </div>
    );
  }

  return <DevisEditor chiffrageId={chiffrageId} docType={docType} />;
}

export default function DevisEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <DevisEditorInner />
    </Suspense>
  );
}
