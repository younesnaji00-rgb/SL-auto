/**
 * Préliminaire rapport generator — 2 pages, matching screenshot 1.
 *
 * Populates:
 *   - Page 1: title box, ref/sinistre/assuré/GSM table, soussignés paragraph,
 *     caractéristique technique table, POSITION DU 1ER EXPERT block (réparation
 *     checkbox + table of fournitures / main d'oeuvre / totals + réforme eco /
 *     tech checkboxes + valeur vénale / épave / différence table).
 *   - Page 2: Annexe 4 header, POSITION DU 2ÈME EXPERT block (blank), observation
 *     lines, closing text, signature columns.
 *
 * Data source:
 *   - `dossiers/{id}` for dossier / vehicule / assuré fields.
 *   - `dossiers/{id}/chiffrage` + `dossiers/{id}/rapport_pieces` for pieces.
 *   - `dossiers/{id}.mainOeuvre` for structured main d'oeuvre categories.
 *   - `dossiers/{id}.reforme` for valeur vénale / épave / type réforme.
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { getDoc, getDocs, doc, collection } from 'firebase/firestore';
import {
  Piece,
  NAVY,
  fC,
  tsToStr,
  loadLocalImage,
  fetchCompagnieLogo,
  selectLatestAccord,
} from './generate-rapport-shared';

type Rgb = readonly [number, number, number];

// Position-du-1er-expert computed values. Covers task #9 requirements.
interface PositionBreakdown {
  reparation: boolean;
  fournitures: number;
  mdoTolerie: number;
  mdoPeinture: number;
  mdoMecanique: number;
  totalBrut: number;
  vetuste: number;
  totalNet: number;
  reformeEconomique: boolean;
  reformeTechnique: boolean;
  valeurVenale: number;
  valeurEpave: number;
  difference: number;
}

interface MainOeuvreEntry {
  nbrH?: number;
  pu?: number;
}
interface MainOeuvreStruct {
  tolerie?: MainOeuvreEntry;
  peinture?: MainOeuvreEntry;
  mecanique?: MainOeuvreEntry;
  electrique?: MainOeuvreEntry;
}
interface ReformeBlock {
  typeReforme?: string;
  valeurVenale?: number;
  valeurEpave?: number;
  difference?: number;
}

function computePosition(
  pieces: Piece[],
  mdo: MainOeuvreStruct,
  reforme: ReformeBlock | undefined
): PositionBreakdown {
  let fournitures = 0;
  let vetuste = 0;
  pieces.forEach((p) => {
    const baseHT = (p.puHT || 0) * (p.quantite || 0) * (1 - (p.remise || 0) / 100);
    const vet = baseHT * ((p.vetuste || 0) / 100);
    vetuste += vet;
    fournitures += baseHT;
  });

  const hours = (e?: MainOeuvreEntry) => (e?.nbrH || 0) * (e?.pu || 0);
  const mdoTolerie = hours(mdo.tolerie);
  const mdoPeinture = hours(mdo.peinture);
  const mdoMecanique = hours(mdo.mecanique) + hours(mdo.electrique);

  const totalBrut = fournitures + mdoTolerie + mdoPeinture + mdoMecanique;
  const totalNet = Math.max(0, totalBrut - vetuste);

  const typeReforme = (reforme?.typeReforme || '').toLowerCase();
  const reformeEconomique = typeReforme.includes('econom') || typeReforme.includes('économ');
  const reformeTechnique = typeReforme.includes('techni');
  const reparation = !reformeEconomique && !reformeTechnique && totalBrut > 0;

  const valeurVenale = Number(reforme?.valeurVenale) || 0;
  const valeurEpave = Number(reforme?.valeurEpave) || 0;
  const difference =
    Number(reforme?.difference) || valeurVenale - valeurEpave;

  return {
    reparation,
    fournitures,
    mdoTolerie,
    mdoPeinture,
    mdoMecanique,
    totalBrut,
    vetuste,
    totalNet,
    reformeEconomique,
    reformeTechnique,
    valeurVenale,
    valeurEpave,
    difference,
  };
}

// ── Primitive drawing helpers ──────────────────────────────────────────
function setTextNavy(pdf: jsPDF) {
  pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
}

function drawBoxTitle(pdf: jsPDF, x: number, y: number, w: number, label: string): number {
  const h = 8;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.4);
  pdf.rect(x, y, w, h);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(label, x + w / 2, y + h / 2 + 1.2, { align: 'center' });
  return y + h;
}

function drawKeyValueTable(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  rows: Array<[string, string]>
): number {
  const rowH = 6;
  const labelW = 35;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.25);
  pdf.setFontSize(9);
  rows.forEach((r, i) => {
    const ry = y + i * rowH;
    pdf.rect(x, ry, w, rowH);
    pdf.line(x + labelW, ry, x + labelW, ry + rowH);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(r[0], x + 2, ry + rowH / 2 + 1.3);
    pdf.setFont('helvetica', 'normal');
    pdf.text(r[1] || '', x + labelW + 2, ry + rowH / 2 + 1.3);
  });
  return y + rows.length * rowH;
}

function drawCheckbox(pdf: jsPDF, x: number, y: number, checked: boolean) {
  const s = 3.5;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, s, s);
  if (checked) {
    pdf.setLineWidth(0.6);
    pdf.line(x + 0.5, y + s / 2, x + s / 2, y + s - 0.5);
    pdf.line(x + s / 2, y + s - 0.5, x + s - 0.3, y + 0.4);
    pdf.setLineWidth(0.3);
  }
}

function drawUnderlinedLabel(pdf: jsPDF, x: number, y: number, text: string) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  setTextNavy(pdf);
  pdf.text(text, x, y);
  const w = pdf.getTextWidth(text);
  pdf.setLineWidth(0.3);
  pdf.line(x, y + 0.8, x + w, y + 0.8);
}

function drawDottedLine(pdf: jsPDF, x1: number, y: number, x2: number) {
  pdf.setLineDashPattern([0.6, 1.2], 0);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(x1, y, x2, y);
  pdf.setLineDashPattern([], 0);
}

// Position-du-expert sub-block (shared between 1er and 2ème renderings).
function drawPositionBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  rank: string,
  data: PositionBreakdown | null // null = blank 2ème expert
): number {
  // Header bullet + label
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  setTextNavy(pdf);
  pdf.text('\u2022', x, y);
  drawUnderlinedLabel(pdf, x + 4, y, `POSITION DU ${rank} :`);
  y += 6;

  // Sub-label: ESTIMATION DES DOMMAGES
  drawUnderlinedLabel(pdf, x + 4, y, 'ESTIMATION DES DOMMAGES :');
  y += 5;

  // Réparation checkbox
  drawCheckbox(pdf, x + 4, y - 3, !!data?.reparation);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Réparation', x + 10, y);
  y += 3;

  // 2-col table: Désignation | Valeur estimée
  const rowH = 5.5;
  const leftW = w * 0.62;
  const rightW = w - leftW;
  const labels: Array<[string, number]> = [
    ['Fournitures', data?.fournitures ?? 0],
    ["Main d'oeuvre tôlerie", data?.mdoTolerie ?? 0],
    ["Main d'oeuvre peinture", data?.mdoPeinture ?? 0],
    ["Main d'oeuvre mécanique", data?.mdoMecanique ?? 0],
    ['Total brut', data?.totalBrut ?? 0],
    ['À déduire vétusté', data?.vetuste ?? 0],
    ['Total net', data?.totalNet ?? 0],
  ];
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.25);
  // Header row
  pdf.setFillColor(240, 240, 240);
  pdf.rect(x, y, leftW, rowH, 'FD');
  pdf.rect(x + leftW, y, rightW, rowH, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('Désignation', x + 2, y + rowH / 2 + 1.2);
  pdf.text('Valeur estimée', x + leftW + 2, y + rowH / 2 + 1.2);
  y += rowH;
  pdf.setFont('helvetica', 'normal');
  labels.forEach(([label, val], i) => {
    const emphasize = label === 'Total brut' || label === 'Total net';
    pdf.rect(x, y, leftW, rowH);
    pdf.rect(x + leftW, y, rightW, rowH);
    pdf.setFont('helvetica', emphasize ? 'bold' : 'normal');
    pdf.text(label, x + 2, y + rowH / 2 + 1.2);
    const txt = data ? `${fC(val)} DHS` : '';
    pdf.text(txt, x + w - 2, y + rowH / 2 + 1.2, { align: 'right' });
    y += rowH;
    // no-op visual check on index
    void i;
  });
  y += 2;

  // Réforme checkboxes
  drawCheckbox(pdf, x + 4, y - 3, !!data?.reformeEconomique);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Réforme Economique', x + 10, y);
  drawCheckbox(pdf, x + 70, y - 3, !!data?.reformeTechnique);
  pdf.text('Réforme Technique', x + 76, y);
  y += 4;

  // Valeur vénale / épave / différence table
  const vRowH = 5.5;
  const vLeftW = w * 0.62;
  const vRightW = w - vLeftW;
  const vrows: Array<[string, number]> = [
    ['Valeur Vénale', data?.valeurVenale ?? 0],
    ['Valeur épave', data?.valeurEpave ?? 0],
    ['Différence des valeurs', data?.difference ?? 0],
  ];
  pdf.setFillColor(240, 240, 240);
  pdf.rect(x, y, vLeftW, vRowH, 'FD');
  pdf.rect(x + vLeftW, y, vRightW, vRowH, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('Désignation', x + 2, y + vRowH / 2 + 1.2);
  pdf.text('Valeur estimée', x + vLeftW + 2, y + vRowH / 2 + 1.2);
  y += vRowH;
  vrows.forEach(([label, val]) => {
    pdf.rect(x, y, vLeftW, vRowH);
    pdf.rect(x + vLeftW, y, vRightW, vRowH);
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, x + 2, y + vRowH / 2 + 1.2);
    const txt = data ? `${fC(val)} DHS` : '';
    pdf.text(txt, x + w - 2, y + vRowH / 2 + 1.2, { align: 'right' });
    y += vRowH;
  });

  return y;
}

// ── Main export ────────────────────────────────────────────────────────
export async function generateRapportPreliminairePDF(
  db: unknown,
  dossierId: string
): Promise<void> {
  if (!db || !dossierId) return;

  // Firestore data fetch. Typed as unknown + narrowed to avoid SDK type imports.
  // Task #10: after merging the two subcollections below, `selectLatestAccord`
  // scopes the piece set to the latest accord round (piece-level versioning via
  // the optional `counterRoundOrder` field).
  const database = db as Parameters<typeof doc>[0];
  const [dossierSnap, piecesSnap, chiffrageSnap] = await Promise.all([
    getDoc(doc(database, 'dossiers', dossierId)),
    getDocs(collection(database, 'dossiers', dossierId, 'rapport_pieces')).catch(
      () => ({ docs: [] as Array<{ id: string; data: () => Record<string, unknown> }> })
    ),
    getDocs(collection(database, 'dossiers', dossierId, 'chiffrage')).catch(
      () => ({ docs: [] as Array<{ id: string; data: () => Record<string, unknown> }> })
    ),
  ]);

  if (!dossierSnap.exists()) {
    throw new Error(`Dossier ${dossierId} introuvable dans Firestore.`);
  }

  const dData = (dossierSnap.data() || {}) as Record<string, unknown>;
  const refExpert = (dData.refExpert as string) || dossierId;
  const today = format(new Date(), 'dd/MM/yyyy');

  const mergedPieces: Piece[] = [
    ...(piecesSnap as { docs: Array<{ id: string; data: () => Record<string, unknown> }> }).docs.map(
      (s) => ({ id: s.id, ...(s.data() as object) } as Piece)
    ),
    ...(chiffrageSnap as { docs: Array<{ id: string; data: () => Record<string, unknown> }> }).docs.map(
      (s) => ({ id: s.id, ...(s.data() as object) } as Piece)
    ),
  ];
  // Keep only pieces belonging to the last accord round (task #10).
  const allPieces: Piece[] = selectLatestAccord(mergedPieces);

  // Logos (best-effort).
  const [slLogo, compLogo] = await Promise.all([
    loadLocalImage('/images/logo.png'),
    fetchCompagnieLogo(database as unknown as Parameters<typeof fetchCompagnieLogo>[0], (dData.compagnie as string) || ''),
  ]);

  // Vehicule resolution (same pattern as the réforme generator).
  const vRaw = (dData.vehicule as Record<string, unknown>) || {};
  const v = {
    marque: (vRaw.marque as string) ?? (dData.vehiculeMarque as string) ?? (dData.marque as string) ?? '',
    modele: (vRaw.modele as string) ?? (dData.vehiculeModele as string) ?? (dData.modele as string) ?? '',
    immatriculation:
      (vRaw.immatriculation as string) ??
      (dData.vehiculeMatricule as string) ??
      (dData.matricule as string) ??
      '',
    serie: (vRaw.serie as string) ?? (dData.vehiculeVIN as string) ?? (dData.serie as string) ?? '',
    energie: (vRaw.energie as string) ?? (dData.vehiculeEnergie as string) ?? (dData.energie as string) ?? '',
    puissance:
      (vRaw.puissance as string) ?? (dData.vehiculePuissance as string) ?? (dData.puissance as string) ?? '',
    km: (vRaw.km as string) ?? (dData.vehiculeKilometrage as string) ?? (dData.km as string) ?? '',
    mec: vRaw.mec ?? (dData.vehiculeMEC as unknown) ?? (dData.mec as unknown) ?? null,
    cylindre: (vRaw.cylindre as string) ?? (dData.vehiculeCylindre as string) ?? '',
    carburant: (vRaw.carburant as string) ?? (vRaw.energie as string) ?? '',
  };

  // Assuré resolution.
  const aRaw = dData.assure;
  const a =
    typeof aRaw === 'object' && aRaw !== null
      ? (aRaw as { nom?: string; prenom?: string; telephone?: string })
      : {
          nom:
            (dData.assureNom as string) ??
            (typeof aRaw === 'string' ? aRaw : '') ??
            '',
          prenom: (dData.assurePrenom as string) ?? '',
          telephone: (dData.assureTelephone as string) ?? (dData.telephone as string) ?? '',
        };

  const compagnie = (dData.compagnie as string) || '';
  const matricule = v.immatriculation || (dData.matricule as string) || '';
  const policeNumber = (dData.policeNumber as string) || '';

  const mdo = (dData.mainOeuvre as MainOeuvreStruct | undefined) || {};
  const reforme = dData.reforme as ReformeBlock | undefined;
  const position = computePosition(allPieces, mdo, reforme);

  // ── Create PDF ────────────────────────────────────────────────────
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210;
  const marginL = 14;
  const marginR = 196;
  const contentW = marginR - marginL;

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 1
  // ═══════════════════════════════════════════════════════════════════
  let y = 12;

  // Optional: small SL logo + compagnie logo in the corners (kept subtle
  // since the screenshot shows the title box as the dominant element).
  if (slLogo) {
    try {
      pdf.addImage(slLogo.data, slLogo.format, marginL, y, 14, 14);
    } catch {
      /* skip */
    }
  }
  if (compLogo) {
    try {
      pdf.addImage(compLogo.data, compLogo.format, marginR - 22, y, 22, 16);
    } catch {
      /* skip */
    }
  }
  y += 17;

  // Title box
  y = drawBoxTitle(
    pdf,
    marginL,
    y,
    contentW,
    "RAPPORT D'EXPERTSE PRÉLIMINAIRE -CLASSIQUE"
  );
  y += 4;

  // Ref / Sinistre du / Assuré / GSM table
  const assureFullName = `${a.prenom || ''} ${a.nom || ''}`.trim();
  y = drawKeyValueTable(pdf, marginL, y, contentW, [
    ['N/Réf', refExpert],
    ['Sinistre du', tsToStr(dData.dateSinistre)],
    ['Assuré', assureFullName],
    ['GSM', a.telephone || ''],
  ]);
  y += 4;

  // Soussignés paragraph
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Entre les soussignés:', marginL, y);
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const soussignes =
    `Monsieur SLAUTO, Expert désigné par la compagnie ${compagnie || '............'}. ` +
    `Assureur du véhicule immatriculé ${matricule || '...........'} par la police N° ${policeNumber || '...........'}. ` +
    `Et Monsieur ......, Expert désigné par la compagnie assureur du ........... ` +
    `véhicule immatriculé .......... par la police N° ........... ` +
    `A l'effet de procéder à l'estimation contradictoire des dommages subis par ${assureFullName || '................................................'} ` +
    `dont les caractéristiques se présentent comme suit:`;
  const splitSous = pdf.splitTextToSize(soussignes, contentW);
  pdf.text(splitSous, marginL, y);
  y += splitSous.length * 4 + 3;

  // Caracteristique technique title
  drawUnderlinedLabel(pdf, marginL, y, 'CARACTERISITIQUE TECHNIQUE DU VEHICULE :');
  y += 4;

  // 2-column caracteristique table
  const colLabelW = 28;
  const colValueW = contentW / 2 - colLabelW;
  const ctRows: Array<Array<[string, string]>> = [
    [
      ['Marque', `${v.marque || ''} ${v.modele || ''}`.trim()],
      ['Châssis', v.serie || ''],
    ],
    [
      ['Type', (dData.typeDossier as string) || ''],
      ['Puissance', v.puissance || ''],
    ],
    [
      ['DMC', v.mec ? tsToStr(v.mec) : ''],
      ['Carburant', v.carburant || v.energie || ''],
    ],
    [
      ['Cylindre', v.cylindre || ''],
      ['Kilométrages', v.km ? `${v.km}` : ''],
    ],
  ];
  const ctRowH = 6;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.25);
  pdf.setFontSize(9);
  ctRows.forEach((row) => {
    let cx = marginL;
    row.forEach(([label, val]) => {
      pdf.rect(cx, y, colLabelW, ctRowH);
      pdf.rect(cx + colLabelW, y, colValueW, ctRowH);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, cx + 2, y + ctRowH / 2 + 1.3);
      pdf.setFont('helvetica', 'normal');
      pdf.text(val || '', cx + colLabelW + 2, y + ctRowH / 2 + 1.3);
      cx += colLabelW + colValueW;
    });
    y += ctRowH;
  });
  y += 4;

  // POSITION DU 1ER EXPERT (populated)
  y = drawPositionBlock(pdf, marginL, y, contentW, '1ER EXPERT', position);

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 2
  // ═══════════════════════════════════════════════════════════════════
  pdf.addPage();
  y = 12;

  // Top header line (Annexe 4)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(
    "ANNEXE 4 : RAPPORT D'EXPERTSE PRÉLIMINAIRE - CLASSIQUE",
    pageW / 2,
    y,
    { align: 'center' }
  );
  y += 6;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.4);
  pdf.line(marginL, y, marginR, y);
  y += 4;

  // POSITION DU 2ÈME EXPERT — blank
  y = drawPositionBlock(pdf, marginL, y, contentW, '2ÈME EXPERT', null);
  y += 6;

  // OBSERVATION block
  drawUnderlinedLabel(pdf, marginL, y, 'OBSERVATION OU MOTIF DE DÉSACCORD :');
  y += 5;
  for (let i = 0; i < 4; i++) {
    drawDottedLine(pdf, marginL, y, marginR);
    y += 6;
  }
  y += 2;

  // Closing line
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  const closing =
    'En foi de quoi, la présente minute est établie pour servir et valoir ce que de droit';
  const splitClosing = pdf.splitTextToSize(closing, contentW);
  pdf.text(splitClosing, marginL, y);
  y += splitClosing.length * 4 + 6;

  // Signature columns
  const colW = contentW / 2 - 4;
  const leftX = marginL;
  const rightX = marginL + colW + 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Fait à CASABLANCA , LE ${today}`, leftX, y);
  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.text('EXPERT DE LA COMPAGNIE', leftX, y);
  pdf.text('EXPERT DE LA COMPAGNIE', rightX, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.text(compagnie || '............', leftX, y);
  drawDottedLine(pdf, rightX, y, rightX + colW);
  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('SLAUTO', leftX, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Cabinet ......', rightX, y);

  // Save
  const fileName = `Rapport_Preliminaire_${refExpert}_${today.replace(/\//g, '-')}.pdf`;
  pdf.save(fileName);

  // Mark unused imports so tree-shaking is honest; palette constants are
  // imported for future use by cross-template tweaks.
  void (NAVY as Rgb);
}
