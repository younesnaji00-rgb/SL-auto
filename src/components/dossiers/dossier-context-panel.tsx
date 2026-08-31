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

function Card({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <span className="text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        <h3 className="flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </header>
      <div className="px-3 py-2 text-sm">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-1 text-xs text-muted-foreground">{children}</p>;
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
    <aside className={cn('flex flex-col gap-3', className)} aria-label="Contexte du dossier">
      <Card
        title="Observations"
        icon={<MessageSquare />}
        action={
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => onGoToStep(4)}>
            Voir
          </Button>
        }
      >
        {!observations || observations.length === 0 ? (
          <Empty>Aucune observation.</Empty>
        ) : (
          <ul className="space-y-2">
            {observations.map((o: any) => {
              const d = toDate(o.createdAt);
              return (
                <li key={o.id} className="min-w-0">
                  <p className="line-clamp-2 text-[13px] leading-snug text-foreground/90">{o.text || o.observation || '—'}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {o.userName || o.userNom || o.user || ''}
                    {d && <> · {formatDistanceToNow(d, { locale: fr, addSuffix: true })}</>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Rappels" icon={<Bell />}>
        {openRappels.length === 0 ? (
          <Empty>Aucun rappel actif pour vous sur ce dossier.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {openRappels.slice(0, 3).map((r: any) => {
              const d = toDate(r.createdAt);
              return (
                <li key={r.id} className="min-w-0 text-[13px]">
                  <span className="font-medium">{r.senderNom || 'Rappel'}</span>
                  {r.observation && <span className="text-muted-foreground"> — {r.observation}</span>}
                  {d && <span className="block text-[11px] text-muted-foreground">{format(d, 'dd/MM/yyyy HH:mm', { locale: fr })}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card
        title="Historique"
        icon={<History />}
        action={
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={onOpenHistorique}>
            Tout voir
          </Button>
        }
      >
        {!historique || historique.length === 0 ? (
          <Empty>Aucune entrée.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {historique.map((h: any) => {
              const d = toDate(h.date);
              return (
                <li key={h.id} className="min-w-0 text-[13px]">
                  <p className="truncate">{h.action || '—'}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {d && format(d, 'dd/MM/yyyy HH:mm', { locale: fr })}
                    {h.user && (
                      <>
                        {' · '}
                        <UserNameLink entry={{ userNom: h.userNom, user: h.user }} className="text-muted-foreground" />
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </aside>
  );
}

export default DossierContextPanel;
