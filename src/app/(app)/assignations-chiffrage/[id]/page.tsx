'use client';

import React, { useEffect, useState, useRef, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useFirestore, useStorage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, FileType, Eye, Loader2,
  ChevronDown, ChevronRight, ImageIcon, FileText, ExternalLink, GitBranch,
  Table2, History, Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EDITABLE_DOC_TYPES, isEditableDocType } from '@/lib/devis-schema';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import ModalDecisionStatus from '../../dossiers/[id]/modal-decision-status';
import ObservationsTab from '@/components/observations-tab';

interface ChiffrageFileDoc {
  name: string;
  storagePath: string;
  type: 'photo' | 'rapport';
  docType?: string;
  category?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  pdfUrl: string | null;
  annotations?: any[];
}

interface ChiffrageDoc {
  dossierId: string;
  dossierNom: string;
  assignedChiffreurNom: string;
  status: string;
  files: ChiffrageFileDoc[];
}

export default function AssignationChiffrageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { canWrite } = useCurrentUser();
  const canEdit = canWrite('assignations-chiffrage');

  const [chiffrage, setChiffrage] = useState<ChiffrageDoc | null>(null);
  const [dossier, setDossier] = useState<any>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isDecisionStatusOpen, setDecisionStatusOpen] = useState(false);
  const [versionPreview, setVersionPreview] = useState<{ url: string; label: string } | null>(null);

  const fetchedPathsRef = useRef<Set<string>>(new Set());

  // Listen to chiffrage doc
  useEffect(() => {
    if (!db || !id) return;
    const unsub = onSnapshot(doc(db, 'chiffrages', id), (snap) => {
      if (!snap.exists()) {
        toast({ variant: 'destructive', title: 'Assignation introuvable.' });
        router.push('/assignations-chiffrage');
        return;
      }
      setChiffrage(snap.data() as ChiffrageDoc);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db, id]);

  // Listen to parent dossier doc for status + modal props
  useEffect(() => {
    if (!db || !chiffrage?.dossierId) return;
    const unsub = onSnapshot(doc(db, 'dossiers', chiffrage.dossierId), (snap) => {
      if (snap.exists()) {
        setDossier({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [db, chiffrage?.dossierId]);

  useEffect(() => {
    if (!chiffrage || !storage) return;
    chiffrage.files.forEach((file, i) => {
      const path = file.storagePath;
      if (!path || fetchedPathsRef.current.has(path)) return;
      fetchedPathsRef.current.add(path);
      getDownloadURL(ref(storage, path))
        .then((url) => setDownloadUrls((prev) => ({ ...prev, [i]: url })))
        .catch(() => fetchedPathsRef.current.delete(path));
    });
  }, [chiffrage?.files?.length, storage]);

  const groupedFiles = useMemo(() => {
    const groups: Record<string, { label: string; icon: 'photo' | 'doc'; files: { file: ChiffrageFileDoc; index: number }[] }> = {};

    // Always-present groups (Devis, Facture) so the "Editer (web)" button is visible even when empty.
    EDITABLE_DOC_TYPES.forEach((t) => {
      groups[`doc_${t}`] = { label: t, icon: 'doc', files: [] };
    });

    (chiffrage?.files || []).forEach((file, i) => {
      let groupKey: string;
      let groupLabel: string;
      let icon: 'photo' | 'doc';
      if (file.type === 'photo') {
        const cat = file.category || 'avant';
        const catLabels: Record<string, string> = { avant: 'Photos - Avant', en_cours: 'Photos - En cours', apres: 'Photos - Apres' };
        groupKey = `photo_${cat}`;
        groupLabel = catLabels[cat] || `Photos - ${cat}`;
        icon = 'photo';
      } else {
        groupKey = `doc_${file.docType || 'Autre'}`;
        groupLabel = file.docType || 'Documents - Autre';
        icon = 'doc';
      }
      if (!groups[groupKey]) groups[groupKey] = { label: groupLabel, icon, files: [] };
      groups[groupKey].files.push({ file, index: i });
    });
    return Object.entries(groups);
  }, [chiffrage?.files]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  const dossierStatut = dossier?.statut || 'Nouveau';

  if (loading || !chiffrage) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg animate-pulse bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 flex gap-4 items-start bg-card">
              <div className="w-24 h-24 rounded-lg animate-pulse bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/assignations-chiffrage"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{chiffrage.dossierNom || 'Sans ref.'}</h1>
          <p className="text-sm text-muted-foreground">
            Correcteur : <span className="font-bold text-foreground">{chiffrage.assignedChiffreurNom}</span>
          </p>
        </div>
        {canEdit && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            onClick={() => setDecisionStatusOpen(true)}
          >
            <GitBranch className="h-3.5 w-3.5" />
            Décision de statut
          </Button>
        )}
        <Badge variant="outline" className={cn("gap-1.5 py-1 px-3 rounded-full border font-semibold", getStatusBadgeStyles(dossierStatut))}>
          {dossierStatut}
        </Badge>
      </div>

      {/* File groups — collapsed by default */}
      <div className="space-y-4">
        {groupedFiles.map(([groupKey, group]) => (
          <div key={groupKey} className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <div
              onClick={() => toggleGroup(groupKey)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left cursor-pointer select-none"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(groupKey); } }}
            >
              {expandedGroups.has(groupKey) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              {group.icon === 'photo' ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-bold flex-1">{group.label}</span>
              <Badge variant="secondary" className="text-[10px] font-mono">{group.files.length}</Badge>
              {canEdit && isEditableDocType(group.label) && (
                <Button
                  size="sm"
                  variant={group.files.length === 0 ? 'outline' : 'default'}
                  className="h-7 gap-1.5 text-[11px]"
                  disabled={group.files.length === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/devis-editor?chiffrageId=${id}&docType=${encodeURIComponent(group.label)}`);
                  }}
                  title={group.files.length === 0 ? `Aucun ${group.label.toLowerCase()} dans cette assignation` : `Editer les ${group.label.toLowerCase()}s`}
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Editer (web)
                </Button>
              )}
            </div>
            {expandedGroups.has(groupKey) && group.files.length === 0 && (
              <div className="px-4 py-6 text-center text-xs italic text-muted-foreground">
                Aucun {group.label.toLowerCase()} dans cette assignation.
              </div>
            )}
            {expandedGroups.has(groupKey) && isEditableDocType(group.label) && (() => {
              const versions = ((chiffrage as any)?.structuredEditables?.[group.label]?.versions || []) as Array<{
                id: string;
                createdAt: any;
                createdByNom?: string;
                pdfUrl?: string | null;
              }>;
              return (
                <div className="border-t bg-muted/10">
                  <div className="flex items-center gap-2 px-4 py-2 border-b">
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold">Historique des versions</span>
                    <Badge variant="secondary" className="text-[10px] font-mono ml-auto">{versions.length}</Badge>
                  </div>
                  {versions.length === 0 ? (
                    <div className="px-4 py-3 text-[11px] italic text-muted-foreground">
                      Aucune version enregistrée pour ce type de document.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {versions.slice(0, 50).map((v) => {
                        const raw = v.createdAt;
                        const d: Date | null = raw instanceof Date
                          ? raw
                          : typeof raw?.toDate === 'function'
                            ? raw.toDate()
                            : typeof raw?.seconds === 'number'
                              ? new Date(raw.seconds * 1000)
                              : raw ? new Date(raw) : null;
                        const label = d && !isNaN(d.getTime()) ? d.toLocaleString('fr-FR') : '—';
                        return (
                          <li key={v.id} className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">{label}</div>
                              <div className="text-muted-foreground truncate">par {v.createdByNom || '—'}</div>
                            </div>
                            {v.pdfUrl ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[11px]"
                                  onClick={(e) => { e.stopPropagation(); setVersionPreview({ url: v.pdfUrl!, label }); }}
                                >
                                  Voir
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                  <a
                                    href={v.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              </>
                            ) : (
                              <span className="text-[10px] italic text-muted-foreground px-2">En cours d'upload…</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })()}
            {expandedGroups.has(groupKey) && group.files.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {group.files.map(({ file, index: i }) => (
                  <div
                    key={`${file.storagePath}-${i}`}
                    className="border rounded-xl p-4 flex gap-4 items-start bg-card shadow-sm hover:shadow-md transition-all group cursor-pointer"
                    onClick={() => router.push(`/viewer?chiffrageId=${id}&dossierId=${chiffrage.dossierId}&fileIndex=${i}`)}
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden shadow-inner cursor-pointer relative"
                      onClick={(e) => { e.stopPropagation(); if (downloadUrls[i]) setPreviewIndex(i); }}
                    >
                      {downloadUrls[i] && (file.type === 'photo' || file.name.match(/\.(jpg|jpeg|png)$/i)) ? (
                        <img src={downloadUrls[i]} alt={file.name} loading="lazy" decoding="async" className="object-cover w-full h-full" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <FileType className="h-6 w-6 text-muted-foreground opacity-40" />
                          <span className="text-[8px] uppercase font-black text-muted-foreground">{file.type}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-2 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <span className="font-bold text-xs truncate max-w-[150px]">{file.name}</span>
                        <StatusBadge status={file.status} hasAnnotations={!!file.annotations?.length} />
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Cliquez pour ouvrir la vue de comparaison
                      </p>
                      {file.pdfUrl && (
                        <a
                          href={file.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" /> PDF Exporte
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Observations section */}
      <ObservationsTab dossierId={chiffrage.dossierId} section="assignations-chiffrage" variant="collapsible" />

      {/* Lightbox preview */}
      {previewIndex !== null && chiffrage && downloadUrls[previewIndex] && (
        <Dialog open onOpenChange={() => setPreviewIndex(null)}>
          <DialogContent className="max-w-2xl h-[60vh] flex flex-col p-0">
            <DialogTitle className="sr-only">Apercu du fichier</DialogTitle>
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              {chiffrage.files[previewIndex].name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <img src={downloadUrls[previewIndex]} className="max-w-full max-h-full object-contain" alt="Apercu" />
              ) : (
                <iframe src={downloadUrls[previewIndex]} className="w-full h-full border-none" title="Apercu" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Version preview */}
      {versionPreview && (
        <Dialog open onOpenChange={() => setVersionPreview(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
            <DialogTitle className="px-4 py-3 border-b text-sm truncate">
              Version du {versionPreview.label}
            </DialogTitle>
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              <iframe src={versionPreview.url} className="w-full h-full border-none" title={`Version ${versionPreview.label}`} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Decision Status Modal */}
      <ModalDecisionStatus
        open={isDecisionStatusOpen}
        onOpenChange={setDecisionStatusOpen}
        dossierId={chiffrage.dossierId}
        currentStatus={dossierStatut}
        dossierRef={chiffrage.dossierNom || id}
        currentObservation={dossier?.observationDecision || ''}
        currentObservationUpdatedAt={dossier?.observationDecisionUpdatedAt}
        currentObservationUpdatedBy={dossier?.observationDecisionUpdatedBy}
        source="assignations-chiffrage"
      />
    </div>
  );
}

function StatusBadge({ hasAnnotations }: { status: string; hasAnnotations: boolean }) {
  if (hasAnnotations) {
    return <Badge variant="expertise" className="text-[9px] py-0 h-4 uppercase font-black">CORRIGE</Badge>;
  }
  return <Badge variant="secondary" className="text-[9px] py-0 h-4 uppercase font-black">EN ATTENTE</Badge>;
}
