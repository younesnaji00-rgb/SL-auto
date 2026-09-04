/**
 * Central rapport data resolver.
 *
 * `resolveRapportData(db, dossierId)` reads everything a rapport PDF needs from
 * Firestore (`dossiers/{id}` + `rapport_pieces`/`chiffrage` subcollections +
 * `compagnies` logo + local SL logos) and normalises it into a single typed
 * `RapportData` object. The three generators
 * (`generate-rapport-{final,estimatif,reforme}-pdf.ts`) consume this object and
 * are therefore pure layout — no data resolution, no totals maths, so the three
 * templates always agree on the numbers they print.
 *
 * Totals model (matches the supplied templates):
 *   baseHT     = puHT * qte * (1 - remise/100)        // "Total HT" column
 *   rowTVA     = tva ? baseHT * 0.2 : 0               // 20% Moroccan VAT
 *   vetMontant = baseHT * (vetuste/100)               // shown in "Vét %" / "À déduire"
 *   fournitureHT  = Σ baseHT     fournitureTVA = Σ rowTVA
 *   mdoHT         = Σ nbrH*pu    mdoTVA = tvaRegime ? mdoHT*0.2 : 0
 *   totalTTC      = (fournitureHT+mdoHT) + (fournitureTVA+mdoTVA)
 *   indemnisation = totalTTC - vétusté - franchise
 */
import { format } from 'date-fns';
import { getDoc, getDocs, doc, collection, query, where } from 'firebase/firestore';
import {
  selectLatestAccord,
  fetchImageAsBase64,
  loadLocalImage,
  fetchCompagnieLogo,
  type LoadedImage,
} from './generate-rapport-shared';
import { amountToWords } from './amount-to-words';
import { BRAND } from './brand';
import { scaleImageDown } from './rapport-car';
import { parseFr, normalizeExtraColumns, type DevisRow, type DevisExtraColumn } from './devis-schema';
import { parseAccordDocType } from './docType-accorde';
import type { ReformeData } from './reforme-schema';

// ── Public shapes ────────────────────────────────────────────────────────

/** Fully computed piece line, ready to print. */
export interface RapportPiece {
  designation: string;
  /** Raw type label ("R.Ps", "ORG", "Originale", …). */
  typePiece: string;
  /** Single-letter origin code: O (origine), A (adaptable), R (réemploi). */
  nature: string;
  operation: string;
  vetuste: number; // percent
  quantite: number;
  puHT: number;
  remise: number; // percent
  tva: boolean;
  typeChoc: string;
  baseHT: number; // puHT*qte*(1-remise/100)
  vetMontant: number; // baseHT*vetuste/100
  rowTVA: number; // baseHT*0.2 when tva
  totalTTC: number; // baseHT + rowTVA
}

/** One main-d'oeuvre (labor) line. */
export interface RapportMdoRow {
  key: string;
  label: string;
  nbrH: number;
  pu: number;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
}

export interface RapportTotals {
  fournitureHT: number;
  fournitureTVA: number;
  fournitureTTC: number;
  mdoHT: number;
  mdoTVA: number;
  mdoTTC: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  vetuste: number;
  franchise: number;
  indemnisation: number;
  /** True when the dossier is under a VAT regime (any piece carries TVA, or reforme.avecTva). */
  tvaRegime: boolean;
}

export interface RapportData {
  dossierId: string;
  refExpert: string;
  numeroDossier: string;
  today: string;

  // Compagnie / pour le compte de
  compagnie: string;
  pourLeCompteDe: string;
  referenceCompagnie: string;

  // Classification
  typeDossier: string;
  nature: string; // RC, etc.

  // Dates (already formatted dd/MM/yyyy, '' when absent)
  dateSinistre: string;
  dateRequete: string;
  dateMission: string;
  dateExpertise: string;
  dateAvantTravaux: string;
  dateEnCoursTravaux: string;
  dateApresTravaux: string;

  assure: {
    nom: string;
    prenom: string;
    fullName: string;
    cin: string;
    telephone: string;
    adresse: string;
  };

  vehicule: {
    marque: string;
    modele: string;
    marqueModele: string;
    immatriculation: string;
    serie: string;
    energie: string;
    puissance: string;
    km: string;
    mec: string; // formatted date or ''
    typeMine: string;
    cylindre: string;
    etatGeneral: string;
    valeurNeuf: number;
    usurePneus: { avg: string; avd: string; arg: string; ard: string };
  };

  policeNumber: string;
  intermediaire: string;

  adversaire: {
    present: boolean;
    fullName: string;
    vehicule: string;
    immatriculation: string;
    compagnie: string;
    police: string;
  };

  reparateur: {
    raisonSociale: string;
    garageAgree: string; // 'Oui' | 'Non' | repairerType label
    accord: string;
  };

  // Expert identity (cabinet constants unless overridden on the dossier)
  expertNom: string;
  cabinetNom: string;
  expertAdverse: string;
  cabinetAdverse: string;

  // Logos (base64)
  slLogo: LoadedImage | null;
  slTextLogo: LoadedImage | null;
  compagnieLogo: LoadedImage | null;
  cachet: LoadedImage | null;

  // Pieces / labor / totals
  pieces: RapportPiece[];
  piecesByChoc: Array<{ choc: string; pieces: RapportPiece[] }>;
  mdoRows: RapportMdoRow[];
  totals: RapportTotals;

  // Réforme
  reforme: ReformeData | null;
  reformeView: {
    typeReforme: string;
    isEconomique: boolean;
    isTechnique: boolean;
    valeurNeuf: string;
    valeurAssuree: string;
    valeurVenale: number;
    valeurEpave: number;
    recuperabiliteTVA: string;
    epaviste: string;
    montantIndemnisation: number;
    geree: string; // "Reforme geree par la compagnie" subtitle
  };

  montantEnLettres: string; // already cased per caller? -> lowercase, caller uppercases
  observation: string;
  pointsChoc: Record<string, boolean>;
  pointsChocDessous: Record<string, boolean>;
}

// ── Helpers ────────────────────────────────────────────────────────────

const tsToStr = (ts: unknown): string => {
  if (!ts) return '';
  try {
    const anyTs = ts as { toDate?: () => Date };
    const d = anyTs.toDate ? anyTs.toDate() : new Date(ts as string | number | Date);
    if (isNaN(d.getTime())) return String(ts);
    return format(d, 'dd/MM/yyyy');
  } catch {
    return String(ts);
  }
};

const str = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Map a raw type-pièce label to the O/A/R origin legend. */
function natureCode(typePiece: string): string {
  const t = (typePiece || '').toLowerCase();
  if (t.includes('adap') || t.startsWith('a')) return 'A';
  if (t.includes('reemploi') || t.includes('réemploi') || t.includes('occas') || t.includes('rec') || t.startsWith('r')) return 'R';
  if (t.includes('orig') || t.startsWith('o')) return 'O';
  return 'O';
}

const MDO_LABELS: Record<string, string> = {
  tolerie: 'Tolerie',
  peinture: 'Peinture',
  mecanique: 'Mecanique',
  electrique: 'Electrique',
};

/**
 * Designations that mark a main-d'oeuvre (labor) line rather than a piece.
 * Devis rows leave type/tva/vétusté blank for both pieces and labor, so the
 * designation is the only reliable discriminator: "MAIN D'ŒUVRE …" / "MAIN
 * D'OEUVRE …", or a line that *starts* with a labor category word (so
 * "PRODUIT DE PEINTURE" / "ING. PEINTURE" stay fournitures).
 */
const LABOR_RE = /\bmain\s*d['’`´\s]*(?:œ|oe)uvre|^\s*(?:t[ôo]lerie|peinture|m[ée]canique|[ée]lectri)/i;

/** Map a labor-row designation to a main-d'oeuvre category key (best-effort). */
function laborKey(designation = ''): string {
  const s = designation.toLowerCase();
  if (/t[oô]l/.test(s)) return 'tolerie';
  if (/peint/.test(s)) return 'peinture';
  if (/m[ée]ca/.test(s)) return 'mecanique';
  if (/[ée]lectr/.test(s)) return 'electrique';
  return '';
}

/** Map a DevisRow.ref (Remplacement / Réparation) to an operation label. */
function opFromRef(ref?: string): string {
  if (!ref) return '';
  const s = ref.toLowerCase();
  if (s.includes('remplac')) return 'Echange';
  if (s.includes('répar') || s.includes('repar')) return 'Réparer';
  return ref;
}

// ── Resolver ─────────────────────────────────────────────────────────────

export async function resolveRapportData(
  db: unknown,
  dossierId: string,
): Promise<RapportData> {
  if (!db || !dossierId) throw new Error('resolveRapportData: db and dossierId are required.');
  const database = db as Parameters<typeof doc>[0];

  const [dossierSnap, piecesSnap, chiffrageSnap, chiffragesSnap] = await Promise.all([
    getDoc(doc(database, 'dossiers', dossierId)),
    getDocs(collection(database, 'dossiers', dossierId, 'rapport_pieces')).catch(
      () => ({ docs: [] as Array<{ id: string; data: () => Record<string, unknown> }> }),
    ),
    getDocs(collection(database, 'dossiers', dossierId, 'chiffrage')).catch(
      () => ({ docs: [] as Array<{ id: string; data: () => Record<string, unknown> }> }),
    ),
    // Chiffreur accords are stored on the `chiffrages` collection (linked by
    // dossierId), NOT on the dossier doc — fetch them so accorded lines appear.
    getDocs(
      query(collection(database, 'chiffrages'), where('dossierId', '==', dossierId)),
    ).catch(() => ({ docs: [] as Array<{ data: () => Record<string, unknown> }> })),
  ]);

  if (!dossierSnap.exists()) {
    throw new Error(`Dossier ${dossierId} introuvable dans Firestore.`);
  }
  const d = (dossierSnap.data() || {}) as Record<string, unknown>;

  // ── Accorded pieces + main d'oeuvre ───────────────────────────────────
  // The chiffreur's accord is stored on `chiffrages/{id}.structuredEditables`
  // (the dossier only receives the published PDF). The gestionnaire path writes
  // the same shape onto `dossier.structuredEditables`. The accorded unit price
  // per row lives in an extra column with kind 'accord' (values keyed by row
  // id) — NOT in `row.puHT`, which keeps the garage's original price. Labor rows
  // (tva & vétusté blank) become main d'oeuvre lines.
  type StructEntry = {
    rows?: DevisRow[];
    extraColumns?: DevisExtraColumn[];
    extraColumn?: { label: string; values: Record<string, string> };
  };
  const editableEntries: Array<{ docType: string; entry: StructEntry }> = [];
  const pushEditables = (se: unknown) => {
    if (!se || typeof se !== 'object') return;
    for (const [docType, entry] of Object.entries(se as Record<string, StructEntry>)) {
      if (entry && typeof entry === 'object') editableEntries.push({ docType, entry });
    }
  };
  for (const cs of chiffragesSnap.docs as Array<{ data: () => Record<string, unknown> }>) {
    pushEditables((cs.data() || {}).structuredEditables);
  }
  pushEditables(d.structuredEditables);

  // Latest accord OR proposition d'accord per source family. The chiffreur's
  // work is often only a "proposition d'accord" (not a finalised "accord"), so
  // both kinds count; ranking mirrors find-latest-chiffrage-docs: higher ordinal
  // wins, then accord beats proposition, then the base parent is preferred.
  const pickAccord = (family: 'Devis Garage' | 'Facture Garage'): StructEntry | null => {
    let best: StructEntry | null = null;
    let bestRank = -1;
    for (const { docType, entry } of editableEntries) {
      const p = parseAccordDocType(docType);
      if (!p || p.sourceDocType !== family) continue;
      if (p.kind !== 'accord' && p.kind !== 'proposition-accord') continue;
      if (!Array.isArray(entry.rows) || entry.rows.length === 0) continue;
      const rank = p.ordinal * 10 + (p.kind === 'accord' ? 2 : 1) * 2 + (p.parentOrdinal === 1 ? 1 : 0);
      if (rank > bestRank) { bestRank = rank; best = entry; }
    }
    return best;
  };

  const accordPriceOf = (col: DevisExtraColumn | undefined, row: DevisRow): number => {
    const raw = col?.values?.[row.id];
    if (raw != null && String(raw).trim() !== '') return parseFr(String(raw));
    return num(row.puHT); // accord cell blank → fall back to the source price
  };

  const extractLines = (
    entry: StructEntry | null,
  ): { pieces: RapportPiece[]; labor: Array<{ key: string; label: string; montantHT: number }> } => {
    const linePieces: RapportPiece[] = [];
    const labor: Array<{ key: string; label: string; montantHT: number }> = [];
    if (!entry || !Array.isArray(entry.rows)) return { pieces: linePieces, labor };
    const cols = normalizeExtraColumns(entry);
    const accordCol =
      cols.find((c) => c.kind === 'accord') || cols.find((c) => c.kind === 'proposition-accord');
    for (const row of entry.rows) {
      const pu = accordPriceOf(accordCol, row);
      const qte = typeof row.qte === 'number' && Number.isFinite(row.qte) ? row.qte : 1;
      const isLabor = LABOR_RE.test(row.designation || '');
      if (isLabor) {
        labor.push({ key: laborKey(row.designation), label: row.designation || "Main d'oeuvre", montantHT: qte * pu });
        continue;
      }
      const vetuste = Math.min(100, Math.max(0, num(row.vetuste)));
      const tva = num(row.tva) > 0;
      const baseHT = pu * qte;
      const rowTVA = tva ? baseHT * 0.2 : 0;
      linePieces.push({
        designation: str(row.designation),
        typePiece: str(row.type),
        nature: natureCode(str(row.type)),
        operation: opFromRef(row.ref),
        vetuste,
        quantite: qte,
        puHT: pu,
        remise: 0,
        tva,
        typeChoc: 'Choc 1',
        baseHT,
        vetMontant: (baseHT * vetuste) / 100,
        rowTVA,
        totalTTC: baseHT + rowTVA,
      });
    }
    return { pieces: linePieces, labor };
  };

  const devisLines = extractLines(pickAccord('Devis Garage'));
  const factureLines = extractLines(pickAccord('Facture Garage'));
  const accordPieces = [...devisLines.pieces, ...factureLines.pieces];
  const accordLabor = [...devisLines.labor, ...factureLines.labor];

  // Legacy / scan-rapport fallback: pieces stored in dossier subcollections.
  type RawPiece = {
    id: string;
    designation?: string;
    operation?: string;
    typePiece?: string;
    vetuste?: number;
    quantite?: number;
    puHT?: number;
    remise?: number;
    typeChoc?: string;
    tva?: boolean;
    counterRoundOrder?: number | null;
  };
  const subRaw: RawPiece[] = [
    ...(piecesSnap.docs as Array<{ id: string; data: () => Record<string, unknown> }>).map(
      (s) => ({ id: s.id, ...(s.data() as object) } as RawPiece),
    ),
    ...(chiffrageSnap.docs as Array<{ id: string; data: () => Record<string, unknown> }>).map(
      (s) => ({ id: s.id, ...(s.data() as object) } as RawPiece),
    ),
  ];
  const subPieces: RapportPiece[] = selectLatestAccord(subRaw).map((p) => {
    const quantite = num(p.quantite) || 1;
    const puHT = num(p.puHT);
    const remise = num(p.remise);
    const vetuste = Math.min(100, Math.max(0, num(p.vetuste)));
    const tva = p.tva !== false;
    const baseHT = puHT * quantite * (1 - remise / 100);
    const rowTVA = tva ? baseHT * 0.2 : 0;
    const typePiece = str(p.typePiece);
    return {
      designation: str(p.designation),
      typePiece,
      nature: natureCode(typePiece),
      operation: str(p.operation),
      vetuste,
      quantite,
      puHT,
      remise,
      tva,
      typeChoc: str(p.typeChoc) || 'Choc 1',
      baseHT,
      vetMontant: (baseHT * vetuste) / 100,
      rowTVA,
      totalTTC: baseHT + rowTVA,
    };
  });

  // Accord data is canonical; fall back to subcollection pieces (scan-rapport).
  const pieces: RapportPiece[] = accordPieces.length > 0 ? accordPieces : subPieces;

  // Group by choc, preserving first-seen order.
  const chocOrder: string[] = [];
  const chocMap = new Map<string, RapportPiece[]>();
  for (const p of pieces) {
    if (!chocMap.has(p.typeChoc)) {
      chocMap.set(p.typeChoc, []);
      chocOrder.push(p.typeChoc);
    }
    chocMap.get(p.typeChoc)!.push(p);
  }
  const piecesByChoc = chocOrder.map((choc) => ({ choc, pieces: chocMap.get(choc)! }));

  // ── Fourniture sums + TVA regime ──
  const reforme = (d.reforme as ReformeData | undefined) || null;
  const fournitureHT = pieces.reduce((a, p) => a + p.baseHT, 0);
  const fournitureTVA = pieces.reduce((a, p) => a + p.rowTVA, 0);
  const totalVetuste = pieces.reduce((a, p) => a + p.vetMontant, 0);
  // Main d'oeuvre follows a TVA regime only when the fourniture is predominantly
  // taxed (chiffreurs frequently leave TVA blank on most lines) or reforme.avecTva.
  const tvaRegime = (fournitureHT > 0 && fournitureTVA >= fournitureHT * 0.15) || !!reforme?.avecTva;

  // ── Main d'oeuvre ──
  const mdoRaw = (d.mainOeuvre || {}) as Record<string, { nbrH?: number; pu?: number }>;
  let mdoRows: RapportMdoRow[];
  if (accordLabor.length > 0) {
    // Accord labor rows — one main-d'oeuvre line each (lump sum, no hourly split).
    mdoRows = accordLabor.map((r) => {
      const montantTVA = tvaRegime ? r.montantHT * 0.2 : 0;
      return {
        key: r.key,
        label: r.label,
        nbrH: 0,
        pu: 0,
        montantHT: r.montantHT,
        montantTVA,
        montantTTC: r.montantHT + montantTVA,
      };
    });
  } else {
    // Scan-rapport main-d'oeuvre object (tolerie/peinture/mecanique/electrique).
    mdoRows = (['tolerie', 'peinture', 'mecanique', 'electrique'] as const)
      .map((key) => {
        const e = mdoRaw[key] || {};
        const nbrH = num(e.nbrH);
        const pu = num(e.pu);
        const montantHT = nbrH * pu;
        const montantTVA = tvaRegime ? montantHT * 0.2 : 0;
        return {
          key,
          label: MDO_LABELS[key] || key,
          nbrH,
          pu,
          montantHT,
          montantTVA,
          montantTTC: montantHT + montantTVA,
        };
      })
      // Hide the electrique row when empty (templates show tolerie/peinture/mecanique).
      .filter((r, i) => i < 3 || r.montantHT > 0);
  }

  // ── Totals ──
  const mdoHT = mdoRows.reduce((a, r) => a + r.montantHT, 0);
  const mdoTVA = mdoRows.reduce((a, r) => a + r.montantTVA, 0);
  const totalHT = fournitureHT + mdoHT;
  const totalTVA = fournitureTVA + mdoTVA;
  const totalTTC = totalHT + totalTVA;

  const franchise = num(d.franchise) || num(reforme?.franchise);
  const indemnisation = Math.max(0, totalTTC - totalVetuste - franchise);

  const totals: RapportTotals = {
    fournitureHT,
    fournitureTVA,
    fournitureTTC: fournitureHT + fournitureTVA,
    mdoHT,
    mdoTVA,
    mdoTTC: mdoHT + mdoTVA,
    totalHT,
    totalTVA,
    totalTTC,
    vetuste: totalVetuste,
    franchise,
    indemnisation,
    tvaRegime,
  };

  // ── Vehicle resolution (object first, flat fallbacks) ──
  const vRaw = (d.vehicule as Record<string, unknown>) || {};
  const marque = str(vRaw.marque ?? d.vehiculeMarque ?? d.marque);
  const modele = str(vRaw.modele ?? d.vehiculeModele ?? d.modele);
  const usure = (vRaw.usurePneus as Record<string, unknown>) || {};
  const vehicule = {
    marque,
    modele,
    marqueModele: `${marque} ${modele}`.trim(),
    immatriculation: str(vRaw.immatriculation ?? d.vehiculeMatricule ?? d.matricule),
    serie: str(vRaw.serie ?? d.vehiculeVIN ?? d.serie ?? vRaw.chassis),
    energie: str(vRaw.energie ?? d.vehiculeEnergie ?? d.energie),
    puissance: str(vRaw.puissance ?? d.vehiculePuissance ?? d.puissanceFiscale),
    km: str(vRaw.km ?? d.vehiculeKilometrage ?? d.km),
    mec: tsToStr(vRaw.mec ?? d.vehiculeMEC ?? d.mec),
    typeMine: str(vRaw.typeMine ?? d.typeMine),
    cylindre: str(vRaw.cylindre ?? d.cylindre),
    etatGeneral: str(vRaw.etatGeneral ?? d.etatGeneral),
    valeurNeuf: num(vRaw.valeurNeuf),
    usurePneus: {
      avg: str(usure.avg ?? usure.AVG),
      avd: str(usure.avd ?? usure.AVD),
      arg: str(usure.arg ?? usure.ARG),
      ard: str(usure.ard ?? usure.ARD),
    },
  };

  // ── Assuré ──
  const aRaw = d.assure;
  const aObj = typeof aRaw === 'object' && aRaw !== null ? (aRaw as Record<string, unknown>) : {};
  const aNom = str(aObj.nom ?? d.assureNom ?? (typeof aRaw === 'string' ? aRaw : ''));
  const aPrenom = str(aObj.prenom ?? d.assurePrenom);
  const assure = {
    nom: aNom,
    prenom: aPrenom,
    fullName: `${aPrenom} ${aNom}`.trim(),
    cin: str(aObj.cin ?? d.assureCIN ?? d.cin),
    telephone: str(aObj.telephone ?? d.assureTelephone ?? d.telephone),
    adresse: str(aObj.adresse ?? d.assureAdresse),
  };

  // ── Adversaire ──
  const advRaw = (d.partieAdverse as Record<string, unknown>) || {};
  const advNom = str(d.adverseNom ?? advRaw.assure ?? advRaw.nom);
  const advPrenom = str(d.adversePrenom ?? advRaw.prenom);
  const advFullName = `${advPrenom} ${advNom}`.trim();
  const adversaire = {
    present: !!(advFullName || d.adverseCompagnie || advRaw.compagnie || d.adverseMatricule || advRaw.matricule),
    fullName: advFullName,
    vehicule: str(advRaw.marque ?? d.adverseMarque),
    immatriculation: str(d.adverseMatricule ?? advRaw.matricule),
    compagnie: str(d.adverseCompagnie ?? advRaw.compagnie),
    police: str(advRaw.police ?? d.adversePolice),
  };

  // ── Intermédiaire ──
  const interRaw = (d.intermediaire as Record<string, unknown>) || {};
  const intermediaire = str(
    interRaw.nom ?? d.intermediaireNom ?? d.intermediaryName ?? d.intermediaire,
  );

  // ── Réparateur ──
  const repairerType = str(d.repairerType);
  const reparateur = {
    raisonSociale: str(d.garageName),
    garageAgree: /agr/i.test(repairerType) ? 'Oui' : repairerType || 'Non',
    accord: str(d.accordReparateur),
  };

  // ── Expert identity (cabinet constants unless overridden) ──
  const experts = (d.experts as Record<string, { nom?: string; compagnie?: string }>) || {};
  const expertNom = str(d.expertNom) || BRAND.expertName;
  const cabinetNom = str(d.cabinetNom) || BRAND.cabinetName;
  const expertAdverse = str(d.expertAdverse ?? experts['2eme']?.nom);
  const cabinetAdverse = str(d.cabinetAdverse ?? experts['2eme']?.compagnie);

  // ── Logos ──
  // The compagnie logo + cachet come from Storage and can be multi-megapixel;
  // downscale them so the PDF stays small (otherwise a single logo can bloat it
  // to several MB even though it prints at ~28mm).
  const [slLogo, slTextLogo, compagnieRaw, cachetRaw] = await Promise.all([
    loadLocalImage('/images/logo.png'),
    loadLocalImage('/images/auto-expertise.png'),
    fetchCompagnieLogo(db as Parameters<typeof fetchCompagnieLogo>[0], str(d.compagnie)),
    loadLocalImage('/images/cachet.png'),
  ]);
  const [compagnieLogo, cachet] = await Promise.all([
    scaleImageDown(compagnieRaw, 600),
    scaleImageDown(cachetRaw, 600),
  ]);
  void fetchImageAsBase64; // re-exported helper, kept available to callers

  // The dossier's selected impact zones — rendered as a native @react-pdf SVG
  // (CarTopSvg) directly from this map, so no rasterisation is needed here.
  const pointsChocRaw = (d.pointsChoc as Record<string, boolean>) || {};

  // ── Réforme view ──
  const reformeType = (reforme?.typeReforme || '').toLowerCase();
  const isEconomique = reformeType.includes('econom') || reformeType.includes('économ');
  const isTechnique = reformeType.includes('techni') || (!isEconomique && !!reforme);
  const valeurVenale = num(reforme?.valeurVenale);
  const valeurEpave = num(reforme?.valeurEpave);
  const reformeIndemn =
    num(reforme?.totalIndemnisation) ||
    num(reforme?.difference) ||
    Math.max(0, valeurVenale - valeurEpave);
  const reformeView = {
    typeReforme: str(reforme?.typeReforme),
    isEconomique,
    isTechnique,
    valeurNeuf: vehicule.valeurNeuf > 0 ? vehicule.valeurNeuf.toFixed(2) : 'NC',
    valeurAssuree: num(d.valeurAssuree) > 0 ? num(d.valeurAssuree).toFixed(2) : 'NC',
    valeurVenale,
    valeurEpave,
    recuperabiliteTVA: str(d.recuperabiliteTVA) || (reforme?.avecTva ? 'Récupérable' : 'Non récupérable'),
    epaviste: str(d.epaviste),
    montantIndemnisation: reformeIndemn,
    geree: str(d.reformeGeree) || 'Reforme geree par la compagnie',
  };

  // ── Montant en lettres (computed from indemnisation; field overrides) ──
  const stored = str(d.montantEnLettres);
  const montantEnLettres = stored || amountToWords(indemnisation);

  const refExpert = str(d.refExpert) || dossierId;

  return {
    dossierId,
    refExpert,
    numeroDossier: str(d.numeroDossier ?? d.nDossier ?? d.numDossier) || refExpert,
    today: format(new Date(), 'dd/MM/yyyy'),

    compagnie: str(d.compagnie),
    pourLeCompteDe: str(d.compagnie),
    referenceCompagnie: str(d.referenceCompagnie),

    typeDossier: str(d.typeDossier),
    nature: str(d.nature),

    dateSinistre: tsToStr(d.dateSinistre),
    dateRequete: tsToStr(d.dateRequete),
    dateMission: tsToStr(d.dateMissionAgentTerrain ?? d.dateMission),
    dateExpertise: tsToStr(d.datePhotosAvant ?? d.dateExpertise),
    dateAvantTravaux: tsToStr(d.datePhotosAvant),
    dateEnCoursTravaux: tsToStr(d.datePhotosEnCours),
    dateApresTravaux: tsToStr(d.datePhotosApres),

    assure,
    vehicule,
    policeNumber: str(d.policeNumber),
    intermediaire,
    adversaire,
    reparateur,

    expertNom,
    cabinetNom,
    expertAdverse,
    cabinetAdverse,

    slLogo,
    slTextLogo,
    compagnieLogo,
    cachet,

    pieces,
    piecesByChoc,
    mdoRows,
    totals,

    reforme,
    reformeView,

    montantEnLettres,
    observation: str(d.observationExpert ?? (d.lastObservation as { text?: string } | undefined)?.text ?? d.commentaireRapport),
    pointsChoc: pointsChocRaw,
    pointsChocDessous: (d.pointsChocDessous as Record<string, boolean>) || {},
  };
}
