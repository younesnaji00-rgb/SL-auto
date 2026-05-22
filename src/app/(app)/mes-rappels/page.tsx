'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Inbox, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRappels } from '@/hooks/use-rappels';
import { collection, doc, onSnapshot, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const SESSION_KEY = (dossierId: string) => `rappel-active-session-${dossierId}`;

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function formatDate(ts: any): string {
  if (!ts) return '-';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  try { return format(date, 'dd/MM/yyyy HH:mm', { locale: fr }); } catch { return '-'; }
}

function formatHm(ts: any): string {
  if (!ts) return '--:--';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  try { return format(date, 'HH:mm', { locale: fr }); } catch { return '--:--'; }
}

function tsMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  const n = Number(ts);
  return Number.isFinite(n) ? n : 0;
}

interface SessionTaggedProps {
  dossierId: string;
  sessionId?: string;
}

/**
 * F9.B: lists every observation on this dossier whose `rappelSessionId`
 * matches the active rappel's session. Renders as `HH:mm [author] text`.
 */
function SessionObservations({ dossierId, sessionId }: SessionTaggedProps) {
  const db = useFirestore();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!db || !dossierId || !sessionId) {
      setItems([]);
      return;
    }
    const q = query(
      collection(db, 'dossiers', dossierId, 'observations'),
      where('rappelSessionId', '==', sessionId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.metadata.fromCache && snap.size === 0) return;
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
        setItems(rows);
      },
      () => {},
    );
    return () => unsub();
  }, [db, dossierId, sessionId]);

  if (!sessionId) return <span className="text-muted-foreground">—</span>;
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-col gap-1 max-w-[280px]">
      {items.map((it) => {
        const author = it.author || it.authorEmail || 'Utilisateur inconnu';
        return (
          <div key={it.id} className="text-xs leading-snug break-words">
            <span className="tabular-nums text-muted-foreground">{formatHm(it.createdAt)}</span>
            {' '}
            <span className="font-medium">[{author}]</span>
            {' '}
            <span>{it.text || ''}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * F9.B: lists every historique entry on this dossier whose
 * `rappelSessionId` matches the rappel's session, grouped by historique
 * `type`. Each entry shows `HH:mm [user] action`.
 */
function SessionModifications({ dossierId, sessionId }: SessionTaggedProps) {
  const db = useFirestore();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!db || !dossierId || !sessionId) {
      setItems([]);
      return;
    }
    const q = query(
      collection(db, 'dossiers', dossierId, 'historique'),
      where('rappelSessionId', '==', sessionId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.metadata.fromCache && snap.size === 0) return;
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => tsMillis(a.date) - tsMillis(b.date));
        setItems(rows);
      },
      () => {},
    );
    return () => unsub();
  }, [db, dossierId, sessionId]);

  if (!sessionId) return <span className="text-muted-foreground">—</span>;
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;

  const groups = new Map<string, any[]>();
  for (const it of items) {
    const type = it.type || 'autre';
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(it);
  }

  return (
    <div className="flex flex-col gap-2 max-w-[300px]">
      {Array.from(groups.entries()).map(([type, rows]) => (
        <div key={type} className="flex flex-col gap-0.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {type} ({rows.length})
          </div>
          {rows.map((it) => {
            const who = it.userNom || it.user || 'Utilisateur inconnu';
            return (
              <div key={it.id} className="text-xs leading-snug break-words pl-1">
                <span className="tabular-nums text-muted-foreground">{formatHm(it.date)}</span>
                {' '}
                <span className="font-medium">[{who}]</span>
                {' '}
                <span>{it.action || ''}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function MesRappelsPage() {
  const { rappels, loading } = useRappels();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Mes rappels</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rappels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Inbox className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Aucun rappel pour le moment.</p>
          <p className="text-xs mt-1 opacity-70">Les rappels envoyés depuis Gestion des dossiers apparaîtront ici.</p>
        </div>
      ) : (
        <Card className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-bold text-xs">Référence dossier</TableHead>
                <TableHead className="font-bold text-xs">Envoyé par</TableHead>
                <TableHead className="font-bold text-xs">Observation</TableHead>
                <TableHead className="font-bold text-xs">Date</TableHead>
                <TableHead className="font-bold text-xs">Observations</TableHead>
                <TableHead className="font-bold text-xs">Modifications</TableHead>
                <TableHead className="font-bold text-xs text-right">Statut</TableHead>
                <TableHead className="font-bold text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rappels.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    const existingSid = r.sessionId;
                    let sid = existingSid;
                    if (db) {
                      if (!existingSid) {
                        sid = newSessionId();
                        updateDoc(doc(db, 'rappels', r.id), {
                          read: true,
                          sessionId: sid,
                          sessionStartedAt: serverTimestamp(),
                        }).catch(() => {});
                      } else if (!r.read) {
                        updateDoc(doc(db, 'rappels', r.id), { read: true }).catch(() => {});
                      }
                    }
                    if (typeof window !== 'undefined' && sid) {
                      try { window.localStorage.setItem(SESSION_KEY(r.dossierId), sid); } catch {}
                    }
                    router.push(`/dossiers/${r.dossierId}`);
                  }}
                >
                  <TableCell className="font-mono text-sm font-semibold text-primary tabular-nums">
                    {r.dossierRef || r.dossierId}
                  </TableCell>
                  <TableCell className="text-sm">{r.senderNom || '—'}</TableCell>
                  <TableCell className="text-sm">{r.observation || '—'}</TableCell>
                  <TableCell className="text-sm tabular-nums">{formatDate(r.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default">
                    <SessionObservations dossierId={r.dossierId} sessionId={r.sessionId} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default">
                    <SessionModifications dossierId={r.dossierId} sessionId={r.sessionId} />
                  </TableCell>
                  <TableCell className="text-right">
                    {r.resolvedAt ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">Traité</Badge>
                    ) : r.read ? (
                      <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Lu</Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border border-primary/30">Nouveau</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!r.resolvedAt}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!db || r.resolvedAt) return;
                        updateDoc(doc(db, 'rappels', r.id), { resolvedAt: serverTimestamp() })
                          .then(() => {
                            if (typeof window !== 'undefined') {
                              try { window.localStorage.removeItem(SESSION_KEY(r.dossierId)); } catch {}
                            }
                            toast({ title: 'Rappel marqué comme traité' });
                          })
                          .catch(() => {
                            toast({ title: 'Erreur', description: 'Impossible de marquer comme traité', variant: 'destructive' });
                          });
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Marquer traité
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
