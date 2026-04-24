import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  type DevisSnapshot,
  type EditableDocType,
  formatFr,
  rowTotalHT,
  sumHT,
  sumTTC,
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
  opts?: {
    author?: string;
    versionTimestamp?: Date;
    docType?: EditableDocType;
    /**
     * Optional user-uploaded stamp image rendered in the identity block's
     * right column (where the old hardcoded "SL AUTO EXPERTISE" text stamp
     * used to render). The image is drawn into a fixed rectangle; if the
     * image's aspect ratio differs from the rectangle it will be stretched.
     * Known limitation: no cropping UI — acceptable for now.
     */
    stampImage?: { dataUrl: string; width: number; height: number } | null;
    /**
     * Overrides the PDF title. Used by accord/proposition-accord export flows
     * so the same renderer can produce a `Devis` / `Facture` / `Accord` /
     * `Proposition d'accord` header without threading docType-like enums.
     * Omitted = keep existing default title.
     */
    titleOverride?: 'Devis' | 'Facture' | 'Accord' | "Proposition d'accord";
  }
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
  pdf.text(opts?.titleOverride ?? 'Devis', margin + 2, margin + 10);

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

  // Optional user-uploaded stamp image (right column, bottom).
  // Occupies the same rectangle the old hardcoded "SL AUTO EXPERTISE" text
  // stamp used. If no image is provided, nothing is rendered here.
  // Known limitation: the image is stretched to fit the rectangle regardless
  // of aspect ratio — no cropping UI yet.
  const stampX = margin + colW + 40;
  const stampY = blockY + 22;
  const stampW = colW - 42;
  const stampH = 14;
  if (opts?.stampImage && opts.stampImage.dataUrl) {
    const dataUrl = opts.stampImage.dataUrl;
    const format = dataUrl.startsWith('data:image/jpeg')
      || dataUrl.startsWith('data:image/jpg')
      ? 'JPEG'
      : 'PNG';
    pdf.addImage(dataUrl, format, stampX, stampY, stampW, stampH);
  }

  // ── Main table ──────────────────────────────────────────────────────────
  // Normalize extra columns from new (`extraColumns`) or legacy (`extraColumn`) shape.
  const extraCols: Array<{ id: string; label: string; values: Record<string, string>; kind?: 'counter' | 'default' | 'accord' | 'proposition-accord' }> =
    Array.isArray(devis.extraColumns) && devis.extraColumns.length > 0
      ? devis.extraColumns.filter((c) => !!c && !!c.label)
      : (devis.extraColumn && devis.extraColumn.label
          ? [{ id: 'legacy', label: devis.extraColumn.label, values: devis.extraColumn.values || {} }]
          : []);

  // Partition extras: non-accord extras render as-is (one column each); accord /
  // proposition-accord extras render as a triple (PU / Total HT Accord / Prix TTC
  // Accord) on the far right.
  const nonAccordExtras = extraCols.filter(
    (c) => c.kind !== 'accord' && c.kind !== 'proposition-accord'
  );
  const accordExtras = extraCols.filter(
    (c) => c.kind === 'accord' || c.kind === 'proposition-accord'
  );

  // Per-row TTC helper: rowTotalHT × (1 + tva/100). Blank tva → 0% multiplier.
  const rowPrixTTC = (r: (typeof devis.rows)[number]): number => {
    const pct = typeof r.tva === 'number' && Number.isFinite(r.tva) ? r.tva : 0;
    return rowTotalHT(r) * (1 + pct / 100);
  };

  // Parse an accord column's per-row PU value (user-entered as a fr-formatted
  // string). Invalid / blank → 0 so the computed Total HT Accord stays numeric.
  const parseAccordPU = (raw: string | undefined): number => {
    if (!raw) return 0;
    const cleaned = raw.replace(/\s|\u00a0/g, '');
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');
    let normalized = cleaned;
    if (hasComma && hasDot) normalized = cleaned.replace(/\./g, '').replace(',', '.');
    else if (hasComma) normalized = cleaned.replace(',', '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };
  const accordRowTotalHT = (r: (typeof devis.rows)[number], puRaw: string | undefined): number => {
    const pu = parseAccordPU(puRaw);
    const q = typeof r.qte === 'number' && Number.isFinite(r.qte) ? r.qte : 0;
    const vRaw = typeof r.vetuste === 'number' && Number.isFinite(r.vetuste) ? r.vetuste : 0;
    const v = Math.min(100, Math.max(0, vRaw));
    return pu * q * (1 - v / 100);
  };
  const accordRowTTC = (r: (typeof devis.rows)[number], puRaw: string | undefined): number => {
    const ht = accordRowTotalHT(r, puRaw);
    const pct = typeof r.tva === 'number' && Number.isFinite(r.tva) ? r.tva : 0;
    return ht * (1 + pct / 100);
  };

  // Build accord triple headers: PU label + Total HT Accord + Prix TTC Accord.
  const accordTripleHeaders: string[] = accordExtras.flatMap((c) => [
    c.label,
    'Total HT Accord',
    'Prix TTC Accord',
  ]);

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
      'Prix en TTC',
      ...nonAccordExtras.map((c) => c.label),
      ...accordTripleHeaders,
    ],
  ];

  const body = devis.rows.map((r) => {
    // Blank cells in the source (main d'oeuvre / labor rows have no qté/tva/vétusté)
    // must stay blank in the PDF — don't print "0" where the source had nothing.
    const vetusteCell = r.vetuste == null ? '' : `${formatFr(r.vetuste, 0)}%`;
    const tvaCell = r.tva == null ? '' : `${formatFr(r.tva, 0)}%`;
    const qteCell = r.qte == null ? '' : formatFr(r.qte, 0);
    const base = [
      r.ref || '',
      r.designation || '',
      ...(showVetuste ? [vetusteCell] : []),
      r.type || '',
      tvaCell,
      qteCell,
      formatFr(r.puHT),
      formatFr(rowTotalHT(r)),
      formatFr(rowPrixTTC(r)),
    ];
    nonAccordExtras.forEach((c) => base.push(c.values[r.id] || ''));
    accordExtras.forEach((c) => {
      const pu = c.values[r.id] || '';
      base.push(pu);
      base.push(formatFr(accordRowTotalHT(r, pu)));
      base.push(formatFr(accordRowTTC(r, pu)));
    });
    return base;
  });

  // Column indices shift by 1 when Vetuste is inserted between Designation (1) and TYPE.
  const off = showVetuste ? 1 : 0;
  const totalHtIndex = 7 + off;
  const prixTTCIndex = totalHtIndex + 1;                                // NEW column
  const nonAccordStartIndex = prixTTCIndex + 1;
  const accordStartIndex = nonAccordStartIndex + nonAccordExtras.length;
  const columnStyles: Record<number, any> = {
    0: { cellWidth: 22, halign: 'center' },                          // REF
    [2 + off]: { halign: 'center', cellWidth: 14 },                  // TYPE (was col 2)
    [3 + off]: { halign: 'center', cellWidth: 14 },                  // TVA
    [4 + off]: { halign: 'center', cellWidth: 12 },                  // Qte
    [5 + off]: { halign: 'right', cellWidth: 24 },                   // P.U H.T
    [6 + off]: { halign: 'right', cellWidth: 26 },                   // Total H.T
    [prixTTCIndex]: { halign: 'right', cellWidth: 26 },              // Prix en TTC
  };
  if (showVetuste) columnStyles[2] = { halign: 'center', cellWidth: 16 }; // Vetuste
  // Counter columns (non-accord extras): render in red for visual parity with the editor.
  nonAccordExtras.forEach((c, i) => {
    if (c.kind === 'counter') {
      columnStyles[nonAccordStartIndex + i] = {
        halign: 'right',
        cellWidth: 24,
        textColor: [220, 38, 38],
        fontStyle: 'bold',
      };
    }
  });
  // Accord triples: right-aligned, slightly narrower so the triple fits.
  accordExtras.forEach((_c, i) => {
    const base = accordStartIndex + i * 3;
    columnStyles[base] = { halign: 'right', cellWidth: 20 };          // PU
    columnStyles[base + 1] = { halign: 'right', cellWidth: 22 };      // Total HT Accord
    columnStyles[base + 2] = { halign: 'right', cellWidth: 22 };      // Prix TTC Accord
  });

  // Shrink body font a notch when an accord triple is present — three extra
  // columns push A4 portrait to its limit.
  const tableFontSize = accordExtras.length > 0 ? 7.5 : 8.5;

  autoTable(pdf, {
    startY: blockY + blockH + 4,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: tableFontSize, cellPadding: 1.5, textColor: 20, lineColor: 120, lineWidth: 0.2 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold', halign: 'center' },
    columnStyles,
    margin: { left: margin, right: margin },
  });

  // ── Totals footer ───────────────────────────────────────────────────────
  // Two rows now: Total H.T and Total TTC Expert (Total TVA row dropped).
  // "Total TTC Expert" is wider than the former "Total TTC" label, so the
  // label column is given more room.
  const finalY = (pdf as any).lastAutoTable?.finalY || blockY + blockH + 4;
  const totalsY = finalY + 4;
  const totalsW = 78;
  const totalsX = pageW - margin - totalsW;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.rect(totalsX, totalsY, totalsW, 14);
  pdf.line(totalsX, totalsY + 7, totalsX + totalsW, totalsY + 7);
  pdf.line(totalsX + 38, totalsY, totalsX + 38, totalsY + 14);

  pdf.text('Total H.T', totalsX + 2, totalsY + 5);
  pdf.text('Total TTC Expert', totalsX + 2, totalsY + 12);

  pdf.setFont('helvetica', 'normal');
  pdf.text(formatFr(sumHT(devis.rows)), totalsX + totalsW - 2, totalsY + 5, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatFr(sumTTC(devis.rows)), totalsX + totalsW - 2, totalsY + 12, { align: 'right' });

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
