/**
 * Final contradictory rapport — "RAPPORT D'EXPERTISE / CONTRADICTOIRE".
 *
 * Rendered with @react-pdf/renderer: black-on-white bordered form (the only
 * colour is the two logos + the stamp), declarative column ratios, vector text.
 * Page 1 reproduces the supplied Sanlam scan; page 2 is the populated
 * "Détails fourniture et réparation" table.
 *
 * All data comes from `resolveRapportData` — this file is pure layout.
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

export async function generateRapportFinalPDF(
  db: unknown,
  dossierId: string,
  options?: { returnBlob?: boolean },
): Promise<Blob | void> {
  const data = await resolveRapportData(db, dossierId);
  return renderRapport(
    <RapportFinalDocument data={data} />,
    `Rapport_Final_${data.refExpert}_${data.today.replace(/\//g, '-')}.pdf`,
    options?.returnBlob,
  );
}

// ── Small layout helpers (final-report house style) ───────────────────────
const box = (extra?: object) => ({
  borderWidth: 0.6,
  borderColor: LINE,
  borderTopWidth: 0,
  ...extra,
});

function SectionHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 0.6, borderColor: LINE }}>
      <View
        style={{
          backgroundColor: SHADE,
          borderRightWidth: 0.6,
          borderColor: LINE,
          paddingVertical: 2.5,
          paddingHorizontal: 6,
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>{label}</Text>
      </View>
      <View style={{ flex: 1, paddingVertical: 2.5, paddingHorizontal: 6, justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

function Pair({
  l1,
  v1,
  l2,
  v2,
}: {
  l1: string;
  v1: string;
  l2?: string;
  v2?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 2.5 }}>
      <View style={{ width: '50%' }}>
        <LV label={l1} value={v1} />
      </View>
      <View style={{ width: '50%' }}>{l2 ? <LV label={l2} value={v2} /> : null}</View>
    </View>
  );
}

function Footer({ today }: { today: string }) {
  return (
    <View
      fixed
      style={{ position: 'absolute', bottom: 16, left: PAGE_PAD_X, right: PAGE_PAD_X }}
    >
      <View style={{ borderBottomWidth: 0.8, borderColor: INK, marginBottom: 3 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{COMPANY_NAME}</Text>
          <Text style={{ fontSize: 6, color: SOFT }}>{COMPANY_ADDRESS_FOOTER}</Text>
          <Text style={{ fontSize: 6, color: SOFT }}>{COMPANY_CONTACT_FOOTER}</Text>
        </View>
        <Text style={{ fontSize: 7 }}>Rapport établi le : {today}</Text>
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

const DETAIL_COLS: Col[] = [
  { width: 11, header: 'Categorie', align: 'left' },
  { width: 11, header: 'Sous. Cat.', align: 'left' },
  { width: 19, header: 'Piéces/Type', align: 'left' },
  { width: 5, header: 'Nat', align: 'center' },
  { width: 6, header: 'Nb', align: 'right' },
  { width: 9, header: 'PU HT', align: 'right' },
  { width: 7, header: 'Rem%', align: 'right' },
  { width: 10, header: 'Total HT', align: 'right' },
  { width: 8, header: 'TVA', align: 'right' },
  { width: 9, header: 'Total TTC', align: 'right' },
  { width: 5, header: 'Vét%', align: 'right' },
];

/** Pure layout document (renderable with mock data for tests/preview). */
export function RapportFinalDocument({ data }: { data: RapportData }) {
  const t = data.totals;

  const detailBody: Array<Array<string | number>> = data.pieces.map((p) => [
    'Remplacement',
    'Remplacement',
    p.designation,
    p.nature,
    p.quantite.toFixed(2),
    fC(p.puHT),
    p.remise ? p.remise.toFixed(1) : '',
    fC(p.baseHT),
    fC(p.rowTVA),
    fC(p.totalTTC),
    p.vetuste ? p.vetuste.toFixed(1) : '',
  ]);
  if (t.mdoHT > 0) {
    detailBody.push([
      "Main d'oeuvre",
      "Main d'oeuvre",
      "MAIN D'ŒUVRE",
      '',
      '1.00',
      fC(t.mdoHT),
      '',
      fC(t.mdoHT),
      fC(t.mdoTVA),
      fC(t.mdoTTC),
      '',
    ]);
  }
  detailBody.push(['', '', '', '', '', '', 'Somme', fC(t.totalHT), fC(t.totalTVA), fC(t.totalTTC), '']);
  const sommeRow = detailBody.length - 1;

  return (
    <Document>
      {/* ══════════════════ PAGE 1 — MAIN REPORT ══════════════════ */}
      <RapportPage>
        <Footer today={data.today} />

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: '28%' }}>
            <SafeImage img={data.slLogo} style={{ width: 38, height: 30, objectFit: 'contain' }} />
            <SafeImage img={data.slTextLogo} style={{ width: 78, height: 14, objectFit: 'contain', marginTop: 2 }} />
          </View>
          <View style={{ width: '44%', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 15 }}>RAPPORT D'EXPERTISE</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginTop: 2 }}>CONTRADICTOIRE</Text>
          </View>
          <View style={{ width: '28%', alignItems: 'flex-end' }}>
            <SafeImage img={data.compagnieLogo} style={{ width: 95, height: 42, objectFit: 'contain' }} />
          </View>
        </View>

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
            <Pair l1="Type :" v1="" l2="Agent/Courtier :" v2={data.intermediaire || 'sans intermédiaire'} />
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
                <LV label="Raison sociale :" value={data.reparateur.raisonSociale || 'Particulier'} />
              </View>
              <View style={{ width: '45%' }}>
                <LV label="Garage Agréé :" value={data.reparateur.garageAgree} />
              </View>
            </View>
          </SectionHeader>
        </View>

        {/* Caractéristiques techniques + Véhicule Vu */}
        <View style={{ marginTop: 4 }}>
          <View style={{ flexDirection: 'row', borderWidth: 0.6, borderColor: LINE }}>
            <View style={{ width: '65%', backgroundColor: SHADE, borderRightWidth: 0.6, borderColor: LINE, paddingVertical: 2.5, paddingHorizontal: 4 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>
                Caractéristiques techniques du véhicule expertisé
              </Text>
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
            <View style={[box({ borderLeftWidth: 0 }), { width: '35%' }]}>
              {[
                ['Avant Travaux', data.dateAvantTravaux],
                ['En Cours Travaux', data.dateEnCoursTravaux],
                ['Aprés Travaux', data.dateApresTravaux],
              ].map(([lab, val], i) => (
                <View
                  key={lab}
                  style={{
                    flexDirection: 'row',
                    borderBottomWidth: i < 2 ? 0.5 : 0,
                    borderColor: LINE,
                    minHeight: 18,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ width: '58%', fontSize: 7, paddingHorizontal: 3, fontFamily: 'Helvetica-Bold' }}>{lab}</Text>
                  <Text style={{ width: '42%', fontSize: 7, paddingHorizontal: 3, color: SOFT, borderLeftWidth: 0.5, borderColor: LINE }}>{val}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Point de choc */}
        <View style={{ flexDirection: 'row', borderWidth: 0.6, borderColor: LINE, marginTop: 4, height: 92 }}>
          <View style={{ width: '36%', alignItems: 'center', justifyContent: 'center', borderRightWidth: 0.6, borderColor: LINE }}>
            <CarTopSvg zones={data.pointsChoc} height={82} />
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
            ['TVA :', '0', "Main d'oeuvre", fC(t.mdoHT), fC(t.mdoTVA), fC(t.mdoTTC)],
            ['Franchise :', fC(t.franchise), 'Totale', fC(t.totalHT), fC(t.totalTVA), fC(t.totalTTC)],
          ]}
          fontSize={8}
        />

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, textAlign: 'center', marginTop: 6 }}>
          Montant d'indemnisation :   {fC(t.indemnisation)}
        </Text>

        {/* Legal closing */}
        <Text style={{ fontSize: 8, color: SOFT, marginTop: 8 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', color: INK }}>Arrêté le présent rapport d'expertise à la somme de : </Text>
          {data.montantEnLettres.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 8, color: SOFT, marginTop: 3 }}>
          En foi de quoi,le présent rapport est établi en unique original pour servir et valoir ce que de droit, et sous
          réserves des droits des parties
        </Text>

        {/* Signatures */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
          <Text style={{ fontSize: 9 }}>Expert adverse : {data.expertAdverse || 'CEOO'}</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 9 }}>Signature</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>SLAUTO</Text>
            <SafeImage img={data.cachet || data.slLogo} style={{ width: 95, height: 48, objectFit: 'contain', marginTop: 2 }} />
          </View>
        </View>
      </RapportPage>

      {/* ══════════════════ PAGE 2 — DETAIL TABLE ══════════════════ */}
      <RapportPage>
        <Footer today={data.today} />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ width: '25%' }}>
            <SafeImage img={data.slLogo} style={{ width: 32, height: 26, objectFit: 'contain' }} />
          </View>
          <View style={{ width: '50%', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12 }}>RAPPORT D'EXPERTISE</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>CONTRADICTOIRE</Text>
          </View>
          <View style={{ width: '25%', alignItems: 'flex-end' }}>
            <SafeImage img={data.compagnieLogo} style={{ width: 80, height: 36, objectFit: 'contain' }} />
          </View>
        </View>

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center', marginBottom: 8 }}>
          REF EXPERT : {data.refExpert}
        </Text>

        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 4 }}>
          Détails fourniture et réparation :
        </Text>
        <Table cols={DETAIL_COLS} body={detailBody} fontSize={6.5} headFontSize={6.8} cellPad={2} boldRows={[sommeRow]} />

        {/* Observation */}
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 8, marginBottom: 3 }}>Observation expert :</Text>
        <View style={{ borderWidth: 0.6, borderColor: LINE, minHeight: 40, padding: 4 }}>
          <Text style={{ fontSize: 8, color: SOFT }}>{data.observation || ''}</Text>
        </View>

        <Text style={{ fontSize: 8, color: SOFT, marginTop: 8 }}>Publié le: {data.today}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, width: '70%', textAlign: 'center' }}>
            Expert: {data.cabinetAdverse || "CABINET D'ETUDES ET D'EXPERTISES OUDRHIRI"}
          </Text>
          <SafeImage img={data.cachet || data.slLogo} style={{ width: 90, height: 50, objectFit: 'contain' }} />
        </View>
      </RapportPage>
    </Document>
  );
}
