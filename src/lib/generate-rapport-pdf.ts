import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getDoc, getDocs, doc, collection, query, where } from 'firebase/firestore';
import { selectLatestAccord, devisRowToPiece } from './generate-rapport-shared';
import type { DevisRow } from './devis-schema';

export type Piece = {
  id: string;
  designation: string;
  operation: string;
  typePiece: string;
  vetuste: number;
  quantite: number;
  puHT: number;
  remise: number;
  typeChoc: string;
  tva: boolean;
  createdAt: any;
  /**
   * Accord round marker — propagated from the counter-devis upload metadata
   * (`send-to-chiffrage.ts` / `modal-chiffrage.tsx`). Used by `selectLatestAccord`
   * to scope the rapport PDF to the last accord only (task #10).
   */
  counterRoundOrder?: number | null;
};

// ── Constants ──────────────────────────────────────────────────────────
const COMPANY_NAME = 'SL AUTO EXPERTISE';
const COMPANY_ADDRESS = '219 BD MOHAMED ZERKTOUNI, Etage 6, Bureau 67, MAARIF - CASABLANCA 20060';
const COMPANY_TEL = '05 22 64 60 01';
const COMPANY_EMAIL = 'slautoexpertise@gmail.com';

const NAVY = [17, 24, 57] as const;   // Dark navy for text
const BORDER = [180, 180, 180] as const;
const HEADER_BG = [230, 235, 245] as const;

// ── Helpers ────────────────────────────────────────────────────────────
const fC = (val: number) =>
  (val || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tsToStr = (ts: any): string => {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, 'dd/MM/yyyy');
  } catch { return String(ts); }
};

async function fetchImageAsBase64(url: string): Promise<{ data: string; format: string } | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const fmt = blob.type.includes('png') ? 'PNG' : 'JPEG';
    return { data: dataUrl, format: fmt };
  } catch { return null; }
}

async function loadLocalImage(path: string): Promise<{ data: string; format: string } | null> {
  try {
    const resp = await fetch(path);
    const blob = await resp.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const fmt = blob.type.includes('png') ? 'PNG' : 'JPEG';
    return { data: dataUrl, format: fmt };
  } catch { return null; }
}

async function fetchCompagnieLogo(db: any, compagnieName: string): Promise<{ data: string; format: string } | null> {
  if (!compagnieName) return null;
  try {
    const snap = await getDocs(collection(db, 'compagnies'));
    for (const d of snap.docs) {
      const data = d.data();
      if (data.nom && data.nom.toLowerCase().trim() === compagnieName.toLowerCase().trim() && data.logoUrl) {
        return fetchImageAsBase64(data.logoUrl);
      }
    }
  } catch { /* ignore */ }
  return null;
}

// ── Main export ────────────────────────────────────────────────────────
export async function generateRapportPDF(db: any, dossierId: string, typeRapport?: string) {
  if (!db || !dossierId) return;

  // Fetch all data in parallel
  const [dossierSnap, piecesSnap, chiffrageSnap] = await Promise.all([
    getDoc(doc(db, 'dossiers', dossierId)),
    getDocs(collection(db, 'dossiers', dossierId, 'rapport_pieces')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'dossiers', dossierId, 'chiffrage')).catch(() => ({ docs: [] })),
  ]);

  if (!dossierSnap.exists()) {
    throw new Error(`Dossier ${dossierId} introuvable dans Firestore.`);
  }

  const dData = dossierSnap.data() || {};
  const refExpert = dData.refExpert || dossierId;
  const today = format(new Date(), 'dd/MM/yyyy');

  // Merge pieces from both subcollections, then keep only the last accord
  // round (task #10). See `selectLatestAccord` for the accord model details.
  const mergedPieces = [
    ...(piecesSnap as any).docs.map((s: any) => ({ id: s.id, ...s.data() })),
    ...(chiffrageSnap as any).docs.map((s: any) => ({ id: s.id, ...s.data() })),
  ] as Piece[];
  // Pull accordé rows from the new flow (task #3 writes here).
  const editables = (dData.structuredEditables || {}) as Record<string, { rows?: DevisRow[] }>;
  const accordeRows: DevisRow[] = [
    ...((editables['Devis accordé']?.rows) || []),
    ...((editables['Facture accordé']?.rows) || []),
  ];
  for (const r of accordeRows) {
    mergedPieces.push(devisRowToPiece(r) as Piece);
  }
  const allPieces = selectLatestAccord(mergedPieces);

  // Load logos in parallel
  const [slLogo, slText, compLogo] = await Promise.all([
    loadLocalImage('/images/logo.png'),
    loadLocalImage('/images/auto-expertise.png'),
    fetchCompagnieLogo(db, dData.compagnie || ''),
  ]);

  // Resolve vehicle data
  const v = dData.vehicule || {
    marque: dData.vehiculeMarque ?? dData.marque ?? '',
    modele: dData.vehiculeModele ?? dData.modele ?? '',
    immatriculation: dData.vehiculeMatricule ?? dData.matricule ?? '',
    serie: dData.vehiculeVIN ?? dData.serie ?? '',
    energie: dData.vehiculeEnergie ?? dData.energie ?? '',
    puissance: dData.vehiculePuissance ?? dData.puissance ?? '',
    km: dData.vehiculeKilometrage ?? dData.km ?? '',
    mec: dData.vehiculeMEC ?? dData.mec ?? null,
  };

  // Resolve assure data
  const a = typeof dData.assure === 'object' && dData.assure !== null
    ? dData.assure
    : {
        nom: dData.assureNom ?? (typeof dData.assure === 'string' ? dData.assure : '') ?? '',
        prenom: dData.assurePrenom ?? '',
        cin: dData.assureCIN ?? dData.cin ?? '',
        telephone: dData.assureTelephone ?? dData.telephone ?? '',
      };

  // Resolve adverse party data
  const adv = dData.partieAdverse || {};
  const hasAdversaire = dData.adverseNom || adv.assure;

  // Build subtitle from chiffrage type or nature
  const chiffrageLabel = dData.typeChiffrage && dData.sousTypeChiffrage
    ? `${dData.typeChiffrage} ${dData.sousTypeChiffrage}`
    : null;
  const subtitle = typeRapport || chiffrageLabel || dData.nature || '';

  // ── Create PDF ─────────────────────────────────────────────────────
  const pdf = new jsPDF();
  const pageW = 210;
  const marginL = 14;
  const marginR = 196;
  const contentW = marginR - marginL;

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER / SUMMARY
  // ═══════════════════════════════════════════════════════════════════

  let y = 10;

  // ── Header with logos ──────────────────────────────────────────────
  // SL logo left
  if (slLogo) {
    try { pdf.addImage(slLogo.data, slLogo.format, marginL, y, 15, 15); } catch { /* skip */ }
  }
  if (slText) {
    try { pdf.addImage(slText.data, slText.format, marginL, y + 16, 30, 8); } catch { /* skip */ }
  }

  // Title area (title removed per user request)

  if (subtitle) {
    pdf.setFontSize(11);
    pdf.text(subtitle.toUpperCase(), pageW / 2, y + 15, { align: 'center' });
  }

  // Compagnie logo right
  if (compLogo) {
    try { pdf.addImage(compLogo.data, compLogo.format, marginR - 25, y, 25, 20); } catch { /* skip */ }
  }

  y += 28;

  // ── Horizontal line ────────────────────────────────────────────────
  pdf.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  pdf.setLineWidth(0.5);
  pdf.line(marginL, y, marginR, y);
  y += 5;

  // ── Dossier Info Block ─────────────────────────────────────────────
  const drawLabelValue = (label: string, value: string, x: number, yy: number, labelW = 32) => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    pdf.text(label, x, yy);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40);
    pdf.text(value || '', x + labelW, yy);
  };

  // Row 1: Ref Expert + Pour le compte de
  drawLabelValue('Ref Expert :', refExpert, marginL, y, 24);
  drawLabelValue('Pour le compte de :', dData.compagnie || '', 110, y, 36);
  y += 5;

  // Bordered info box
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setLineWidth(0.3);
  const infoBoxY = y;
  pdf.rect(marginL, y, contentW, 16);
  y += 4;

  drawLabelValue('N° Dossier :', dData.refExpert || dossierId, marginL + 2, y, 22);
  drawLabelValue('Date Sinistre :', tsToStr(dData.dateSinistre), 110, y, 26);
  y += 5;
  drawLabelValue('Type Dossier :', dData.typeDossier || '', marginL + 2, y, 24);
  drawLabelValue('Date Requête :', tsToStr(dData.dateRequete), 110, y, 26);
  y += 5;
  drawLabelValue('', '', marginL + 2, y);
  drawLabelValue('Ref Compagnie :', dData.referenceCompagnie || '', 110, y, 28);
  y = infoBoxY + 16 + 4;

  // ── Assuré Section ─────────────────────────────────────────────────
  const drawSectionHeader = (title: string, yy: number) => {
    pdf.setFillColor(HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]);
    pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    pdf.rect(marginL, yy, contentW, 6, 'FD');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    pdf.text(title, marginL + 2, yy + 4);
    return yy + 6;
  };

  y = drawSectionHeader(`Assuré    Nom et Prenom : ${a.prenom || ''} ${a.nom || ''}`.trim(), y);

  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.rect(marginL, y, contentW, 16);
  const assureBoxY = y;
  y += 4;
  drawLabelValue('Véhicule :', `${v.marque || ''} ${v.modele || ''}`.trim(), marginL + 2, y, 20);
  drawLabelValue("Cie d'assurances :", dData.compagnie || '', 110, y, 32);
  y += 5;
  drawLabelValue('Immatriculation :', v.immatriculation || '', marginL + 2, y, 28);
  drawLabelValue('N° Police :', dData.policeNumber || '', 110, y, 20);
  y += 5;
  drawLabelValue('Type :', dData.typeDossier || '', marginL + 2, y, 14);
  drawLabelValue('Agent/Courtier :', dData.intermediaireNom || '', 110, y, 28);
  y = assureBoxY + 16 + 3;

  // ── Adversaire Section (conditional) ───────────────────────────────
  if (hasAdversaire) {
    const advName = `${dData.adversePrenom || ''} ${dData.adverseNom || adv.assure || ''}`.trim();
    y = drawSectionHeader(`Adversaire    Nom et Prenom : ${advName}`, y);

    pdf.rect(marginL, y, contentW, 11);
    const advBoxY = y;
    y += 4;
    drawLabelValue('Véhicule :', adv.marque || '', marginL + 2, y, 20);
    drawLabelValue("Cie d'assurances :", dData.adverseCompagnie || adv.compagnie || '', 110, y, 32);
    y += 5;
    drawLabelValue('Immatriculation :', dData.adverseMatricule || adv.matricule || '', marginL + 2, y, 28);
    drawLabelValue('N° Police :', adv.police || '', 110, y, 20);
    y = advBoxY + 11 + 3;
  }

  // ── Réparateur Section ─────────────────────────────────────────────
  if (dData.garageName) {
    y = drawSectionHeader('Réparateur', y);
    pdf.rect(marginL, y, contentW, 6);
    y += 4;
    drawLabelValue('Raison sociale :', dData.garageName || '', marginL + 2, y, 28);
    drawLabelValue('Garage Agréé :', dData.repairerType || '', 110, y, 26);
    y += 5;
  }

  // ── Caractéristiques techniques ────────────────────────────────────
  if (y > 220) { pdf.addPage(); y = 15; }

  y = drawSectionHeader('Caractéristiques techniques du véhicule expertisé', y);
  const techBoxH = 30;
  pdf.rect(marginL, y, contentW * 0.65, techBoxH);
  pdf.rect(marginL + contentW * 0.65, y, contentW * 0.35, techBoxH);

  // Tech details left
  let techY = y + 4;
  drawLabelValue('Véhicule :', `${v.marque || ''} ${v.modele || ''}`.trim(), marginL + 2, techY, 28);
  drawLabelValue('Type Mine :', '', 100, techY, 20);
  techY += 5;
  drawLabelValue('Immatriculation :', v.immatriculation || '', marginL + 2, techY, 28);
  drawLabelValue('N° Série :', v.serie || '', 100, techY, 18);
  techY += 5;
  drawLabelValue('Puissance fiscale :', v.puissance || '', marginL + 2, techY, 30);
  drawLabelValue('kilométrage :', v.km ? `${v.km}` : '', 100, techY, 22);
  techY += 5;
  drawLabelValue('Date mise en Cir :', v.mec ? tsToStr(v.mec) : '', marginL + 2, techY, 30);
  drawLabelValue('Energie :', v.energie || '', 100, techY, 18);
  techY += 5;
  drawLabelValue('Etat général :', '', marginL + 2, techY, 24);

  // Véhicule Vu right side
  const vuX = marginL + contentW * 0.65 + 2;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  pdf.text('Véhicule Vu', vuX + 15, y + 4, { align: 'center' });

  const vuStartY = y + 7;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Avant', vuX, vuStartY);
  pdf.text('Travaux', vuX, vuStartY + 3);
  pdf.line(vuX + 18, vuStartY - 1, vuX + contentW * 0.35 - 4, vuStartY - 1);
  pdf.line(vuX + 18, vuStartY + 4, vuX + contentW * 0.35 - 4, vuStartY + 4);

  pdf.text('En Cours', vuX, vuStartY + 10);
  pdf.text('Travaux', vuX, vuStartY + 13);
  pdf.line(vuX + 18, vuStartY + 9, vuX + contentW * 0.35 - 4, vuStartY + 9);
  pdf.line(vuX + 18, vuStartY + 14, vuX + contentW * 0.35 - 4, vuStartY + 14);

  pdf.text('Après', vuX, vuStartY + 20);
  pdf.text('Travaux', vuX, vuStartY + 23);
  pdf.line(vuX + 18, vuStartY + 19, vuX + contentW * 0.35 - 4, vuStartY + 19);
  pdf.line(vuX + 18, vuStartY + 24, vuX + contentW * 0.35 - 4, vuStartY + 24);

  y += techBoxH + 4;

  // ── Point de choc ──────────────────────────────────────────────────
  if (y > 220) { pdf.addPage(); y = 15; }

  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.rect(marginL, y, contentW, 30);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  pdf.text('Point de choc', marginL + contentW / 2, y + 5, { align: 'center' });

  // Draw simplified car outline
  const carX = marginL + contentW / 2 - 20;
  const carY = y + 8;
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(carX, carY, 40, 18, 3, 3, 'S');
  // Windshield lines
  pdf.line(carX + 8, carY, carX + 8, carY + 18);
  pdf.line(carX + 32, carY, carX + 32, carY + 18);

  // Mark active points
  const pc = dData.pointsChoc || {};
  const drawChocPoint = (cx: number, cy: number, active: boolean) => {
    if (active) {
      pdf.setFillColor(220, 50, 50);
      pdf.circle(cx, cy, 2, 'F');
    }
  };
  drawChocPoint(carX + 20, carY + 2, pc.AV);      // Front
  drawChocPoint(carX + 20, carY + 16, pc.AR);      // Rear
  drawChocPoint(carX + 2, carY + 9, pc.LATG);      // Left
  drawChocPoint(carX + 38, carY + 9, pc.LATD);     // Right
  drawChocPoint(carX + 20, carY + 9, pc.Toit);     // Roof

  y += 34;

  // ── Conclusions (Montants en DHS) ──────────────────────────────────
  if (y > 230) { pdf.addPage(); y = 15; }

  // Calculate totals
  let fHT = 0;
  let fTVA = 0;
  let totalVetuste = 0;
  allPieces.forEach(p => {
    const baseHT = p.puHT * p.quantite * (1 - p.remise / 100);
    const vetAmount = baseHT * (p.vetuste / 100);
    totalVetuste += vetAmount;
    const rowHT = baseHT - vetAmount;
    const rowTVA = p.tva ? rowHT * 0.2 : 0;
    fHT += rowHT;
    fTVA += rowTVA;
  });

  const mdo = dData.mainOeuvre || { tolerie: { nbrH: 0, pu: 0 }, peinture: { nbrH: 0, pu: 0 }, mecanique: { nbrH: 0, pu: 0 }, electrique: { nbrH: 0, pu: 0 } };
  let mHT = 0;
  Object.values(mdo).forEach((val: any) => { mHT += (val.nbrH || 0) * (val.pu || 0); });
  const mTVA = 0; // Main d'oeuvre TVA as shown in template

  const grandHT = fHT + mHT;
  const grandTVA = fTVA + mTVA;
  const grandTTC = grandHT + grandTVA;
  const franchise = dData.franchise || 0;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  pdf.text('Conclusions (Montants exprimés en DHS)', marginL, y + 4);
  y += 7;

  // Deductions table (left) + Totals table (right)
  autoTable(pdf, {
    startY: y,
    margin: { left: marginL },
    tableWidth: contentW,
    head: [['A déduire', '', 'HT', 'TVA', 'TTC']],
    body: [
      [`Vetusté :`, fC(totalVetuste), 'Fourniture', fC(fHT), fC(fTVA), fC(fHT + fTVA)],
      ['TVA :', fC(grandTVA), "Main d'oeuvre", fC(mHT), fC(mTVA), fC(mHT + mTVA)],
      ['Franchise :', fC(franchise), 'Totale', fC(grandHT), fC(grandTVA), fC(grandTTC)],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [NAVY[0], NAVY[1], NAVY[2]], textColor: [255, 255, 255] },
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'right' },
      2: { cellWidth: 40, fontStyle: 'bold' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
  });

  y = (pdf as any).lastAutoTable.finalY + 5;

  // Montant d'indemnisation
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  const indemnisation = grandTTC - franchise;
  pdf.text(`Montant d'indemnisation :   ${fC(indemnisation)}`, marginL + contentW / 2, y, { align: 'center' });
  y += 8;

  // Legal closing text
  if (y > 255) { pdf.addPage(); y = 15; }
  const montantEnLettres = dData.montantEnLettres || '';
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40, 40, 40);
  const closingText = `Arrêté le présent rapport d'expertise à la somme de : ${montantEnLettres ? montantEnLettres.toUpperCase() + ' DHS' : fC(indemnisation) + ' DHS'}
En foi de quoi,le présent rapport est établi en unique original pour servir et valoir ce que de droit, et sous réserves des droits des parties`;
  const splitClosing = pdf.splitTextToSize(closingText, contentW);
  pdf.text(splitClosing, marginL, y);
  y += splitClosing.length * 4 + 8;

  // Signature
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Signature', marginR - 20, y, { align: 'center' });
  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text('SLAUTO', marginR - 20, y, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 2+ — DETAIL TABLES
  // ═══════════════════════════════════════════════════════════════════
  pdf.addPage();
  y = 10;

  // Header on detail pages
  if (slLogo) {
    try { pdf.addImage(slLogo.data, slLogo.format, marginL, y, 12, 12); } catch { /* skip */ }
  }
  if (slText) {
    try { pdf.addImage(slText.data, slText.format, marginL, y + 13, 25, 6); } catch { /* skip */ }
  }

  // Title area (title removed per user request)

  if (compLogo) {
    try { pdf.addImage(compLogo.data, compLogo.format, marginR - 22, y, 22, 18); } catch { /* skip */ }
  }

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`REF EXPERT : ${refExpert}`, pageW / 2, y + 14, { align: 'center' });
  y += 24;

  // ── Detail Fournitures table ───────────────────────────────────────
  // Group pieces by typeChoc
  const chocGroups: Record<string, Piece[]> = {};
  allPieces.forEach(p => {
    const choc = p.typeChoc || 'Choc1';
    if (!chocGroups[choc]) chocGroups[choc] = [];
    chocGroups[choc].push(p);
  });

  for (const [chocName, pieces] of Object.entries(chocGroups)) {
    if (y > 240) { pdf.addPage(); y = 15; }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    pdf.text(`Detail Fournitures :    ${chocName}`, marginL, y);
    y += 4;

    let groupHT = 0;
    let groupTVA = 0;
    let groupVetuste = 0;
    const rows = pieces.map(p => {
      const baseHT = p.puHT * p.quantite * (1 - p.remise / 100);
      const vet = baseHT * (p.vetuste / 100);
      groupVetuste += vet;
      const rowHT = baseHT - vet;
      const rowTVA = p.tva ? rowHT * 0.2 : 0;
      groupHT += rowHT;
      groupTVA += rowTVA;
      return [p.designation, p.typePiece || '', p.operation || '', p.vetuste || 0, p.quantite || 1, fC(p.puHT), fC(p.puHT * p.quantite)];
    });

    autoTable(pdf, {
      startY: y,
      margin: { left: marginL, right: pageW - marginR },
      head: [['Designation', 'Type Pièce', 'Opé', 'Vet', 'Qte', 'P.U.HT', 'Total HT']],
      body: rows,
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: [NAVY[0], NAVY[1], NAVY[2]], textColor: [255, 255, 255], fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 55 },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
      theme: 'grid',
    });

    y = (pdf as any).lastAutoTable.finalY + 3;

    // Totale row for this group
    autoTable(pdf, {
      startY: y,
      margin: { left: marginL, right: pageW - marginR },
      body: [
        ['Totale', `Vétusté : ${fC(groupVetuste)}`, `Ht : ${fC(groupHT)}`, `TVA : ${fC(groupTVA)}`, `TTC : ${fC(groupHT + groupTVA)}`],
      ],
      styles: { fontSize: 8, fontStyle: 'bold', cellPadding: 2 },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 20 },
      },
    });

    y = (pdf as any).lastAutoTable.finalY + 8;
  }

  // ── Main d'oeuvre table ────────────────────────────────────────────
  if (y > 230) { pdf.addPage(); y = 15; }

  // Group by choc if applicable, otherwise single table
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  pdf.text("Main d'oeuvre :    Choc 1", marginL, y);
  y += 4;

  const mdoLabels: Record<string, string> = { tolerie: 'Tolerie', peinture: 'Peinture', mecanique: 'Mecanique', electrique: 'Electrique' };
  let mdoTotalHT = 0;
  let mdoTotalTVA = 0;
  const mdoRows = Object.entries(mdo).map(([key, val]: [string, any]) => {
    const rowHT = (val.nbrH || 0) * (val.pu || 0);
    const rowTVA = 0; // As shown in template
    mdoTotalHT += rowHT;
    mdoTotalTVA += rowTVA;
    return [mdoLabels[key] || key, val.nbrH || 0, val.pu || 0, fC(rowHT), fC(rowTVA), fC(rowHT + rowTVA)];
  });

  autoTable(pdf, {
    startY: y,
    margin: { left: marginL, right: pageW - marginR },
    head: [['Main d\'oeuvre', 'NBR Heurs', 'Taux HT', 'Montant HT', 'TVA', 'Montant TTC']],
    body: mdoRows,
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { fillColor: [NAVY[0], NAVY[1], NAVY[2]], textColor: [255, 255, 255], fontSize: 8 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    theme: 'grid',
  });

  y = (pdf as any).lastAutoTable.finalY + 3;

  // Main d'oeuvre totale
  autoTable(pdf, {
    startY: y,
    margin: { left: marginL, right: pageW - marginR },
    body: [
      ['', 'Totale', `Ht : ${fC(mdoTotalHT)}`, `TVA : ${fC(mdoTotalTVA)}`, `TTC : ${fC(mdoTotalHT + mdoTotalTVA)}`],
    ],
    styles: { fontSize: 8, fontStyle: 'bold', cellPadding: 2 },
    theme: 'grid',
  });

  y = (pdf as any).lastAutoTable.finalY + 8;

  // ── Observation ────────────────────────────────────────────────────
  if (y > 250) { pdf.addPage(); y = 15; }

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  pdf.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  pdf.text('Observation', marginL, y);
  pdf.line(marginL, y + 1, marginL + 20, y + 1);
  y += 6;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40, 40, 40);
  const obs = dData.observationExpert || '';
  if (obs) {
    const splitObs = pdf.splitTextToSize(obs, contentW);
    pdf.text(splitObs, marginL, y);
    y += splitObs.length * 4 + 5;
  }

  // ═══════════════════════════════════════════════════════════════════
  // FOOTER on all pages
  // ═══════════════════════════════════════════════════════════════════
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
    pdf.setLineWidth(0.3);
    pdf.line(marginL, 280, marginR, 280);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    pdf.text(COMPANY_NAME, marginL, 284);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text(COMPANY_ADDRESS, marginL, 288);
    pdf.text(`Tele : ${COMPANY_TEL} / Email : ${COMPANY_EMAIL}`, marginL, 291);

    pdf.setFontSize(7);
    pdf.text(`Rapport établi le : ${today}`, marginR, 288, { align: 'right' });
  }

  // ── Save ───────────────────────────────────────────────────────────
  const fileLabel = subtitle ? `Rapport_${subtitle.replace(/\s+/g, '_')}` : 'Rapport_Expertise';
  pdf.save(`${fileLabel}_${refExpert}_${today.replace(/\//g, '-')}.pdf`);
}
