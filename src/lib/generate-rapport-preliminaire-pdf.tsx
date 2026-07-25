/**
 * Rapport d'expertise préliminaire — "RAPPORT D'EXPERTSE PRÉLIMINAIRE -
 * CONTRADICTOIRE" (Sanlam-style minute contradictoire).
 *
 * Rendered with @react-pdf/renderer: a plain black-on-white bordered form (no
 * logos, no footer, no stamp — exactly like the supplied scan). The prose and
 * form labels are set in Times (serif) while the bordered "fiche" tables use a
 * bold Helvetica label column, matching the original document's font mix.
 *
 * Page 1 — 1er expert (SL Auto): identity (N/Réf, sinistre, assuré, GSM), the
 * "entre les soussignés" preamble, the vehicle characteristics, and SL Auto's
 * own estimation des dommages + réforme values.
 * Page 2 — 2ème expert (adverse, left blank to be filled by hand): the same
 * estimation grid empty, the observation / motif de désaccord lines, and the
 * dual signature block.
 *
 * All data comes from `resolveRapportData` — this file is pure layout.
 */
import React from 'react';
import { Document, View, Text, Svg, Path } from '@react-pdf/renderer';
import { t } from '@/i18n';
import { resolveRapportData, type RapportData } from '@/lib/rapport-data';
import { fC, COMPANY_CITY } from '@/lib/generate-rapport-shared';
import { RapportPage, renderRapport, INK, SOFT } from '@/lib/rapport-pdf-kit';

export async function generateRapportPreliminairePDF(
  db: unknown,
  dossierId: string,
  options?: { returnBlob?: boolean },
): Promise<Blob | void> {
  const data = await resolveRapportData(db, dossierId);
  return renderRapport(
    <RapportPreliminaireDocument data={data} />,
    `Rapport_Preliminaire_${data.refExpert}_${data.today.replace(/\//g, '-')}.pdf`,
    options?.returnBlob,
  );
}

// ── Font roles (match the original scan's serif prose / sans labels mix) ──────
const SERIF = 'Times-Roman';
const SERIF_B = 'Times-Bold';
const SANS = 'Helvetica';
const SANS_B = 'Helvetica-Bold';

/** Repeated dot "fill-in-the-blank" run, as printed in the form. */
const dots = (n: number) => '.'.repeat(n);

// ── Bordered-grid primitives (single black hairline, no doubling) ────────────
function GBox({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={{ borderTopWidth: 0.7, borderLeftWidth: 0.7, borderColor: INK, ...style }}>
      {children}
    </View>
  );
}

function TRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row' }} wrap={false}>
      {children}
    </View>
  );
}

function Cell({
  w,
  children,
  font = SERIF,
  size = 9,
  align = 'left',
  last = false,
  pad = 5,
  color = INK,
}: {
  w: number;
  children?: React.ReactNode;
  font?: string;
  size?: number;
  align?: 'left' | 'right' | 'center';
  last?: boolean;
  pad?: number;
  color?: string;
}) {
  return (
    <View
      style={{
        width: `${w}%`,
        borderRightWidth: last ? 0 : 0.7,
        borderBottomWidth: 0.7,
        borderColor: INK,
        paddingVertical: pad,
        paddingHorizontal: 5,
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: font, fontSize: size, textAlign: align, color }}>
        {children === '' || children == null ? ' ' : children}
      </Text>
    </View>
  );
}

/** Pale form checkbox; light grey check when ticked (mirrors the scan). */
function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View
      style={{
        width: 11,
        height: 11,
        borderWidth: 0.8,
        borderColor: '#8a8a8a',
        backgroundColor: '#EAEAEA',
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? (
        <Svg width={11} height={11} viewBox="0 0 11 11">
          <Path d="M2 5.5 L4.5 8.2 L9 2.5" stroke="#6b6b6b" strokeWidth={1.4} fill="none" />
        </Svg>
      ) : null}
    </View>
  );
}

/** Full-width title inside a thin black box. */
function TitleBox({ children, size = 11 }: { children: React.ReactNode; size?: number }) {
  return (
    <View style={{ borderWidth: 0.7, borderColor: INK, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center' }}>
      <Text style={{ fontFamily: SERIF, fontSize: size, textAlign: 'center' }}>{children}</Text>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 9 }}>
      <View style={{ width: 2.6, height: 2.6, borderRadius: 1.3, backgroundColor: INK, marginRight: 5, marginLeft: 4 }} />
      <Text style={{ fontFamily: SERIF, fontSize: 9.5 }}>{children}</Text>
    </View>
  );
}

function SmallHeading({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <Text style={{ fontFamily: SERIF_B, fontSize: 8.5, textDecoration: 'underline', letterSpacing: 0.3, ...style }}>
      {children}
    </Text>
  );
}

const EST_LABELS = [
  '- Fournitures (pièces, fournitures peinture)',
  "- Main d'oeuvre tôlerie",
  "- Main d'oeuvre peinture",
  "- Main d'oeuvre mécanique",
  'Total brut des dommages',
  'A déduire vétusté ( )',
  'Total net des dommages',
] as const;
// Rows rendered bold (totaux).
const EST_BOLD = new Set([4, 6]);

/** Estimation des dommages grid. `values` empty ⇒ the blank 2ème-expert sheet. */
function EstimationTable({ values }: { values: string[] }) {
  return (
    <GBox style={{ marginTop: 2 }}>
      <TRow>
        <Cell w={60} font={SERIF_B} align="center" pad={4}>{t('Désignation et descriptif')}</Cell>
        <Cell w={40} font={SERIF_B} align="center" pad={4} last>{t('Valeur estimée')}</Cell>
      </TRow>
      {EST_LABELS.map((label, i) => {
        const bold = EST_BOLD.has(i);
        return (
          <TRow key={i}>
            <Cell w={60} font={bold ? SERIF_B : SERIF}>{t(label)}</Cell>
            <Cell w={40} font={bold ? SERIF_B : SERIF} align="right" last>{values[i] ?? ''}</Cell>
          </TRow>
        );
      })}
    </GBox>
  );
}

const VAL_LABELS = [
  'Valeur Vénale',
  'Valeur épave (sous réserve de la maximalisaton)',
  'Diférence des valeurs',
] as const;

/** Réforme valeurs grid (Vénale / épave / différence). */
function ValeursTable({ values }: { values: string[] }) {
  return (
    <GBox style={{ marginTop: 6 }}>
      {VAL_LABELS.map((label, i) => (
        <TRow key={i}>
          <Cell w={73} font={SANS_B}>{t(label)}</Cell>
          <Cell w={27} font={SANS} align="right" last>{values[i] ?? ''}</Cell>
        </TRow>
      ))}
    </GBox>
  );
}

/** "ESTIMATION DES DOMMAGES :" heading + the Réparation checkbox. */
function EstimationHeader({ reparation }: { reparation: boolean }) {
  return (
    <>
      <SmallHeading style={{ marginLeft: 14, marginTop: 4, marginBottom: 4 }}>
        {t('ESTIMATION DES DOMMAGES :')}
      </SmallHeading>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, marginBottom: 5 }}>
        <CheckBox checked={reparation} />
        <Text style={{ fontFamily: SERIF, fontSize: 9 }}>{t('Réparation')}</Text>
      </View>
    </>
  );
}

function ReformeRow({ economique, technique }: { economique: boolean; technique: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 4 }}>
      <CheckBox checked={economique} />
      <Text style={{ fontFamily: SERIF, fontSize: 9, marginRight: 22 }}>{t('Réforme Economique')}</Text>
      <CheckBox checked={technique} />
      <Text style={{ fontFamily: SERIF, fontSize: 9 }}>{t('Réforme Technique')}</Text>
    </View>
  );
}

/** Pure layout document (renderable with mock data for tests/preview). */
export function RapportPreliminaireDocument({ data }: { data: RapportData }) {
  const t2 = data.totals;
  const rv = data.reformeView;

  // Main d'oeuvre split by category (TTC); everything not tôlerie/peinture is
  // folded into "mécanique" so the four lines always sum to the brut total.
  const mdoTTCByKey = (k: string) =>
    data.mdoRows.filter((r) => r.key === k).reduce((a, r) => a + r.montantTTC, 0);
  const moTol = mdoTTCByKey('tolerie');
  const moPei = mdoTTCByKey('peinture');
  const moAutre = Math.max(0, t2.mdoTTC - moTol - moPei);

  const isEconomique = rv.isEconomique;
  const isTechnique = rv.isTechnique;
  const isReparation = !isEconomique && !isTechnique;
  const diff = Math.max(0, rv.valeurVenale - rv.valeurEpave);

  // 1er expert (SL Auto) — filled; 2ème expert — blank.
  const estValues = [
    fC(t2.fournitureTTC),
    fC(moTol),
    fC(moPei),
    fC(moAutre),
    fC(t2.totalTTC),
    fC(t2.vetuste),
    fC(Math.max(0, t2.totalTTC - t2.vetuste)),
  ];
  const valValues = [fC(rv.valeurVenale), fC(rv.valeurEpave), fC(diff)];
  const blank7 = ['', '', '', '', '', '', ''];
  const blank3 = ['', '', ''];

  const prose = { fontFamily: SERIF, fontSize: 9, marginBottom: 3 } as const;

  return (
    <Document>
      {/* ══════════════════ PAGE 1 — 1ER EXPERT ══════════════════ */}
      <RapportPage>
        <TitleBox size={11}>{t("RAPPORT D'EXPERTSE PRÉLIMINAIRE -CONTRADICTOIRE")}</TitleBox>

        {/* Identity fiche */}
        <GBox style={{ marginTop: 14 }}>
          {[
            ['N/Réf', data.refExpert],
            ['Sinistre du', data.dateSinistre],
            ['Assuré', data.assure.fullName],
            ['GSM', data.assure.telephone],
          ].map(([l, v], i) => (
            <TRow key={i}>
              <Cell w={31} font={SANS_B}>{t(l)}</Cell>
              <Cell w={69} font={SANS} last>{v}</Cell>
            </TRow>
          ))}
        </GBox>

        {/* Entre les soussignés */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: SERIF_B, fontSize: 9.5, marginBottom: 4 }}>{t('Entre les soussignés:')}</Text>
          <Text style={prose}>
            {t('Monsieur')} <Text style={{ fontFamily: SERIF_B }}>SLAUTO</Text>, {t('Expert désigné par la compagnie')} {data.compagnie}
          </Text>
          <Text style={prose}>
            {t('Assureur du véhicule immatriculé')} <Text style={{ fontFamily: SERIF_B }}>{data.vehicule.immatriculation}</Text>
            {' '}{t('par la police N°')} <Text style={{ fontFamily: SERIF_B }}>{data.policeNumber}</Text>
          </Text>
          <Text style={prose}>
            {t('Et Monsieur')} {dots(52)}, {t('Expert désigné par la compagnie assureur du')} {dots(23)}
          </Text>
          <Text style={prose}>
            {t('véhicule immatriculé')} {dots(28)} {t('par la police N°')} {dots(28)}
          </Text>
          <Text style={prose}>{t("A l'effet de procéder à l'estimation contradictoire des dommages subis par")}</Text>
          <Text style={prose}>{dots(99)} {t('dont les caractéristiques se présentent comme suit:')}</Text>
        </View>

        {/* Caractéristique technique */}
        <SmallHeading style={{ marginTop: 8, marginBottom: 4 }}>{t('CARACTERISTIQUE TECHNIQUE DU VEHICULE :')}</SmallHeading>
        <GBox>
          {[
            ['Marque', data.vehicule.marque, 'Châssis', data.vehicule.serie],
            ['Type', data.vehicule.typeMine, 'Puissance', data.vehicule.puissance],
            ['DMC', data.vehicule.mec, 'Carburant', data.vehicule.energie],
            ['Cylindre', data.vehicule.cylindre, 'Kilométrages', data.vehicule.km],
          ].map(([l1, v1, l2, v2], i) => (
            <TRow key={i}>
              <Cell w={20} font={SANS_B}>{t(l1)}</Cell>
              <Cell w={30} font={SANS}>{v1}</Cell>
              <Cell w={22} font={SANS_B}>{t(l2)}</Cell>
              <Cell w={28} font={SANS} last>{v2}</Cell>
            </TRow>
          ))}
        </GBox>

        {/* Position 1er expert + estimation */}
        <Bullet>{t('POSITION DU 1ER EXPERT :')}</Bullet>
        <EstimationHeader reparation={isReparation} />
        <EstimationTable values={estValues} />
        <ReformeRow economique={isEconomique} technique={isTechnique} />
        <ValeursTable values={valValues} />
      </RapportPage>

      {/* ══════════════════ PAGE 2 — 2ÈME EXPERT ══════════════════ */}
      <RapportPage>
        <TitleBox size={10}>{t("ANNEXE 4 : RAPPORT D'EXPERTSE PRÉLIMINAIRE - CONTRADICTOIRE")}</TitleBox>

        <Bullet>{t('POSITION DU 2ÈME EXPERT :')}</Bullet>
        <EstimationHeader reparation={false} />
        <EstimationTable values={blank7} />
        <ReformeRow economique={false} technique={false} />
        <ValeursTable values={blank3} />

        {/* Observation / motif de désaccord */}
        <SmallHeading style={{ marginTop: 12, marginBottom: 6 }}>{t('OBSERVATION OU MOTIF DE DÉSACCORD :')}</SmallHeading>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ borderBottomWidth: 0.7, borderColor: SOFT, borderStyle: 'dotted', height: 13 }} />
        ))}

        <Text style={{ fontFamily: SERIF, fontSize: 9, marginTop: 14 }}>
          {t('En foi de quoi, la présente minute est établie pour servir et valoir ce que de droit')}
        </Text>

        {/* Dual signature block */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <View style={{ width: '48%' }}>
            <Text style={{ fontFamily: SERIF, fontSize: 9 }}>{t('Fait à')} {COMPANY_CITY}, {t('le')} {data.today}</Text>
            <Text style={{ fontFamily: SERIF, fontSize: 9, marginTop: 2 }}>{t('EXPERT DE LA COMPAGNIE')}</Text>
            <Text style={{ fontFamily: SERIF, fontSize: 9 }}>{data.compagnie}</Text>
            <Text style={{ fontFamily: SERIF, fontSize: 9 }}>SLAUTO</Text>
          </View>
          <View style={{ width: '48%' }}>
            <Text style={{ fontFamily: SERIF, fontSize: 9 }}>{t('EXPERT DE LA COMPAGNIE')}</Text>
            <Text style={{ fontFamily: SERIF, fontSize: 9 }}>{dots(35)}</Text>
            <Text style={{ fontFamily: SERIF, fontSize: 9 }}>{t('Cabinet')} {dots(26)}</Text>
          </View>
        </View>
      </RapportPage>
    </Document>
  );
}
