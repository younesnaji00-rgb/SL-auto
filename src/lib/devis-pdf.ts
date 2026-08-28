import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { t, intlLocale } from '@/i18n';
import { BRAND } from './brand';
import {
  type DevisSnapshot,
  type EditableDocType,
  formatFr,
  OBSERVATION_LABELS,
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
     * Optional click-to-place position for the stamp. When set, the stamp is
     * drawn at the given (page, xMm, yMm) anchor with `widthMm` width and
     * height auto-derived from the source aspect ratio. When absent and
     * `stampImage` is set, falls back to the legacy fixed position in the
     * identity block.
     */
    stampPlacement?: { page: number; xMm: number; yMm: number; widthMm: number } | null;
    /**
     * Overrides the PDF title. Used by accord/proposition-accord export flows
     * so the same renderer can produce a `Devis` / `Facture` / `Accord` /
     * `Proposition d'accord` header without threading docType-like enums.
     * Omitted = keep existing default title.
     */
    titleOverride?: 'Devis' | 'Facture' | 'Accord' | "Proposition d'accord";
    /**
     * Save-time collapse: render each accord/proposition extra as a SINGLE
     * "Prix Total Accordé/Proposé" column instead of the 3-column triple
     * (PU / Total HT / Prix TTC). The value rendered is HT when `sansTva`,
     * TTC otherwise. Matches the on-screen editor's last column.
     */
    collapseAccordToTotal?: boolean;
    /** Used together with `collapseAccordToTotal`. When true, render HT; else TTC. */
    sansTva?: boolean;
  }
): Blob {
  // Switch to landscape when an accord/proposition triple is present — A4 portrait
  // (190mm usable) cannot fit 11 columns without squeezing Designation to ~0 and
  // wrapping its text letter-by-letter. Landscape (277mm usable) gives breathing room.
  const hasAccordTriple = (devis.extraColumns ?? []).some(
    (c) => c?.kind === 'accord' || c?.kind === 'proposition-accord',
  );
  const hasObservations = devis.rows.some((r) => !!r.observation);
  const pdf = new jsPDF({
    orientation: hasAccordTriple ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });
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
  pdf.text(t(opts?.titleOverride ?? 'Devis'), margin + 2, margin + 10);

  // Devis N° + Date on the right
  const rightX = pageW - margin;
  const topBoxY = margin;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.rect(pageW - margin - 80, topBoxY, 80, 18);
  pdf.line(pageW - margin - 80, topBoxY + 9, pageW - margin, topBoxY + 9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(t('Devis N°'), pageW - margin - 77, topBoxY + 5.5);
  pdf.text(t('Date'), pageW - margin - 77, topBoxY + 14.5);
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
    [t('Marque'), devis.header.marque],
    [t('Matricule'), devis.header.matricule],
    [t('Modele'), devis.header.modele],
    [t('Kilometrage'), devis.header.kilometrage],
    [t('N° de chassis'), devis.header.chassis],
    [t('expert'), devis.header.expert],
  ];
  const rightRows: Array<[string, string]> = [
    [t('Client'), devis.header.client],
    [t('Adresse'), devis.header.adresse],
    [t('ICE'), devis.header.ice],
    [t('Telephone'), devis.header.telephone],
    [t('Assurances'), devis.header.assurances],
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
      const lines = split.slice(0, maxLines);
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

  // Optional user-uploaded stamp image. When `stampPlacement` is provided,
  // the stamp is drawn at the click-target page+coords with width preserved
  // from the placement spec (height auto from the source aspect ratio).
  // Otherwise, falls back to the legacy fixed rectangle in the identity
  // block's right column.
  if (opts?.stampImage && opts.stampImage.dataUrl) {
    const dataUrl = opts.stampImage.dataUrl;
    const format = dataUrl.startsWith('data:image/jpeg')
      || dataUrl.startsWith('data:image/jpg')
      ? 'JPEG'
      : 'PNG';
    if (opts.stampPlacement) {
      // Defer click-to-place rendering to AFTER autoTable so we can navigate
      // to the target page and the stamp lands on top of any table content.
      // Marker — actual draw happens after autoTable below.
    } else {
      const stampX = margin + colW + 40;
      const stampY = blockY + 22;
      const stampW = colW - 42;
      const stampH = 14;
      pdf.addImage(dataUrl, format, stampX, stampY, stampW, stampH);
    }
  }

  // ── Main table ──────────────────────────────────────────────────────────
  // Normalize extra columns from new (`extraColumns`) or legacy (`extraColumn`) shape.
  const extraCols: Array<{ id: string; label: string; values: Record<string, string>; kind?: 'counter' | 'default' | 'accord' | 'proposition-accord' }> =
    Array.isArray(devis.extraColumns) && devis.extraColumns.length > 0
      ? devis.extraColumns.filter((c) => !!c && !!c.label)
      : (devis.extraColumn && devis.extraColumn.label
          ? [{ id: 'legacy', label: devis.extraColumn.label, values: devis.extraColumn.values || {} }]
          : []);

  // Only accord / proposition-accord extras are rendered (as a triple:
  // PU / Total HT Accord / Prix TTC Accord). Non-accord extras (counters, etc.)
  // are intentionally omitted — the accord doc reflects the agreed values only.
  const accordExtras = extraCols.filter(
    (c) => c.kind === 'accord' || c.kind === 'proposition-accord'
  );

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

  const collapseAccord = opts?.collapseAccordToTotal === true;
  const sansTva = opts?.sansTva === true;

  // Build accord headers. Legacy mode renders a 3-column triple per extra
  // (PU label + Total HT + Prix TTC). Collapse mode renders a single
  // "Prix Total Accordé/Proposé" column per extra — matches the on-screen
  // editor's last column when the user clicks Sauvegarder.
  const accordTripleHeaders: string[] = accordExtras.flatMap((c) => {
    if (collapseAccord) {
      return [c.kind === 'accord' ? t('Prix Total Accordé') : t('Prix Total Proposé')];
    }
    const suffix = c.kind === 'accord' ? 'accordé' : 'proposé';
    return [t(c.label), t(`Total HT ${suffix}`), t(`Prix TTC ${suffix}`)];
  });

  // Proposition-only: append an extra empty column at the right edge to let a
  // 2nd expert hand-fill their agreement on the rendered PDF. Detected by the
  // presence of any `proposition-accord` extra; pure `accord` documents are
  // unchanged.
  const isProposition = accordExtras.some((c) => c.kind === 'proposition-accord');

  // Final accord/proposition document: garage values (P.U H.T, Total H.T,
  // Prix en TTC) are kept alongside the accord triples so the saved doc shows
  // both source and agreed values side by side. Vetuste and counter columns
  // remain omitted.
  const head: string[][] = [
    [
      t('REF'),
      t('Designation'),
      t('TYPE'),
      t('T.V.A'),
      t('Qte'),
      t('P.U H.T'),
      t('Total H.T'),
      t('Prix en TTC'),
      ...(hasObservations ? [t('Observation')] : []),
      ...accordTripleHeaders,
      ...(isProposition ? [t('Accord 2eme expert')] : []),
    ],
  ];

  const body = devis.rows.map((r) => {
    const tvaCell = r.tva == null ? '' : `${formatFr(r.tva, 0)}%`;
    const qteCell = r.qte == null ? '' : formatFr(r.qte, 0);
    const puHtCell = formatFr(r.puHT ?? 0);
    const tvaPct = typeof r.tva === 'number' && Number.isFinite(r.tva) ? r.tva : 0;
    const totalHt = rowTotalHT(r);
    const totalHtCell = formatFr(totalHt);
    const prixTtcCell = formatFr(totalHt * (1 + tvaPct / 100));
    const base = [
      r.ref || '',
      r.designation || '',
      r.type || '',
      tvaCell,
      qteCell,
      puHtCell,
      totalHtCell,
      prixTtcCell,
      ...(hasObservations ? [r.observation ? t(OBSERVATION_LABELS[r.observation]) : ''] : []),
    ];
    accordExtras.forEach((c) => {
      const pu = c.values[r.id] || '';
      if (collapseAccord) {
        const total = sansTva ? accordRowTotalHT(r, pu) : accordRowTTC(r, pu);
        base.push(formatFr(total));
      } else {
        base.push(pu);
        base.push(formatFr(accordRowTotalHT(r, pu)));
        base.push(formatFr(accordRowTTC(r, pu)));
      }
    });
    if (isProposition) {
      base.push('');
    }
    return base;
  });

  const accordStartIndex = hasObservations ? 9 : 8;
  // Designation must NEVER be cramped — set a generous `minCellWidth` floor and
  // shrink the other fixed columns first when horizontal space runs out (e.g.
  // proposition d'accord with an accord triple + 2eme expert column). The
  // numeric columns only ever show short values like "1 000,00", so a tighter
  // width still keeps the body readable while their headers may wrap to 2 lines.
  const columnStyles: Record<number, any> = {
    0: { cellWidth: 18, halign: 'center' },                       // REF
    1: { cellWidth: 'auto', minCellWidth: 50, halign: 'left' },   // Designation — never cramped
    2: { halign: 'center', cellWidth: 14 },                       // TYPE
    3: { halign: 'center', cellWidth: 12 },                       // T.V.A
    4: { halign: 'center', cellWidth: 12 },                       // Qte
  };
  columnStyles[5] = { halign: 'right', cellWidth: 22 };          // P.U H.T
  columnStyles[6] = { halign: 'right', cellWidth: 22 };          // Total H.T
  columnStyles[7] = { halign: 'right', cellWidth: 22 };          // Prix en TTC
  if (hasObservations) {
    columnStyles[8] = { halign: 'left', cellWidth: 22 };          // Observation
  }
  // Accord columns: legacy mode = triple per extra (PU / Total HT / Prix TTC);
  // collapse mode = single "Prix Total Accordé/Proposé" per extra.
  const accordColsPerExtra = collapseAccord ? 1 : 3;
  accordExtras.forEach((_c, i) => {
    const base = accordStartIndex + i * accordColsPerExtra;
    if (collapseAccord) {
      columnStyles[base] = { halign: 'right', cellWidth: 28 };        // Prix Total Accordé/Proposé
    } else {
      columnStyles[base] = { halign: 'right', cellWidth: 22 };          // PU
      columnStyles[base + 1] = { halign: 'right', cellWidth: 24 };      // Total HT Accord
      columnStyles[base + 2] = { halign: 'right', cellWidth: 24 };      // Prix TTC Accord
    }
  });
  if (isProposition) {
    const idx = accordStartIndex + accordExtras.length * accordColsPerExtra;
    columnStyles[idx] = { halign: 'center', cellWidth: 22 };          // Accord 2eme expert (empty)
  }

  // With landscape kicking in for accord triples (line 45), there's enough width
  // to keep the readable 8.5pt body font in all cases.
  const tableFontSize = 8.5;

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
  if (sansTva) {
    // Sans TVA: collapse to a single Total H.T row (7mm tall, no horizontal divider).
    pdf.rect(totalsX, totalsY, totalsW, 7);
    pdf.line(totalsX + 38, totalsY, totalsX + 38, totalsY + 7);
    pdf.text(t('Total H.T'), totalsX + 2, totalsY + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatFr(sumHT(devis.rows)), totalsX + totalsW - 2, totalsY + 5, { align: 'right' });
  } else {
    pdf.rect(totalsX, totalsY, totalsW, 14);
    pdf.line(totalsX, totalsY + 7, totalsX + totalsW, totalsY + 7);
    pdf.line(totalsX + 38, totalsY, totalsX + 38, totalsY + 14);

    pdf.text(t('Total H.T'), totalsX + 2, totalsY + 5);
    pdf.text(t('Total TTC Expert'), totalsX + 2, totalsY + 12);

    pdf.setFont('helvetica', 'normal');
    pdf.text(formatFr(sumHT(devis.rows)), totalsX + totalsW - 2, totalsY + 5, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatFr(sumTTC(devis.rows)), totalsX + totalsW - 2, totalsY + 12, { align: 'right' });
  }

  // ── Version watermark in footer ─────────────────────────────────────────
  if (opts?.author || opts?.versionTimestamp) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    const ts = opts.versionTimestamp ? opts.versionTimestamp.toLocaleString(intlLocale()) : '';
    const author = opts.author || '';
    pdf.text(
      `${t('Version generee le')} ${ts}${author ? ` ${t('par')} ${author}` : ''} — ${BRAND.companyName}`,
      margin,
      pdf.internal.pageSize.getHeight() - 6
    );
    pdf.setTextColor(20, 20, 20);
  }

  // ── Click-to-place stamp ────────────────────────────────────────────────
  // Drawn LAST so the stamp sits on top of any content at the user-chosen
  // anchor (xMm, yMm) on the target page. Width comes from the placement;
  // height is derived from the source aspect ratio. Placed after the
  // watermark so changing the active page here doesn't affect earlier draws.
  if (opts?.stampImage && opts.stampImage.dataUrl && opts.stampPlacement) {
    const { dataUrl } = opts.stampImage;
    const { page, xMm, yMm, widthMm } = opts.stampPlacement;
    const totalPages = (pdf as any).internal?.getNumberOfPages?.() ?? pdf.getNumberOfPages?.() ?? 1;
    const targetPage = Math.max(1, Math.min(totalPages, Math.round(page)));
    pdf.setPage(targetPage);
    const format = dataUrl.startsWith('data:image/jpeg')
      || dataUrl.startsWith('data:image/jpg')
      ? 'JPEG'
      : 'PNG';
    const aspect = opts.stampImage.height > 0
      ? opts.stampImage.width / opts.stampImage.height
      : 1;
    const heightMm = aspect > 0 ? widthMm / aspect : widthMm;
    pdf.addImage(dataUrl, format, xMm, yMm, widthMm, heightMm);
  }

  return pdf.output('blob');
}
