/**
 * Réforme summary generator — a plain, single-page table of the réforme values
 * entered by the chiffreur in the assignations-chiffrage réforme dialog.
 *
 * This is intentionally NOT the full "RAPPORT D'EXPERTISE NON DEFINITIF
 * REFORME" expertise layout (see `generate-rapport-reforme-pdf.ts`). That
 * template is only produced when the report is explicitly generated from the
 * rapport tab. On save, we just persist a readable summary of the figures.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { t } from '@/i18n';
import { resolveRapportData, type RapportData } from './rapport-data';
import { type ReformeData } from './reforme-schema';
import { fC, NAVY, BORDER, HEADER_BG, COMPANY_CITY, addImageSafe } from './generate-rapport-shared';

// Normalize legacy lowercase 'technique' to the canonical label. Inlined here
// (rather than imported from the réforme dialog) to avoid a circular import:
// the dialog imports this generator on save.
function normalizeReformeType(raw: string | undefined): string {
  if (!raw) return '';
  const low = raw.toLowerCase();
  if (low === 'technique') return 'Technique';
  if (low === 'économique' || low === 'economique') return 'Économique';
  return raw;
}

export async function generateReformeSummaryPDF(
  db: unknown,
  dossierId: string,
  reforme: ReformeData,
  options?: { returnBlob?: boolean },
): Promise<Blob | void> {
  if (!db || !dossierId) return;

  const data = await resolveRapportData(db, dossierId);
  const pdf = buildReformeSummary(data, reforme);
  if (options?.returnBlob) return pdf.output('blob');
  pdf.save(`Reforme_${data.refExpert}_${data.today.replace(/\//g, '-')}.pdf`);
}

/** Pure layout: render a simple réforme summary table from the entered data. */
export function buildReformeSummary(data: RapportData, reforme: ReformeData): jsPDF {
  const pageW = 210;
  const marginL = 14;
  const marginR = 196;
  const contentW = 182;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const setText = (size: number, bold = false, color: readonly number[] = NAVY) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(color[0], color[1], color[2]);
  };

  const typeReforme = normalizeReformeType(reforme.typeReforme) || 'Technique';

  // ── Header ──────────────────────────────────────────────────────────
  let y = 14;
  setText(9, true);
  pdf.text(`${t('CABINET :')} ${data.cabinetNom}`, marginL, y);
  pdf.text(`${t('EXPERT :')} ${data.expertNom}`, marginR, y, { align: 'right' });
  y += 5;
  setText(8, false, [40, 40, 40]);
  pdf.text(
    `${t('Réf sinistre :')} ${data.referenceCompagnie}   ${t('Date sinistre :')} ${data.dateSinistre}` +
      `   ${t('Date mission :')} ${data.dateMission}   ${t('Assurance :')} ${data.compagnie}`,
    marginL,
    y,
  );
  y += 4;
  pdf.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  pdf.setLineWidth(0.4);
  pdf.line(marginL, y, marginR, y);
  y += 6;

  // ── Title ───────────────────────────────────────────────────────────
  setText(13, true);
  pdf.text(`${t('RÉFORME')} ${t(typeReforme).toUpperCase()} : ${data.refExpert}`, pageW / 2, y, {
    align: 'center',
  });
  y += 7;

  // ── Identity mini-table ─────────────────────────────────────────────
  autoTable(pdf, {
    startY: y,
    margin: { left: marginL, right: pageW - marginR },
    tableWidth: contentW,
    body: [
      [t('Assuré'), data.assure.fullName || ''],
      [t('Véhicule'), data.vehicule.marqueModele || ''],
      [t('Immatriculation'), data.vehicule.immatriculation || ''],
      [t("Cie d'assurance"), data.compagnie || ''],
    ],
    styles: { fontSize: 8, cellPadding: 1.4, lineColor: [BORDER[0], BORDER[1], BORDER[2]], lineWidth: 0.2 },
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: [HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]] },
      1: { cellWidth: contentW - 50, textColor: [40, 40, 40] },
    },
  });
  y = (pdf as any).lastAutoTable.finalY + 5;

  // ── Réforme values table ────────────────────────────────────────────
  setText(9, true);
  pdf.text(t('VALEURS DE RÉFORME'), marginL, y);
  y += 2.5;

  const valueRows: Array<[string, string]> = [
    [t('Type Réforme'), t(typeReforme)],
    [t('Valeur vénale (avec TVA)'), fC(reforme.valeurVenale)],
    [t('Valeur épave'), fC(reforme.valeurEpave)],
    [t("Valeur d'achat"), fC(reforme.valeurAchat)],
    [t('Valeur commerciale'), fC(reforme.valeurCommerciale)],
    [t('La différence des valeurs'), fC(reforme.difference)],
    [t('La méthode de calcul'), reforme.methodeCalcul || ''],
    [t('Montant accord'), fC(reforme.montantAccord)],
    [t('Franchise'), fC(reforme.franchise)],
    [t('Montant déplacement'), fC(reforme.montantDeplacement)],
    [t('Montant honoraires'), fC(reforme.montantHonoraires)],
  ];

  autoTable(pdf, {
    startY: y,
    margin: { left: marginL, right: pageW - marginR },
    tableWidth: contentW,
    head: [[t('Désignation'), t('Valeur')]],
    body: valueRows,
    foot: [[t("Total d'indemnisation"), fC(reforme.totalIndemnisation)]],
    styles: { fontSize: 8.5, cellPadding: 1.6, lineColor: [BORDER[0], BORDER[1], BORDER[2]], lineWidth: 0.2 },
    headStyles: { fillColor: [NAVY[0], NAVY[1], NAVY[2]], textColor: [255, 255, 255], fontSize: 8.5 },
    footStyles: { fillColor: [HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]], textColor: [NAVY[0], NAVY[1], NAVY[2]], fontStyle: 'bold', fontSize: 9 },
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold', textColor: [40, 40, 40] },
      1: { cellWidth: contentW - 110, halign: 'right', textColor: [40, 40, 40] },
    },
  });
  y = (pdf as any).lastAutoTable.finalY + 6;

  // SL stamp below the table (clamped so it never crosses the footer rule).
  addImageSafe(pdf, data.cachet || data.slLogo, marginL, Math.min(y, 258), 40, 20);

  // ── Footer ──────────────────────────────────────────────────────────
  pdf.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  pdf.setLineWidth(0.3);
  pdf.line(marginL, 284, marginR, 284);
  setText(8, false, [40, 40, 40]);
  pdf.text(`${t('Expert :')} ${data.expertNom}`, marginL, 289);
  pdf.text(`${t('Fait à')} ${COMPANY_CITY} ${t('le')} ${data.today}`, marginR, 289, { align: 'right' });

  return pdf;
}
