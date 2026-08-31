'use client';

/**
 * Rappels bell — the header's notification centre, fed by the same `rappels`
 * collection as /mes-rappels. Passive badge (NN/g): unread count only, cleared
 * when the recipient opens the dossier (the dossier page marks rappels read)
 * or via "Tout marquer comme lu".
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { useRappels, type Rappel } from '@/hooks/use-rappels';
import { useFirestore } from '@/firebase';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { cn } from '@/lib/utils';

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
  const router = useRouter();
  const db = useFirestore();
  const { rappels, loading } = useRappels();
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-ink-3 hover:text-ink"
          aria-label={count > 0 ? `Rappels : ${count} non lu${count > 1 ? 's' : ''}` : 'Rappels'}
          title="Rappels"
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-status-info-fg px-1 text-[11px] font-semibold tabular-nums text-status-info-bg ring-2 ring-background">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
          <div>
            <p className="t-heading">Rappels</p>
            <p className="t-caption">
              {loading ? 'Chargement…' : count > 0 ? `${count} non lu${count > 1 ? 's' : ''}` : 'Aucun rappel en attente'}
            </p>
          </div>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllRead} disabled={marking}>
              <Check className="h-3.5 w-3.5" /> Tout marquer comme lu
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="p-3">
            <EmptyState
              icon={<Bell />}
              title="Aucun rappel"
              description="Les rappels qui vous sont envoyés apparaîtront ici."
              dashed={false}
              className="border-0 bg-transparent py-6"
            />
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {items.map((r) => {
              const d = toDate(r.createdAt);
              const isUnread = !r.read && !r.resolvedAt;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openRappel(r)}
                    className={cn(
                      'grid w-full grid-cols-[10px_1fr_auto] items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none',
                    )}
                  >
                    <span className={cn('mt-1.5 h-2 w-2 rounded-full', isUnread ? 'bg-status-info-fg' : 'bg-surface-4')} aria-hidden />
                    <span className="min-w-0">
                      <span className={cn('block truncate text-sm', isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>{rappelLabel(r)}</span>
                      {r.observation && <span className="t-caption block truncate">{r.observation}</span>}
                      {r.senderNom && <span className="t-caption block">De {r.senderNom}</span>}
                    </span>
                    {d && (
                      <span className="t-caption shrink-0 tabular-nums">
                        {formatDistanceToNow(d, { locale: fr, addSuffix: false })}
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
            <Link href="/mes-rappels" onClick={() => setOpen(false)}>Voir tous les rappels</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
