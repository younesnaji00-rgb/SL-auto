/**
 * Réforme rapport — "RAPPORT D'EXPERTISE NON DEFINITIF REFORME" (Wafa-style).
 *
 * Rendered with @react-pdf/renderer (black-on-white, declarative ratios, vector
 * text). Page 1: identity table, vehicle characteristics, dommages evaluation,
 * réforme conclusion. Page 2: detail/commentaire annex. All data comes from
 * `resolveRapportData`; the optional `typeReforme` param overrides the resolved
 * économique/technique flags (kept for the reforme-dialog caller).
 */
import React from 'react';
import { Document, View, Text } from '@react-pdf/renderer';
import { resolveRapportData, type RapportMdoRow, type RapportData } from '@/lib/rapport-data';
import { montantEnLettresDhs } from '@/lib/number-to-words-fr';
import { fC, COMPANY_CITY } from '@/lib/generate-rapport-shared';
import {
  RapportPage,
  SafeImage,
  Band,
  LV,
  Table,
  Rule,
  renderRapport,
  INK,
  LINE,
  SHADE,
  SOFT,
  PAGE_PAD_X,
  type Col,
} from '@/lib/rapport-pdf-kit';
import { CarTopSvg } from '@/lib/rapport-car-pdf';

export async function generateRapportReformePDF(
  db: unknown,
  dossierId: string,
  typeReforme?: string,
  options?: { returnBlob?: boolean },
): Promise<Blob | void> {
  if (!db || !dossierId) return;
  const data = await resolveRapportData(db, dossierId);
  return renderRapport(
    <RapportReformeDocument data={data} typeReforme={typeReforme} />,
    `Rapport_Reforme_${data.refExpert}_${data.today.replace(/\//g, '-')}.pdf`,
    options?.returnBlob,
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View
      style={{
        width: 9,
        height: 9,
        borderWidth: 0.8,
        borderColor: INK,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 2,
      }}
    >
      {checked ? <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>X</Text> : null}
    </View>
  );
}

function CommonHeader({ data }: { data: RapportData }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>CABINET : {data.cabinetNom}</Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>EXPERT : {data.expertNom}</Text>
      </View>
      <Text style={{ fontSize: 8, color: SOFT, marginTop: 3 }}>
        Réf sinistre : {data.referenceCompagnie}   Date sinistre : {data.dateSinistre}   Date mission :{' '}
        {data.dateMission}   Assurance : {data.compagnie}
      </Text>
      <Rule color={INK} top={3} bottom={4} />
    </View>
  );
}

function Footer({ data }: { data: RapportData }) {
  return (
    <View fixed style={{ position: 'absolute', bottom: 16, left: PAGE_PAD_X, right: PAGE_PAD_X }}>
      <View style={{ borderBottomWidth: 0.8, borderColor: INK, marginBottom: 3 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 8, color: SOFT }}>Expert : {data.expertNom}</Text>
        <Text style={{ fontSize: 8, color: SOFT }}>Fait à {COMPANY_CITY} le {data.today}</Text>
      </View>
    </View>
  );
}

const ID_COLS: Col[] = [
  { width: 22, align: 'left' },
  { width: 39, align: 'left' },
  { width: 39, align: 'left' },
];

const EVAL_COLS: Col[] = [
  { width: 30, header: '', align: 'left' },
  { width: 10, header: 'Nbr H', align: 'center' },
  { width: 15, header: 'Prix unitaire', align: 'right' },
  { width: 15, header: 'Total HT', align: 'right' },
  { width: 15, header: 'Montant TVA', align: 'right' },
  { width: 15, header: 'Total TTC', align: 'right' },
];

const DETAIL_FOURN_COLS: Col[] = [
  { width: 9, header: 'Qte', align: 'center' },
  { width: 30, header: 'Désignation', align: 'left' },
  { width: 9, header: 'Type', align: 'center' },
  { width: 13, header: 'Prix', align: 'right' },
  { width: 12, header: 'Vétusté%', align: 'center' },
  { width: 9, header: 'Tva%', align: 'center' },
  { width: 18, header: 'Total', align: 'right' },
];

const DETAIL_TRAV_COLS: Col[] = [
  { width: 38, header: 'Désignation', align: 'left' },
  { width: 15, header: 'Nbr H', align: 'center' },
  { width: 20, header: 'Tarif', align: 'right' },
  { width: 27, header: 'Montant TTC', align: 'right' },
];

export function RapportReformeDocument({
  data,
  typeReforme,
}: {
  data: RapportData;
  typeReforme?: string;
}) {
  const t = data.totals;
  const rv = data.reformeView;

  const paramLower = (typeReforme || '').toLowerCase();
  const hasParam = paramLower.length > 0;
  const isEconomique = hasParam ? paramLower.includes('econom') : rv.isEconomique;
  const isTechnique = hasParam ? !paramLower.includes('econom') : rv.isTechnique;

  const zeroMdo: RapportMdoRow = { key: '', label: '', nbrH: 0, pu: 0, montantHT: 0, montantTVA: 0, montantTTC: 0 };
  const mdoBy = (key: string) => data.mdoRows.find((r) => r.key === key) ?? zeroMdo;
  const tol = mdoBy('tolerie');
  const pei = mdoBy('peinture');
  const mec = mdoBy('mecanique');

  const idRows: Array<Array<string | number>> = [
    ['Nom & Prénom', data.assure.fullName, data.adversaire.fullName || '0'],
    ['Véhicule', data.vehicule.marqueModele, data.adversaire.vehicule],
    ['Immatriculation', data.vehicule.immatriculation, data.adversaire.immatriculation || '0'],
    ["Cie d'assurance", data.compagnie, data.adversaire.compagnie],
    ['N° Police', data.policeNumber, data.adversaire.police || '0'],
    ['Intermédiaire', data.intermediaire, ''],
  ];

  const evalBody: Array<Array<string | number>> = [
    ['MO 1 Tôlerie', tol.nbrH.toFixed(2), fC(tol.pu), fC(tol.montantHT), fC(tol.montantTVA), fC(tol.montantTTC)],
    ['MO 2 Tôlerie', '0.00', fC(0), fC(0), fC(0), fC(0)],
    ['MO 3 Tôlerie', '0.00', fC(0), fC(0), fC(0), fC(0)],
    ['MO Peinture', pei.nbrH.toFixed(2), fC(pei.pu), fC(pei.montantHT), fC(pei.montantTVA), fC(pei.montantTTC)],
    ['MO 1 Mécanique', mec.nbrH.toFixed(2), fC(mec.pu), fC(mec.montantHT), fC(mec.montantTVA), fC(mec.montantTTC)],
    ['MO 2 Mécanique', '0.00', fC(0), fC(0), fC(0), fC(0)],
    ['MO 3 Mécanique', '0.00', fC(0), fC(0), fC(0), fC(0)],
    ["Total main d'oeuvre", '', '', fC(t.mdoHT), fC(t.mdoTVA), fC(t.mdoTTC)],
    ['Pièces', '', '', fC(t.fournitureHT), fC(t.fournitureTVA), fC(t.fournitureTTC)],
    ['Ingrédient peinture', '', '', fC(0), fC(0), fC(0)],
    ['Petite fourniture', '', '', fC(0), fC(0), fC(0)],
    ['Autres', '', '', fC(0), fC(0), fC(0)],
    ['Total fournitures (Dh)', '', '', fC(t.fournitureHT), fC(t.fournitureTVA), fC(t.fournitureTTC)],
    ['Total général', '', '', fC(t.totalHT), fC(t.totalTVA), fC(t.totalTTC)],
  ];

  const reformeLettres = montantEnLettresDhs(rv.montantIndemnisation || t.indemnisation);

  const nDetail = Math.max(data.pieces.length, data.mdoRows.length);

  return (
    <Document>
      {/* ══════════════════ PAGE 1 — MAIN ══════════════════ */}
      <RapportPage>
        <Footer data={data} />
        <CommonHeader data={data} />

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center' }}>
          RAPPORT D'EXPERTISE NON DEFINITIF REFORME : {data.refExpert}
        </Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center', marginTop: 3 }}>{rv.geree}</Text>
        <Text style={{ fontSize: 8, color: SOFT, marginTop: 3, marginBottom: 4 }}>
          Réf sinistre : {data.referenceCompagnie}   Date sinistre : {data.dateSinistre}   Date mission :{' '}
          {data.dateMission}   Assurance : {data.compagnie}
        </Text>

        {/* ASSURE / ADVERSAIRE */}
        <Table
          cols={ID_COLS}
          head={['', 'ASSURE', 'ADVERSAIRE']}
          body={idRows}
          boldCols={[0]}
          fontSize={7.5}
          cellPad={2}
        />

        {/* Nature + réparateur lines */}
        <View style={{ borderWidth: 0.6, borderTopWidth: 0, borderColor: LINE, padding: 3 }}>
          <LV label="Nature de contrat :" value={data.nature} />
        </View>
        <View style={{ borderWidth: 0.6, borderTopWidth: 0, borderColor: LINE, padding: 3 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5 }}>Réparateur : Accord du réparateur</Text>
        </View>
        <View style={{ borderWidth: 0.6, borderTopWidth: 0, borderColor: LINE, padding: 3, marginBottom: 4 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5 }}>Adresse    :   Oui ( ) Non ( )</Text>
        </View>

        {/* CARACTERISTIQUES */}
        <Band>CARACTERISTIQUES TECHNIQUES DU VEHICULE D'EXPERTISE</Band>
        <View style={{ flexDirection: 'row', borderWidth: 0.6, borderTopWidth: 0, borderColor: LINE }}>
          <View style={{ width: '62%', padding: 4, borderRightWidth: 0.6, borderColor: LINE }}>
            {[
              ['Marque :', data.vehicule.marque, 'Immatriculation :', data.vehicule.immatriculation],
              ['Modèle :', data.vehicule.modele, 'N° série :', data.vehicule.serie],
              ['type mine :', data.vehicule.typeMine, 'Puissance :', data.vehicule.puissance],
              ['Energie :', data.vehicule.energie, 'D.M.C :', data.vehicule.mec],
              ['Kilométrage :', data.vehicule.km || 'Non Estimable', 'Et.général :', data.vehicule.etatGeneral],
              ['Usure pneus AVG :', `${data.vehicule.usurePneus.avg} %`, 'AVD :', `${data.vehicule.usurePneus.avd} %`],
              ['ARG :', `${data.vehicule.usurePneus.arg} %`, 'ARD :', `${data.vehicule.usurePneus.ard} %`],
            ].map(([l1, v1, l2, v2], i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
                <View style={{ width: '50%' }}>
                  <LV label={l1} value={v1} />
                </View>
                <View style={{ width: '50%' }}>
                  <LV label={l2} value={v2} />
                </View>
              </View>
            ))}
          </View>
          <View style={{ width: '38%', padding: 4, alignItems: 'center' }}>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', alignSelf: 'flex-start' }}>N.E: circulation hors</Text>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', alignSelf: 'flex-start', marginBottom: 3 }}>stationnement</Text>
            <CarTopSvg zones={data.pointsChoc} height={64} />
          </View>
        </View>

        {/* DATE EXPERTISE */}
        <Band style={{ marginTop: 4 }}>Date expertise véhicule : {data.dateExpertise}</Band>
        <View style={{ flexDirection: 'row', borderWidth: 0.6, borderTopWidth: 0, borderColor: LINE, padding: 3 }}>
          <Text style={{ width: '34%', fontSize: 7.5, fontFamily: 'Helvetica-Bold' }}>Avant réparation : {data.dateAvantTravaux}</Text>
          <Text style={{ width: '33%', fontSize: 7.5, fontFamily: 'Helvetica-Bold' }}>En cours travaux : {data.dateEnCoursTravaux}</Text>
          <Text style={{ width: '33%', fontSize: 7.5, fontFamily: 'Helvetica-Bold' }}>Après travaux : {data.dateApresTravaux}</Text>
        </View>

        {/* EVALUATION DES DOMMAGES */}
        <Band style={{ marginTop: 4 }}>EVALUATION DES DOMMAGES</Band>
        <Table cols={EVAL_COLS} body={evalBody} boldCols={[0]} fontSize={6.5} headFontSize={6.8} cellPad={1.5} style={{ borderTopWidth: 0 }} />

        <View style={{ borderWidth: 0.6, borderTopWidth: 0, borderColor: LINE, padding: 3 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5 }}>A Déduire    Vétusté TTC : {fC(t.vetuste)}</Text>
        </View>
        <View style={{ borderWidth: 0.6, borderTopWidth: 0, borderColor: LINE, padding: 3, marginBottom: 4 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5 }}>Immobilisation :        Dépannage : {fC(0)}</Text>
        </View>

        {/* REFORME CONCLUSION */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
          <CheckBox checked />
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, marginRight: 18 }}> Epaviste retenu</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8 }}>Réforme  Economique(</Text>
          <CheckBox checked={isEconomique} />
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8 }}>)  Technique(</Text>
          <CheckBox checked={isTechnique} />
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8 }}>)</Text>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 2 }}>
          <Text style={{ width: '50%', fontSize: 8, color: SOFT }}>{rv.epaviste || 'Reforme jamali'}</Text>
          <Text style={{ width: '50%', fontSize: 8, color: SOFT }}>Valeur à neuf : {rv.valeurNeuf}</Text>
        </View>
        {[
          `Valeur assurée : ${rv.valeurAssuree}`,
          `Valeur vénale : ${fC(rv.valeurVenale)}`,
          `Valeur épave : ${fC(rv.valeurEpave)}`,
          `Récupérabilité de TVA : ${rv.recuperabiliteTVA}`,
          `Montant de l'indemnisation : ${fC(rv.montantIndemnisation)}`,
        ].map((s) => (
          <Text key={s} style={{ fontSize: 8, color: SOFT, marginBottom: 2 }}>{s}</Text>
        ))}

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5, marginTop: 3 }}>Arrêté le présent rapport à la somme de :</Text>
        <Text style={{ fontSize: 8.5, color: SOFT, marginTop: 2 }}>{reformeLettres}</Text>

        <SafeImage img={data.cachet || data.slLogo} style={{ width: 110, height: 54, objectFit: 'contain', marginTop: 6 }} />
      </RapportPage>

      {/* ══════════════════ PAGE 2 — DETAIL / COMMENTAIRE ══════════════════ */}
      <RapportPage>
        <Footer data={data} />
        <CommonHeader data={data} />

        {/* Merged title band */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: '50%', backgroundColor: SHADE, borderWidth: 0.6, borderColor: LINE, paddingVertical: 2.5, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>Détail Fourniture</Text>
          </View>
          <View style={{ width: '50%', backgroundColor: SHADE, borderWidth: 0.6, borderLeftWidth: 0, borderColor: LINE, paddingVertical: 2.5, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>Travaux de réparation</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: '50%' }}>
            <Table
              cols={DETAIL_FOURN_COLS}
              body={Array.from({ length: nDetail }, (_, i) => {
                const p = data.pieces[i];
                return p
                  ? [p.quantite.toFixed(0), p.designation, p.nature, fC(p.puHT), `${p.vetuste}`, p.tva ? '20' : '0', fC(p.totalTTC)]
                  : ['', '', '', '', '', '', ''];
              })}
              fontSize={7}
              headFontSize={7}
              cellPad={1.5}
              style={{ borderTopWidth: 0 }}
            />
          </View>
          <View style={{ width: '50%' }}>
            <Table
              cols={DETAIL_TRAV_COLS}
              body={Array.from({ length: nDetail }, (_, i) => {
                const m = data.mdoRows[i];
                return m ? [m.label, m.nbrH.toFixed(2), fC(m.pu), fC(m.montantTTC)] : ['', '', '', ''];
              })}
              fontSize={7}
              headFontSize={7}
              cellPad={1.5}
              style={{ borderTopWidth: 0, borderLeftWidth: 0 }}
            />
          </View>
        </View>

        <Text style={{ fontSize: 7.5, color: SOFT, marginTop: 4 }}>
          O: Pièce d'origine A: Pièce adaptable et R: Pièce réemploi
        </Text>

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 8 }}>COMMENTAIRE RAPPORT :</Text>
        <Text style={{ fontSize: 8.5, color: SOFT, marginTop: 3 }}>{data.observation || ''}</Text>
      </RapportPage>
    </Document>
  );
}
