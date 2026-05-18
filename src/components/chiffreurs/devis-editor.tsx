'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, Columns2, FileText, Loader2,
  Save, Sparkles, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CellNumberInput } from '@/components/ui/cell-number-input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { enqueueUpload } from '@/lib/offline/upload-queue';
import {
  type DevisExtraColumn, type DevisHeader, type DevisRow, type DevisSnapshot, type DevisVersion, type StructuredDevis,
  type EditableBaseDocType, type EditableDocType, type ObservationOption,
  emptyHeader, emptyRow, formatFr, normalizeExtraColumns, parseFr, rowTotalHT, sumHT, sumTTC, sumTVA,
  REF_OPTIONS, TYPE_OPTIONS, OBSERVATION_OPTIONS, OBSERVATION_LABELS, toBaseEditableDocType,
} from '@/lib/devis-schema';
import { extractAndPersistChiffrageDevis } from '@/lib/devis-extract';
import { saveGestionnaireDevisAsPieceJointe } from '@/lib/send-to-chiffrage';
import { mapToAccorde, parseAccordDocType } from '@/lib/docType-accorde';
import { deriveStatus } from '@/lib/status-machine';
import { cn } from '@/lib/utils';
import ReferencePanel from '@/app/editor/reference-panel';
import { useSidebar } from '@/components/ui/sidebar';
import { logHistorique, logWorkflow } from '@/app/(app)/dossiers/[id]/log-historique';
import { DevisPreviewDialog } from '@/components/chiffreurs/devis-preview-dialog';
import { ScanWarningDialog } from '@/components/chiffreurs/scan-warning-dialog';

/**
 * The devis editor is shared between two entry points:
 *  - `chiffreur` (default): the chiffreur opens an assignation and writes back
 *    into `chiffrages/{chiffrageId}.structuredEditables[docType]`. A chiffrage
 *    is required.
 *  - `gestionnaire`: Admin/Gestionnaire opens the creator dialog from
 *    `chiffrage-tab.tsx` or `step-5-chiffrage.tsx`. Save routes to the
 *    dossier's pieces-jointes via {@link saveGestionnaireDevisAsPieceJointe}
 *    with `skipAIScan: true` so the AI extractor short-circuits. A `dossierId`
 *    is required; `chiffrageId` is optional and, when present, the structured
 *    mirror is written into the existing chiffrage too.
 */
interface DevisEditorProps {
  chiffrageId?: string;
  docType: EditableDocType;
  mode?: 'chiffreur' | 'gestionnaire';
  /** Required when `mode === 'gestionnaire'`. Used for the pieces-jointes write. */
  dossierId?: string;
  /**
   * Round-3: when the chiffreur opens a cardinal accord slot (Devis 2ème accord,
   * 3ème accord, 1ère/2ème/3ème proposition d'accord), the editor seeds from the
   * dossier's BASELINE scan rather than from the chiffrage's previous accord
   * state. The slot label is forwarded so the init effect can detect this.
   */
  accordSlot?: string;
}

const HEADER_FIELDS_LEFT: Array<{ key: keyof DevisHeader; label: string }> = [
  { key: 'marque', label: 'Marque' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'modele', label: 'Modèle' },
  { key: 'kilometrage', label: 'Kilométrage' },
  { key: 'chassis', label: 'N° de châssis' },
  { key: 'expert', label: 'Expert' },
];

const HEADER_FIELDS_RIGHT: Array<{ key: keyof DevisHeader; label: string }> = [
  { key: 'client', label: 'Client' },
  { key: 'adresse', label: 'Adresse' },
  { key: 'ice', label: 'ICE' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'assurances', label: 'Assurances' },
];

const DOC_TYPE_LABEL: Record<EditableBaseDocType, { plural: string; lower: string }> = {
  'Devis Garage': { plural: 'devis', lower: 'devis' },
  'Facture Garage': { plural: 'factures', lower: 'facture' },
};

export function DevisEditor({
  chiffrageId,
  docType,
  mode = 'chiffreur',
  dossierId: dossierIdProp,
  accordSlot,
}: DevisEditorProps) {
  const typeLabel = DOC_TYPE_LABEL[toBaseEditableDocType(docType)];
  const isGestionnaire = mode === 'gestionnaire';
  // Task #5: columns are now fixed and always include Vétusté (regardless of
  // docType), per the standardised Moroccan devis/facture layout.
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { profile, canWrite } = useCurrentUser();
  const canEdit = canWrite('assignations-chiffrage');
  const { setOpen: setAppSidebarOpen } = useSidebar();

  const [loading, setLoading] = useState(!isGestionnaire);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dossierId, setDossierId] = useState<string>(dossierIdProp ?? '');
  const [dossier, setDossier] = useState<any>(null);
  const [devisFileNames, setDevisFileNames] = useState<string[]>([]);
  const [counterFilePaths, setCounterFilePaths] = useState<string[]>([]);
  const [persisted, setPersisted] = useState<StructuredDevis | null>(null);
  const [chiffrageEditables, setChiffrageEditables] = useState<Record<string, StructuredDevis>>({});
  const [extractionAttempted, setExtractionAttempted] = useState(false);

  const [header, setHeader] = useState<DevisHeader>(emptyHeader());
  const [rows, setRows] = useState<DevisRow[]>([emptyRow()]);
  const [extraColumns, setExtraColumns] = useState<DevisExtraColumn[]>([]);
  const [versions, setVersions] = useState<DevisVersion[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  // Task #23: preview dialog state. The Save button now opens this dialog with
  // the current snapshot; the actual upload + Firestore write happens in
  // `performPersist` once the user confirms from the preview.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<DevisSnapshot | null>(null);
  const [previewAccordKind, setPreviewAccordKind] = useState<
    'accord' | 'proposition-accord' | undefined
  >(undefined);
  const [previewOrdinal, setPreviewOrdinal] = useState<number | undefined>(undefined);

  // Task #33: post-scan warning / edit-lock state. `scanReviewed` defaults to
  // true so the existing persisted-reload flow is untouched. Only a fresh
  // successful `runExtraction` flips it false and opens the warning dialog.
  const [scanWarningOpen, setScanWarningOpen] = useState(false);
  const [scanReviewed, setScanReviewed] = useState(true);
  // Task #35: arithmetic mismatches reported by /api/scan-devis (task #34),
  // plumbed through extractAndPersistChiffrageDevis and rendered as bullets
  // in the scan-warning dialog. Reset to [] on each fresh extraction.
  const [scanCalculationErrors, setScanCalculationErrors] = useState<string[]>([]);

  const initializedRef = useRef(false);

  // Per-row cap for the qte column: snapshot the qte value the first time we
  // see a given row id. The decrease-only lock compares against this snapshot,
  // not against the live `r.qte`, so the chiffreur can revert back up to the
  // initial value after lowering it.
  const qteScanCapRef = useRef<Map<string, number | null>>(new Map());
  useEffect(() => {
    const cap = qteScanCapRef.current;
    for (const r of rows) {
      if (!cap.has(r.id)) cap.set(r.id, r.qte);
    }
  }, [rows]);

  // Load chiffrage (realtime). Skipped entirely for the gestionnaire flow —
  // the editor there is seeded by the dossier (not an assignation) and the
  // save path writes into pieces-jointes rather than `chiffrages`.
  useEffect(() => {
    if (isGestionnaire) return;
    if (!db || !chiffrageId) return;
    const unsub = onSnapshot(doc(db, 'chiffrages', chiffrageId), (snap) => {
      if (!snap.exists()) {
        toast({ variant: 'destructive', title: 'Assignation introuvable.' });
        router.push('/assignations-chiffrage');
        return;
      }
      const data = snap.data() as any;
      const matching = (data.files || []).filter((f: any) => f?.docType === docType);
      setDevisFileNames(matching.map((f: any) => f.name || 'document.pdf'));
      setCounterFilePaths(
        matching
          .filter((f: any) => f?.devisVariant === 'counter' && f?.storagePath)
          .map((f: any) => f.storagePath as string)
      );
      setDossierId(data.dossierId || '');
      const editables = (data.structuredEditables || {}) as Record<string, StructuredDevis>;
      const attempts = (data.editableExtractionAttempted || {}) as Record<string, boolean>;
      setPersisted(editables[docType] || null);
      setChiffrageEditables(editables);
      setExtractionAttempted(!!attempts[docType]);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db, chiffrageId, router, toast, isGestionnaire, docType]);

  useEffect(() => {
    if (!db || !dossierId) return;
    const unsub = onSnapshot(doc(db, 'dossiers', dossierId), (snap) => {
      if (snap.exists()) setDossier({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [db, dossierId]);

  // task #17: scan header wins over dossier prefill — fall back to dossier only when scan is blank.
  // `existing` here is the scan-extracted header (from structuredEditables[docType].header) when
  // available, or an empty header for a brand-new gestionnaire doc. For each HEADER_FIELDS_*
  // field we return `existing.<field> || dossier-derived-value || ''` so a non-empty scan value
  // always wins and dossier metadata only fills gaps.
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
      expert: existing.expert || '',
      client: existing.client || dossier.garageName || [a.prenom, a.nom].filter(Boolean).join(' ') || '',
      adresse: existing.adresse || a.adresse || '',
      telephone: existing.telephone || a.telephone || '',
      assurances: existing.assurances || dossier.compagnie || '',
    };
  }, [dossier]);

  // Initialize editor state from chiffrage.structuredDevis (or kick off extraction once).
  useEffect(() => {
    if (loading || initializedRef.current || !dossier || !db || !storage) return;

    // Gestionnaire flow: no chiffrage to read from. Seed from the dossier's
    // own structuredEditables[docType] when present (the typed-documents-grid
    // upload path populates this), otherwise start from an empty row with the
    // dossier-prefilled header.
    if (isGestionnaire) {
      const dossierEditables = (dossier.structuredEditables || {}) as Record<string, StructuredDevis>;
      const seeded = dossierEditables[docType];
      if (seeded) {
        setHeader(dossierPrefill(seeded.header));
        setRows(seeded.rows.length ? seeded.rows : [emptyRow()]);
        setExtraColumns(normalizeExtraColumns(seeded));
        setVersions(seeded.versions || []);
      } else {
        setHeader((h) => dossierPrefill(h));
      }
      initializedRef.current = true;
      return;
    }

    (async () => {
      // Round-3: when opening the editor for a cardinal accord slot (2ème, 3ème,
      // propositions), start from the BASELINE (original AI scan stored on the
      // dossier) — NOT from the chiffrage's structuredEditables which holds the
      // previous accord's edits. Skip when the cardinal slot already has a real
      // saved doc (so re-opening preserves work).
      const parsedSlot = accordSlot ? parseAccordDocType(accordSlot) : null;
      const isCardinalRevision = !!parsedSlot && (
        (parsedSlot.kind === 'accord' && parsedSlot.ordinal >= 2) ||
        parsedSlot.kind === 'proposition-accord'
      );
      if (isCardinalRevision && dossierId) {
        try {
          const snap = await getDocs(query(
            collection(db, 'dossiers', dossierId, 'documents'),
            where('type', '==', accordSlot),
          ));
          const hasRealDoc = snap.docs.some((d) => {
            const x = d.data() as any;
            return !x.pendingUpload && !!x.url;
          });
          if (!hasRealDoc) {
            // Carry-forward: seed from the PREVIOUS round of the same kind so
            // the chiffreur sees every number/mod they made before and can
            // revise them in the new cardinal. Accord/proposition column is
            // unlocked here; the save path re-locks on persist.
            let prevRound: StructuredDevis | undefined;
            if (parsedSlot && parsedSlot.ordinal >= 2) {
              const prevLabel = mapToAccorde(docType, parsedSlot.kind, parsedSlot.ordinal - 1);
              prevRound =
                chiffrageEditables[prevLabel] ||
                ((dossier.structuredEditables || {}) as Record<string, StructuredDevis>)[prevLabel];
            }
            if (prevRound) {
              setHeader(dossierPrefill(prevRound.header));
              setRows(prevRound.rows.length ? prevRound.rows : [emptyRow()]);
              const carriedCols = normalizeExtraColumns(prevRound).map((c) =>
                c.kind === 'accord' || c.kind === 'proposition-accord'
                  ? { ...c, locked: false }
                  : c,
              );
              setExtraColumns(carriedCols);
              setVersions([]);
              initializedRef.current = true;
              return;
            }
            // Fallback (1ère proposition, or any cardinal whose previous round
            // was never saved): strip accord/proposition columns from baseline.
            const baseline = (dossier.structuredEditables || {})[docType] as StructuredDevis | undefined;
            if (baseline) {
              setHeader(dossierPrefill(baseline.header));
              setRows(baseline.rows.length ? baseline.rows : [emptyRow()]);
              const baselineCols = normalizeExtraColumns(baseline).filter(
                (c) => c.kind !== 'accord' && c.kind !== 'proposition-accord',
              );
              setExtraColumns(baselineCols);
              setVersions(baseline.versions || []);
              initializedRef.current = true;
              return;
            }
          }
        } catch (e) {
          console.warn('[devis-editor] cardinal baseline check failed; falling through:', e);
        }
      }

      if (persisted) {
        setHeader(dossierPrefill(persisted.header));
        setRows(persisted.rows.length ? persisted.rows : [emptyRow()]);
        const cols = normalizeExtraColumns(persisted);
        setExtraColumns(cols);
        setVersions(persisted.versions || []);
        initializedRef.current = true;

        // Re-run the extractor if new counter files have landed since the last extract.
        // The extractor is idempotent; it no-ops when every counter is already represented.
        const processedPaths = new Set(
          cols.filter((c) => c.kind === 'counter' && c.sourceStoragePath).map((c) => c.sourceStoragePath as string)
        );
        const hasUnprocessedCounter = counterFilePaths.some((p) => !processedPaths.has(p));
        if (hasUnprocessedCounter) runExtraction(false);
        return;
      }

      // No persisted devis yet — pre-fill header from dossier.
      setHeader((h) => dossierPrefill(h));
      initializedRef.current = true;

      // If already attempted (success or fail) we leave it alone — user can force retry.
      if (extractionAttempted) return;
      if (devisFileNames.length === 0) return;
      runExtraction(false);
    })();

  }, [loading, persisted, extractionAttempted, devisFileNames.length, counterFilePaths, dossier, dossierPrefill, db, storage, accordSlot, dossierId, docType, chiffrageEditables]);

  const runExtraction = useCallback(async (isManualRetry: boolean) => {
    if (!db || !storage) return;
    // The extractor operates on a chiffrage — gestionnaire mode has no
    // chiffrageId (and no AI scan is wanted anyway per task #6).
    if (!chiffrageId) return;
    setExtracting(true);
    try {
      const result = await extractAndPersistChiffrageDevis({
        db, storage, chiffrageId, docType, force: isManualRetry,
      });

      if (!result.ok) {
        if (result.reason === 'no-original-for-counter') {
          toast({
            variant: 'destructive',
            title: 'Devis original manquant',
            description: "Un contre-devis a été uploadé mais aucun devis original n'existe pour ce dossier. Uploadez un original depuis la fiche dossier.",
          });
          return;
        }
        if (result.reason === 'service-overloaded') {
          toast({
            variant: 'destructive',
            title: 'Service IA surchargé',
            description: 'Le service IA est momentanément surchargé. Réessayez dans quelques minutes.',
          });
          return;
        }
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
        setVersions(sd.versions || []);
        toast({ title: 'Extraction automatique terminee', description: `${sd.rows.length} ligne(s) detectee(s) depuis ${devisFileNames.length} ${typeLabel.lower}(s).` });
        // Task #33: a fresh scan just populated editor state — lock edits and
        // surface the warning dialog until the chiffreur confirms review.
        // Task #35: feed the dialog the calculationErrors from the API so they
        // render as bullets underneath the body copy.
        setScanCalculationErrors(Array.isArray(result.calculationErrors) ? result.calculationErrors : []);
        setScanReviewed(false);
        setScanWarningOpen(true);
        // Auto-open the comparison panel so the chiffreur can verify each line
        // against the source devis/facture without having to click `Comparer`.
        // ReferencePanel auto-selects the matching `docType` document.
        setComparisonOpen(true);
        setAppSidebarOpen(false);
      }
    } catch (e: any) {
      console.error('[devis-editor] extraction failed', e);
      toast({ variant: 'destructive', title: 'Extraction impossible', description: e?.message || '' });
    } finally {
      setExtracting(false);
    }
  }, [db, storage, chiffrageId, docType, dossierPrefill, toast, devisFileNames.length, typeLabel.lower]);

  // Always keep an accord column in the chiffreur's table. Default kind is
  // 'accord'; the lightbox / column popover can flip to 'proposition-accord'.
  // Skip for the gestionnaire path (their editor is the source devis).
  useEffect(() => {
    if (isGestionnaire) return;
    if (loading || !dossier) return;
    setExtraColumns((cols) => {
      if (cols.some((c) => c.kind === 'accord' || c.kind === 'proposition-accord')) return cols;
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
      const seededValues: Record<string, string> = {};
      for (const r of rows) {
        seededValues[r.id] = String(r.puHT ?? '');
      }
      const newCol: DevisExtraColumn = {
        id: newId,
        label: 'PUHT accordé',
        values: seededValues,
        kind: 'accord',
        locked: false,
      };
      return [...cols, newCol];
    });
  }, [extraColumns, dossier, loading, isGestionnaire, rows]);

  // Row helpers ──────────────────────────────────────────────────────────
  const updateRow = (id: string, patch: Partial<DevisRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const deleteRow = (id: string) => setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.id !== id)));

  // Task #5: manual add/remove column affordances are gone. The fixed column
  // set is mandated by the Moroccan devis layout (Vétusté, Type, REF,
  // Désignation, T.V.A, Quantité, P.U.H.T, Total H.T). Counter columns still
  // arrive via extractAndPersistChiffrageDevis and are rendered read-only.
  const updateExtraCell = (colId: string, rowId: string, value: string) => {
    setExtraColumns((cols) =>
      cols.map((c) => (c.id === colId ? { ...c, values: { ...c.values, [rowId]: value } } : c))
    );
  };

  // Task #21: patch metadata on an extra column (label / kind / locked).
  // Used by the accord header popover to switch between
  // 'accord' / 'proposition-accord' and set the displayed label.
  const updateExtraColumn = (colId: string, patch: Partial<DevisExtraColumn>) => {
    setExtraColumns((cols) =>
      cols.map((c) => (c.id === colId ? { ...c, ...patch } : c))
    );
  };

  // Task #21: local popover open state, keyed per accord column id.
  const [accordHeaderOpen, setAccordHeaderOpen] = useState<Record<string, boolean>>({});
  const [refHeaderOpen, setRefHeaderOpen] = useState(false);
  const [typeHeaderOpen, setTypeHeaderOpen] = useState(false);
  const [obsHeaderOpen, setObsHeaderOpen] = useState(false);
  const [tvaHeaderOpen, setTvaHeaderOpen] = useState(false);
  const [tvaHeaderValue, setTvaHeaderValue] = useState<number | null>(20);

  // Accord totals helpers. The cap (accord PU ≤ row PUHT) is signalled
  // inline (red border + message) on the cell — no clamping or revert.
  const computeAccordTotalHT = (puAccord: number, qte: number, vetuste: number) =>
    puAccord * qte * (1 - vetuste / 100);
  const computeAccordPrixTTC = (totalHTAccord: number, tva: number) =>
    totalHTAccord * (1 + tva / 100);

  // Derived edit gate. `canEdit` is the role check (gestionnaire or authorised
  // chiffreur); `scanReviewed` is the post-scan confirmation flag. Both must be
  // true before any row/header affordance is enabled.
  const isEditable = canEdit && scanReviewed;


  // Totals ───────────────────────────────────────────────────────────────
  // Pre-compute per-row totals (used both in the main tbody and the inline
  // summary row so Total H.T stays consistent with the schema formula).
  const rowTotals = useMemo(() => rows.map((r) => rowTotalHT(r)), [rows]);
  const totals = useMemo(() => ({
    ht: sumHT(rows),
    tva: sumTVA(rows),
    ttc: sumTTC(rows),
  }), [rows]);

  // Inline totals row values — task #5 replaces the stacked totals card with a
  // single sticky row at the bottom of the same table.
  const totalsRow = useMemo(() => {
    const qteSum = rows.reduce(
      (acc, r) => acc + (typeof r.qte === 'number' && Number.isFinite(r.qte) ? r.qte : 0),
      0,
    );
    const totalHt = rowTotals.reduce((acc, n) => acc + n, 0);
    return { qteSum, totalHt };
  }, [rows, rowTotals]);

  // Total TTC Expert is the chiffreur's accord/proposition column total, NOT
  // the gestionnaire-entered row PUHT total. Returns null when no
  // accord/proposition-accord column exists (callers render '—').
  const totalTTCExpert = useMemo<number | null>(() => {
    const accordCol = extraColumns.find(
      (c) => c.kind === 'accord' || c.kind === 'proposition-accord',
    );
    if (!accordCol) return null;
    return rows.reduce((sum, r) => {
      const pu = parseFr(accordCol.values[r.id] || '');
      const qte = typeof r.qte === 'number' && Number.isFinite(r.qte) ? r.qte : 0;
      const vetuste = typeof r.vetuste === 'number' && Number.isFinite(r.vetuste) ? r.vetuste : 0;
      const tva = typeof r.tva === 'number' && Number.isFinite(r.tva) ? r.tva : 0;
      const tHt = pu * qte * (1 - vetuste / 100);
      return sum + tHt * (1 + tva / 100);
    }, 0);
  }, [extraColumns, rows]);

  // Save ─────────────────────────────────────────────────────────────────
  // Task #23: Phase 1 — compute the snapshot + accord metadata, then hand off
  // to the preview dialog. The actual upload / Firestore write runs in
  // `performPersist` (Phase 2) once the user confirms from the preview.
  //
  // Task #24: when a clone column is present we also derive the cardinal
  // ordinal up-front by scanning `dossiers/{id}/documents` for matching
  // accord variants. The dialog title + the save pipeline both use this
  // ordinal, so the preview and the final doc stay aligned.
  const handleSave = async () => {
    if (!canEdit) {
      toast({ variant: 'destructive', title: 'Action non autorisee' });
      return;
    }
    // Task #7: vétusté is required for Adaptable / Originale rows. Block the
    // finalize/publish flow (preview → PDF write) when any such row still has
    // an empty vétusté. The visual marker (red ring + asterisk) is rendered
    // row-by-row in the table; this is the matching submit-block half.
    const missingVetuste = rows.some(
      (r) => (r.type === 'Adaptable' || r.type === 'Originale') && r.vetuste == null,
    );
    if (missingVetuste) {
      toast({
        variant: 'destructive',
        title: 'Vétusté manquante pour les pièces Adaptable / Originale',
      });
      return;
    }
    if (!db || !storage) return;

    const snapshot: DevisSnapshot = extraColumns.length > 0
      ? { header, rows, extraColumns }
      : { header, rows };

    // Detect an accord / proposition-accord clone column. The preview dialog
    // uses this to title the PDF ("Accord" / "Proposition d'accord") instead
    // of the default "Devis" / "Facture" for the docType.
    const accordColumn = (snapshot.extraColumns ?? []).find(
      (c) => c.kind === 'accord' || c.kind === 'proposition-accord',
    );
    const accordKind: 'accord' | 'proposition-accord' | undefined = accordColumn
      ? (accordColumn.kind as 'accord' | 'proposition-accord')
      : undefined;

    // Derive the cardinal ordinal. Priority order:
    //  1. URL `accordSlot` param — chiffreur explicitly opened a specific
    //     cardinal slot, save lands there.
    //  2. computeCardinalOrdinal — fills the first empty placeholder created
    //     by the gestionnaire's "+" pimple, otherwise appends a new ordinal.
    //  3. Falls back to 1 on any read failure.
    let ordinal: number | undefined;
    if (accordKind) {
      const activeDossierId = dossierIdProp || dossierId;
      const parsedAccordSlot = accordSlot ? parseAccordDocType(accordSlot) : null;
      if (parsedAccordSlot && parsedAccordSlot.sourceDocType === docType) {
        ordinal = parsedAccordSlot.ordinal;
      } else if (activeDossierId && (docType === 'Devis Garage' || docType === 'Facture Garage')) {
        try {
          ordinal = await computeCardinalOrdinal(activeDossierId, docType, accordKind);
        } catch (e) {
          console.warn('[devis-editor] cardinal ordinal derivation failed, defaulting to 1', e);
          ordinal = 1;
        }
      } else {
        ordinal = 1;
      }
    }

    setPreviewSnapshot(snapshot);
    setPreviewAccordKind(accordKind);
    setPreviewOrdinal(ordinal);
    setPreviewOpen(true);
  };

  // Scan `dossiers/{id}/documents` for accord variants matching the source
  // docType + kind. Return the FIRST empty placeholder ordinal (a slot
  // spawned by the gestionnaire's "+" pimple but not yet filled by the
  // chiffreur), so saves don't jump over pre-created cardinal slots.
  // If every existing ordinal already has a real saved doc, append a new
  // ordinal (capped at 3). Labels that don't parse as accord variants
  // are ignored.
  const computeCardinalOrdinal = useCallback(async (
    activeDossierId: string,
    sourceDocType: 'Devis Garage' | 'Facture Garage',
    accordKind: 'accord' | 'proposition-accord',
  ): Promise<number> => {
    if (!db) return 1;
    const documentsCol = collection(db, 'dossiers', activeDossierId, 'documents');
    const docsSnap = await getDocs(query(documentsCol));
    // Per ordinal: true if at least one real (saved) doc exists; false if
    // only a placeholder is present.
    const realByOrdinal = new Map<number, boolean>();
    let maxOrdinal = 0;
    for (const d of docsSnap.docs) {
      const data = d.data() as any;
      const type = data.type;
      if (typeof type !== 'string') continue;
      const parsed = parseAccordDocType(type);
      if (!parsed) continue;
      if (parsed.sourceDocType !== sourceDocType || parsed.kind !== accordKind) continue;
      if (parsed.ordinal > maxOrdinal) maxOrdinal = parsed.ordinal;
      const isReal = !data.pendingUpload && !!data.url;
      if (isReal) realByOrdinal.set(parsed.ordinal, true);
      else if (!realByOrdinal.has(parsed.ordinal)) realByOrdinal.set(parsed.ordinal, false);
    }
    // Smallest placeholder-only ordinal (ascending) — that's the slot the
    // chiffreur is meant to fill next.
    for (let i = 1; i <= maxOrdinal; i++) {
      if (realByOrdinal.get(i) === false) return i;
    }
    return maxOrdinal + 1;
  }, [db]);

  // Task #23: Phase 2 — runs on preview confirm. Uses the blob produced by the
  // preview dialog (preserves WYSIWYG) rather than re-rendering. All the prior
  // persistence logic lives here, split by mode.
  const performPersist = async (blob: Blob, stampId: string | null) => {
    if (!canEdit) {
      toast({ variant: 'destructive', title: 'Action non autorisee' });
      return;
    }
    if (!db || !storage) return;
    const snapshot = previewSnapshot;
    if (!snapshot) return;
    setSaving(true);
    try {
      // Task #3 / Task #24: Facture Garage / Devis Garage saves target an
      // accord-variant slot — ordinal 1 upserts the legacy "accordé" slot
      // (one per dossier), ordinal ≥ 2 creates a brand-new cardinal slot
      // (e.g. "Devis 2ème accord"). The cardinal ordinal is computed by
      // `handleSave` before opening the preview.
      const accordColumn = (snapshot.extraColumns ?? []).find(
        (c) => c.kind === 'accord' || c.kind === 'proposition-accord',
      );
      const persistAccordKind: 'accord' | 'proposition-accord' | undefined =
        accordColumn ? (accordColumn.kind as 'accord' | 'proposition-accord') : undefined;
      const derivedOrdinal: number = persistAccordKind
        ? (typeof previewOrdinal === 'number' && Number.isFinite(previewOrdinal)
            ? previewOrdinal
            : 1)
        : 1;
      const targetDocType = persistAccordKind
        ? mapToAccorde(docType, persistAccordKind, derivedOrdinal)
        : mapToAccorde(docType);

      // Task #24: when an accord clone column is present, mark it as `locked`
      // on the snapshot we persist. Both the dossier mirror and the chiffrage
      // mirror inside `saveGestionnaireDevisAsPieceJointe` read
      // `snapshot.extraColumns` directly, so writing the lock here covers
      // both surfaces without a separate updateDoc.
      const persistedSnapshot: DevisSnapshot = persistAccordKind && snapshot.extraColumns
        ? {
            ...snapshot,
            extraColumns: snapshot.extraColumns.map((c) =>
              c.kind === 'accord' || c.kind === 'proposition-accord'
                ? { ...c, locked: true }
                : c,
            ),
          }
        : snapshot;

      // Gestionnaire save path (task #6): route to pieces-jointes with
      // skipAIScan — no chiffrage write, no AI extraction. The chiffreur
      // receives the pre-built table via structuredEditables.
      if (isGestionnaire) {
        const activeDossierId = dossierIdProp || dossierId;
        if (!activeDossierId) {
          toast({ variant: 'destructive', title: 'Dossier manquant', description: 'Impossible de sauvegarder sans dossier.' });
          return;
        }
        const result = await saveGestionnaireDevisAsPieceJointe({
          db,
          storage,
          dossierId: activeDossierId,
          docType,
          snapshot: persistedSnapshot,
          author: {
            uid: profile?.uid || '',
            nom: profile?.nom || '',
            email: profile?.email || '',
          },
          chiffrageId: chiffrageId || null,
          // Task #23: pass the WYSIWYG blob + selected stamp to the helper so
          // the upload mirrors exactly what the user previewed.
          pdfBlob: blob,
          stampId,
          // Task #24: hand the derived cardinal label + ordinal to the save
          // helper so ordinal ≥ 2 creates a fresh doc (rather than upserting
          // the ordinal-1 slot) and the `type` field reflects the cardinal.
          targetDocType,
          ordinal: derivedOrdinal,
        });
        setVersions((v) => [result.version, ...v]);
        // Task #24: reflect the locked state in the editor so the header
        // popover disappears and the column renders as read-only immediately.
        if (persistAccordKind) {
          setExtraColumns((cols) =>
            cols.map((c) =>
              c.kind === 'accord' || c.kind === 'proposition-accord'
                ? { ...c, locked: true }
                : c,
            ),
          );
        }
        toast({ title: `${targetDocType} enregistré`, description: 'Ajouté aux pièces jointes du dossier.' });
        return;
      }

      if (!chiffrageId) {
        toast({ variant: 'destructive', title: 'Assignation manquante', description: 'Aucun chiffrage associé.' });
        return;
      }
      const now = new Date();
      const author = profile?.nom || profile?.email || 'Utilisateur';
      // Task #23: PDF rendering moved into `DevisPreviewDialog`; we upload the
      // blob the user confirmed rather than re-rendering here.
      const pdfBlob = blob;
      const versionId = crypto.randomUUID();
      const pdfStoragePath = `chiffrages/${chiffrageId}/devis-versions/${targetDocType}/${versionId}.pdf`;

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
          fileName: `${targetDocType.toLowerCase()}-${versionId}.pdf`,
          fileSize: pdfBlob.size,
          contentType: 'application/pdf',
          storagePath: pdfStoragePath,
          firestoreDocPath: 'chiffrages',
          firestoreMetadata: { _chiffrageId: chiffrageId, _type: 'devis-version', _docType: targetDocType, _versionId: versionId },
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

      // Task #24: lock any accord / proposition-accord clone columns on the
      // persisted snapshot so the chiffrage mirror renders the header read-only
      // on subsequent reads. Reuses `persistedSnapshot` computed above.
      const structuredDevis: StructuredDevis = {
        ...persistedSnapshot,
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
          [`structuredEditables.${targetDocType}`]: structuredDevis,
          editableExtractionAttempted: { ...freshAttempts, [targetDocType]: true },
          updatedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          // Task #23: stamp selection is additive; not yet part of the
          // StructuredDevis type, just persisted alongside the chiffrage write.
          ...(stampId !== null ? { [`devisStampId.${targetDocType}`]: stampId } : {}),
        });
      }

      const activeDossierId = dossierIdProp || dossierId;
      if (activeDossierId && pdfUrl) {
        try {
          const documentsCol = collection(db, 'dossiers', activeDossierId, 'documents');
          const placeholderSnap = await getDocs(query(
            documentsCol,
            where('type', '==', targetDocType),
            where('pendingUpload', '==', true),
          ));
          const docPayload = {
            type: targetDocType,
            nom: `${targetDocType.toLowerCase()}-${versionId}.pdf`,
            fileName: `${targetDocType.toLowerCase()}-${versionId}.pdf`,
            storagePath: pdfStoragePath,
            url: pdfUrl,
            pendingUpload: false,
            updatedAt: serverTimestamp(),
            updatedBy: profile?.uid || '',
            uploadedByName: profile?.nom || profile?.email || '',
            uploadePar: profile?.email || '',
          };
          if (!placeholderSnap.empty) {
            await updateDoc(placeholderSnap.docs[0].ref, docPayload);
          } else {
            await addDoc(documentsCol, {
              ...docPayload,
              createdAt: serverTimestamp(),
              createdBy: profile?.uid || '',
            });
          }
        } catch (e) {
          console.warn('[devis-editor] dossier documents mirror failed (non-fatal)', e);
        }
      }
      if (activeDossierId) {
        // Task #10 slice 5: denormalize the chiffrage publish timestamp onto
        // the dossier doc so the dossiers list can render a "Date chiffrage"
        // column without per-row chiffrage lookups. Always overwrite — single
        // "latest publish" timestamp across all stages.
        await setDoc(
          doc(db, 'dossiers', activeDossierId),
          { dateChiffrage: serverTimestamp() },
          { merge: true },
        );
        await logHistorique(
          db, activeDossierId,
          `Enregistré ${targetDocType}`,
          profile?.email || profile?.nom || 'Utilisateur',
          `${snapshot.rows.length} ligne(s) enregistrée(s)`,
          'document',
          profile?.nom,
        ).catch(() => {});
        await logWorkflow(
          db, activeDossierId,
          `${targetDocType} mis à jour`,
          profile?.email || profile?.nom || 'Utilisateur',
          profile?.uid || '',
          'done',
          { details: `${snapshot.rows.length} ligne(s)` },
          profile?.nom,
        ).catch(() => {});

        // Task #11 / Task #24: if the snapshot carries a committed accord /
        // proposition clone column, bump the dossier statut accordingly.
        // Ordinal is the cardinal derived in `handleSave`, so 2ème accord
        // lands on the right statut.
        // Non-fatal: keep the save-success path clean.
        try {
          if (persistAccordKind) {
            const accordKind: 'accord' | 'proposition' =
              persistAccordKind === 'accord' ? 'accord' : 'proposition';
            const target = deriveStatus({
              kind: 'chiffreurSave',
              accordKind,
              ordinal: derivedOrdinal,
            });
            const dossierRef = doc(db, 'dossiers', activeDossierId);
            const dossierSnap = await getDoc(dossierRef);
            const currentStatut = dossierSnap.exists()
              ? ((dossierSnap.data() as Record<string, unknown>).statut as
                  | string
                  | undefined)
              : undefined;
            if (currentStatut !== target) {
              await updateDoc(dossierRef, {
                statut: target,
                updatedAt: serverTimestamp(),
              });
              await logHistorique(
                db, activeDossierId,
                target,
                profile?.email || profile?.nom || 'Utilisateur',
                `Statut mis à jour automatiquement (enregistrement ${persistAccordKind === 'accord' ? 'accord' : "proposition d'accord"}).`,
                'statut',
                profile?.nom,
              ).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('[devis-editor] statut update failed (non-fatal)', e);
        }
      }

      setVersions((v) => [newVersion, ...v]);

      // Task #24: reflect the locked state in the editor so the header popover
      // disappears and the column renders as read-only immediately after save.
      if (persistAccordKind) {
        setExtraColumns((cols) =>
          cols.map((c) =>
            c.kind === 'accord' || c.kind === 'proposition-accord'
              ? { ...c, locked: true }
              : c,
          ),
        );
      }

      if (uploaded) {
        toast({ title: `${targetDocType} enregistre`, description: 'Nouvelle version generee.' });
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
        {!isGestionnaire && chiffrageId && (
          <Button variant="outline" size="icon" asChild>
            <Link href={`/assignations-chiffrage/${chiffrageId}`} aria-label="Retour">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">Editer les {typeLabel.plural}</h1>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            {isGestionnaire ? (
              <span className="truncate">Nouveau {typeLabel.lower} — sera ajouté aux pièces jointes du dossier.</span>
            ) : devisFileNames.length > 0 ? (
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
        {/*
          Task #33 (revised): the post-scan warning dialog is now informational
          only — it no longer carries its own "J'ai vérifié" action. The
          chiffreur acknowledges the scan review by clicking THIS button,
          which is the single canonical unlock entry-point. Visible only when
          the table is locked (`!scanReviewed`) and the user can edit.
        */}
        {canEdit && !scanReviewed && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setScanReviewed(true)}
            title="Confirmer la vérification du scan et déverrouiller le tableau"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            J&apos;ai vérifié
          </Button>
        )}
        {!isGestionnaire && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => runExtraction(true)}
            loading={extracting}
            disabled={!canEdit || devisFileNames.length === 0}
            title="Relancer l'extraction automatique (écrase les données)"
          >
            {extracting ? null : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Ré-extraire
          </Button>
        )}
        <Button variant="default" size="sm" onClick={handleSave} loading={saving} disabled={!canEdit}>
          {saving ? null : <Save className="h-3.5 w-3.5 mr-1.5" />}
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
            initialDocType={docType}
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
              disabled={!isEditable}
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
              disabled={!isEditable}
            />
          ))}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <HeaderField
              label="Devis N°"
              value={header.devisNumero}
              onChange={(v) => setHeader((h) => ({ ...h, devisNumero: v }))}
              disabled={!isEditable}
            />
            <HeaderField
              label="Date"
              value={header.dateDevis}
              onChange={(v) => setHeader((h) => ({ ...h, dateDevis: v }))}
              disabled={!isEditable}
              placeholder="JJ/MM/AAAA"
            />
          </div>
        </div>
      </div>

      {/* Rows table — fixed columns. The accord/proposition column is created
          automatically when the chiffreur picks via the first-open lightbox.
          Rows are added only via AI scan, paste, or programmatic flows (no
          manual "add row" button). The table grows to its natural height —
          only horizontal scroll on overflow. */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="min-w-[900px] w-full text-xs border-collapse">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:text-left [&>th]:font-bold [&>th]:text-[11px] [&>th]:border-b [&>th]:border-r [&>th:last-child]:border-r-0 [&>th]:bg-muted/50">
                <th style={{ width: '180px' }}>
                  <Popover open={refHeaderOpen} onOpenChange={setRefHeaderOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!isEditable}
                        className="w-full flex items-center justify-between gap-1 font-bold text-[11px] hover:text-primary focus:outline-none focus:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Définir Réparation/Remplacement pour toutes les lignes"
                      >
                        <span>Réparation/Remplacement</span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-40 p-1">
                      {REF_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted focus:bg-muted focus:outline-none"
                          onClick={() => {
                            setRows((rs) => rs.map((r) => ({ ...r, ref: opt })));
                            setRefHeaderOpen(false);
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </th>
                <th>Designation</th>
                <th style={{ width: '90px' }}>
                  <Popover open={typeHeaderOpen} onOpenChange={setTypeHeaderOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!isEditable}
                        className="w-full flex items-center justify-between gap-1 font-bold text-[11px] hover:text-primary focus:outline-none focus:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Définir Type pour toutes les lignes"
                      >
                        <span>Type</span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-40 p-1">
                      {TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted focus:bg-muted focus:outline-none"
                          onClick={() => {
                            setRows((rs) => rs.map((r) => {
                              if (opt === 'Originale' && r.type !== 'Originale') return { ...r, type: 'Originale', tva: 20 };
                              if (opt === 'Occasion') return { ...r, type: 'Occasion', vetuste: null };
                              return { ...r, type: opt };
                            }));
                            setTypeHeaderOpen(false);
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </th>
                <th style={{ width: '70px' }} className="text-center">Quantite</th>
                <th style={{ width: '110px' }} className="text-right bg-muted/40">P.U.H.T</th>
                <th style={{ width: '120px' }} className="text-right">Total H.T</th>
                <th style={{ width: '70px' }} className="text-center">
                  <Popover open={tvaHeaderOpen} onOpenChange={setTvaHeaderOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!isEditable}
                        className="w-full flex items-center justify-center gap-1 font-bold text-[11px] hover:text-primary focus:outline-none focus:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Définir T.V.A pour toutes les lignes"
                      >
                        <span>T.V.A</span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-44 p-2">
                      <CellNumberInput
                        value={tvaHeaderValue}
                        onChange={setTvaHeaderValue}
                        suffix="%"
                        decimals={0}
                        align="center"
                        allowNull
                      />
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs mt-2"
                        onClick={() => {
                          setRows((rs) => rs.map((r) => ({ ...r, tva: tvaHeaderValue })));
                          setTvaHeaderOpen(false);
                        }}
                      >
                        Appliquer à toutes les lignes
                      </Button>
                    </PopoverContent>
                  </Popover>
                </th>
                <th style={{ width: '80px' }} className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>Vetuste</span>
                    <button type="button" disabled={!isEditable}
                            className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted focus:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                            title="-5 sur toutes les lignes"
                            onClick={() => setRows((rs) => rs.map((r) => {
                              if (r.type === 'Occasion') return r;
                              const cur = typeof r.vetuste === 'number' && Number.isFinite(r.vetuste) ? r.vetuste : 0;
                              return { ...r, vetuste: Math.min(100, Math.max(0, cur - 5)) };
                            }))}>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button type="button" disabled={!isEditable}
                            className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted focus:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                            title="+5 sur toutes les lignes"
                            onClick={() => setRows((rs) => rs.map((r) => {
                              if (r.type === 'Occasion') return r;
                              const cur = typeof r.vetuste === 'number' && Number.isFinite(r.vetuste) ? r.vetuste : 0;
                              return { ...r, vetuste: Math.min(100, Math.max(0, cur + 5)) };
                            }))}>
                      <ChevronUp className="h-3 w-3" />
                    </button>
                  </div>
                </th>
                <th style={{ width: '120px' }} className="text-right">Prix en TTC</th>
                {extraColumns.map((col) => {
                  const isCounter = col.kind === 'counter';
                  const isAccord = col.kind === 'accord' || col.kind === 'proposition-accord';
                  // Task #21: accord columns render as a triple (PU / Total HT Accord / Prix TTC Accord).
                  if (isAccord) {
                    const puHeader = col.locked ? (
                      // Task #40: locked accord/proposition clones show a tooltip on
                      // hover explaining how to reverse the save. Label stays plain text.
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate font-bold text-[11px] cursor-help">
                              {col.label || (col.kind === 'accord' ? 'PUHT accordé' : 'PUHT proposé')}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            Pour annuler, contactez le gestionnaire pour une nouvelle planification.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Popover
                        open={!!accordHeaderOpen[col.id]}
                        onOpenChange={(o) => setAccordHeaderOpen((s) => ({ ...s, [col.id]: o }))}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center justify-between gap-1 font-bold text-[11px] hover:text-primary focus:outline-none focus:text-primary"
                            title="Choisir un type d'accord"
                          >
                            <span className="truncate">{col.label || 'Choisir un accord'}</span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-48 p-1">
                          <button
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted focus:bg-muted focus:outline-none"
                            onClick={() => {
                              updateExtraColumn(col.id, { label: 'PUHT accordé', kind: 'accord' });
                              setAccordHeaderOpen((s) => ({ ...s, [col.id]: false }));
                            }}
                          >
                            PUHT accordé
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted focus:bg-muted focus:outline-none"
                            onClick={() => {
                              updateExtraColumn(col.id, {
                                label: 'PUHT proposé',
                                kind: 'proposition-accord',
                              });
                              setAccordHeaderOpen((s) => ({ ...s, [col.id]: false }));
                            }}
                          >
                            PUHT proposé
                          </button>
                        </PopoverContent>
                      </Popover>
                    );
                    // Suffix mirrors the PU header: 'accordé' for accord
                    // columns, 'proposé' for proposition columns. Keeps the
                    // triple coherent at a glance.
                    const tripleSuffix = col.kind === 'accord' ? 'accordé' : 'proposé';
                    return (
                      <React.Fragment key={col.id}>
                        <th style={{ width: '120px' }} className="text-right bg-muted/40">
                          {puHeader}
                        </th>
                        <th style={{ width: '130px' }} className="text-right bg-muted/40">{`Total H.T ${tripleSuffix}`}</th>
                        <th style={{ width: '130px' }} className="text-right bg-muted/40">{`Prix TTC ${tripleSuffix}`}</th>
                      </React.Fragment>
                    );
                  }
                  return (
                    <th
                      key={col.id}
                      style={{ width: '140px' }}
                      className={cn(isCounter && 'text-destructive')}
                    >
                      <div className="flex items-center gap-1">
                        {isCounter && <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive shrink-0" aria-hidden />}
                        <span className="truncate">{col.label}</span>
                        {isCounter && col.sourcePdfUrl && (
                          <a
                            href={col.sourcePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-destructive/70 hover:text-destructive"
                            title="Ouvrir le document source"
                          >
                            <FileText className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th style={{ width: '130px' }}>
                  <Popover open={obsHeaderOpen} onOpenChange={setObsHeaderOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!isEditable}
                        className="w-full flex items-center justify-between gap-1 font-bold text-[11px] hover:text-primary focus:outline-none focus:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Définir Observation pour toutes les lignes"
                      >
                        <span>Observation</span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-44 p-1">
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted focus:bg-muted focus:outline-none text-muted-foreground"
                        onClick={() => {
                          setRows((rs) => rs.map((r) => ({ ...r, observation: undefined })));
                          setObsHeaderOpen(false);
                        }}
                      >
                        (aucune)
                      </button>
                      {OBSERVATION_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted focus:bg-muted focus:outline-none"
                          onClick={() => {
                            setRows((rs) => rs.map((r) => ({ ...r, observation: opt as ObservationOption })));
                            setObsHeaderOpen(false);
                          }}
                        >
                          {OBSERVATION_LABELS[opt]}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </th>
                <th style={{ width: '70px' }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const total = rowTotals[i] ?? 0;
                // Visual-only required marker: Adaptable/Originale must have a
                // vétusté value. `r.vetuste == null` catches both null and
                // undefined; 0 is a valid filled-in value.
                const vetusteMissing = (r.type === 'Adaptable' || r.type === 'Originale') && r.vetuste == null;
                return (
                  <tr key={r.id} className="[&>td]:px-1.5 [&>td]:py-1 [&>td]:border-b [&>td]:border-r [&>td:last-child]:border-r-0 group hover:bg-muted/30">
                    <td>
                      {/* scanned values outside the enum render blank so the chiffreur picks */}
                      <div className="flex items-center gap-0.5">
                        <Select
                          value={(REF_OPTIONS as readonly string[]).includes(r.ref) ? r.ref : ''}
                          onValueChange={(v) => updateRow(r.id, { ref: v })}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8 w-full px-1.5 text-xs border-transparent bg-transparent focus:border-primary/50 focus:bg-background rounded">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            {REF_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {r.ref && isEditable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                            title="Effacer"
                            onClick={(e) => { e.stopPropagation(); updateRow(r.id, { ref: '' }); }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td>
                      <CellInput value={r.designation} onChange={(v) => updateRow(r.id, { designation: v })} disabled={!isEditable} />
                    </td>
                    <td>
                      {/* scanned values outside the enum render blank so the chiffreur picks */}
                      <div className="flex items-center gap-0.5">
                        <Select
                          value={(TYPE_OPTIONS as readonly string[]).includes(r.type) ? r.type : ''}
                          onValueChange={(v) => {
                            // Set tva=20 only when transitioning INTO 'Originale' from a different type.
                            // This preserves any manual tva edit when re-selecting 'Originale' (no-op transition).
                            if (v === 'Originale' && r.type !== 'Originale') {
                              updateRow(r.id, { type: 'Originale', tva: 20 });
                            } else if (v === 'Occasion') {
                              // Occasion clears vétusté (and the cell becomes disabled below).
                              updateRow(r.id, { type: 'Occasion', vetuste: null });
                            } else {
                              updateRow(r.id, { type: v });
                            }
                          }}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8 w-full px-1.5 text-xs border-transparent bg-transparent focus:border-primary/50 focus:bg-background rounded">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            {TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {r.type && isEditable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                            title="Effacer"
                            onClick={(e) => { e.stopPropagation(); updateRow(r.id, { type: '' }); }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td>
                      <CellNumberInput value={r.qte} onChange={(v) => {
                        // Task #6: After scanReviewed flips true, qte is locked
                        // to decrease-only. The cap is the qte captured the
                        // first time we saw this row (qteScanCapRef) — not the
                        // live r.qte — so the chiffreur can lower the value
                        // and then revert back up to the initial scan value.
                        // Treat null as 0 for the comparison.
                        const cap = qteScanCapRef.current.get(r.id);
                        const ceiling = cap === undefined ? (r.qte ?? 0) : (cap ?? 0);
                        if (scanReviewed && (v ?? 0) > ceiling) return;
                        updateRow(r.id, { qte: v });
                      }} disabled={!isEditable} decimals={0} align="center" allowNull />
                    </td>
                    <td className="bg-muted/40">
                      <CellNumberInput value={r.puHT} onChange={(v) => updateRow(r.id, { puHT: v ?? 0 })} disabled={!isEditable} align="right" />
                    </td>
                    {/* Total H.T is computed — read-only, auto-updating. */}
                    <td className="text-right font-semibold pr-2">{formatFr(total)}</td>
                    <td>
                      <CellNumberInput value={r.tva} onChange={(v) => updateRow(r.id, { tva: v })} disabled={!isEditable} suffix="%" decimals={0} align="center" allowNull />
                    </td>
                    <td>
                      <div className={cn("relative rounded", vetusteMissing && "ring-1 ring-red-500")}>
                        <CellNumberInput
                          value={r.vetuste ?? null}
                          onChange={(v) => updateRow(r.id, { vetuste: v })}
                          disabled={!isEditable || r.type === 'Occasion'}
                          suffix="%"
                          decimals={0}
                          align="center"
                          allowNull
                          step={5}
                          min={0}
                          max={50}
                          showSteppers
                        />
                        {vetusteMissing && (
                          <span className="absolute -top-1 -right-1 text-red-500 text-[10px] leading-none pointer-events-none">*</span>
                        )}
                      </div>
                    </td>
                    {/* Prix en TTC is computed — read-only: Total H.T * (1 + tva/100). */}
                    <td className="text-right font-semibold pr-2">
                      {formatFr(total * (1 + (r.tva ?? 0) / 100))}
                    </td>
                    {extraColumns.map((col) => {
                      const isAccord = col.kind === 'accord' || col.kind === 'proposition-accord';
                      if (isAccord) {
                        const raw = col.values[r.id] || '';
                        const puAccord = parseFr(raw);
                        const qte = typeof r.qte === 'number' && Number.isFinite(r.qte) ? r.qte : 0;
                        const vetuste = typeof r.vetuste === 'number' && Number.isFinite(r.vetuste) ? r.vetuste : 0;
                        const tva = typeof r.tva === 'number' && Number.isFinite(r.tva) ? r.tva : 0;
                        const totalHTAccord = computeAccordTotalHT(puAccord, qte, vetuste);
                        const prixTTCAccord = computeAccordPrixTTC(totalHTAccord, tva);
                        const rowPuHT = typeof r.puHT === 'number' && Number.isFinite(r.puHT) ? r.puHT : 0;
                        const isAccordOverCap = puAccord > 0 && puAccord > rowPuHT;
                        return (
                          <React.Fragment key={col.id}>
                            <td className="bg-muted/40 align-top">
                              <AccordPUInput
                                value={raw}
                                disabled={!isEditable || col.locked === true}
                                error={isAccordOverCap}
                                onChange={(v) => updateExtraCell(col.id, r.id, v)}
                                onBlurValidate={() => {
                                  const current = parseFr(col.values[r.id] || '');
                                  if (current > 0 && current > rowPuHT) {
                                    updateExtraCell(col.id, r.id, '');
                                    toast({
                                      variant: 'destructive',
                                      title: 'Valeur supérieure au P.U.H.T.',
                                      description: 'La cellule a été effacée.',
                                    });
                                  }
                                }}
                              />
                              {isAccordOverCap && (
                                <p className="text-[10px] text-destructive mt-0.5 px-1.5 leading-tight">
                                  Doit être ≤ P.U.H.T
                                </p>
                              )}
                            </td>
                            <td className="text-right font-semibold pr-2 bg-muted/40">
                              {formatFr(totalHTAccord)}
                            </td>
                            <td className="text-right font-semibold pr-2 bg-muted/40">
                              {formatFr(prixTTCAccord)}
                            </td>
                          </React.Fragment>
                        );
                      }
                      return (
                        <td key={col.id}>
                          <CellInput
                            value={col.values[r.id] || ''}
                            onChange={(v) => updateExtraCell(col.id, r.id, v)}
                            disabled={!isEditable}
                            className={col.kind === 'counter' ? 'text-destructive font-semibold' : undefined}
                          />
                        </td>
                      );
                    })}
                    {/* Observation: optional dropdown annotation. Empty value = no
                        selection (cleared via the "(aucune)" item which maps to
                        the sentinel "__none__" since shadcn Select disallows "").
                        When no observation is set, the trigger renders empty —
                        the inline X button on the right handles clearing once
                        a value is picked. */}
                    <td>
                      <div className="flex items-center gap-0.5">
                        <Select
                          value={r.observation ?? '__none__'}
                          onValueChange={(v) => {
                            if (v === '__none__') {
                              updateRow(r.id, { observation: undefined });
                            } else {
                              updateRow(r.id, { observation: v as ObservationOption });
                            }
                          }}
                          disabled={!isEditable}
                        >
                          <SelectTrigger className="h-8 w-full px-1.5 text-xs border-transparent bg-transparent focus:border-primary/50 focus:bg-background rounded">
                            <SelectValue placeholder="">
                              {r.observation ? OBSERVATION_LABELS[r.observation] : ''}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs text-muted-foreground">(aucune)</SelectItem>
                            {OBSERVATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">{OBSERVATION_LABELS[opt]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {r.observation && isEditable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                            title="Effacer"
                            onClick={(e) => { e.stopPropagation(); updateRow(r.id, { observation: undefined }); }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td>
                      {canEdit && (
                        <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Supprimer" onClick={() => deleteRow(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/*
                Inline totals row — task #5 part B. Sticks to the bottom of the
                scroll container. Bold + separator border + muted background.
                Per-column: Vétusté/Type/REF/Désignation/T.V.A blank;
                Quantité = Σ; P.U.H.T = mean; Total H.T = Σ of row totals.
              */}
              <tr
                className={cn(
                  'sticky bottom-0 z-10 bg-muted/80 backdrop-blur-sm font-bold',
                  'border-t-2 border-foreground/20',
                  '[&>td]:px-1.5 [&>td]:py-2 [&>td]:border-t-2 [&>td]:border-foreground/20 [&>td]:bg-muted/80',
                  '[&>td]:border-r [&>td:last-child]:border-r-0',
                )}
              >
                <td className="text-muted-foreground">Total</td>
                <td />
                <td />
                <td className="text-center">{formatFr(totalsRow.qteSum, 0)}</td>
                <td />
                <td className="text-right">{formatFr(totalsRow.totalHt)}</td>
                <td />
                <td className="text-center text-muted-foreground">—</td>
                <td className="text-right">{totalTTCExpert == null ? '—' : formatFr(totalTTCExpert)}</td>
                {extraColumns.map((col) => {
                  const isCounter = col.kind === 'counter';
                  const isAccord = col.kind === 'accord' || col.kind === 'proposition-accord';
                  if (isAccord) {
                    // Task #21: accord footer — PU cell empty, Total H.T Accord
                    // and Prix TTC Accord show column sums.
                    let totalHTAccordSum = 0;
                    let prixTTCAccordSum = 0;
                    for (const r of rows) {
                      const pu = parseFr(col.values[r.id] || '');
                      const qte = typeof r.qte === 'number' && Number.isFinite(r.qte) ? r.qte : 0;
                      const vetuste = typeof r.vetuste === 'number' && Number.isFinite(r.vetuste) ? r.vetuste : 0;
                      const tva = typeof r.tva === 'number' && Number.isFinite(r.tva) ? r.tva : 0;
                      const tHt = computeAccordTotalHT(pu, qte, vetuste);
                      totalHTAccordSum += tHt;
                      prixTTCAccordSum += computeAccordPrixTTC(tHt, tva);
                    }
                    return (
                      <React.Fragment key={col.id}>
                        <td />
                        <td className="text-right">{formatFr(totalHTAccordSum)}</td>
                        <td className="text-right">{formatFr(prixTTCAccordSum)}</td>
                      </React.Fragment>
                    );
                  }
                  // Σ for imported/extra columns, SR-tolerant.
                  const colSum = rows.reduce((acc, r) => acc + parseFr(col.values[r.id] || ''), 0);
                  return (
                    <td key={col.id} className={cn('text-right', isCounter && 'text-destructive')}>
                      {formatFr(colSum)}
                    </td>
                  );
                })}
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        {/*
          Single-row summary below the table: Total H.T (under HT col) and
          Total TTC Expert (under Prix en TTC col). Task #16 collapsed the
          previous two-row TVA + TTC footer into this single row.
        */}
        <div className="flex items-center p-2 border-t bg-muted/20 text-xs">
          <div className="flex-1" />
          <div className="flex items-center gap-6">
            <span className="font-bold">Total H.T</span>
            <span className="w-28 text-right font-bold">{formatFr(totals.ht)}</span>
            <span className="font-bold">Total TTC Expert</span>
            <span className="w-28 text-right font-bold">{totalTTCExpert == null ? '—' : formatFr(totalTTCExpert)}</span>
          </div>
        </div>
      </div>


        </div>
      </div>

      {/*
        Task #23 — save-flow preview. Opened by the Enregistrer button (and
        Ctrl+S). The dialog renders the PDF with optional stamp, and its
        `Confirmer & enregistrer` action feeds the resulting blob + stampId
        into `performPersist` which runs the upload + Firestore writes.
      */}
      {previewSnapshot && (
        <DevisPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          snapshot={previewSnapshot}
          docType={toBaseEditableDocType(docType)}
          accordKind={previewAccordKind}
          ordinal={previewOrdinal}
          onConfirm={async ({ blob, stampId }) => {
            setPreviewOpen(false);
            await performPersist(blob, stampId);
          }}
          onEdit={() => {
            // Close the dialog; editor state is preserved so the user can
            // keep editing and re-open the preview.
          }}
        />
      )}

      {/*
        Task #33 (revised) — post-scan warning dialog. Informational only:
        it auto-opens after a successful `runExtraction` and lists the
        per-line calculation mismatches. The dialog has no confirm button —
        dismissing it leaves `scanReviewed=false`, so the table remains
        locked. The chiffreur acknowledges the review by clicking the
        toolbar `J'ai vérifié` button next to `Comparer`.
      */}
      <ScanWarningDialog
        open={scanWarningOpen}
        onOpenChange={setScanWarningOpen}
        calculationErrors={scanCalculationErrors}
      />

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
  value, onChange, disabled, className,
}: { value: string; onChange: (v: string) => void; disabled?: boolean; className?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full h-7 px-1.5 text-xs bg-transparent outline-none rounded border border-transparent",
        "focus:border-primary/50 focus:bg-background disabled:cursor-not-allowed",
        className,
      )}
    />
  );
}

// Accord PU cell. When `error` is true, the cell renders a destructive border
// and a hover-title hint. On blur, `onBlurValidate` runs — the parent uses it to
// clear over-cap values (and toast the user).
function AccordPUInput({
  value, onChange, onBlurValidate, disabled, error,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlurValidate?: () => void;
  disabled?: boolean;
  error?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlurValidate}
      disabled={disabled}
      inputMode="decimal"
      title={error ? 'La valeur ne peut pas dépasser le P.U.H.T.' : undefined}
      className={cn(
        "w-full h-7 px-1.5 text-xs bg-transparent outline-none rounded border text-right",
        "focus:bg-background disabled:cursor-not-allowed",
        error
          ? "border-destructive focus:border-destructive"
          : "border-transparent focus:border-primary/50",
      )}
    />
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
