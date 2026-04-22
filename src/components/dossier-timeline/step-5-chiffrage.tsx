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
  FileSignature,
  FileText,
  History,
  Loader2,
  Receipt,
  Scale,
  Sparkles,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  computeDifference,
  computeTotalIndemnisation,
  type ReformeData,
} from '@/lib/reforme-schema';
import { DevisEditor } from '@/components/chiffreurs/devis-editor';

type CreatorKind = 'devis' | 'facture';

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
  const { profile } = useCurrentUser();
  // Creator buttons (Devis / Facture) are only visible to Admin + Gestionnaire.
  // Task #5 fills in the full editor flow; Task #6 wires the save-to-pieces-jointes pipeline.
  const canCreateChiffrageDoc =
    profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const [creatorKind, setCreatorKind] = useState<CreatorKind | null>(null);

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

  // History drawer state
  const [historyDoc, setHistoryDoc] = useState<{
    docType: string;
    name: string;
    versions: any[];
  } | null>(null);

  // Lightbox preview state
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    name: string;
    isImage: boolean;
  } | null>(null);

  const openHistory = (row: ModifiedRow) => {
    const entry = (chiffrage?.structuredEditables || {})[row.docType];
    const versions: any[] = Array.isArray(entry?.versions) ? entry.versions : [];
    setHistoryDoc({
      docType: row.docType,
      name: row.fileName,
      versions,
    });
  };

  const openPreview = (url: string, name: string) => {
    setPreviewDoc({
      url,
      name,
      isImage: /\.(png|jpe?g|webp|gif)$/i.test(name),
    });
  };

  const reforme = dossier?.reforme as ReformeData | undefined;

  if (chiffragesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Task #5: mount the real <DevisEditor /> in a near-full-screen dialog.
  // Task #6: the editor here runs in `gestionnaire` mode — save routes into
  // the dossier's pieces-jointes with `skipAIScan: true`, not into a chiffrage.
  // A chiffrage is no longer required to open the dialog.
  const editorChiffrageId: string | null = chiffrage?.id ?? null;
  const editorDocType = creatorKind === 'devis' ? 'Devis Garage' : 'Facture Garage';
  const creatorDialog = (
    <Dialog open={!!creatorKind} onOpenChange={(o) => !o && setCreatorKind(null)}>
      <DialogContent className="max-w-[98vw] w-full h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle>
            {creatorKind === 'devis' ? 'Créer un devis' : 'Créer une facture'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          {creatorKind ? (
            <DevisEditor
              mode="gestionnaire"
              dossierId={dossierId}
              chiffrageId={editorChiffrageId || undefined}
              docType={editorDocType}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Role-gated button row, reused in both branches.
  const creatorButtons = canCreateChiffrageDoc ? (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setCreatorKind('devis')}>
        <FileSignature className="mr-2 h-3.5 w-3.5" />
        Créer un devis
      </Button>
      <Button size="sm" variant="outline" onClick={() => setCreatorKind('facture')}>
        <Receipt className="mr-2 h-3.5 w-3.5" />
        Créer une facture
      </Button>
    </div>
  ) : null;

  if (!chiffrage) {
    return (
      <div className="space-y-6">
        {creatorButtons}
        <Card className="shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Calculator className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground italic">
              Aucun chiffrage pour ce dossier
            </p>
          </CardContent>
        </Card>
        {creatorDialog}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {creatorButtons}

        {/* Réforme summary */}
        {reforme?.updatedAt ? (
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
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-2 bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                  <span className="min-w-0">Fichier</span>
                  <span className="whitespace-nowrap text-right">Dernière modif.</span>
                  <span className="w-[110px]" />
                  <span className="w-[130px]" />
                  <span className="w-[100px]" />
                </div>
                {modifiedRows.map((row) => {
                  const originalUrl = findDossierDocUrl(row.fileName);
                  const latestVersion = Array.isArray(row.structured?.versions) ? row.structured.versions[0] : null;
                  const latestUrl: string | undefined = latestVersion?.pdfUrl ?? latestVersion?.url;
                  const isSelected = selectedKeys.has(row.key);
                  return (
                    <div
                      key={row.key}
                      className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-2.5 text-sm hover:bg-accent/30"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(row.key)}
                        aria-label={`Sélectionner ${row.fileName}`}
                      />
                      <div className="min-w-0">
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
                      <div className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap text-right">
                        {formatTs(row.updatedAt)}
                      </div>
                      <div className="shrink-0">
                        {originalUrl ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => openPreview(originalUrl, row.fileName)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Voir l'original
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
                      </div>
                      <div className="shrink-0">
                        {latestUrl ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => openPreview(latestUrl, `${row.fileName} — Dernière modif.`)}
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                            Dernière modif.
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button size="sm" variant="ghost" className="h-7 px-2" disabled>
                                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                                  Dernière modif.
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Aucune version enregistrée</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => openHistory(row)}
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

        {/* History drawer — right-side Sheet */}
        <Sheet open={!!historyDoc} onOpenChange={(o) => !o && setHistoryDoc(null)}>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Historique — {historyDoc?.name}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {historyDoc && historyDoc.versions.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune version enregistrée.</p>
              )}
              {historyDoc?.versions?.map((v: any, i: number) => {
                const raw = v?.savedAt ?? v?.createdAt;
                const d: Date | null = raw instanceof Date
                  ? raw
                  : typeof raw?.toDate === 'function'
                    ? raw.toDate()
                    : typeof raw?.seconds === 'number'
                      ? new Date(raw.seconds * 1000)
                      : raw ? new Date(raw) : null;
                const label = d && !isNaN(d.getTime()) ? d.toLocaleString('fr-FR') : '';
                const author = v?.savedBy ?? v?.createdByNom ?? 'Inconnu';
                const versionNumber = historyDoc.versions.length - i;
                const versionUrl: string | undefined = v?.pdfUrl ?? v?.url;
                return (
                  <Card key={v?.id ?? i}>
                    <CardHeader className="p-3 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Version {versionNumber}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">par {author}</p>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {v?.note && <p className="text-xs">{v.note}</p>}
                      <div className="flex items-center gap-2">
                        {versionUrl ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5"
                              onClick={() => setPreviewDoc({
                                url: versionUrl,
                                name: `${historyDoc.name} — Version ${versionNumber}`,
                                isImage: /\.(png|jpe?g|webp|gif)$/i.test(versionUrl),
                              })}
                            >
                              <Eye className="h-3.5 w-3.5" /> Voir
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1.5">
                              <a href={versionUrl} target="_blank" rel="noopener noreferrer" download>
                                <Download className="h-3.5 w-3.5" /> Télécharger
                              </a>
                            </Button>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Aucun fichier disponible pour cette version.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        {creatorDialog}

        {/* Lightbox preview for original document */}
        <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-4 py-3 border-b">
              <DialogTitle className="truncate">{previewDoc?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              {previewDoc?.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : previewDoc ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full border-none"
                  title={previewDoc.name}
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
