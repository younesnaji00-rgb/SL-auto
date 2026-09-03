/**
 * Centralized dossier status colour mapping for the canonical 15-label set.
 * Every status resolves to one SEMANTIC STATUS PAIR (or the neutral surface
 * step) — `status-{success,warning,danger,info}-{bg,fg}` from globals.css,
 * ≥ 4.5:1 in both themes. No palette classes (blueprint §1: semantic colour
 * is separate from the accent; hand-picked hues were retired 2026-09-01).
 *
 * Family → tone (de-saturated 2026-09-03, owner-approved; research
 * docs/research/dossiers-attention-efficiency.md + dossiers-color-type-polish.md:
 * colour is the page's only preattentive channel — spend it on the 2–3
 * states that mean something, keep passive/progress states in ink. Few:
 * "subdued and neutral, except… especially important"):
 *   - Création dossier                       → neutral (not started)
 *   - Planification programmée / expertise   → neutral (scheduled — passive)
 *   - Proposition d'accord / 2ème / 3ème     → neutral (awaiting the other side)
 *   - Chiffrage en cours                     → warning (work in flight)
 *   - Accord / 2ème / 3ème accord            → success (agreed)
 *   - Accord envoyé                          → success (closed-ish)
 * The label text always disambiguates the stage within a family.
 */

type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const ACCORD_SET: ReadonlySet<string> = new Set([
  'Accord',
  '2ème accord',
  '3ème accord',
]);

const PROPOSITION_SET: ReadonlySet<string> = new Set([
  'Proposition d\'accord',
  '2ème proposition d\'accord',
  '3ème proposition d\'accord',
]);

/** Family classification shared by the badge, header and dot helpers. */
export function getStatusTone(status: string): StatusTone {
  const s = (status || '').trim();
  if (s === 'Création dossier') return 'neutral';
  if (s.startsWith('Planification programmée')) return 'neutral';
  if (s.startsWith('Planification expertise')) return 'neutral';
  if (s === 'Chiffrage en cours') return 'warning';
  if (PROPOSITION_SET.has(s)) return 'neutral';
  if (ACCORD_SET.has(s)) return 'success';
  if (s === 'Accord envoyé') return 'success';
  // Réforme = the exceptional verdict (véhicule économiquement irréparable) —
  // the one state that warrants the danger pair (previously fell through to
  // neutral, hiding it).
  if (s === 'Réforme') return 'danger';
  return 'neutral';
}

/** Tinted pill: soft bg + deep fg, hairline in the fg colour at 30 %. */
const BADGE_BY_TONE: Record<StatusTone, string> = {
  neutral: 'bg-surface-3 text-ink-2 border-transparent',
  info: 'bg-status-info-bg text-status-info-fg border-status-info-fg/30',
  warning: 'bg-status-warning-bg text-status-warning-fg border-status-warning-fg/30',
  success: 'bg-status-success-bg text-status-success-fg border-status-success-fg/30',
  danger: 'bg-status-danger-bg text-status-danger-fg border-status-danger-fg/30',
};

/** Solid variant (deep fg as the fill, soft bg as the text) for header bands. */
const HEADER_BY_TONE: Record<StatusTone, string> = {
  neutral: 'bg-ink-solid text-on-ink',
  info: 'bg-status-info-fg text-status-info-bg',
  warning: 'bg-status-warning-fg text-status-warning-bg',
  success: 'bg-status-success-fg text-status-success-bg',
  danger: 'bg-status-danger-fg text-status-danger-bg',
};

const DOT_BY_TONE: Record<StatusTone, string> = {
  neutral: 'bg-ink-4',
  info: 'bg-status-info-fg',
  warning: 'bg-status-warning-fg',
  success: 'bg-status-success-fg',
  danger: 'bg-status-danger-fg',
};

export function getStatusBadgeStyles(status: string): string {
  return BADGE_BY_TONE[getStatusTone(status)];
}

/** Standard className for a status pill badge (11 px / 500, pill). */
export const STATUS_BADGE_CLASS = 'text-[11px] py-0.5 px-2 rounded-full border font-medium whitespace-nowrap tabular-nums';

/**
 * Solid header-band variant. Same family classification as
 * getStatusBadgeStyles so colours stay coordinated across the UI.
 */
export function getStatusHeaderStyles(status: string): string {
  return HEADER_BY_TONE[getStatusTone(status)];
}

/** Small dot indicator colour — same family classification. */
export function getStatusDotColor(status: string): string {
  return DOT_BY_TONE[getStatusTone(status)];
}
