'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator, Loader2, FileText, ChevronDown, ChevronRight, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCurrentUser } from '@/hooks/use-current-user';

interface ChiffrageItem {
  id: string;
  dossierId: string;
  dossierNom: string;
  assignedChiffreurNom: string;
  status: string;
  files: any[];
  createdAt: any;
  sentByNom?: string;
  sentByEmail?: string;
}

function computeFileCounts(files: any[]) {
  const photos: Record<string, number> = { avant: 0, en_cours: 0, apres: 0 };
  const docs: Record<string, number> = {};

  (files || []).forEach((f: any) => {
    if (f.type === 'photo') {
      const cat = f.category || 'avant';
      photos[cat] = (photos[cat] || 0) + 1;
    } else {
      const dt = f.docType || 'Autre';
      docs[dt] = (docs[dt] || 0) + 1;
    }
  });

  return { photos, docs };
}

const photoCatLabels: Record<string, string> = {
  avant: 'Photos Avant',
  en_cours: 'Photos En cours',
  apres: 'Photos Après',
};

export default function AssignationsChiffragePage() {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const [chiffrages, setChiffrages] = useState<ChiffrageItem[]>([]);
  const [dossierStatuts, setDossierStatuts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, Set<string>>>({});

  // Listen to chiffrages
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'chiffrages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChiffrageItem)).filter(c => c.files && c.files.length > 0);
      if (profile?.role === 'Chiffreur' && profile?.nom) {
        const myName = profile.nom.toLowerCase().trim();
        items = items.filter(c => c.assignedChiffreurNom?.toLowerCase().trim() === myName);
      }
      setChiffrages(items);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db, profile?.role, profile?.nom]);

  // Listen to dossier statuts for all referenced dossierIds
  const dossierIds = useMemo(() => [...new Set(chiffrages.map(c => c.dossierId).filter(Boolean))], [chiffrages]);

  useEffect(() => {
    if (!db || dossierIds.length === 0) return;
    const unsubs = dossierIds.map(did =>
      onSnapshot(doc(db, 'dossiers', did), (snap) => {
        if (snap.exists()) {
          setDossierStatuts(prev => ({ ...prev, [did]: snap.data().statut || 'Nouveau' }));
        }
      })
    );
    return () => unsubs.forEach(u => u());
  }, [db, dossierIds.join(',')]);

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr }); }
    catch { return '-'; }
  };

  const toggleRowSection = (chiffrageId: string, section: string) => {
    setExpandedRows(prev => {
      const current = prev[chiffrageId] || new Set<string>();
      const next = new Set(current);
      if (next.has(section)) next.delete(section); else next.add(section);
      return { ...prev, [chiffrageId]: next };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Assignations au Chiffrage</h1>
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
                <TableHead className="font-bold text-xs">Assigné par</TableHead>
                <TableHead className="font-bold text-xs text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : chiffrages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Aucune assignation au chiffrage.
                  </TableCell>
                </TableRow>
              ) : (
                chiffrages.map((c) => {
                  const { photos, docs } = computeFileCounts(c.files);
                  const expanded = expandedRows[c.id] || new Set<string>();
                  const statut = dossierStatuts[c.dossierId] || 'Nouveau';

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/50 transition-colors align-top">
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
                        <div className="space-y-1">
                          {/* Photo counts by category */}
                          {Object.entries(photos).filter(([, count]) => count > 0).map(([cat, count]) => {
                            const key = `photo_${cat}`;
                            return (
                              <button
                                key={key}
                                onClick={() => toggleRowSection(c.id, key)}
                                className="flex items-center gap-1.5 text-xs w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                              >
                                {expanded.has(key) ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                <span className="flex-1 text-left">{photoCatLabels[cat] || cat}</span>
                                <Badge variant="secondary" className="text-[9px] py-0 h-4 font-mono">{count}</Badge>
                              </button>
                            );
                          })}
                          {/* Document counts by type */}
                          {Object.entries(docs).map(([docType, count]) => {
                            const key = `doc_${docType}`;
                            return (
                              <button
                                key={key}
                                onClick={() => toggleRowSection(c.id, key)}
                                className="flex items-center gap-1.5 text-xs w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                              >
                                {expanded.has(key) ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                <FileText className="h-3 w-3 text-muted-foreground" />
                                <span className="flex-1 text-left">{docType}</span>
                                <Badge variant="secondary" className="text-[9px] py-0 h-4 font-mono">{count}</Badge>
                              </button>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{statut}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.sentByNom || c.sentByEmail || '-'}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
