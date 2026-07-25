'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageLoader } from '@/components/ui/page-loader';
import { DevisEditor } from '@/components/chiffreurs/devis-editor';
import { isEditableDocType, type EditableDocType } from '@/lib/devis-schema';
import { useT } from '@/i18n';

function DevisEditorInner() {
  const t = useT();
  const searchParams = useSearchParams();
  const chiffrageId = searchParams.get('chiffrageId') || '';
  const docTypeRaw = searchParams.get('docType') || 'Devis Garage';
  const docType: EditableDocType = isEditableDocType(docTypeRaw) ? docTypeRaw : 'Devis Garage';
  const accordSlot = searchParams.get('accordSlot') || undefined;

  if (!chiffrageId) {
    return (
      <div className="max-w-screen-lg mx-auto px-6 py-10 text-sm text-muted-foreground">
        {t('Paramètres manquants : chiffrageId est requis.')}
      </div>
    );
  }

  return <DevisEditor chiffrageId={chiffrageId} docType={docType} accordSlot={accordSlot} />;
}

export default function DevisEditorPage() {
  const t = useT();
  return (
    <Suspense fallback={<PageLoader label={t("Chargement de l'éditeur…")} />}>
      <DevisEditorInner />
    </Suspense>
  );
}
