'use client';

/**
 * « Historique » for a dossiers-list row.
 *
 * Owner ruling 2026-09-09: the row menu used to offer two narrow slices —
 * « Historique des statuts » and « Historique des observations ». Neither
 * answered the question the gestionnaire actually asks of a row ("what has
 * happened to this dossier?"), so both are gone and this single sheet is the
 * historique again, in its original shape: the DATES CLÉS ledger on top, then
 * every recorded modification below it, newest first. It is the same data the
 * dossier's own Historique tab shows, read-only, without leaving the list.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Sheet } from '@/components/ui/sheet';
import { UserNameLink } from '@/components/user-name-link';
import { auditText } from '@/lib/audit-i18n';
import { useT } from '@/i18n';
import {
  buildDatesClesRows,
  formatAuditDate,
} from './[id]/historique-tab';
import {
  HistoryEmpty,
  HistoryLoading,
  HistorySheetContent,
  toDateSafe,
} from './status-history-sheet';

type DossierHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row itself — the list already holds the whole dossier document. */
  dossier: (Record<string, any> & { id: string; refExpert?: string }) | null;
};

export default function DossierHistorySheet({ open, onOpenChange, dossier }: DossierHistorySheetProps) {
  const t = useT();
  const db = useFirestore();
  const dossierId = dossier?.id ?? null;

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe only while the sheet is open: the list can hold hundreds of
  // rows and none of them should carry a historique listener at rest.
  useEffect(() => {
    if (!db || !dossierId || !open) {
      setEntries([]);
      setLoading(true);
      return;
    }
    const q = query(collection(db, 'dossiers', dossierId, 'historique'), orderBy('date', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('DossierHistorySheet: snapshot error', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [db, dossierId, open]);

  // Only the dates that actually happened — an empty ledger row is noise in a
  // panel this narrow (the dossier's own tab keeps the full grid with blanks).
  const datesCles = useMemo(
    () => buildDatesClesRows(dossier, t).filter((row) => !!row.value),
    [dossier, t],
  );

  if (!dossier) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <HistorySheetContent
        title={t('Historique')}
        description={t('Dates clés et modifications du dossier')}
        refExpert={dossier.refExpert}
        dataTour="dos-history-sheet"
      >
        {/* DATES CLÉS — the ledger, first, exactly as the tab presents it. */}
        <section className="pb-5">
          <h3 className="t-label pb-2">{t('Dates clés')}</h3>
          {datesCles.length === 0 ? (
            <p className="t-caption">{t('Aucune date enregistrée pour le moment.')}</p>
          ) : (
            <dl className="divide-y divide-hairline">
              {datesCles.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-1.5">
                  <dt className="min-w-0 truncate text-sm text-ink-3">{row.label}</dt>
                  <dd className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                    {formatAuditDate(row.value, '—')}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* MODIFICATIONS — every entry, not just the status ones. */}
        <section className="border-t border-hairline pt-4">
          <h3 className="t-label pb-2">{t('Modifications')}</h3>
          {loading ? (
            <HistoryLoading />
          ) : entries.length === 0 ? (
            <HistoryEmpty
              title={t('Aucune modification')}
              description={t("Les changements s'enregistrent ici au fil du dossier.")}
            />
          ) : (
            <ol className="relative space-y-5 border-l border-hairline-strong pl-5">
              {entries.map((entry) => (
                <li key={entry.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-ink-3"
                  />
                  <p className="text-sm font-semibold text-ink">{auditText(entry.action, t) || '—'}</p>
                  <p className="t-caption tabular-nums">
                    {toDateSafe(entry.date) ? formatAuditDate(entry.date, t('Date inconnue')) : t('Date inconnue')}
                    {' '}
                    {t('par')} <UserNameLink entry={entry} className="font-medium text-ink-2" />
                  </p>
                  {entry.details && (
                    <p className="mt-1 whitespace-pre-wrap break-words border-l-2 border-hairline-strong py-0.5 pl-3 text-sm italic text-ink-2">
                      {auditText(entry.details, t)}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </HistorySheetContent>
    </Sheet>
  );
}
