'use client';

import React from 'react';
import { Bell, Inbox, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRappels } from '@/hooks/use-rappels';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
