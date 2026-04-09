'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChiffrageItem {
  id: string;
  dossierId: string;
  dossierNom: string;
  assignedChiffreurNom: string;
  status: string;
  files: any[];
  createdAt: any;
}

export default function AssignationsChiffragePage() {
  const db = useFirestore();
  const [chiffrages, setChiffrages] = useState<ChiffrageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'chiffrages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setChiffrages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChiffrageItem)).filter(c => c.files && c.files.length > 0));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db]);

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy 'a' HH:mm", { locale: fr }); }
    catch { return '-'; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Assignations au Chiffrage</h1>
        <Badge variant="secondary" className="ml-2">{chiffrages.length}</Badge>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-bold text-xs">Dossier</TableHead>
                <TableHead className="font-bold text-xs">Chiffreur</TableHead>
                <TableHead className="font-bold text-xs">Fichiers</TableHead>
                <TableHead className="font-bold text-xs">Statut</TableHead>
                <TableHead className="font-bold text-xs text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : chiffrages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Aucune assignation au chiffrage.
                  </TableCell>
                </TableRow>
              ) : (
                chiffrages.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Link
                        href={`/assignations-chiffrage/${c.id}`}
                        className="font-bold text-sm text-primary hover:underline"
                      >
                        {c.dossierNom || 'Sans ref.'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{c.assignedChiffreurNom || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{c.files?.length || 0} fichiers</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === 'done' ? 'expertise' : 'secondary'}
                        className="gap-1"
                      >
                        {c.status === 'done' ? (
                          <><CheckCircle2 className="h-3 w-3" /> Termine</>
                        ) : (
                          <><Loader2 className="h-3 w-3 animate-spin" /> En cours</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
