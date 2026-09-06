'use client';

/**
 * Rappels bell — the header's notification centre, fed by the same `rappels`
 * collection as /mes-rappels. Passive badge (NN/g): unread count only, cleared
 * when the recipient opens the dossier (the dossier page marks rappels read)
 * or via "Tout marquer comme lu".
 *
 * Phone form (research docs/research/mobile-overlays-feedback.md §10): the
 * 352 px dropdown was a desktop menu mis-sized to a 390 px screen. Below md
 * the bell opens a `BottomSheet tall` instead — « Rappels · N non lus » in the
 * header with « Tout marquer comme lu » as a 44 px text button, 56 px rows,
 * and « Voir tous les rappels » as a 48 px full-width footer. Tapping a row
 * CLOSES the sheet and then navigates (Apple: dismiss before presenting).
 * The badge stays on the bell; the desktop dropdown is untouched.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { useRappels, type Rappel } from '@/hooks/use-rappels';
import { useFirestore } from '@/firebase';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { cn } from '@/lib/utils';
import { dateFnsLocale, useT } from '@/i18n';

function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  return null;
}

function rappelLabel(r: Rappel): string {
  const ref = r.dossierRef || r.dossierData?.refExpert;
  const a = r.dossierData?.assure;
  const assure = typeof a === 'string' ? a : a ? `${a.prenom || ''} ${a.nom || ''}`.trim() : '';
  return [ref, assure].filter(Boolean).join(' · ') || 'Dossier';
}

export default function Notifications() {
  const { isVisible } = useVisibleNav();
  if (!isVisible('/mes-rappels')) return null;
  return <NotificationsInner />;
}

function NotificationsInner() {
  const t = useT();
  const router = useRouter();
  const db = useFirestore();
  const { rappels, loading } = useRappels();
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const unread = useMemo(() => rappels.filter((r) => !r.read && !r.resolvedAt), [rappels]);
  const items = useMemo(() => {
    const sorted = [...rappels].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
    return sorted.slice(0, 8);
  }, [rappels]);

  const markAllRead = async () => {
    if (!db || unread.length === 0) return;
    setMarking(true);
    try {
      const batch = writeBatch(db);
      unread.forEach((r) => batch.update(doc(db, 'rappels', r.id), { read: true }));
      await batch.commit();
    } catch (err) {
      console.warn('[notifications] markAllRead failed', err);
    } finally {
      setMarking(false);
    }
  };

  const openRappel = (r: Rappel) => {
    setOpen(false);
    router.push(`/dossiers/${r.dossierId}`);
  };

  const count = unread.length;
  const bellLabel =
    count > 0
      ? `${t('Rappels')} : ${count} ${count > 1 ? t('non lus') : t('non lu')}`
      : t('Rappels');

  const badge =
    count > 0 ? (
      <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-status-info-fg px-1 text-[11px] font-semibold tabular-nums text-status-info-bg ring-2 ring-background">
        {count > 99 ? '99+' : count}
      </span>
    ) : null;

  const emptyState = (
    <EmptyState
      icon={<Bell />}
      title={t('Aucun rappel')}
      description={t('Les rappels qui vous sont envoyés apparaîtront ici.')}
      dashed={false}
      className="border-0 bg-transparent py-6"
    />
  );

  /* ---------------------------- phone: sheet ---------------------------- */

  if (isPhone) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 text-ink-3 hover:text-ink"
          aria-label={bellLabel}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          data-tour="shell-notifications"
        >
          <Bell className="h-5 w-5" />
          {badge}
        </Button>

        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          detent="tall"
          flush
          title={
            <span className="truncate">
              {t('Rappels')}
              {count > 0 && <span className="text-ink-3"> · {count} {count > 1 ? t('non lus') : t('non lu')}</span>}
            </span>
          }
          titleText={bellLabel}
          headerActions={
            count > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[13px] font-medium text-accent-foreground transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> {t('Tout marquer comme lu')}
              </button>
            ) : null
          }
          footer={
            <Button variant="ghost" className="h-12 w-full justify-center text-[15px] text-ink-2" asChild>
              <Link href="/mes-rappels" onClick={() => setOpen(false)}>{t('Voir tous les rappels')}</Link>
            </Button>
          }
        >
          {items.length === 0 ? (
            <div className="px-4 py-2">
              {loading ? <p className="t-caption py-6 text-center">{t('Chargement…')}</p> : emptyState}
            </div>
          ) : (
            // 56 px rows (B §1 rhythm): 8 px unread dot, semibold label,
            // observation caption, relative time at the trailing edge.
            <ul className="divide-y divide-hairline">
              {items.map((r) => {
                const d = toDate(r.createdAt);
                const isUnread = !r.read && !r.resolvedAt;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => openRappel(r)}
                      className="grid min-h-[56px] w-full grid-cols-[10px_1fr_auto] items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:bg-surface-2 focus-visible:outline-none"
                    >
                      <span className={cn('h-2 w-2 rounded-full', isUnread ? 'bg-status-info-fg' : 'bg-surface-4')} aria-hidden />
                      <span className="min-w-0">
                        <span className={cn('block truncate text-[15px] leading-tight', isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>
                          {t(rappelLabel(r))}
                        </span>
                        {r.observation && <span className="t-caption mt-0.5 block truncate">{r.observation}</span>}
                        {r.senderNom && <span className="t-caption block truncate">{t('De')} {r.senderNom}</span>}
                      </span>
                      {d && (
                        <span className="t-caption shrink-0 tabular-nums">
                          {formatDistanceToNow(d, { locale: dateFnsLocale(), addSuffix: false })}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </BottomSheet>
      </>
    );
  }

  /* --------------------------- desktop: menu ---------------------------- */

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-ink-3 hover:text-ink"
          aria-label={bellLabel}
          title={t('Rappels')}
          data-tour="shell-notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {badge}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0" sheetTitle={t('Rappels')} sheetDetent="tall">
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
          <div>
            <p className="t-heading">{t('Rappels')}</p>
            <p className="t-caption">
              {loading
                ? t('Chargement…')
                : count > 0
                  ? `${count} ${count > 1 ? t('non lus') : t('non lu')}`
                  : t('Aucun rappel en attente')}
            </p>
          </div>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllRead} disabled={marking}>
              <Check className="h-3.5 w-3.5" /> {t('Tout marquer comme lu')}
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="p-3">{emptyState}</div>
        ) : (
          // List rows (element-specs §4 / Material 3 lists): hairline
          // dividers only, 16 px horizontal padding, ≥ 44 px, whole row
          // clickable; unread = info dot + heavier label (§14: never colour
          // alone — the dot pairs with the bold label and the header count).
          <ul className="max-h-80 divide-y divide-hairline overflow-y-auto">
            {items.map((r) => {
              const d = toDate(r.createdAt);
              const isUnread = !r.read && !r.resolvedAt;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openRappel(r)}
                    className={cn(
                      'grid min-h-11 w-full grid-cols-[10px_1fr_auto] items-start gap-2 px-4 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none',
                    )}
                  >
                    <span className={cn('mt-1.5 h-2 w-2 rounded-full', isUnread ? 'bg-status-info-fg' : 'bg-surface-4')} aria-hidden />
                    <span className="min-w-0">
                      <span className={cn('block truncate text-[13px]', isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>{t(rappelLabel(r))}</span>
                      {r.observation && <span className="t-caption block truncate">{r.observation}</span>}
                      {r.senderNom && <span className="t-caption block">{t('De')} {r.senderNom}</span>}
                    </span>
                    {d && (
                      <span className="t-caption shrink-0 tabular-nums">
                        {formatDistanceToNow(d, { locale: dateFnsLocale(), addSuffix: false })}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-hairline px-2 py-1.5">
          <Button variant="ghost" size="sm" className="w-full justify-center text-xs text-ink-2" asChild>
            <Link href="/mes-rappels" onClick={() => setOpen(false)}>{t('Voir tous les rappels')}</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
