/**
 * Rapport d'expertise estimatif — Forfait (RMA-style).
 *
 * Rendered with @react-pdf/renderer (black-on-white, declarative ratios, vector
 * text). Page 1 is the main report; page 2 lists fournitures per choc + main
 * d'oeuvre + observation. All data comes from `resolveRapportData`.
 */
import React from 'react';
import { Document, View, Text } from '@react-pdf/renderer';
import { resolveRapportData, type RapportData } from '@/lib/rapport-data';
import {
  fC,
  COMPANY_NAME,
  COMPANY_ADDRESS_FOOTER,
  COMPANY_CONTACT_FOOTER,
} from '@/lib/generate-rapport-shared';
import {
  RapportPage,
  SafeImage,
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

export async function generateRapportEstimatifPDF(
  db: unknown,
  dossierId: string,
  options?: { returnBlob?: boolean },
): Promise<Blob | void> {
  const data = await resolveRapportData(db, dossierId);
  return renderRapport(
    <RapportEstimatifDocument data={data} />,
    `Rapport_Estimatif_${data.refExpert}_${data.today.replace(/\//g, '-')}.pdf`,
    options?.returnBlob,
  );
}

const box = (extra?: object) => ({ borderWidth: 0.6, borderColor: LINE, borderTopWidth: 0, ...extra });

function Pair({ l1, v1, l2, v2 }: { l1: string; v1: string; l2?: string; v2?: string }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 2.5 }}>
      <View style={{ width: '50%' }}>
        <LV label={l1} value={v1} />
      </View>
      <View style={{ width: '50%' }}>{l2 ? <LV label={l2} value={v2} /> : null}</View>
    </View>
  );
}

function SectionHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 0.6, borderColor: LINE }}>
      <View style={{ backgroundColor: SHADE, borderRightWidth: 0.6, borderColor: LINE, paddingVertical: 2.5, paddingHorizontal: 6, justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>{label}</Text>
      </View>
      <View style={{ flex: 1, paddingVertical: 2.5, paddingHorizontal: 6, justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

function Footer({ today }: { today: string }) {
  return (
    <View fixed style={{ position: 'absolute', bottom: 16, left: PAGE_PAD_X, right: PAGE_PAD_X }}>
      <View style={{ borderBottomWidth: 0.8, borderColor: INK, marginBottom: 3 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{COMPANY_NAME}</Text>
          <Text style={{ fontSize: 6, color: SOFT }}>{COMPANY_ADDRESS_FOOTER}</Text>
          <Text style={{ fontSize: 6, color: SOFT }}>{COMPANY_CONTACT_FOOTER}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 7 }}>Rapport établi le : {today}</Text>
          <Text style={{ fontSize: 7 }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} sur ${totalPages}`} />
        </View>
      </View>
    </View>
  );
}

function EstimatifHeader({ data, small }: { data: RapportData; small?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: '30%' }} />
      <View style={{ width: '40%', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: small ? 13 : 15 }}>Rapport d'expertise estimatif</Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>{data.typeDossier || 'Forfait'}</Text>
      </View>
      <View style={{ width: '30%', alignItems: 'flex-end' }}>
        <SafeImage img={data.compagnieLogo} style={{ width: 90, height: 40, objectFit: 'contain' }} />
      </View>
    </View>
  );
}

const CONCLUSION_COLS: Col[] = [
  { width: 14, align: 'left' },
  { width: 12, align: 'right' },
  { width: 17, align: 'left' },
  { width: 19, align: 'right' },
  { width: 19, align: 'right' },
  { width: 19, align: 'right' },
];

const FOURNITURE_COLS: Col[] = [
  { width: 30, header: 'Designation', align: 'left' },
  { width: 14, header: 'Type Piéce', align: 'left' },
  { width: 10, header: 'Opé', align: 'left' },
  { width: 9, header: 'Vet', align: 'center' },
  { width: 9, header: 'Qte', align: 'center' },
  { width: 14, header: 'P.U. HT', align: 'right' },
  { width: 14, header: 'Total HT', align: 'right' },
];

const MDO_COLS: Col[] = [
  { width: 25, header: "Main d'oeuvre", align: 'left' },
  { width: 15, header: 'Nbr Heures', align: 'center' },
  { width: 15, header: 'Taux HT', align: 'center' },
  { width: 15, header: 'Montant HT', align: 'right' },
  { width: 15, header: 'TVA', align: 'right' },
  { width: 15, header: 'Montant TTC', align: 'right' },
];

export function RapportEstimatifDocument({ data }: { data: RapportData }) {
  const t = data.totals;
  return (
    <Document>
      {/* ══════════════════ PAGE 1 — MAIN ══════════════════ */}
      <RapportPage>
        <Footer today={data.today} />
        <EstimatifHeader data={data} />
        <Rule color={INK} top={6} bottom={6} />

        {/* Ref box */}
        <View style={{ borderWidth: 0.6, borderColor: LINE }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 0.6, borderColor: LINE }}>
            <View style={{ width: '50%', backgroundColor: SHADE, borderRightWidth: 0.6, borderColor: LINE, paddingVertical: 2.5, paddingHorizontal: 4 }}>
              <LV label="Ref Expert :" value={data.refExpert} labelStyle={{ fontSize: 8.5 }} />
            </View>
            <View style={{ width: '50%', backgroundColor: SHADE, paddingVertical: 2.5, paddingHorizontal: 4 }}>
              <LV label="Pour le compte de :" value={data.pourLeCompteDe} labelStyle={{ fontSize: 8.5 }} />
            </View>
          </View>
          <View style={{ padding: 4 }}>
            <Pair l1="N° Dossier :" v1={data.numeroDossier} l2="Date Sinistre :" v2={data.dateSinistre} />
            <Pair l1="Type Dossier :" v1={data.typeDossier} l2="Date Requête :" v2={data.dateRequete} />
            <Pair l1="" v1="" l2="Ref Compagnie :" v2={data.referenceCompagnie} />
          </View>
        </View>

        {/* Assuré */}
        <View style={{ marginTop: 4 }}>
          <SectionHeader label="Assuré">
            <LV label="Nom et Prenom :" value={data.assure.fullName} labelStyle={{ fontSize: 8 }} />
          </SectionHeader>
          <View style={box({ padding: 4 })}>
            <Pair l1="Véhicule :" v1={data.vehicule.marqueModele} l2="Cie d'assurances :" v2={data.compagnie} />
            <Pair l1="Immatriculation :" v1={data.vehicule.immatriculation} l2="N° Police :" v2={data.policeNumber} />
            <Pair l1="Type :" v1="" l2="Agent/Courtier :" v2={data.intermediaire} />
          </View>
        </View>

        {/* Adversaire */}
        {data.adversaire.present && (
          <View style={{ marginTop: 4 }}>
            <SectionHeader label="Adversaire">
              <LV label="Nom et Prenom :" value={data.adversaire.fullName} labelStyle={{ fontSize: 8 }} />
            </SectionHeader>
            <View style={box({ padding: 4 })}>
              <Pair l1="Véhicule :" v1={data.adversaire.vehicule} l2="Cie d'assurances :" v2={data.adversaire.compagnie} />
              <Pair l1="Immatriculation :" v1={data.adversaire.immatriculation} l2="N° Police :" v2={data.adversaire.police} />
            </View>
          </View>
        )}

        {/* Réparateur */}
        <View style={{ marginTop: 4 }}>
          <SectionHeader label="Réparateur">
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: '55%' }}>
                <LV label="Raison sociale :" value={data.reparateur.raisonSociale || 'sans garage'} />
              </View>
              <View style={{ width: '45%' }}>
                <LV label="Garage Agréé :" value={data.reparateur.garageAgree} />
              </View>
            </View>
          </SectionHeader>
        </View>

        {/* Caractéristiques + Véhicule Vu */}
        <View style={{ marginTop: 4 }}>
          <View style={{ flexDirection: 'row', borderWidth: 0.6, borderColor: LINE }}>
            <View style={{ width: '65%', backgroundColor: SHADE, borderRightWidth: 0.6, borderColor: LINE, paddingVertical: 2.5, paddingHorizontal: 4 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>Caractéristiques techniques du véhicule expertisé</Text>
            </View>
            <View style={{ width: '35%', backgroundColor: SHADE, paddingVertical: 2.5, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>Véhicule Vu</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={[box({ borderRightWidth: 0.6 }), { width: '65%', padding: 4 }]}>
              <Pair l1="Véhicule :" v1={data.vehicule.marqueModele} l2="Type Mine :" v2={data.vehicule.typeMine} />
              <Pair l1="Immatriculation :" v1={data.vehicule.immatriculation} l2="N° Série :" v2={data.vehicule.serie} />
              <Pair l1="Puissance fiscale :" v1={data.vehicule.puissance} l2="kilométrage :" v2={data.vehicule.km} />
              <Pair l1="Date mise en Cir :" v1={data.vehicule.mec} l2="Energie :" v2={data.vehicule.energie} />
              <Pair l1="Etat général :" v1={data.vehicule.etatGeneral} />
            </View>
            <View style={[box({ borderLeftWidth: 0, padding: 4 }), { width: '35%' }]}>
              <LV label="Avant Travaux :" value={data.dateAvantTravaux} style={{ marginBottom: 5, fontSize: 7 }} />
              <LV label="En Cours Travaux :" value={data.dateEnCoursTravaux} style={{ marginBottom: 5, fontSize: 7 }} />
              <LV label="Aprés Travaux :" value={data.dateApresTravaux} style={{ fontSize: 7 }} />
            </View>
          </View>
        </View>

        {/* Point de choc */}
        <View style={{ flexDirection: 'row', borderWidth: 0.6, borderColor: LINE, marginTop: 4, height: 96 }}>
          <View style={{ width: '36%', alignItems: 'center', justifyContent: 'center', borderRightWidth: 0.6, borderColor: LINE }}>
            <Text style={{ fontSize: 6.5 }}>Avant</Text>
            <CarTopSvg zones={data.pointsChoc} height={78} />
            <Text style={{ fontSize: 6.5 }}>Arrière</Text>
          </View>
          <View style={{ width: '64%', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>Point de choc</Text>
          </View>
        </View>

        {/* Conclusions */}
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 6, marginBottom: 3 }}>
          Conclusions (Montants exprimés en DHS)
        </Text>
        <Table
          cols={CONCLUSION_COLS}
          head={['A déduire', '', '', 'HT', 'TVA', 'TTC']}
          headAlign="left"
          body={[
            ['Vetusté :', fC(t.vetuste), 'Fourniture', fC(t.fournitureHT), fC(t.fournitureTVA), fC(t.fournitureTTC)],
            ['TVA :', fC(t.totalTVA), "Main d'oeuvre", fC(t.mdoHT), fC(t.mdoTVA), fC(t.mdoTTC)],
            ['Franchise :', fC(t.franchise), 'Totale', fC(t.totalHT), fC(t.totalTVA), fC(t.totalTTC)],
          ]}
          fontSize={8}
        />
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, textAlign: 'center', marginTop: 6 }}>
          Montant d'indemnisation :   {fC(t.indemnisation)}
        </Text>

        {/* Closing */}
        <Text style={{ fontSize: 8, color: SOFT, marginTop: 8 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', color: INK }}>Arrêté le présent rapport d'expertise à la somme de :  </Text>
          {data.montantEnLettres}
        </Text>
        <Text style={{ fontSize: 8, color: SOFT, marginTop: 3 }}>
          En foi de quoi,le présent rapport est établi en unique original pour servir et valoir ce que de droit, et sous
          réserves des droits des parties
        </Text>

        {/* Signature */}
        <View style={{ alignItems: 'flex-end', marginTop: 14 }}>
          <Text style={{ fontSize: 9 }}>L'expert</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>SLAUTO</Text>
          <SafeImage img={data.cachet || data.slLogo} style={{ width: 95, height: 48, objectFit: 'contain', marginTop: 2 }} />
        </View>
      </RapportPage>

      {/* ══════════════════ PAGE 2 — DETAIL ══════════════════ */}
      <RapportPage>
        <Footer today={data.today} />
        <EstimatifHeader data={data} small />
        <Rule color={INK} top={6} bottom={6} />

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 6 }}>Ref Expert :  {data.refExpert}</Text>

        {data.piecesByChoc.map((g) => {
          const sumVet = g.pieces.reduce((a, p) => a + p.vetMontant, 0);
          const sumHT = g.pieces.reduce((a, p) => a + p.baseHT, 0);
          const sumTVA = g.pieces.reduce((a, p) => a + p.rowTVA, 0);
          const sumTTC = g.pieces.reduce((a, p) => a + p.totalTTC, 0);
          return (
            <View key={g.choc} style={{ marginBottom: 10 }} wrap={false}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 3 }}>Detail Fournitures :    {g.choc}</Text>
              <Table
                cols={FOURNITURE_COLS}
                body={g.pieces.map((p) => [
                  p.designation,
                  p.typePiece,
                  p.operation,
                  p.vetuste.toFixed(2),
                  p.quantite.toFixed(2),
                  fC(p.puHT),
                  fC(p.baseHT),
                ])}
                fontSize={7.5}
                headFontSize={8}
              />
              <View style={{ flexDirection: 'row', borderWidth: 0.6, borderTopWidth: 0, borderColor: LINE }}>
                <Text style={{ width: '20%', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: 3, borderRightWidth: 0.6, borderColor: LINE }}>Total</Text>
                <Text style={{ width: '20%', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: 3, borderRightWidth: 0.6, borderColor: LINE }}>Vétusté : {fC(sumVet)}</Text>
                <Text style={{ width: '20%', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: 3, borderRightWidth: 0.6, borderColor: LINE }}>Ht : {fC(sumHT)}</Text>
                <Text style={{ width: '20%', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: 3, borderRightWidth: 0.6, borderColor: LINE }}>TVA : {fC(sumTVA)}</Text>
                <Text style={{ width: '20%', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: 3 }}>TTC : {fC(sumTTC)}</Text>
              </View>
            </View>
          );
        })}

        {/* Main d'oeuvre */}
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginTop: 4, marginBottom: 3 }}>Main d'oeuvre :    Choc 1</Text>
        <Table
          cols={MDO_COLS}
          body={data.mdoRows.map((r) => [
            r.label,
            r.nbrH.toFixed(2),
            r.pu.toFixed(2),
            fC(r.montantHT),
            fC(r.montantTVA),
            fC(r.montantTTC),
          ])}
          fontSize={7.5}
          headFontSize={8}
        />
        <View style={{ flexDirection: 'row', borderWidth: 0.6, borderTopWidth: 0, borderColor: LINE }}>
          <Text style={{ width: '40%', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: 3, borderRightWidth: 0.6, borderColor: LINE }}>Total</Text>
          <Text style={{ width: '20%', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: 3, borderRightWidth: 0.6, borderColor: LINE }}>Ht : {fC(t.mdoHT)}</Text>
          <Text style={{ width: '20%', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: 3, borderRightWidth: 0.6, borderColor: LINE }}>TVA : {fC(t.mdoTVA)}</Text>
          <Text style={{ width: '20%', fontFamily: 'Helvetica-Bold', fontSize: 8, padding: 3 }}>TTC : {fC(t.mdoTTC)}</Text>
        </View>

        {/* Observation */}
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 3 }}>Observation</Text>
          <View style={{ borderTopWidth: 0.8, borderColor: INK, width: 56, marginBottom: 4 }} />
          <Text style={{ fontSize: 9, color: SOFT }}>{data.observation || ''}</Text>
        </View>
      </RapportPage>
    </Document>
  );
}
