'use client';

/**
 * HISTORIQUE as a full screen — `/dossiers/[id]?vue=historique` (mobile pass
 * 2026-09-06; research docs/research/mobile-record-pages.md E9).
 *
 * Not a Sheet: the history is a destination the reader scrolls and comes back
 * from, and a sheet over a record makes Back ambiguous (E12). HubSpot's record
 * redesign ✓ is the model for the row itself — "gave each activity an easily
 * scannable collapsed state, so that reps could survey across many data points
 * at once"; "removing activity icons, we cleared out many differing
 * components, controls, and uses of color".
 *
 * Anatomy: « Dates clés » as a one-column `dl` (40 px rows) → the log grouped
 * by day with sticky 32 px day headers → 56 px rows (time `t-mono` in a 44 px
 * column, action 2-line clamp, author caption), tap expands the details in
 * place, 50 loaded then « Voir plus ». No avatars, no per-row icons, no colour
 * except the sinistre-douteux callout, absolute dates (terrain ruling).
 */

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { UserNameLink } from '@/components/user-name-link';
import { toDate } from '@/lib/dossier-steps';
import { auditText } from '@/lib/audit-i18n';
import { DatesCles, SinistreDouteuxCallout, TIMELINE_ENTRY_TYPES, useHistoriqueData } from '../historique-tab';
import { cn } from '@/lib/utils';
import { intlLocale, useT } from '@/i18n';

const PAGE = 50;

/** « Mar. 3 sept. 2026 » — the sticky day header. */
function dayLabel(d: Date): string {
  const s = d.toLocaleDateString(intlLocale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function PhoneHistoriqueScreen({ dossierId }: { dossierId: string }) {
  const t = useT();
  const { entries, dossier, loading } = useHistoriqueData(dossierId);
  const [shown, setShown] = React.useState(PAGE);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  // Title (« Historique ») and the up-link to the hub are published by the
  // record page through <RecordBar> — one chrome registrar per route.

  const rows = React.useMemo(() => entries.filter((e) => TIMELINE_ENTRY_TYPES.has(e.type)), [entries]);
  const visible = rows.slice(0, shown);

  // Group the visible slice by calendar day, newest first (the query already
  // orders by date desc, so a single pass preserves the order).
  const days = React.useMemo(() => {
    const out: { key: string; label: string; items: any[] }[] = [];
    for (const e of visible) {
      const d = toDate(e.date);
      const key = d ? dayKey(d) : 'unknown';
      const label = d ? dayLabel(d) : t('Date inconnue');
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(e);
      else out.push({ key, label, items: [e] });
    }
    return out;
  }, [visible, t]);

  return (
    <div className="pb-4">
      <section className="px-4 pt-4">
        <h2 className="t-heading mb-2">{t('Dates clés')}</h2>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <DatesCles dossierId={dossierId} dossier={dossier} layout="list" />
        )}
      </section>

      {!loading && dossier?.sinistreDouteux?.active && (
        <div className="mt-5 px-4">
          <SinistreDouteuxCallout dossierId={dossierId} dossier={dossier} />
        </div>
      )}

      <section className="mt-6" aria-label={t('Journal')}>
        <h2 className="t-heading px-4">{t('Journal')}</h2>
        {loading ? (
          <div className="mt-2 space-y-px">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="t-caption px-4 py-6">{t('Aucun changement de statut enregistré pour ce dossier.')}</p>
        ) : (
          <>
            {days.map((day) => (
              <div key={day.key}>
                <h3 className="sticky top-0 z-10 flex h-8 items-center bg-surface-2 px-4 text-[12px] font-medium text-ink-2">
                  {day.label}
                </h3>
                <ul className="divide-y divide-hairline border-b border-hairline">
                  {day.items.map((entry) => {
                    const d = toDate(entry.date);
                    const open = expanded === entry.id;
                    const details = entry.details ? auditText(entry.details, t) : null;
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : entry.id)}
                          aria-expanded={open}
                          className="flex min-h-[56px] w-full items-start gap-2 px-4 py-2 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2"
                        >
                          <span className="t-mono w-11 shrink-0 pt-0.5 text-[12px] tabular-nums text-ink-3">
                            {d ? d.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('t-body-sm block text-ink', open ? '' : 'line-clamp-2')}>{auditText(entry.action, t)}</span>
                            {entry.user && (
                              <span className="t-caption block truncate">
                                <UserNameLink entry={entry} className="text-ink-3" />
                              </span>
                            )}
                            {open && details && (
                              <span className="mt-2 block border-l-2 border-hairline-strong py-0.5 pl-3 text-sm italic text-ink-2">
                                &quot;{details}&quot;
                              </span>
                            )}
                          </span>
                          {details && (
                            <ChevronDown
                              className={cn('mt-1 h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 ease-standard motion-reduce:transition-none', open && 'rotate-180')}
                              aria-hidden
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {rows.length > shown && (
              <div className="px-4 pt-4">
                <Button variant="outline" className="h-12 w-full" onClick={() => setShown((n) => n + PAGE)}>
                  {t('Voir plus')}
                </Button>
                <p className="t-caption mt-1.5 text-center tabular-nums">
                  {shown} {t('sur')} {rows.length}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default PhoneHistoriqueScreen;
