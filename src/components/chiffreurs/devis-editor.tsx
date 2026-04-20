'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, onSnapshot, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import {
  ArrowLeft, Columns2, Copy, Download, History, Loader2, Plus, RefreshCcw,
  Save, Sparkles, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { enqueueUpload } from '@/lib/offline/upload-queue';
import {
  type DevisExtraColumn, type DevisHeader, type DevisRow, type DevisSnapshot, type DevisVersion, type StructuredDevis,
  emptyHeader, emptyRow, formatFr, normalizeExtraColumns, parseFr, rowTotalHT, sumHT, sumTTC, sumTVA,
} from '@/lib/devis-schema';
import { extractAndPersistChiffrageDevis } from '@/lib/devis-extract';
import type { EditableDocType } from '@/lib/devis-schema';
import { renderDevisPdf } from '@/lib/devis-pdf';
import { cn } from '@/lib/utils';
import ReferencePanel from '@/app/editor/reference-panel';
import { useSidebar } from '@/components/ui/sidebar';

interface DevisEditorProps {
  chiffrageId: string;
  docType: EditableDocType;
}

const HEADER_FIELDS_LEFT: Array<{ key: keyof DevisHeader; label: string }> = [
  { key: 'marque', label: 'Marque' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'modele', label: 'Modele' },
  { key: 'kilometrage', label: 'Kilometrage' },
  { key: 'chassis', label: 'N° de chassis' },
  { key: 'expert', label: 'Expert' },
];

const HEADER_FIELDS_RIGHT: Array<{ key: keyof DevisHeader; label: string }> = [
  { key: 'client', label: 'Client' },
  { key: 'adresse', label: 'Adresse' },
  { key: 'ice', label: 'ICE' },
  { key: 'telephone', label: 'Telephone' },
  { key: 'assurances', label: 'Assurances' },
];

const DOC_TYPE_LABEL: Record<EditableDocType, { plural: string; lower: string }> = {
  Devis: { plural: 'devis', lower: 'devis' },
  Facture: { plural: 'factures', lower: 'facture' },
};

export function DevisEditor({ chiffrageId, docType }: DevisEditorProps) {
  const typeLabel = DOC_TYPE_LABEL[docType];
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { profile, canWrite } = useCurrentUser();
  const canEdit = canWrite('assignations-chiffrage');
  const { setOpen: setAppSidebarOpen } = useSidebar();

  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dossierId, setDossierId] = useState<string>('');
  const [dossier, setDossier] = useState<any>(null);
  const [devisFileNames, setDevisFileNames] = useState<string[]>([]);
  const [persisted, setPersisted] = useState<StructuredDevis | null>(null);
  const [extractionAttempted, setExtractionAttempted] = useState(false);

  const [header, setHeader] = useState<DevisHeader>(emptyHeader());
  const [rows, setRows] = useState<DevisRow[]>([emptyRow()]);
  const [extraColumns, setExtraColumns] = useState<DevisExtraColumn[]>([]);
  /** Number of extra columns in the last persisted snapshot. The user may have at most savedExtraColumnsCount + 1 columns locally. */
  const [savedExtraColumnsCount, setSavedExtraColumnsCount] = useState(0);
  const [versions, setVersions] = useState<DevisVersion[]>([]);
  const [versionPreviewUrl, setVersionPreviewUrl] = useState<string | null>(null);
  const [versionLabel, setVersionLabel] = useState<string>('');
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const initializedRef = useRef(false);

  // Load chiffrage (realtime)
  useEffect(() => {
    if (!db || !chiffrageId) return;
    const unsub = onSnapshot(doc(db, 'chiffrages', chiffrageId), (snap) => {
      if (!snap.exists()) {
        toast({ variant: 'destructive', title: 'Assignation introuvable.' });
        router.push('/assignations-chiffrage');
        return;
      }
      const data = snap.data() as any;
      const names = (data.files || [])
        .filter((f: any) => f?.docType === docType)
        .map((f: any) => f.name || 'document.pdf');
      setDevisFileNames(names);
      setDossierId(data.dossierId || '');
      const editables = (data.structuredEditables || {}) as Record<string, StructuredDevis>;
      const attempts = (data.editableExtractionAttempted || {}) as Record<string, boolean>;
      setPersisted(editables[docType] || null);
      setExtractionAttempted(!!attempts[docType]);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db, chiffrageId, router, toast]);

  useEffect(() => {
    if (!db || !dossierId) return;
    const unsub = onSnapshot(doc(db, 'dossiers', dossierId), (snap) => {
      if (snap.exists()) setDossier({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [db, dossierId]);

  const dossierPrefill = useCallback((existing: DevisHeader): DevisHeader => {
    if (!dossier) return existing;
    const v = dossier.vehicule || {};
    const a = dossier.assure || {};
    const mecRaw = v.mec;
    let mecStr = '';
    if (mecRaw) {
      try {
        const d = mecRaw.toDate ? mecRaw.toDate() : new Date(mecRaw);
        if (!isNaN(d.getTime())) mecStr = d.toLocaleDateString('fr-FR');
      } catch { /* ignore */ }
    }
    return {
      ...existing,
      marque: existing.marque || v.marque || '',
      matricule: existing.matricule || dossier.matricule || v.immatriculation || '',
      modele: existing.modele || v.modele || mecStr || '',
      kilometrage: existing.kilometrage || v.km || '',
      chassis: existing.chassis || v.serie || '',
      expert: existing.expert || profile?.nom || dossier.refExpert || '',
      client: existing.client || dossier.garageName || [a.prenom, a.nom].filter(Boolean).join(' ') || '',
      adresse: existing.adresse || a.adresse || '',
      telephone: existing.telephone || a.telephone || '',
      assurances: existing.assurances || dossier.compagnie || '',
    };
  }, [dossier, profile?.nom]);

  // Initialize editor state from chiffrage.structuredDevis (or kick off extraction once).
  useEffect(() => {
    if (loading || initializedRef.current || !dossier || !db || !storage) return;

    if (persisted) {
      setHeader(dossierPrefill(persisted.header));
      setRows(persisted.rows.length ? persisted.rows : [emptyRow()]);
      const cols = normalizeExtraColumns(persisted);
      setExtraColumns(cols);
      setSavedExtraColumnsCount(cols.length);
      setVersions(persisted.versions || []);
      initializedRef.current = true;
      return;
    }

    // No persisted devis yet — pre-fill header from dossier.
    setHeader((h) => dossierPrefill(h));
    initializedRef.current = true;

    // If already attempted (success or fail) we leave it alone — user can force retry.
    if (extractionAttempted) return;
    if (devisFileNames.length === 0) return;
    runExtraction(false);

  }, [loading, persisted, extractionAttempted, devisFileNames.length, dossier, dossierPrefill, db, storage]);

  const runExtraction = useCallback(async (isManualRetry: boolean) => {
    if (!db || !storage) return;
    setExtracting(true);
    try {
      const result = await extractAndPersistChiffrageDevis({
        db, storage, chiffrageId, docType, force: isManualRetry,
      });

      if (!result.ok) {
        if (isManualRetry) {
          toast({ variant: 'destructive', title: 'Extraction impossible', description: 'Veuillez saisir les donnees manuellement.' });
        } else {
          toast({ title: 'Extraction auto indisponible', description: 'Remplissez manuellement ou reessayez.' });
        }
        return;
      }

      if (result.reason === 'already-extracted' || result.reason === 'already-attempted' || result.reason === 'no-files') {
        return;
      }

      const sd = result.structuredDevis;
      if (sd) {
        setHeader(dossierPrefill(sd.header));
        setRows(sd.rows.length ? sd.rows : [emptyRow()]);
        const cols = normalizeExtraColumns(sd);
        setExtraColumns(cols);
        setSavedExtraColumnsCount(cols.length);
        setVersions(sd.versions || []);
        toast({ title: 'Extraction automatique terminee', description: `${sd.rows.length} ligne(s) detectee(s) depuis ${devisFileNames.length} ${typeLabel.lower}(s).` });
      }
    } catch (e: any) {
      console.error('[devis-editor] extraction failed', e);
      toast({ variant: 'destructive', title: 'Extraction impossible', description: e?.message || '' });
    } finally {
      setExtracting(false);
    }
  }, [db, storage, chiffrageId, docType, dossierPrefill, toast, devisFileNames.length, typeLabel.lower]);

  // Row helpers ──────────────────────────────────────────────────────────
  const updateRow = (id: string, patch: Partial<DevisRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const duplicateRow = (id: string) => setRows((rs) => {
    const i = rs.findIndex((r) => r.id === id);
    if (i < 0) return rs;
    const copy: DevisRow = { ...rs[i], id: crypto.randomUUID() };
    return [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)];
  });
  const deleteRow = (id: string) => setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.id !== id)));

  const canAddColumn = extraColumns.length < savedExtraColumnsCount + 1;

  const addExtraColumn = () => {
    if (!canAddColumn) return;
    const label = typeof window !== 'undefined' ? window.prompt('Nom de la colonne supplementaire ?') : '';
    if (!label) return;
    const newCol: DevisExtraColumn = {
      id: crypto.randomUUID(),
      label: label.trim(),
      values: {},
    };
    setExtraColumns((cols) => [...cols, newCol]);
  };
  const removeExtraColumn = (colId: string) => {
    setExtraColumns((cols) => cols.filter((c) => c.id !== colId));
  };
  const updateExtraCell = (colId: string, rowId: string, value: string) => {
    setExtraColumns((cols) =>
      cols.map((c) => (c.id === colId ? { ...c, values: { ...c.values, [rowId]: value } } : c))
    );
  };

  // Totals ───────────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    ht: sumHT(rows),
    tva: sumTVA(rows),
    ttc: sumTTC(rows),
  }), [rows]);

  // Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canEdit) {
      toast({ variant: 'destructive', title: 'Action non autorisee' });
      return;
    }
    if (!db || !storage) return;
    setSaving(true);
    try {
      const snapshot: DevisSnapshot = extraColumns.length > 0
        ? { header, rows, extraColumns }
        : { header, rows };
      const now = new Date();
      const author = profile?.nom || profile?.email || 'Utilisateur';
      const pdfBlob = renderDevisPdf(snapshot, { author, versionTimestamp: now });
      const versionId = crypto.randomUUID();
      const pdfStoragePath = `chiffrages/${chiffrageId}/devis-versions/${docType}/${versionId}.pdf`;

      let pdfUrl = '';
      let uploaded = false;

      if (navigator.onLine) {
        try {
          const ref = storageRef(storage, pdfStoragePath);
          await uploadBytes(ref, pdfBlob, { contentType: 'application/pdf' });
          pdfUrl = await getDownloadURL(ref);
          uploaded = true;
        } catch (e) {
          console.error('[devis-editor] direct upload failed, queueing', e);
        }
      }

      if (!uploaded) {
        await enqueueUpload({
          fileBlob: pdfBlob,
          fileName: `${docType.toLowerCase()}-${versionId}.pdf`,
          fileSize: pdfBlob.size,
          contentType: 'application/pdf',
          storagePath: pdfStoragePath,
          firestoreDocPath: 'chiffrages',
          firestoreMetadata: { _chiffrageId: chiffrageId, _type: 'devis-version', _docType: docType, _versionId: versionId },
        });
        toast({ title: 'Version mise en file d\'attente', description: 'Elle sera synchronisee une fois en ligne.' });
      }

      const newVersion: DevisVersion = {
        id: versionId,
        createdAt: Timestamp.fromDate(now),
        createdByUid: profile?.uid || '',
        createdByNom: author,
        storagePath: pdfStoragePath,
        pdfUrl,
        snapshot,
      };

      const structuredDevis: StructuredDevis = {
        ...snapshot,
        versions: [newVersion, ...versions],
        updatedAt: Timestamp.fromDate(now),
        updatedBy: profile?.uid || '',
      };

      const docRef = doc(db, 'chiffrages', chiffrageId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const fresh = snap.data() as any;
        const freshAttempts = (fresh.editableExtractionAttempted || {}) as Record<string, boolean>;
        await updateDoc(docRef, {
          [`structuredEditables.${docType}`]: structuredDevis,
          editableExtractionAttempted: { ...freshAttempts, [docType]: true },
          updatedAt: serverTimestamp(),
        });
      }

      setVersions((v) => [newVersion, ...v]);
      // After save, the local extra-column count becomes the new "saved" baseline,
      // unlocking +1 more for the next session.
      setSavedExtraColumnsCount(extraColumns.length);

      if (uploaded) {
        toast({ title: `${docType} enregistre`, description: 'Nouvelle version generee.' });
      }
    } catch (e: any) {
      console.error('[devis-editor] save failed', e);
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde', description: e?.message || '' });
    } finally {
      setSaving(false);
    }
  };

  // Keyboard: Ctrl+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);

  }, [saving, header, rows, extraColumns]);

  // Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 py-4 space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/assignations-chiffrage/${chiffrageId}`} aria-label="Retour">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">Editer les {typeLabel.plural}</h1>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            {devisFileNames.length > 0 ? (
              <>
                <Badge variant="outline" className="text-[10px]">{devisFileNames.length}</Badge>
                <span className="truncate">{typeLabel.lower}(s) fusionne(s) : {devisFileNames.join(' · ')}</span>
              </>
            ) : `Aucun ${typeLabel.lower} dans cette assignation`}
          </div>
        </div>
        <Button
          variant={comparisonOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            const opening = !comparisonOpen;
            setComparisonOpen(opening);
            if (opening) setAppSidebarOpen(false);
          }}
          disabled={!dossierId}
          title={comparisonOpen ? 'Fermer la comparaison' : 'Ouvrir la comparaison'}
        >
          <Columns2 className="h-3.5 w-3.5 mr-1.5" />
          Comparer
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runExtraction(true)}
          disabled={extracting || !canEdit || devisFileNames.length === 0}
          title="Relancer l'extraction automatique (ecrase les donnees)"
        >
          {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
          Re-extraire
        </Button>
        <Button variant="default" size="sm" onClick={handleSave} disabled={saving || !canEdit}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Enregistrer
        </Button>
      </div>

      {extracting && !saving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border rounded-lg px-3 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Extraction automatique en cours depuis {devisFileNames.length} {typeLabel.lower}(s)…
        </div>
      )}

      <div className={cn(comparisonOpen && 'flex gap-3 items-start')}>
        {comparisonOpen && dossierId && (
          <ReferencePanel
            dossierId={dossierId}
            isOpen={comparisonOpen}
            onClose={() => setComparisonOpen(false)}
            className="sticky top-4 self-start h-[calc(100vh-7rem)] w-1/2 min-w-[320px] max-w-[640px] border rounded-xl overflow-hidden"
          />
        )}
        <div className={cn(comparisonOpen ? 'flex-1 min-w-0 space-y-4' : 'space-y-4')}>

      {/* Identity block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-xl p-3 sm:p-4 bg-card shadow-sm">
        <div className="space-y-2">
          {HEADER_FIELDS_LEFT.map((f) => (
            <HeaderField
              key={f.key}
              label={f.label}
              value={header[f.key] || ''}
              onChange={(v) => setHeader((h) => ({ ...h, [f.key]: v }))}
              disabled={!canEdit}
            />
          ))}
        </div>
        <div className="space-y-2">
          {HEADER_FIELDS_RIGHT.map((f) => (
            <HeaderField
              key={f.key}
              label={f.label}
              value={header[f.key] || ''}
              onChange={(v) => setHeader((h) => ({ ...h, [f.key]: v }))}
              disabled={!canEdit}
            />
          ))}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <HeaderField
              label="Devis N°"
              value={header.devisNumero}
              onChange={(v) => setHeader((h) => ({ ...h, devisNumero: v }))}
              disabled={!canEdit}
            />
            <HeaderField
              label="Date"
              value={header.dateDevis}
              onChange={(v) => setHeader((h) => ({ ...h, dateDevis: v }))}
              disabled={!canEdit}
              placeholder="JJ/MM/AAAA"
            />
          </div>
        </div>
      </div>

      {/* Rows table */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-muted/20">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Ajouter une ligne
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addExtraColumn}
              disabled={!canAddColumn}
              title={canAddColumn ? 'Ajouter une colonne supplementaire' : 'Enregistrez d\'abord pour debloquer une colonne supplementaire'}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Ajouter une colonne
            </Button>
            {extraColumns.length > 0 && (
              <span className="text-[10px] text-muted-foreground italic ml-1">
                {extraColumns.length} colonne(s) ajoutee(s)
                {!canAddColumn && ' — enregistrez pour en ajouter une de plus'}
              </span>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:text-left [&>th]:font-bold [&>th]:text-[11px] [&>th]:border-b [&>th]:border-r [&>th:last-child]:border-r-0">
                <th style={{ width: '80px' }}>REF</th>
                <th>Designation</th>
                <th style={{ width: '80px' }}>TYPE</th>
                <th style={{ width: '70px' }} className="text-center">T.V.A</th>
                <th style={{ width: '60px' }} className="text-center">Qte</th>
                <th style={{ width: '100px' }} className="text-right">P.U H.T</th>
                <th style={{ width: '110px' }} className="text-right">Total H.T</th>
                {extraColumns.map((col) => (
                  <th key={col.id} style={{ width: '140px' }}>
                    <div className="flex items-center gap-1">
                      <span className="truncate">{col.label}</span>
                      {canEdit && (
                        <button
                          onClick={() => removeExtraColumn(col.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Supprimer la colonne"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th style={{ width: '70px' }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const total = rowTotalHT(r);
                return (
                  <tr key={r.id} className="[&>td]:px-1.5 [&>td]:py-1 [&>td]:border-b [&>td]:border-r [&>td:last-child]:border-r-0 group hover:bg-muted/30">
                    <td>
                      <CellInput value={r.ref} onChange={(v) => updateRow(r.id, { ref: v })} disabled={!canEdit} />
                    </td>
                    <td>
                      <CellInput value={r.designation} onChange={(v) => updateRow(r.id, { designation: v })} disabled={!canEdit} />
                    </td>
                    <td>
                      <CellInput value={r.type} onChange={(v) => updateRow(r.id, { type: v })} disabled={!canEdit} />
                    </td>
                    <td>
                      <CellNumberInput value={r.tva} onChange={(v) => updateRow(r.id, { tva: v })} disabled={!canEdit} suffix="%" decimals={0} align="center" />
                    </td>
                    <td>
                      <CellNumberInput value={r.qte} onChange={(v) => updateRow(r.id, { qte: v })} disabled={!canEdit} decimals={0} align="center" />
                    </td>
                    <td>
                      <CellNumberInput value={r.puHT} onChange={(v) => updateRow(r.id, { puHT: v })} disabled={!canEdit} align="right" />
                    </td>
                    <td className="text-right font-semibold pr-2">{formatFr(total)}</td>
                    {extraColumns.map((col) => (
                      <td key={col.id}>
                        <CellInput
                          value={col.values[r.id] || ''}
                          onChange={(v) => updateExtraCell(col.id, r.id, v)}
                          disabled={!canEdit}
                        />
                      </td>
                    ))}
                    <td>
                      {canEdit && (
                        <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Dupliquer" onClick={() => duplicateRow(r.id)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Supprimer" onClick={() => deleteRow(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center p-2 border-t bg-muted/20">
          <div className="flex-1" />
          <div className="flex flex-col items-end gap-0.5 text-xs">
            <div className="flex gap-6"><span className="text-muted-foreground">Total H.T</span><span className="font-semibold w-24 text-right">{formatFr(totals.ht)}</span></div>
            <div className="flex gap-6"><span className="text-muted-foreground">TVA</span><span className="w-24 text-right">{formatFr(totals.tva)}</span></div>
            <div className="flex gap-6 font-bold"><span>Total TTC</span><span className="w-24 text-right">{formatFr(totals.ttc)}</span></div>
          </div>
        </div>
      </div>

      {/* Version history */}
      <div className="border rounded-xl bg-card shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-bold text-sm">Historique des versions</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">{versions.length}</Badge>
        </div>
        {versions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground italic">
            Aucune version encore. Enregistrez pour creer la premiere.
          </div>
        ) : (
          <ul className="divide-y">
            {versions.slice(0, 50).map((v) => {
              const d = toDate(v.createdAt);
              const label = d ? d.toLocaleString('fr-FR') : '—';
              return (
                <li key={v.id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{label}</div>
                    <div className="text-muted-foreground truncate">par {v.createdByNom || '—'}</div>
                  </div>
                  {v.pdfUrl ? (
                    <>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setVersionPreviewUrl(v.pdfUrl); setVersionLabel(label); }}
                      >
                        Voir
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={v.pdfUrl} target="_blank" rel="noopener noreferrer" download><Download className="h-3.5 w-3.5" /></a>
                      </Button>
                    </>
                  ) : (
                    <span className="text-[10px] italic text-muted-foreground px-2">En cours d'upload…</span>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7" title="Restaurer cette version"
                      onClick={() => {
                        setHeader(v.snapshot.header);
                        setRows(v.snapshot.rows.map((r) => ({ ...r })));
                        const restoredCols = normalizeExtraColumns(v.snapshot);
                        setExtraColumns(restoredCols);
                        // Restoring counts as the new baseline — the user may add one more after this.
                        setSavedExtraColumnsCount(restoredCols.length);
                        toast({ title: 'Version chargee', description: 'Enregistrez pour creer une nouvelle version.' });
                      }}
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

        </div>
      </div>

      {/* Version preview dialog */}
      <Dialog open={!!versionPreviewUrl} onOpenChange={(o) => { if (!o) setVersionPreviewUrl(null); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-3 border-b shrink-0">
            <DialogTitle className="text-sm">Version du {versionLabel}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-900 overflow-hidden">
            {versionPreviewUrl && (
              <iframe src={versionPreviewUrl} className="w-full h-full border-none" title="Version PDF" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────

function HeaderField({
  label, value, onChange, disabled, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string }) {
  return (
    <label className="grid grid-cols-[110px_1fr] items-center gap-2 text-xs">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
    </label>
  );
}

function CellInput({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full h-7 px-1.5 text-xs bg-transparent outline-none rounded border border-transparent",
        "focus:border-primary/50 focus:bg-background disabled:cursor-not-allowed"
      )}
    />
  );
}

function CellNumberInput({
  value, onChange, disabled, align = 'left', suffix, decimals = 2,
}: {
  value: number; onChange: (v: number) => void; disabled?: boolean;
  align?: 'left' | 'center' | 'right'; suffix?: string; decimals?: number;
}) {
  const [text, setText] = useState<string>(formatFr(value, decimals));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatFr(value, decimals));
  }, [value, decimals, focused]);

  return (
    <div className="relative">
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseFr(e.target.value));
        }}
        onFocus={(e) => { setFocused(true); e.currentTarget.select(); }}
        onBlur={() => {
          setFocused(false);
          setText(formatFr(parseFr(text), decimals));
        }}
        disabled={disabled}
        inputMode="decimal"
        className={cn(
          "w-full h-7 px-1.5 text-xs bg-transparent outline-none rounded border border-transparent",
          "focus:border-primary/50 focus:bg-background disabled:cursor-not-allowed",
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          suffix && 'pr-5',
        )}
      />
      {suffix && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">{suffix}</span>}
    </div>
  );
}

// ── utilities ─────────────────────────────────────────────────────────────

function toDate(x: any): Date | null {
  if (!x) return null;
  if (x instanceof Date) return x;
  if (typeof x.toDate === 'function') {
    try { return x.toDate(); } catch { /* ignore */ }
  }
  if (typeof x.seconds === 'number') return new Date(x.seconds * 1000);
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}
