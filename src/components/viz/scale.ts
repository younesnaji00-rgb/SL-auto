/**
 * The only "chart library" the dashboards need (docs/research/dashboard-charts.md D2):
 * a linear scale, a nice axis top and number formatting in French.
 */

export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** Top of a zero-based axis: 1 / 2 / 5 × 10ⁿ just above `max`. */
export const nice = (max: number): number => {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  const m = max / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
};

const NNBSP = ' ';

/** Integer with French thousands separators (narrow no-break space). */
export const fmtInt = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return n < 0 ? `−${s}` : s;
};

/** Decimal with a French comma, `digits` fraction digits. */
export const fmtDec = (n: number | null | undefined, digits = 1): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  const fixed = Math.abs(n).toFixed(digits);
  const [int, frac] = fixed.split('.');
  const s = int.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP) + (frac ? `,${frac}` : '');
  return n < 0 ? `−${s}` : s;
};

/** Calendar-day duration: « 0,5 j », « 3 j », « 12,4 j ». */
export const fmtDays = (d: number | null | undefined): string => {
  if (d == null || !Number.isFinite(d)) return '—';
  const digits = d >= 10 || Number.isInteger(d) ? 0 : 1;
  return `${fmtDec(d, digits)}${NNBSP}j`;
};

/** Percentage from an already-rounded integer or null. */
export const fmtPct = (p: number | null | undefined): string => (p == null || !Number.isFinite(p) ? '—' : `${fmtInt(p)}${NNBSP}%`);

/**
 * Dirhams: every digit up to six (« 124 500 MAD »), the SI prefix only past a
 * million (« 1,2 M MAD ») — aesthetics R7/R8 (OQLF). The label follows the
 * number after a narrow no-break space.
 */
export const fmtMAD = (n: number | null | undefined, label = 'MAD'): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const body = abs >= 1_000_000 ? `${fmtDec(abs / 1_000_000, 1)}${NNBSP}M` : fmtInt(abs);
  return `${n < 0 ? '−' : ''}${body}${NNBSP}${label}`;
};

/** Signed delta with the true minus: « +3 », « −2 », « 0 ». */
export const fmtSigned = (n: number | null | undefined, digits = 0): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  return `${n > 0 ? '+' : '−'}${fmtDec(Math.abs(n), digits)}`;
};
