import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getDoc, getDocs, doc, collection } from 'firebase/firestore';

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
};

export async function generateRapportPDF(db: any, dossierId: string, typeRapport?: string) {
  if (!db || !dossierId) return;

  // FIX 2 — Broaden the Firestore data fetch
  const [dossierSnap, piecesSnap, photosSnap, chiffrageSnap, documentsSnap] = await Promise.all([
    getDoc(doc(db, 'dossiers', dossierId)),
    getDocs(collection(db, 'dossiers', dossierId, 'rapport_pieces')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'dossiers', dossierId, 'photos')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'dossiers', dossierId, 'chiffrage')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'dossiers', dossierId, 'documents')).catch(() => ({ docs: [] })),
  ]);

  // FIX 6 — Guard against empty dossier data
  if (!dossierSnap.exists()) {
    throw new Error(`Dossier ${dossierId} introuvable dans Firestore.`);
  }

  const dData = dossierSnap.data() || {};
  const refExpert = dData.refExpert || dossierId;

  // Merge pieces from both subcollections so the PDF is never empty (FIX 2)
  const allPieces = [
    ...(piecesSnap as any).docs.map((s: any) => ({ id: s.id, ...s.data() })),
    ...(chiffrageSnap as any).docs.map((s: any) => ({ id: s.id, ...s.data() })),
  ] as Piece[];

  // Merge photos from both photo sources (FIX 2)
  const photos = [
    ...(photosSnap as any).docs.map((s: any) => s.data()),
    ...(documentsSnap as any).docs
      .map((s: any) => s.data())
      .filter((d: any) => d.type?.startsWith('image') || d.url || d.fileType?.startsWith('image')),
  ];

  const pdf = new jsPDF();
  const today = format(new Date(), 'dd/MM/yyyy');
  const fC = (val: number) => (val || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // COLORS
  const PRIMARY_BLUE = [37, 99, 235];
  const LIGHT_GRAY = [241, 245, 249];
  const BORDER_COLOR = [226, 232, 240];

  // 2. HEADER
  pdf.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  pdf.rect(0, 0, 210, 40, 'F');
  
  // Build title from rapport type: e.g. "Définitif" → "RAPPORT DÉFINITIF"
  const rapportTitle = typeRapport
    ? `RAPPORT ${typeRapport.toUpperCase()}`
    : 'RAPPORT D\'EXPERTISE';

  pdf.setFontSize(24);
  pdf.setTextColor(255);
  pdf.setFont("helvetica", "bold");
  pdf.text(rapportTitle, 14, 25);
  
  pdf.setFontSize(10);
  pdf.text(`Réf: ${refExpert}`, 14, 32);
  pdf.text(`Date d'édition: ${today}`, 196, 32, { align: 'right' });

  let y = 50;

  // 3. INFORMATION CARDS
  const drawInfoBlock = (title: string, data: [string, string][], x: number, y: number, w: number) => {
    pdf.setFontSize(11);
    pdf.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, x, y);
    
    pdf.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    pdf.line(x, y + 2, x + w, y + 2);
    
    let curY = y + 8;
    pdf.setFontSize(9);
    data.forEach(([label, value]) => {
      pdf.setTextColor(100);
      pdf.setFont("helvetica", "normal");
      pdf.text(label, x, curY);
      pdf.setTextColor(30);
      pdf.setFont("helvetica", "bold");
      pdf.text(value, x + 35, curY);
      curY += 6;
    });
    return curY;
  };

  // FIX 3 — Fix the vehicule field mapping
  const v = dData.vehicule || {
    marque:         dData.vehiculeMarque        ?? dData.marque        ?? '',
    modele:         dData.vehiculeModele        ?? dData.modele        ?? '',
    immatriculation:dData.vehiculeMatricule     ?? dData.matricule     ?? '',
    serie:          dData.vehiculeVIN           ?? dData.serie         ?? '',
    energie:        dData.vehiculeEnergie       ?? dData.energie       ?? '',
    puissance:      dData.vehiculePuissance     ?? dData.puissance     ?? '',
    km:             dData.vehiculeKilometrage   ?? dData.km            ?? '',
    mec:            dData.vehiculeMEC           ?? dData.mec           ?? null,
  };

  const vData: [string, string][] = [
    ['Marque:', v.marque || '-'],
    ['Modèle:', v.modele || '-'],
    ['Immatriculation:', v.immatriculation || '-'],
    ['Date MEC:', v.mec ? (v.mec.toDate ? format(v.mec.toDate(), 'dd/MM/yyyy') : v.mec) : '-'],
    ['Énergie:', v.energie || '-'],
    ['Kilométrage:', v.km ? `${v.km} km` : '-']
  ];

  // FIX 4 — Fix the assure field mapping
  const a = typeof dData.assure === 'object' && dData.assure !== null
    ? dData.assure
    : {
        nom:       dData.assureNom       ?? (typeof dData.assure === 'string' ? dData.assure : '') ?? '',
        prenom:    dData.assurePrenom    ?? '',
        cin:       dData.assureCIN       ?? dData.cin       ?? '',
        telephone: dData.assureTelephone ?? dData.telephone ?? '',
        adresse:   dData.assureAdresse   ?? dData.adresse   ?? '',
        ville:     dData.assureVille     ?? dData.ville     ?? '',
      };

  const aData: [string, string][] = [
    ['Assuré:', `${a.prenom || ''} ${a.nom || ''}`.trim()],
    ['CIN:', a.cin || '-'],
    ['Téléphone:', a.telephone || '-'],
    ['Compagnie:', dData.compagnie || '-'],
    ['N° Police:', dData.policeNumber || '-'],
    ['N° Sinistre:', dData.referenceCompagnie || '-']
  ];

  drawInfoBlock('INFORMATIONS VÉHICULE', vData, 14, y, 85);
  const nextY = drawInfoBlock('INFORMATIONS ASSURÉ', aData, 110, y, 85);
  y = Math.max(y + 45, nextY + 10);

  // 4. VISUAL DIAGRAMS (POINTS DE CHOC)
  pdf.setFontSize(12);
  pdf.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  pdf.setFont("helvetica", "bold");
  pdf.text('POINTS DE CHOC VISUELS', 14, y);
  y += 8;

  const pc = dData.pointsChoc || {};
  const pcd = dData.pointsChocDessous || {};

  const drawCar = (startX: number, startY: number, title: string, data: any, type: 'top' | 'bottom') => {
    pdf.setDrawColor(200);
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(startX, startY, 40, 80, 5, 5, 'FD');
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(title, startX + 20, startY + 85, { align: 'center' });

    pdf.setDrawColor(220);
    if (type === 'top') {
      pdf.roundedRect(startX + 5, startY + 20, 30, 45, 3, 3, 'S'); // Cabin
    } else {
      pdf.line(startX + 20, startY + 10, startX + 20, startY + 70); // Drive shaft
    }

    const drawZone = (x: number, y: number, label: string, active: boolean) => {
      if (active) {
        pdf.setFillColor(239, 68, 68); // Red
        pdf.setDrawColor(220, 38, 38);
        pdf.circle(x, y, 3, 'FD');
        pdf.setTextColor(239, 68, 68);
      } else {
        pdf.setFillColor(240);
        pdf.setDrawColor(200);
        pdf.circle(x, y, 2, 'FD');
        pdf.setTextColor(180);
      }
      pdf.setFontSize(6);
      pdf.text(label, x + 4, y + 1.5);
    };

    if (type === 'top') {
      drawZone(startX + 20, startY + 5, 'AV', pc.AV);
      drawZone(startX + 20, startY + 75, 'AR', pc.AR);
      drawZone(startX + 5, startY + 40, 'LATG', pc.LATG);
      drawZone(startX + 35, startY + 40, 'LATD', pc.LATD);
      drawZone(startX + 20, startY + 40, 'Toit', pc.Toit);
    } else {
      drawZone(startX + 10, startY + 15, 'Susp AV', pcd.suspensionAV);
      drawZone(startX + 20, startY + 30, 'Plancher', pcd.plancher);
      drawZone(startX + 30, startY + 65, 'Reservoir', pcd.reservoir);
    }
  };

  drawCar(40, y, 'Vue de dessus', pc, 'top');
  drawCar(130, y, 'Vue de dessous', pcd, 'bottom');
  y += 95;

  // 5. FOURNITURE TABLE
  if (y > 240) { pdf.addPage(); y = 20; }
  pdf.setFontSize(12);
  pdf.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  pdf.text('FOURNITURE ET PIÈCES', 14, y);
  y += 4;

  let fHT = 0; let fTVA = 0;
  const pieceRows = allPieces.map(p => {
    const rowHT = p.puHT * p.quantite * (1 - p.remise / 100) * (1 - p.vetuste / 100);
    const rowTVA = p.tva ? rowHT * 0.2 : 0;
    fHT += rowHT; fTVA += rowTVA;
    return [p.designation, p.typePiece, `${p.vetuste}%`, p.quantite, fC(p.puHT), `${p.remise}%`, fC(rowHT), fC(rowHT + rowTVA)];
  });

  autoTable(pdf, {
    startY: y,
    head: [['Désignation', 'Type', 'Vét.', 'Qté', 'PU HT', 'Rem.', 'HT', 'TTC']],
    body: pieceRows,
    foot: [[ { content: 'Total Fourniture', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }, fC(fHT), fC(fHT + fTVA) ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: PRIMARY_BLUE },
    theme: 'striped',
  });

  y = (pdf as any).lastAutoTable.finalY + 12;

  // 6. MAIN D'OEUVRE TABLE
  if (y > 240) { pdf.addPage(); y = 20; }
  pdf.setFontSize(12);
  pdf.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  pdf.text("MAIN D'OEUVRE", 14, y);
  y += 4;

  const mdo = dData.mainOeuvre || {
    tolerie: { nbrH: 0, pu: 80 },
    peinture: { nbrH: 0, pu: 80 },
    mecanique: { nbrH: 0, pu: 80 },
    electrique: { nbrH: 0, pu: 80 },
  };
  let mHT = 0;
  const mdoLabels: Record<string, string> = { tolerie: 'Tôlerie', peinture: 'Peinture', mecanique: 'Mécanique', electrique: 'Électrique' };
  const mdoRows = Object.entries(mdo).map(([key, val]: [string, any]) => {
    const rowHT = (val.nbrH || 0) * (val.pu || 0);
    mHT += rowHT;
    return [mdoLabels[key] || key, val.nbrH || 0, val.pu || 0, fC(rowHT), fC(rowHT * 1.2)];
  });

  autoTable(pdf, {
    startY: y,
    head: [["Rubrique", 'Nbr Heures', 'P.U', 'Total HT', 'Total TTC']],
    body: mdoRows,
    foot: [[ { content: 'Total Main d\'oeuvre', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, fC(mHT), fC(mHT * 1.2) ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: PRIMARY_BLUE },
    theme: 'striped',
  });

  y = (pdf as any).lastAutoTable.finalY + 15;

  // 7. RÉCAPITULATIF GÉNÉRAL
  if (y > 220) { pdf.addPage(); y = 20; }
  pdf.setFontSize(12);
  pdf.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  pdf.text('RÉCAPITULATIF GÉNÉRAL', 14, y);
  y += 4;

  const totalTTC = (fHT + fTVA) + (mHT * 1.2);

  autoTable(pdf, {
    startY: y,
    head: [['Rubrique', 'Total HT', 'TVA (20%)', 'Total TTC']],
    body: [
      ['Fourniture', fC(fHT), fC(fTVA), fC(fHT + fTVA)],
      ['Main d\'oeuvre', fC(mHT), fC(mHT * 0.2), fC(mHT * 1.2)],
      [
        { content: 'TOTAL GÉNÉRAL ESTIMÉ', styles: { fontStyle: 'bold', textColor: PRIMARY_BLUE, fontSize: 10 } },
        { content: fC(fHT + mHT), styles: { fontStyle: 'bold', textColor: PRIMARY_BLUE, fontSize: 10 } },
        { content: fC(fTVA + (mHT * 0.2)), styles: { fontStyle: 'bold', textColor: PRIMARY_BLUE, fontSize: 10 } },
        { content: `${fC(totalTTC)} MAD`, styles: { fontStyle: 'bold', textColor: PRIMARY_BLUE, fontSize: 10 } }
      ]
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: PRIMARY_BLUE },
    theme: 'grid',
  });

  y = (pdf as any).lastAutoTable.finalY + 15;

  // 8. OBSERVATION
  if (y > 240) { pdf.addPage(); y = 20; }
  pdf.setFontSize(12);
  pdf.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  pdf.text('OBSERVATION DE L\'EXPERT', 14, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.setTextColor(50);
  const splitObs = pdf.splitTextToSize(dData.observationExpert || 'Aucune observation particulière.', 180);
  pdf.text(splitObs, 14, y);
  y += (splitObs.length * 6) + 20;

  // FIX 5 — Fix photo rendering (CORS-safe)
  if (photos.length > 0) {
    pdf.addPage();
    y = 20;
    pdf.setFontSize(14);
    pdf.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    pdf.text('ANNEXE: GALERIE PHOTOS', 14, y);
    y += 10;

    const imgW = 60; const imgH = 45; const margin = 5;
    let curX = 14;

    for (const photo of photos) {
      if (y > 240) { pdf.addPage(); y = 20; curX = 14; }
      
      try {
        if (photo.url || photo.downloadURL) {
          const imgUrl = photo.url || photo.downloadURL;
          // Fetch as blob to avoid CORS issues with Firebase Storage URLs (FIX 5)
          const resp = await fetch(imgUrl);
          const blob = await resp.blob();
          const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const ext = blob.type.includes('png') ? 'PNG' : 'JPEG';
          pdf.addImage(dataUrl, ext, curX, y, imgW, imgH);
        }
      } catch (e) {
        // Draw placeholder cross if image fails
        pdf.setDrawColor(180, 190, 210);
        pdf.line(curX, y, curX + imgW, y + imgH);
        pdf.line(curX + imgW, y, curX, y + imgH);
        pdf.setFontSize(6);
        pdf.setTextColor(150, 160, 180);
        pdf.text('Image non disponible', curX + imgW / 2, y + imgH / 2, { align: 'center' });
      }

      curX += imgW + margin;
      if (curX > 180) { curX = 14; y += imgH + margin; }
    }
  }

  // 10. PAGE FOOTER
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.setDrawColor(230);
    pdf.line(14, 285, 196, 285);
    const footerLabel = typeRapport ? `Rapport ${typeRapport}` : "Rapport d'Expertise Automobile";
    pdf.text(`${footerLabel} - Dossier #${refExpert}`, 14, 290);
    pdf.text(`Page ${i} / ${pageCount}`, 105, 290, { align: 'center' });
    pdf.text(`DashFlow Admin System`, 196, 290, { align: 'right' });
  }

  const fileLabel = typeRapport ? `Rapport_${typeRapport.replace(/\s+/g, '_')}` : 'Rapport_Expertise';
  pdf.save(`${fileLabel}_${refExpert}_${today.replace(/\//g, '-')}.pdf`);
}
