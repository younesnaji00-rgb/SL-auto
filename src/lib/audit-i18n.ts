import { getLocale } from '@/i18n';
import { applyAuditRules, type Translate } from '@/lib/audit-rules';

/**
 * English rendering for audit trails (historique / workflow entries).
 *
 * Those entries are PERSISTED in French: `logHistorique` writes an `action`
 * label plus a `details` sentence built by template interpolation, so a flat
 * dictionary can translate the fixed labels but never the sentences — an
 * English demo would show French history rows.
 *
 * Order: pattern rules first (they own the interpolated shapes), then the
 * dictionary, then the stored string untouched.
 *
 * French locale is a no-op — the stored string IS the source of truth.
 */
export function auditText(raw: unknown, t: Translate): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return '';
  if (getLocale() !== 'en') return s;
  return applyAuditRules(s, t) ?? t(s);
}
