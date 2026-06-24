/**
 * Shared @react-pdf/renderer primitives for the rapport PDFs.
 *
 * The supplied templates are plain black-on-white bordered forms — the only
 * colour on the page is the two logos. So this kit deliberately ships NO blue
 * theme: ink is black, rules are thin dark-grey, and the only fill is a pale
 * neutral grey for label/header cells. Layout is declarative (flex + percentage
 * widths) so column ratios are exact instead of hand-placed millimetres, and the
 * output is vector (selectable text, tiny file).
 */
import React from 'react';
import { Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { LoadedImage } from './generate-rapport-shared';

/**
 * Render a built `<Document>` to a Blob and either return it (for callers that
 * embed/preview) or trigger a browser download with the given filename. Keeps
 * the same call shape the old jsPDF wrappers exposed (`{ returnBlob }`).
 */
export async function renderRapport(
  doc: React.ReactElement,
  filename: string,
  returnBlob?: boolean,
): Promise<Blob | void> {
  // @react-pdf uses `export =`, so the precise `ReactElement<DocumentProps>`
  // type is awkward to express at call sites; the cast is safe because callers
  // always pass a <Document>-rooted element.
  const blob = await pdf(doc as NonNullable<Parameters<typeof pdf>[0]>).toBlob();
  if (returnBlob) return blob;
  if (typeof document === 'undefined') return blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Palette (monochrome — matches the scans) ──────────────────────────────
export const INK = '#000000';
export const LINE = '#1f1f1f'; // thin table/box rules
export const SHADE = '#ECECEC'; // pale neutral grey for label/header cells (NO blue)
export const SOFT = '#3a3a3a'; // slightly softer ink for values

export const PAGE_PAD_X = 28; // ~10mm side margins
export const PAGE_PAD_TOP = 22;
export const PAGE_PAD_BOTTOM = 46; // room for the fixed footer

const base = StyleSheet.create({
  page: {
    paddingTop: PAGE_PAD_TOP,
    paddingBottom: PAGE_PAD_BOTTOM,
    paddingHorizontal: PAGE_PAD_X,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: INK,
    lineHeight: 1.15,
  },
  box: {
    borderTopWidth: 0.6,
    borderLeftWidth: 0.6,
    borderColor: LINE,
  },
});

/** A4 portrait page with the house padding. */
export function RapportPage({ children }: { children: React.ReactNode }) {
  return (
    <Page size="A4" style={base.page} wrap>
      {children}
    </Page>
  );
}

/** Image that simply renders nothing when the payload is missing/invalid. */
export function SafeImage({
  img,
  style,
}: {
  img: LoadedImage | null | undefined;
  style?: Style;
}) {
  if (!img || !img.data) return null;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={img.data} style={style} />;
}

/** Full-width pale section band ("Assuré", "EVALUATION DES DOMMAGES", …). */
export function Band({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: Style;
}) {
  return (
    <View
      style={{
        backgroundColor: SHADE,
        borderWidth: 0.6,
        borderColor: LINE,
        paddingVertical: 2.5,
        paddingHorizontal: 4,
        ...style,
      }}
    >
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>{children}</Text>
    </View>
  );
}

/** Bold label + normal value, inline. */
export function LV({
  label,
  value,
  style,
  labelStyle,
  valueStyle,
}: {
  label: string;
  value?: string;
  style?: Style;
  labelStyle?: Style;
  valueStyle?: Style;
}) {
  return (
    <Text style={{ fontSize: 8, ...style }}>
      <Text style={{ fontFamily: 'Helvetica-Bold', ...labelStyle }}>{label} </Text>
      <Text style={{ color: SOFT, ...valueStyle }}>{value || ''}</Text>
    </Text>
  );
}

// ── Bordered grid table ───────────────────────────────────────────────────
export type Col = {
  /** Column width as a percentage of the table width (all cols must sum to 100). */
  width: number;
  header?: string;
  align?: 'left' | 'right' | 'center';
};

export type TableProps = {
  cols: Col[];
  /** Header labels; falls back to each col's `header`. Omit for a head-less table. */
  head?: string[];
  body: Array<Array<string | number>>;
  fontSize?: number;
  headFontSize?: number;
  /** Row indexes (in body) to render bold. */
  boldRows?: number[];
  /** Column indexes to render bold across all body rows (e.g. a label column). */
  boldCols?: number[];
  /** Per-cell vertical padding. */
  cellPad?: number;
  headAlign?: 'left' | 'right' | 'center';
  style?: Style;
};

/**
 * A bordered table that draws single-width grid lines via the
 * top/left-on-container + right/bottom-on-cell technique (no doubled borders).
 */
export function Table({
  cols,
  head,
  body,
  fontSize = 8,
  headFontSize,
  boldRows = [],
  boldCols = [],
  cellPad = 3,
  headAlign = 'center',
  style,
}: TableProps) {
  const headers = head ?? cols.map((c) => c.header ?? '');
  const hasHead = headers.some((h) => h !== '') || head !== undefined;

  const cell = (
    content: string | number,
    col: Col,
    opts: { bold?: boolean; shade?: boolean; align?: Col['align']; size: number },
    isLastCol: boolean,
  ) => (
    <View
      style={{
        width: `${col.width}%`,
        borderRightWidth: isLastCol ? 0 : 0.6,
        borderBottomWidth: 0.6,
        borderColor: LINE,
        backgroundColor: opts.shade ? SHADE : undefined,
        paddingVertical: cellPad,
        paddingHorizontal: 3,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: opts.size,
          fontFamily: opts.bold ? 'Helvetica-Bold' : 'Helvetica',
          textAlign: opts.align ?? col.align ?? 'left',
          color: opts.bold ? INK : SOFT,
        }}
      >
        {content === '' || content == null ? ' ' : String(content)}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        borderTopWidth: 0.6,
        borderLeftWidth: 0.6,
        borderColor: LINE,
        ...style,
      }}
    >
      {hasHead && (
        <View style={{ flexDirection: 'row' }}>
          {cols.map((c, i) =>
            cell(
              headers[i] ?? '',
              c,
              { bold: true, shade: true, align: headAlign, size: headFontSize ?? fontSize },
              i === cols.length - 1,
            ),
          )}
        </View>
      )}
      {body.map((row, ri) => (
        <View style={{ flexDirection: 'row' }} key={ri} wrap={false}>
          {cols.map((c, ci) =>
            cell(
              row[ci] ?? '',
              c,
              { bold: boldRows.includes(ri) || boldCols.includes(ci), size: fontSize },
              ci === cols.length - 1,
            ),
          )}
        </View>
      ))}
    </View>
  );
}

/** Thin full-width horizontal rule. */
export function Rule({ color = INK, top = 4, bottom = 0 }: { color?: string; top?: number; bottom?: number }) {
  return <View style={{ borderBottomWidth: 0.8, borderColor: color, marginTop: top, marginBottom: bottom }} />;
}
