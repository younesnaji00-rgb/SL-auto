'use client';

import React, { useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  type Timestamp,
} from 'firebase/firestore';
import {
  Calculator,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  Scale,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useFirestore, useCollection } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  computeDifference,
  computeTotalIndemnisation,
  type ReformeData,
} from '@/lib/reforme-schema';

interface Step5ChiffrageProps {
  dossierId: string;
  dossier: any;
}

type ModifiedRow = {
  key: string;
  fileName: string;
  docType: string;
  updatedBy: string | null;
  updatedAt: any;
  structured: any | null;
  source: 'structuredEditables' | 'annotations';
};

function formatTs(ts: any): string {
  if (!ts) return '—';
  try {
    const d =
      typeof ts?.toDate === 'function'
        ? ts.toDate()
        : ts instanceof Date
          ? ts
          : ts?.seconds
            ? new Date(ts.seconds * 1000)
            : new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return '—';
  }
}

function formatMoney(n: number | undefined | null): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0,00';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Step5Chiffrage({ dossierId, dossier }: Step5ChiffrageProps) {
  const db = useFirestore();
  const { toast } = useToast();

  const chiffragesQuery = useMemo(() => {
    if (!db || !dossierId) return null;
    return query(
      collection(db, 'chiffrages'),
      where('dossierId', '==', dossierId),
      orderBy('createdAt', 'desc'),
    );
  }, [db, dossierId]);

  const { data: chiffrages, loading: chiffragesLoading } = useCollection<any>(chiffragesQuery);
  const chiffrage = chiffrages && chiffrages.length > 0 ? chiffrages[0] : null;

  // Read dossier documents subcollection to resolve original file URLs.
  const documentsQuery = useMemo(() => {
    if (!db || !dossierId) return null;
    return collection(db, 'dossiers', dossierId, 'documents');
  }, [db, dossierId]);
  const { data: dossierDocs } = useCollection<any>(documentsQuery);

  // Build the list of modified files.
  const modifiedRows = useMemo<ModifiedRow[]>(() => {
    if (!chiffrage) return [];
    const rows: ModifiedRow[] = [];
    const structuredEditables = (chiffrage.structuredEditables || {}) as Record<string, any>;
    const files: any[] = Array.isArray(chiffrage.files) ? chiffrage.files : [];

    // One row per structuredEditables entry. Resolve a filename from
    // chiffrage.files matching the same docType when available.
    for (const docType of Object.keys(structuredEditables)) {
      const entry = structuredEditables[docType];
      const matching = files.find((f) => f?.docType === docType);
      const fileName = matching?.name || `${docType}.pdf`;
      rows.push({
        key: `structured:${docType}`,
        fileName,
        docType,
        updatedBy: entry?.updatedBy || null,
        updatedAt: entry?.updatedAt || chiffrage.updatedAt || null,
        structured: entry,
        source: 'structuredEditables',
      });
    }

    // Also surface files that have PDF annotations (red-pen modifications
    // made in the chiffreur editor) but no structuredEditables entry.
    files.forEach((f, idx) => {
      if (!Array.isArray(f?.annotations) || f.annotations.length === 0) return;
      const dt = f.docType || f.category || 'Document';
      if (structuredEditables[dt]) return; // already surfaced above
      rows.push({
        key: `ann:${idx}:${f.name || dt}`,
        fileName: f.name || `${dt}.pdf`,
        docType: dt,
        updatedBy: null,
        updatedAt: chiffrage.updatedAt || null,
        structured: null,
        source: 'annotations',
      });
    });

    return rows;
  }, [chiffrage]);

  const findDossierDocUrl = (fileName: string): string | null => {
    if (!dossierDocs || !fileName) return null;
    const match = dossierDocs.find(
      (d: any) => (d.nom || d.fileName) === fileName,
    );
    return match?.url || match?.downloadURL || null;
  };

  // Multi-select state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const toggle = (k: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };
  const allSelected =
    modifiedRows.length > 0 && modifiedRows.every((r) => selectedKeys.has(r.key));
  const toggleAll = () => {
    setSelectedKeys((prev) => {
      if (allSelected) return new Set();
      return new Set(modifiedRows.map((r) => r.key));
    });
  };

  const handleBulkDownload = () => {
    // TODO (future task): hook up to the documents-tab multi-download helper
    // once it is extracted into a shared utility. For now the gestionnaire is
    // informed the bulk action is coming soon.
    toast({ title: 'Téléchargement groupé à venir' });
  };

  // History dialog state
  const [historyRow, setHistoryRow] = useState<ModifiedRow | null>(null);

  const reforme = dossier?.reforme as ReformeData | undefined;

  if (chiffragesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!chiffrage) {
    return (
      <Card className="shadow-sm border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Calculator className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground italic">
            Aucun chiffrage pour ce dossier
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Réforme summary */}
        {reforme ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Réforme
                {reforme.avecTva ? (
                  <Badge variant="secondary" className="text-[10px]">Avec TVA</Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Valeur vénale</span>
                  <span className="font-medium">{formatMoney(reforme.valeurVenale)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Valeur épave</span>
                  <span className="font-medium">{formatMoney(reforme.valeurEpave)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Différence</span>
                  <span className="font-medium">{formatMoney(computeDifference(reforme))}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Montant Accord</span>
                  <span className="font-medium">{formatMoney(reforme.montantAccord)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Total indemnisation</span>
                  <span className="font-semibold text-primary">
                    {formatMoney(computeTotalIndemnisation(reforme))}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Méthode</span>
                  <span className="font-medium truncate ml-2" title={reforme.methodeCalcul || '—'}>
                    {reforme.methodeCalcul || '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Modified files */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Fichiers modifiés par le chiffreur
              <Badge variant="secondary" className="text-[10px]">{modifiedRows.length}</Badge>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkDownload}
              disabled={selectedKeys.size === 0}
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Télécharger la sélection ({selectedKeys.size})
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {modifiedRows.length === 0 ? (
              <p className="text-xs italic text-muted-foreground text-center py-8">
                Aucune modification enregistrée.
              </p>
            ) : (
              <div className="divide-y">
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                  <span className="flex-1">Fichier</span>
                  <span className="w-24 text-right">Dernière modif.</span>
                  <span className="w-40" />
                </div>
                {modifiedRows.map((row) => {
                  const originalUrl = findDossierDocUrl(row.fileName);
                  const isSelected = selectedKeys.has(row.key);
                  return (
                    <div key={row.key} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/30">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(row.key)}
                        aria-label={`Sélectionner ${row.fileName}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate" title={row.fileName}>
                            {row.fileName}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {row.docType}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          Chiffreur: {row.updatedBy || '—'}
                        </div>
                      </div>
                      <div className="w-24 text-right text-[11px] text-muted-foreground">
                        {formatTs(row.updatedAt)}
                      </div>
                      <div className="w-40 flex items-center justify-end gap-1">
                        {originalUrl ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            asChild
                          >
                            <a href={originalUrl} target="_blank" rel="noreferrer">
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Voir l'original
                            </a>
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  disabled
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Voir l'original
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>À venir</TooltipContent>
                          </Tooltip>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => setHistoryRow(row)}
                        >
                          <History className="h-3.5 w-3.5 mr-1" />
                          Historique
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History dialog — read-only JSON stub */}
        <Dialog open={!!historyRow} onOpenChange={(o) => !o && setHistoryRow(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Historique — {historyRow?.fileName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto rounded-md bg-muted/50 p-3">
              {historyRow?.structured ? (
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono">
                  {JSON.stringify(historyRow.structured, null, 2)}
                </pre>
              ) : (
                <p className="text-xs italic text-muted-foreground text-center py-6">
                  Aucune donnée structurée disponible. Les annotations PDF ne sont
                  pas encore affichées ici — à venir.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
