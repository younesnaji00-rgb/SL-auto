'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, FileWarning, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { DevisEditor } from '@/components/chiffreurs/devis-editor';
import { isEditableDocType, type EditableDocType } from '@/lib/devis-schema';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/i18n';

/**
 * Editing a devis on a phone is out of scope by ruling (mobile pass
 * 2026-09-06, owner call on E-Q3 in docs/research/mobile-record-pages.md): the
 * editor is a split pane of a structured line-item table and a PDF canvas,
 * two surfaces that each need the width the other one wants. Rather than ship
 * a 390 px version of it that no chiffreur could use, the route states the
 * fact and hands over the link — a full-page notice, never a blank screen or a
 * silently broken editor.
 */
function PhoneNotice({ docType, accordSlot }: { docType: string; accordSlot?: string }) {
  const t = useT();
  const { toast } = useToast();

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t('Lien copié'), description: t("Ouvrez-le sur un ordinateur pour éditer le devis.") });
    } catch {
      // Clipboard is unavailable in some in-app WebViews: show the URL so it
      // can be copied by hand rather than failing silently.
      window.prompt(t('Copiez ce lien'), url);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-3">
          <Monitor className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="t-title">{t('Édition sur ordinateur')}</h1>
        <p className="t-body mt-2 text-ink-2">
          {t("L'éditeur de devis met le tableau des lignes et le PDF côte à côte : il demande un grand écran.")}
        </p>
      </div>

      <dl className="mt-6 border-y border-hairline">
        <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-hairline px-1 last:border-b-0">
          <dt className="t-label">{t('Document')}</dt>
          <dd className="t-body truncate font-semibold">{t(docType)}</dd>
        </div>
        {accordSlot && (
          <div className="flex min-h-[44px] items-center justify-between gap-3 px-1">
            <dt className="t-label">{t('Étape')}</dt>
            <dd className="t-body truncate font-semibold">{t(accordSlot)}</dd>
          </div>
        )}
      </dl>

      <Button className="mt-6 h-12 w-full gap-2" onClick={copyLink}>
        <Copy className="h-4 w-4" />
        {t('Copier le lien')}
      </Button>
      <p className="t-caption mt-2 text-center">{t('Collez-le dans le navigateur de votre ordinateur.')}</p>
    </div>
  );
}

function DevisEditorInner() {
  const t = useT();
  const searchParams = useSearchParams();
  const isPhone = useIsPhone();
  const chiffrageId = searchParams.get('chiffrageId') || '';
  const docTypeRaw = searchParams.get('docType') || 'Devis Garage';
  const docType: EditableDocType = isEditableDocType(docTypeRaw) ? docTypeRaw : 'Devis Garage';
  const accordSlot = searchParams.get('accordSlot') || undefined;

  if (!chiffrageId) {
    // Empty state — element-specs §12 (NN/g: state + reason, no repeated
    // title in the description; standalone on the canvas → dashed frame is
    // fine). No action: the route is opened from an assignation.
    return (
      <div className="mx-auto max-w-screen-lg px-4 py-10 sm:px-6">
        <EmptyState
          role="alert"
          icon={<FileWarning />}
          title={t('Paramètres manquants')}
          description={t("Le paramètre chiffrageId est requis pour ouvrir l'éditeur.")}
        />
      </div>
    );
  }

  if (isPhone) return <PhoneNotice docType={docType} accordSlot={accordSlot} />;

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
