'use client';

/**
 * Right-hand context column for the dossier page on wide screens (HubSpot /
 * Jira pattern): compact summaries of Observations, Rappels and Historique so
 * they are visible without opening sheets. Below `xl` the page keeps its
 * existing sheets/dialogs — this column simply isn't rendered.
 */

import React, { useMemo } from 'react';
import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, History, MessageSquare } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { UserNameLink } from '@/components/user-name-link';
import { toDate } from '@/lib/dossier-steps';
import { cn } from '@/lib/utils';

/**
 * Flat context block (DESIGN.md §10): no card, no border — a `t-label`
 * header and hairline-separated rows; blocks are separated by spacing so the
 * column reads as one quiet aside next to the paper steps.
 */
function Block({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <header className="flex h-6 items-center gap-2">
        <span className="text-ink-3 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        <h3 className="t-label flex-1">{title}</h3>
        {action}
      </header>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="t-caption py-1">{children}</p>;
}

export function DossierContextPanel({
  dossierId,
  onOpenHistorique,
  onGoToStep,
  className,
}: {
  dossierId: string;
  onOpenHistorique: () => void;
  onGoToStep: (stepId: number) => void;
  className?: string;
}) {
  const db = useFirestore();
  const { profile } = useCurrentUser();

  const obsQuery = useMemo(
    () => (db && dossierId ? query(collection(db, 'dossiers', dossierId, 'observations'), orderBy('createdAt', 'desc'), limit(3)) : null),
    [db, dossierId],
  );
  const histQuery = useMemo(
    () => (db && dossierId ? query(collection(db, 'dossiers', dossierId, 'historique'), orderBy('date', 'desc'), limit(4)) : null),
    [db, dossierId],
  );
  const rappelQuery = useMemo(
    () =>
      db && dossierId && profile?.uid
        ? query(collection(db, 'rappels'), where('recipientUid', '==', profile.uid), where('dossierId', '==', dossierId))
        : null,
    [db, dossierId, profile?.uid],
  );

  const { data: observations } = useCollection<any>(obsQuery as any);
  const { data: historique } = useCollection<any>(histQuery as any);
  const { data: rappels } = useCollection<any>(rappelQuery as any);

  const openRappels = (rappels || []).filter((r: any) => !r.resolvedAt);

  return (
    <aside className={cn('flex flex-col gap-8', className)} aria-label="Contexte du dossier">
      <Block
        title="Observations"
        icon={<MessageSquare />}
        action={
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-ink-3 hover:text-ink" onClick={() => onGoToStep(4)}>
            Voir
          </Button>
        }
      >
        {!observations || observations.length === 0 ? (
          <Empty>Aucune observation.</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {observations.map((o: any) => {
              const d = toDate(o.createdAt);
              return (
                <li key={o.id} className="min-w-0 py-2 first:pt-0 last:pb-0">
                  <p className="t-body-sm line-clamp-2 text-ink-2">{o.text || o.observation || '—'}</p>
                  <p className="t-caption mt-0.5 truncate">
                    {o.userName || o.userNom || o.user || ''}
                    {d && <> · {formatDistanceToNow(d, { locale: fr, addSuffix: true })}</>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <Block title="Rappels" icon={<Bell />}>
        {openRappels.length === 0 ? (
          <Empty>Aucun rappel actif pour vous sur ce dossier.</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {openRappels.slice(0, 3).map((r: any) => {
              const d = toDate(r.createdAt);
              return (
                <li key={r.id} className="t-body-sm min-w-0 py-2 first:pt-0 last:pb-0">
                  <span className="font-medium text-ink">{r.senderNom || 'Rappel'}</span>
                  {r.observation && <span className="text-ink-3"> — {r.observation}</span>}
                  {d && <span className="t-caption block">{format(d, 'dd/MM/yyyy HH:mm', { locale: fr })}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <Block
        title="Historique"
        icon={<History />}
        action={
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-ink-3 hover:text-ink" onClick={onOpenHistorique}>
            Tout voir
          </Button>
        }
      >
        {!historique || historique.length === 0 ? (
          <Empty>Aucune entrée.</Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {historique.map((h: any) => {
              const d = toDate(h.date);
              return (
                <li key={h.id} className="min-w-0 py-2 first:pt-0 last:pb-0">
                  <p className="t-body-sm truncate text-ink-2">{h.action || '—'}</p>
                  <p className="t-caption truncate">
                    {d && format(d, 'dd/MM/yyyy HH:mm', { locale: fr })}
                    {h.user && (
                      <>
                        {' · '}
                        <UserNameLink entry={{ userNom: h.userNom, user: h.user }} className="text-ink-3" />
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Block>
    </aside>
  );
}

export default DossierContextPanel;
