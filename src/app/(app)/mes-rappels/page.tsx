'use client';

import React, { useMemo, useState } from 'react';
import { Bell, Inbox, Loader2, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRappels, useRappelsSent, type Rappel } from '@/hooks/use-rappels';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';

function formatDate(ts: any): string {
  if (!ts) return '-';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  try { return format(date, 'dd/MM/yyyy HH:mm', { locale: fr }); } catch { return '-'; }
}

function tsMillis(ts: any): number {
  if (!ts) return 0;
  if (ts.toMillis) return ts.toMillis();
  if (ts.toDate) return ts.toDate().getTime();
  const n = Number(ts);
  return Number.isFinite(n) ? n : 0;
}

interface SentGroup {
  key: string;
  batchId?: string;
  rappels: Rappel[];
  recipientNames: string[];   // distinct, in insertion order
  dossierCount: number;       // distinct dossier ids
  latest: any;
  readCount: number;
}

function groupSent(rappels: Rappel[]): SentGroup[] {
  const map = new Map<string, SentGroup>();
  const seenRecipients = new Map<string, Set<string>>(); // group key → recipientUid set
  const seenDossiers = new Map<string, Set<string>>();   // group key → dossierId set
  for (const r of rappels) {
    // Legacy data (no batchId) → each rappel is its own bundle of 1.
    const key = r.batchId || `solo:${r.id}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        batchId: r.batchId,
        rappels: [],
        recipientNames: [],
        dossierCount: 0,
        latest: r.createdAt,
        readCount: 0,
      };
      map.set(key, g);
      seenRecipients.set(key, new Set());
      seenDossiers.set(key, new Set());
    }
    g.rappels.push(r);
    if (r.read) g.readCount++;
    if (tsMillis(r.createdAt) > tsMillis(g.latest)) g.latest = r.createdAt;
    const recipientSet = seenRecipients.get(key)!;
    if (r.recipientUid && !recipientSet.has(r.recipientUid)) {
      recipientSet.add(r.recipientUid);
      g.recipientNames.push(r.recipientNom || '—');
    }
    const dossierSet = seenDossiers.get(key)!;
    if (r.dossierId && !dossierSet.has(r.dossierId)) {
      dossierSet.add(r.dossierId);
      g.dossierCount++;
    }
  }
  return Array.from(map.values()).sort((a, b) => tsMillis(b.latest) - tsMillis(a.latest));
}

function formatRecipients(names: string[]): string {
  if (names.length === 0) return '—';
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(', ');
  return `${names.length} destinataires`;
}

export default function MesRappelsPage() {
  const { rappels, loading } = useRappels();
  const { rappels: sentRappels, loading: sentLoading } = useRappelsSent();
  const router = useRouter();
  const db = useFirestore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sentGroups = useMemo(() => groupSent(sentRappels), [sentRappels]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Mes rappels</h1>
      </header>

      <Tabs defaultValue="recus" className="w-full">
        <TabsList>
          <TabsTrigger value="recus">Reçus</TabsTrigger>
          <TabsTrigger value="envoyes">Envoyés</TabsTrigger>
        </TabsList>

        <TabsContent value="recus" className="mt-4">
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
                    <TableHead className="font-bold text-xs">Date</TableHead>
                    <TableHead className="font-bold text-xs text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rappels.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        // Keep existing click-to-mark-read for UX redundancy; the dossier
                        // page mount effect is the canonical trigger but this ensures
                        // immediate feedback if Firestore propagation lags.
                        if (!r.read && db) {
                          updateDoc(doc(db, 'rappels', r.id), { read: true }).catch(() => {});
                        }
                        router.push(`/dossiers/${r.dossierId}`);
                      }}
                    >
                      <TableCell className="font-mono text-sm font-semibold text-primary tabular-nums">
                        {r.dossierRef || r.dossierId}
                      </TableCell>
                      <TableCell className="text-sm">{r.senderNom || '—'}</TableCell>
                      <TableCell className="text-sm tabular-nums">{formatDate(r.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {r.read ? (
                          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Lu</Badge>
                        ) : (
                          <Badge className="bg-primary/10 text-primary border border-primary/30">Nouveau</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="envoyes" className="mt-4">
          {sentLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sentGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Send className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Aucun rappel envoyé pour le moment.</p>
              <p className="text-xs mt-1 opacity-70">Les rappels que vous envoyez depuis Gestion des dossiers apparaîtront ici.</p>
            </div>
          ) : (
            <Card className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-bold text-xs w-8" />
                    <TableHead className="font-bold text-xs">Destinataire(s)</TableHead>
                    <TableHead className="font-bold text-xs">Dossiers</TableHead>
                    <TableHead className="font-bold text-xs">Date</TableHead>
                    <TableHead className="font-bold text-xs text-right">Lus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentGroups.map((g) => {
                    const isOpen = expanded.has(g.key);
                    const total = g.rappels.length;
                    return (
                      <React.Fragment key={g.key}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleExpand(g.key)}
                        >
                          <TableCell className="w-8">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell
                            className="text-sm font-medium"
                            title={g.recipientNames.join(', ')}
                          >
                            {formatRecipients(g.recipientNames)}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">{g.dossierCount}</TableCell>
                          <TableCell className="text-sm tabular-nums">{formatDate(g.latest)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            <span className={cn(g.readCount === total ? 'text-emerald-600' : 'text-muted-foreground')}>
                              {g.readCount} / {total} lus
                            </span>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow className="bg-muted/10">
                            <TableCell colSpan={5} className="p-0">
                              <div className="px-4 py-2">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-transparent">
                                      <TableHead className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground py-1">Dossier</TableHead>
                                      <TableHead className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground py-1">Destinataire</TableHead>
                                      <TableHead className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground py-1">Date</TableHead>
                                      <TableHead className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground text-right py-1">Statut</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {g.rappels.map((r) => (
                                      <TableRow key={r.id} className="border-b last:border-b-0">
                                        <TableCell className="font-mono text-sm font-semibold text-primary tabular-nums py-2">
                                          <Link
                                            href={`/dossiers/${r.dossierId}`}
                                            className="hover:underline"
                                          >
                                            {r.dossierRef || r.dossierId}
                                          </Link>
                                        </TableCell>
                                        <TableCell className="text-sm py-2">{r.recipientNom || '—'}</TableCell>
                                        <TableCell className="text-sm tabular-nums py-2">{formatDate(r.createdAt)}</TableCell>
                                        <TableCell className="text-right py-2">
                                          {r.read ? (
                                            <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Lu</Badge>
                                          ) : (
                                            <Badge className="bg-primary/10 text-primary border border-primary/30">Nouveau</Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
