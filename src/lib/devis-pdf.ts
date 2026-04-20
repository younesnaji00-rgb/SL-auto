import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  type DevisSnapshot,
  type EditableDocType,
  formatFr,
  rowTotalHT,
  sumHT,
  sumTTC,
  sumTVA,
} from './devis-schema';

/**
 * Render the structured devis/facture into a PDF (Blob) that mirrors the
 * Jay Auto layout:
 *  - Top band: title + devis n° + date
 *  - Two columns of identity fields
 *  - Main table (REF, Désignation, [Vétusté for Devis], TYPE, T.V.A, Qté, P.U H.T, Total H.T)
 *    + optional extra columns
 *  - Totals footer (H.T, TVA, TTC)
 */
export function renderDevisPdf(
  devis: DevisSnapshot,
  opts?: { author?: string; versionTimestamp?: Date; docType?: EditableDocType }
): Blob {
  const showVetuste = (opts?.docType ?? 'Devis') === 'Devis';
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 10;

  // ── Top band: Devis N° + Date ────────────────────────────────────────────
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.3);

  // Title box
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(20, 20, 20);
  pdf.text('Devis', margin + 2, margin + 10);

  // Devis N° + Date on the right
  const rightX = pageW - margin;
  const topBoxY = margin;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.rect(pageW - margin - 80, topBoxY, 80, 18);
  pdf.line(pageW - margin - 80, topBoxY + 9, pageW - margin, topBoxY + 9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Devis N°', pageW - margin - 77, topBoxY + 5.5);
  pdf.text('Date', pageW - margin - 77, topBoxY + 14.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`: ${devis.header.devisNumero || ''}`, pageW - margin - 55, topBoxY + 5.5);
  pdf.text(`: ${devis.header.dateDevis || ''}`, pageW - margin - 55, topBoxY + 14.5);

  // ── Identity block: two columns ──────────────────────────────────────────
  const blockY = margin + 22;
  const blockH = 38;
  const colW = (pageW - 2 * margin) / 2;

  pdf.rect(margin, blockY, colW, blockH);
  pdf.rect(margin + colW, blockY, colW, blockH);

  pdf.setFontSize(9);
  const leftRows: Array<[string, string]> = [
    ['Marque', devis.header.marque],
    ['Matricule', devis.header.matricule],
    ['Modele', devis.header.modele],
    ['Kilometrage', devis.header.kilometrage],
    ['N° de chassis', devis.header.chassis],
    ['expert', devis.header.expert],
  ];
  const rightRows: Array<[string, string]> = [
    ['Client', devis.header.client],
    ['Adresse', devis.header.adresse],
    ['ICE', devis.header.ice],
    ['Telephone', devis.header.telephone],
    ['Assurances', devis.header.assurances],
  ];

  const drawRows = (rows: Array<[string, string]>, x0: number, y0: number, width: number) => {
    const rowH = blockH / Math.max(rows.length, 6);
    const labelX = x0 + 2;
    const valueX = x0 + 32;
    const valueMaxW = width - 34;
    const lineH = 3.3; // mm, matches 9pt font
    rows.forEach(([label, value], i) => {
      const yy = y0 + (i + 1) * rowH - 1.5;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${label}`, labelX, yy);
      pdf.setFont('helvetica', 'normal');

      // Wrap long values to up to 2 lines; ellipsize anything longer
      // to keep text inside the identity block.
      const raw = `: ${value || ''}`;
      const split = pdf.splitTextToSize(raw, valueMaxW) as string[];
      const maxLines = 2;
      let lines = split.slice(0, maxLines);
      if (split.length > maxLines && lines.length > 0) {
        const last = lines[lines.length - 1];
        let truncated = last;
        // Drop chars until "…" fits within valueMaxW.
        while (truncated.length > 0 && pdf.getTextWidth(truncated + '…') > valueMaxW) {
          truncated = truncated.slice(0, -1);
        }
        lines[lines.length - 1] = (truncated || last) + '…';
      }

      // If wrapping produces 2 lines, shift the first line up a bit so both
      // lines stay centered within the row and don't bleed into the next row.
      const startY = lines.length > 1 ? yy - lineH / 2 : yy;
      lines.forEach((ln, li) => {
        pdf.text(ln, valueX, startY + li * lineH);
      });
    });
  };
  drawRows(leftRows, margin, blockY, colW);
  drawRows(rightRows, margin + colW, blockY, colW);

  // SL Auto stamp (right column, bottom)
  pdf.setDrawColor(30, 64, 175);
  pdf.setTextColor(30, 64, 175);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  const stampX = margin + colW + 40;
  const stampY = blockY + 22;
  pdf.rect(stampX, stampY, colW - 42, 14);
  pdf.text('Proposition du 1er Expert', stampX + 2, stampY + 4);
  pdf.text('SL AUTO EXPERTISE', stampX + 2, stampY + 8);
  pdf.text('Expertise Contradictoire - CID', stampX + 2, stampY + 12);
  pdf.setTextColor(20, 20, 20);
  pdf.setDrawColor(120, 120, 120);

  // ── Main table ──────────────────────────────────────────────────────────
  // Normalize extra columns from new (`extraColumns`) or legacy (`extraColumn`) shape.
  const extraCols: Array<{ id: string; label: string; values: Record<string, string> }> =
    Array.isArray(devis.extraColumns) && devis.extraColumns.length > 0
      ? devis.extraColumns.filter((c) => !!c && !!c.label)
      : (devis.extraColumn && devis.extraColumn.label
          ? [{ id: 'legacy', label: devis.extraColumn.label, values: devis.extraColumn.values || {} }]
          : []);

  const head: string[][] = [
    [
      'REF',
      'Designation',
      ...(showVetuste ? ['Vetuste'] : []),
      'TYPE',
      'T.V.A',
      'Qte',
      'P.U H.T',
      'Total H.T',
      ...extraCols.map((c) => c.label),
    ],
  ];

  const body = devis.rows.map((r) => {
    const base = [
      r.ref || '',
      r.designation || '',
      ...(showVetuste ? [`${formatFr(r.vetuste || 0, 0)}%`] : []),
      r.type || '',
      `${formatFr(r.tva, 0)}%`,
      formatFr(r.qte, 0),
      formatFr(r.puHT),
      formatFr(rowTotalHT(r)),
    ];
    extraCols.forEach((c) => base.push(c.values[r.id] || ''));
    return base;
  });

  // Column indices shift by 1 when Vetuste is inserted between Designation (1) and TYPE.
  const off = showVetuste ? 1 : 0;
  const columnStyles: Record<number, any> = {
    0: { cellWidth: 22, halign: 'center' },                          // REF
    [2 + off]: { halign: 'center', cellWidth: 14 },                  // TYPE (was col 2)
    [3 + off]: { halign: 'center', cellWidth: 14 },                  // TVA
    [4 + off]: { halign: 'center', cellWidth: 12 },                  // Qte
    [5 + off]: { halign: 'right', cellWidth: 24 },                   // P.U H.T
    [6 + off]: { halign: 'right', cellWidth: 28 },                   // Total H.T
  };
  if (showVetuste) columnStyles[2] = { halign: 'center', cellWidth: 16 }; // Vetuste

  autoTable(pdf, {
    startY: blockY + blockH + 4,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.5, textColor: 20, lineColor: 120, lineWidth: 0.2 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold', halign: 'center' },
    columnStyles,
    margin: { left: margin, right: margin },
  });

  // ── Totals footer ───────────────────────────────────────────────────────
  const finalY = (pdf as any).lastAutoTable?.finalY || blockY + blockH + 4;
  const totalsY = finalY + 4;
  const totalsW = 70;
  const totalsX = pageW - margin - totalsW;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.rect(totalsX, totalsY, totalsW, 21);
  pdf.line(totalsX, totalsY + 7, totalsX + totalsW, totalsY + 7);
  pdf.line(totalsX, totalsY + 14, totalsX + totalsW, totalsY + 14);
  pdf.line(totalsX + 30, totalsY, totalsX + 30, totalsY + 21);

  pdf.text('Total H.T', totalsX + 2, totalsY + 5);
  pdf.text('TVA', totalsX + 2, totalsY + 12);
  pdf.text('Total TTC', totalsX + 2, totalsY + 19);

  pdf.setFont('helvetica', 'normal');
  pdf.text(formatFr(sumHT(devis.rows)), totalsX + totalsW - 2, totalsY + 5, { align: 'right' });
  pdf.text(formatFr(sumTVA(devis.rows)), totalsX + totalsW - 2, totalsY + 12, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatFr(sumTTC(devis.rows)), totalsX + totalsW - 2, totalsY + 19, { align: 'right' });

  // ── Version watermark in footer ─────────────────────────────────────────
  if (opts?.author || opts?.versionTimestamp) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    const ts = opts.versionTimestamp ? opts.versionTimestamp.toLocaleString('fr-FR') : '';
    const author = opts.author || '';
    pdf.text(
      `Version generee le ${ts}${author ? ` par ${author}` : ''} — SL Auto Expertise`,
      margin,
      pdf.internal.pageSize.getHeight() - 6
    );
    pdf.setTextColor(20, 20, 20);
  }

  return pdf.output('blob');
}
