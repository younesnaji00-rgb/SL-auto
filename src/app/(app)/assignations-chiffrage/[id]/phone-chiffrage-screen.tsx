'use client';

/**
 * Phone rendering of one chiffrage (mobile redesign 2026-09-14 — Claude
 * Design handoff `Phone.dc.html` screen « chiffrage-detail », turns 3–4
 * « Devis = le fichier »).
 *
 *   [ ‹ Chiffrage   SL-25-0412 (statut) ]        ← top bar (page publishes it)
 *                   Karim Benjelloun
 *   ┌ Véhicule · Immatriculation ─────────────┐   facts card
 *   │ Compagnie · Garage                      │
 *   │ Reçu le 12/09 · Correcteur : … [statut] │
 *   └─────────────────────────────────────────┘
 *   [ Devis 1 | Photos 12 | Observations 3 ]     ← Segmented xs
 *   Devis   = the deposited PDF (tile · name · « n pages · size · déposé le …
 *             par … » · ⤓), page-1 preview framed on surface-2 with a
 *             « Plein écran » pill → the existing lightbox, page dots, then the
 *             accord versions already published; the « Montant chiffré » card
 *             (devis garage total · chiffré total · écart ± · %).
 *   Photos  = 3-column grid of `dossiers/{id}/photos` → lightbox with siblings.
 *   Observations = the shared ObservationsTab (its read filter + write path).
 *   [ 📁 ]  [ Valider le chiffrage ]             ← bottom bar (page)
 *
 * Read paths are the page's existing subscriptions (chiffrage doc, dossier,
 * documents, photos); nothing here writes except through ObservationsTab.
 * Amounts are derived from what the devis editor persisted
 * (`lib/chiffrage-amounts`), never typed here: the only place a chiffrage
 * amount is written is the editor's save flow, which is desktop-only by
 * owner ruling (E-Q3) — the bottom bar's primary hands over to it.
 */

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { ChevronRight, Download, FileText, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { Segmented } from '@/components/ui/segmented';
import { RECORD_CARD_CLASS } from '@/components/ui/record-card';
import { StatusChip } from '@/components/ui/status-chip';
import { PdfThumbnail } from '@/components/common/pdf-thumbnail';
import ObservationsTab from '@/components/observations-tab';
import type { TypedDoc } from '@/components/dossier-timeline/slot-card';
import type { DocFamily } from '@/lib/doc-family';
import { mapToAccorde, parseAccordDocType } from '@/lib/docType-accorde';
import { toOrdinalFr } from '@/lib/devis-schema';
import { docUploaderLabel, formatDocDate, formatFileSize, isPdf } from '@/components/documents/typed-doc';
import { chiffrageAmounts, ecartWithDevis, formatDhs } from '@/lib/chiffrage-amounts';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

export type ChiffrageFacet = 'devis' | 'photos' | 'observations';

export interface PhonePreviewDoc {
  url: string;
  nom: string;
}

export interface PhoneChiffrageScreenProps {
  chiffrageId: string;
  dossierId: string;
  dossier: any;
  /** The assignation document (files, structuredEditables, stamps). */
  chiffrage: { assignedChiffreurNom?: string; files?: any[]; structuredEditables?: Record<string, unknown>; completedAt?: unknown };
  dossierStatut: string;
  /** « Reçu le … » already formatted by the page. */
  receivedAt: string | null;
  /** Devis families first, then factures (the page's `orderedFamilies`). */
  families: DocFamily[];
  docsByType: Record<string, TypedDoc[]>;
  photos: any[] | null | undefined;
  facet: ChiffrageFacet;
  onFacetChange: (facet: ChiffrageFacet) => void;
  /** Opens the existing lightbox (with optional sibling pages). */
  onPreview: (doc: PhonePreviewDoc, pages?: PhonePreviewDoc[]) => void;
}

const hasReal = (docs: TypedDoc[] | undefined) => (docs || []).some((d) => !!d.url && !d.pendingUpload);
const realDoc = (docs: TypedDoc[] | undefined) => (docs || []).find((d) => !!d.url && !d.pendingUpload) ?? null;

/**
 * The slot « Valider le chiffrage » opens in the devis editor — the same
 * target the desktop pipeline's Éditer socket computes:
 *   1. a gestionnaire-created placeholder awaiting the chiffreur (« 2ème
 *      accord » spawned with the cardinal « + »), else
 *   2. the 1er accord when the source exists and no accord is published yet.
 * Null when there is nothing to validate (no source, or the accord chain is
 * complete — further rounds are gestionnaire-initiated).
 */
export function nextChiffrageSlot(
  family: DocFamily | undefined,
  docsByType: Record<string, TypedDoc[]>,
): { parent: string; slot: string } | null {
  if (!family || !hasReal(docsByType[family.parent])) return null;
  let maxAccord = 0;
  let awaiting: string | null = null;
  for (const slot of family.slots) {
    if (slot === family.parent) continue;
    const parsed = parseAccordDocType(slot);
    if (!parsed) continue;
    const docs = docsByType[slot] || [];
    if (hasReal(docs)) {
      if (parsed.kind === 'accord') maxAccord = Math.max(maxAccord, parsed.ordinal);
    } else if (docs.length > 0 && !awaiting) {
      awaiting = slot;
    }
  }
  if (awaiting) return { parent: family.parent, slot: awaiting };
  if (maxAccord === 0) return { parent: family.parent, slot: mapToAccorde(family.parent, 'accord', 1) };
  return null;
}

/** French stage label of an accord / proposition slot (« 1er accord », « 2ème proposition d'accord »). */
function stageLabel(slot: string): string {
  const parsed = parseAccordDocType(slot);
  if (!parsed) return slot;
  const ord = toOrdinalFr(parsed.ordinal);
  return parsed.kind === 'accord' ? `${ord} accord` : `${ord} proposition d'accord`;
}

const PHOTO_CATEGORY_LABEL: Record<string, string> = { avant: 'Avant', en_cours: 'En cours', apres: 'Après' };

/* ------------------------------------------------------------------ */

function Fact({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="min-w-0">
      <div className="text-[11px] leading-4 text-ink-3">{label}</div>
      <div className={cn('mt-0.5 text-[13px] font-medium leading-[1.35] [overflow-wrap:anywhere]', empty ? 'text-ink-4' : 'text-ink', mono && 'font-mono tabular-nums')}>
        {empty ? '—' : value}
      </div>
    </div>
  );
}

/** Label + count inside one Segmented xs option. */
function SegLabel({ label, count }: { label: string; count: number | null }) {
  return (
    <>
      {label}
      {count !== null && <span className="text-[11px] font-medium tabular-nums text-ink-3">{count}</span>}
    </>
  );
}

/* ------------------------------------------------------------------ */

export function PhoneChiffrageScreen({
  dossierId,
  dossier,
  chiffrage,
  dossierStatut,
  receivedAt,
  families,
  docsByType,
  photos,
  facet,
  onFacetChange,
  onPreview,
}: PhoneChiffrageScreenProps) {
  const t = useT();
  const db = useFirestore();

  // Observation count for the segment label (ObservationsTab subscribes on its own).
  const obsQuery = React.useMemo(() => (db && dossierId ? collection(db, 'dossiers', dossierId, 'observations') : null), [db, dossierId]);
  const { data: observations } = useCollection<any>(obsQuery);

  // ── The deposited devis: the first Devis family's source document, else the
  // copy the gestionnaire attached to the assignation (files[docType = Devis]).
  const devisFamily = families.find((f) => f.sourceDocType === 'Devis Garage');
  const sourceDoc = devisFamily ? realDoc(docsByType[devisFamily.parent]) : null;
  const fallbackFile = (chiffrage.files || []).find((f: any) => f?.docType === 'Devis' && f?.pdfUrl) ?? null;
  const devisFile: (PhonePreviewDoc & { size?: number; date?: string; by?: string }) | null = sourceDoc?.url
    ? {
        url: sourceDoc.url,
        nom: sourceDoc.nom || sourceDoc.fileName || 'devis.pdf',
        size: sourceDoc.taille ?? sourceDoc.fileSize,
        date: formatDocDate(sourceDoc.dateUpload ?? sourceDoc.uploadedAt),
        by: docUploaderLabel(sourceDoc),
      }
    : fallbackFile
      ? { url: fallbackFile.pdfUrl, nom: fallbackFile.name || 'devis.pdf' }
      : null;

  const [numPages, setNumPages] = React.useState<number | null>(null);
  React.useEffect(() => { setNumPages(null); }, [devisFile?.url]);

  // Published versions of the same family (accords / propositions), lineage order.
  const versions = React.useMemo(() => {
    if (!devisFamily) return [] as { slot: string; doc: TypedDoc }[];
    return devisFamily.slots
      .filter((slot) => slot !== devisFamily.parent)
      .map((slot) => ({ slot, doc: realDoc(docsByType[slot]) }))
      .filter((v): v is { slot: string; doc: TypedDoc } => !!v.doc);
  }, [devisFamily, docsByType]);

  const amounts = React.useMemo(
    () => chiffrageAmounts(chiffrage.structuredEditables, devisFamily?.parent ?? 'Devis Garage'),
    [chiffrage.structuredEditables, devisFamily?.parent],
  );
  const ecart = amounts.accordTTC !== null && amounts.devisTTC !== null ? ecartWithDevis(amounts.accordTTC, amounts.devisTTC) : null;

  const photoList: any[] = React.useMemo(() => (photos || []).filter((p) => !!p?.url), [photos]);
  const devisCount = (devisFile ? 1 : 0) + versions.length;

  const vehicule = [dossier?.vehicule?.marque, dossier?.vehicule?.modele].filter(Boolean).join(' ');
  const plate: string = dossier?.matricule || dossier?.vehicule?.immatriculation || '';

  const metaBits = [
    receivedAt ? `${t('Reçu le')} ${receivedAt}` : null,
    chiffrage.assignedChiffreurNom ? `${t('Correcteur :')} ${chiffrage.assignedChiffreurNom}` : null,
  ].filter(Boolean);

  const download = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="space-y-3 pb-2 md:hidden">
      {/* Facts card — what the top bar has no room for. */}
      <section aria-label={t('Dossier')} className={cn(RECORD_CARD_CLASS, 'grid grid-cols-2 gap-x-3 gap-y-2 px-3.5 py-2.5')} data-tour="chd-header">
        <Fact label={t('Véhicule')} value={vehicule} />
        <Fact label={t('Immatriculation')} value={plate} mono />
        <Fact label={t('Compagnie')} value={dossier?.compagnie} />
        <Fact label={t('Garage')} value={dossier?.garageName} />
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-hairline pt-2 text-[12px] leading-4 text-ink-3">
          <span className="min-w-0 [overflow-wrap:anywhere]">{metaBits.length ? metaBits.join(' · ') : '—'}</span>
          <StatusChip status={dossierStatut} />
        </div>
      </section>

      <Segmented<ChiffrageFacet>
        size="xs"
        value={facet}
        onValueChange={onFacetChange}
        aria-label={t('Contenu du chiffrage')}
        options={[
          { value: 'devis', label: <SegLabel label={t('Devis')} count={devisCount} />, labelText: `${t('Devis')} ${devisCount}` },
          { value: 'photos', label: <SegLabel label={t('Photos')} count={photoList.length} />, labelText: `${t('Photos')} ${photoList.length}` },
          {
            value: 'observations',
            label: <SegLabel label={t('Observations')} count={observations ? observations.length : null} />,
            labelText: `${t('Observations')} ${observations ? observations.length : ''}`.trim(),
          },
        ]}
      />

      {/* ── Devis = the file ─────────────────────────────────────────── */}
      {facet === 'devis' && (
        <div className="flex flex-col gap-2" data-tour="chd-familles">
          {devisFile ? (
            <article className={RECORD_CARD_CLASS} aria-label={t('Devis déposé')}>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-status-danger-bg text-[10px] font-bold tracking-[0.02em] text-status-danger-fg" aria-hidden>
                  {isPdf(devisFile.nom) ? 'PDF' : <FileText className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold leading-[1.3] text-ink">{devisFile.nom}</span>
                  <span className="block text-[12px] leading-4 text-ink-3">
                    {[
                      numPages ? `${numPages} ${numPages > 1 ? t('pages') : t('page')}` : null,
                      devisFile.size ? formatFileSize(devisFile.size) : null,
                      devisFile.date ? `${t('déposé le')} ${devisFile.date}${devisFile.by ? ` ${t('par')} ${devisFile.by}` : ''}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || t('Fichier joint à l’assignation')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => download(devisFile.url)}
                  aria-label={t('Télécharger')}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Download className="h-5 w-5" aria-hidden />
                </button>
              </div>

              {/* Page-1 preview, framed like a sheet on the surface-2 desk. */}
              <div className="border-t border-hairline bg-surface-2 px-6 pb-2 pt-3">
                <div className="relative aspect-[1/1.35] overflow-hidden rounded bg-card shadow-[0_1px_3px_hsl(var(--shadow-color)/0.12),0_8px_24px_-8px_hsl(var(--shadow-color)/0.18)]">
                  {isPdf(devisFile.nom) ? (
                    <PdfThumbnail
                      url={devisFile.url}
                      width={720}
                      lazy={false}
                      onDocument={({ numPages: n }) => setNumPages(n)}
                      className="h-full w-full object-contain object-top"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={devisFile.url} alt="" className="h-full w-full object-contain object-top" />
                  )}
                  <button
                    type="button"
                    onClick={() => onPreview({ url: devisFile.url, nom: devisFile.nom })}
                    aria-label={t('Ouvrir le devis en plein écran')}
                    className="absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink-solid/80 px-3 text-[12px] font-medium text-background backdrop-blur-sm">
                      <Maximize2 className="h-5 w-5" aria-hidden />
                      {t('Plein écran')}
                    </span>
                  </button>
                </div>
                {/* One dot per page (design prints one even for a single page);
                    past 8 pages the dots would blur — a « 1 / n » caption instead. */}
                {numPages !== null && numPages >= 1 && (
                  <div className="flex justify-center gap-1.5 pb-0.5 pt-2.5" aria-label={`${numPages} ${numPages > 1 ? t('pages') : t('page')}`}>
                    {numPages <= 8 ? (
                      Array.from({ length: numPages }).map((_, i) => (
                        <span key={i} className={cn('h-1.5 rounded-full', i === 0 ? 'w-4 bg-ink-2' : 'w-1.5 bg-hairline-strong')} aria-hidden />
                      ))
                    ) : (
                      <span className="text-[12px] leading-4 tabular-nums text-ink-3" aria-hidden>
                        1 / {numPages}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Versions already published by the chiffreur (lineage order). */}
              {versions.length > 0 && (
                <ul className="divide-y divide-hairline border-t border-hairline">
                  {versions.map(({ slot, doc }) => (
                    <li key={slot}>
                      <button
                        type="button"
                        onClick={() => onPreview({ url: doc.url as string, nom: doc.nom || doc.fileName || slot })}
                        className="flex min-h-[44px] w-full items-center gap-3 px-3.5 py-1.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold leading-[1.3] text-ink">{t(stageLabel(slot))}</span>
                          <span className="block truncate text-[12px] leading-4 text-ink-3">{doc.nom || doc.fileName || slot}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ) : (
            <p className={cn(RECORD_CARD_CLASS, 'px-3.5 py-3 text-[13px] text-ink-3')}>{t('Aucun devis déposé pour ce dossier.')}</p>
          )}

          {/* Montant chiffré — derived from the editor's snapshots. */}
          <article className={cn(RECORD_CARD_CLASS, 'flex flex-col gap-2.5 px-3.5 py-3')} aria-label={t('Montant chiffré')} data-tour="chd-montant">
            <div className="flex items-center justify-between gap-3 text-[13px] text-ink-2">
              <span>{t('Devis garage')}</span>
              <span className={cn('font-semibold tabular-nums', amounts.devisTTC === null ? 'text-ink-4' : 'text-ink')}>
                {amounts.devisTTC === null ? '—' : formatDhs(amounts.devisTTC)}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-2">{t('Montant chiffré')}</span>
              <div
                className="flex h-12 items-center justify-between rounded-md border border-input bg-card px-3"
                role="status"
                aria-label={`${t('Montant chiffré')} ${amounts.accordTTC === null ? '—' : formatDhs(amounts.accordTTC)}`}
              >
                <span className={cn('text-[20px] font-semibold tabular-nums', amounts.accordTTC === null ? 'text-ink-4' : 'text-ink')}>
                  {amounts.accordTTC === null ? '—' : formatDhs(amounts.accordTTC).replace(/ DHS$/, '')}
                </span>
                <span className="text-[12px] font-medium text-ink-3">DHS</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-[12px] text-ink-3">
              <span>{t('Écart avec le devis')}</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  ecart?.tone === 'success' && 'text-status-success-fg',
                  ecart?.tone === 'danger' && 'text-status-danger-fg',
                  !ecart && 'text-ink-4',
                )}
              >
                {ecart ? ecart.label : '—'}
              </span>
            </div>
            <p className="text-[12px] leading-4 text-ink-3">
              {amounts.accordDocType
                ? `${t('Source :')} ${t(amounts.accordDocType)}`
                : t("Le montant se saisit ligne par ligne dans l'éditeur de devis, sur ordinateur.")}
            </p>
          </article>
        </div>
      )}

      {/* ── Photos ───────────────────────────────────────────────────── */}
      {facet === 'photos' &&
        (photoList.length === 0 ? (
          <p className={cn(RECORD_CARD_CLASS, 'flex items-center gap-2 px-3.5 py-3 text-[13px] text-ink-3')}>
            <ImageIcon className="h-4 w-4 shrink-0" aria-hidden />
            {t('Aucune photo pour ce dossier.')}
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-1.5" aria-label={t('Photos')}>
            {photoList.map((p) => {
              const label = PHOTO_CATEGORY_LABEL[p.category as string];
              return (
                <li key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                  <button
                    type="button"
                    onClick={() =>
                      onPreview(
                        { url: p.url, nom: p.name || 'photo' },
                        photoList.map((s) => ({ url: s.url, nom: s.name || 'photo' })),
                      )
                    }
                    aria-label={`${label ? `${t(label)} — ` : ''}${p.name || t('photo')}`}
                    className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                  {label && (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-card/85 px-1.5 py-0.5 text-[12px] font-medium leading-4 text-ink-2">
                      {t(label)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ))}

      {/* ── Observations — the shared panel (visibility filter + write path). */}
      {facet === 'observations' && (
        <div data-tour="chd-observations">
          <ObservationsTab dossierId={dossierId} section="assignations-chiffrage" variant="tab" />
        </div>
      )}
    </div>
  );
}

export default PhoneChiffrageScreen;
