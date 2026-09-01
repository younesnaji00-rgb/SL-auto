'use client';

import React, { useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  type ReformeData,
  computeDifference,
  computeTotalIndemnisation,
  emptyReforme,
} from '@/lib/reforme-schema';
import { generateReformeSummaryPDF } from '@/lib/generate-reforme-summary-pdf';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { logHistorique, logWorkflow } from '@/app/(app)/dossiers/[id]/log-historique';

export interface ReformeDialogProps {
  dossierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Task #37 — Expand réforme flavours. Labels are capitalized because they are
// rendered directly in the dropdown. The schema still accepts any string to
// stay backward-compatible with legacy lowercase 'technique' records.
export const REFORME_TYPES = ['Technique', 'Économique'] as const;

// Legacy lowercase 'technique' should map to the canonical 'Technique' label
// when rehydrating existing dossiers.
export function normalizeReformeType(raw: string | undefined): string {
  if (!raw) return '';
  const low = raw.toLowerCase();
  if (low === 'technique') return 'Technique';
  if (low === 'économique' || low === 'economique') return 'Économique';
  return raw;
}

export function ReformeDialog({ dossierId, open, onOpenChange }: ReformeDialogProps) {
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { profile } = useCurrentUser();

  const [state, setState] = useState<ReformeData>(emptyReforme());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Captured from the same getDoc that hydrates the réforme form so handleSave
  // can guard the status flip without an extra read.
  const [currentStatut, setCurrentStatut] = useState<string>('');

  useEffect(() => {
    if (!open || !db || !dossierId) return;
    setLoading(true);
    getDoc(doc(db, 'dossiers', dossierId))
      .then((snap) => {
        const data = snap.data() as any;
        setCurrentStatut(typeof data?.statut === 'string' ? data.statut : '');
        if (data?.reforme) {
          const hydrated = { ...emptyReforme(), ...(data.reforme as ReformeData) };
          hydrated.typeReforme = normalizeReformeType(hydrated.typeReforme);
          setState(hydrated);
        } else {
          setState(emptyReforme());
        }
      })
      .catch(() => {
        setCurrentStatut('');
        setState(emptyReforme());
      })
      .finally(() => setLoading(false));
  }, [open, db, dossierId]);

  const set = <K extends keyof ReformeData>(key: K, value: ReformeData[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const num = (v: string): number => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const difference = computeDifference(state);
  const totalIndemnisation = computeTotalIndemnisation(state);

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      const typeReforme = normalizeReformeType(state.typeReforme) || 'Technique';
      const finalData: ReformeData = {
        ...state,
        typeReforme,
        difference,
        totalIndemnisation,
        updatedBy: profile?.uid || '',
      };
      await updateDoc(doc(db, 'dossiers', dossierId), {
        reforme: { ...finalData, updatedAt: serverTimestamp() },
        updatedAt: serverTimestamp(),
      });

      // [reforme-verdict-trigger] When the chiffreur deposits a réforme, the
      // dossier's verdict is now "Réforme" — flip the dossier statut and log
      // the change. Guarded so re-saving an already-Réforme dossier does not
      // emit duplicate writes / log spam.
      if (currentStatut !== 'Réforme') {
        try {
          await updateDoc(doc(db, 'dossiers', dossierId), { statut: 'Réforme' });
          const authorName = profile
            ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || profile.email || 'Chiffreur'
            : 'Chiffreur';
          await logHistorique(
            db,
            dossierId,
            'Statut changé en Réforme',
            authorName,
            '',
            'statut',
            authorName,
          );
          await logWorkflow(
            db,
            dossierId,
            'Verdict Réforme déposé',
            authorName,
            profile?.uid || 'unknown',
            'done',
            undefined,
            authorName,
          );
          setCurrentStatut('Réforme');
        } catch (statutErr) {
          console.error('[reforme-dialog] statut flip failed', statutErr);
        }
      }

      // Task #37 — Generate the réforme rapport PDF and persist it as a typed
      // document in `dossiers/{id}/documents` so it surfaces in the grid and
      // documents filter alongside the rest of the dossier's paperwork.
      // Failures here must NOT roll back the save; the réforme data is the
      // load-bearing write. We log + toast a soft warning instead.
      if (storage) {
        try {
          const blob = await generateReformeSummaryPDF(db, dossierId, finalData, { returnBlob: true });
          if (blob && blob instanceof Blob) {
            const docLabel = typeReforme === 'Économique' ? 'Réforme économique' : 'Réforme technique';
            const ts = Date.now();
            const slug = typeReforme.toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
            const fileName = `reforme-${slug}.pdf`;
            const storagePath = `dossiers/${dossierId}/documents/${ts}_${fileName}`;
            await uploadFileWithOfflineSupport({
              storage,
              db,
              file: blob,
              fileName,
              storagePath,
              firestoreDocPath: `dossiers/${dossierId}/documents`,
              firestoreMetadata: {
                nom: fileName,
                type: docLabel,
                taille: blob.size,
                storagePath,
                uploadePar: profile?.email || 'Chiffreur',
                uploadedBy: profile?.uid || 'unknown',
                uploadedByName: profile
                  ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || profile.email
                  : 'Chiffreur',
              },
            });
          }
        } catch (pdfErr: any) {
          console.error('[reforme-dialog] PDF generation/upload failed', pdfErr);
          toast({
            variant: 'destructive',
            title: 'Réforme enregistrée — PDF indisponible',
            description: pdfErr?.message || 'Le rapport PDF n\'a pas pu être généré.',
          });
          onOpenChange(false);
          return;
        }
      }

      toast({ title: 'Réforme enregistrée' });
      onOpenChange(false);
    } catch (e: any) {
      console.error('[reforme-dialog] save failed', e);
      toast({ variant: 'destructive', title: 'Erreur', description: e?.message || '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Dialog — element-specs §13 (M3 dialogs: brief headline + one-line
          supporting text; the confirm is closest to the edge with the
          dismissive `outline` to its left; never more than two actions). */}
      <DialogContent hideCloseButton className="max-h-[calc(90vh/var(--app-zoom))] overflow-y-auto lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="t-title">Réforme</DialogTitle>
          <DialogDescription className="t-caption">
            Renseignez les valeurs de réforme du véhicule. Les montants dérivés sont calculés automatiquement.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
          </div>
        ) : (
          // Form — element-specs §9 (GOV.UK text input: visible label above,
          // sentence case; NN/g: labels quiet, rows 16 apart, 40 px fields).
          // Two short columns of related amounts (not a dense grid); derived
          // amounts are read-only values (§10 summary list), not disabled inputs.
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 py-2 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="typeReforme" className="t-label">Type de réforme</Label>
                <Select
                  value={state.typeReforme || 'Technique'}
                  onValueChange={(v) => set('typeReforme', v)}
                >
                  <SelectTrigger id="typeReforme" className="mt-1 h-10"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {REFORME_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <NumberField id="valeurVenale" label="Valeur vénale (avec TVA)" value={state.valeurVenale} onChange={(v) => set('valeurVenale', v)} parse={num} />
              <NumberField id="valeurEpave" label="Valeur épave" value={state.valeurEpave} onChange={(v) => set('valeurEpave', v)} parse={num} />
              <NumberField id="valeurAchat" label="Valeur d'achat" value={state.valeurAchat} onChange={(v) => set('valeurAchat', v)} parse={num} />
              <NumberField id="valeurCommerciale" label="Valeur commerciale" value={state.valeurCommerciale} onChange={(v) => set('valeurCommerciale', v)} parse={num} />

              <ComputedField label="Différence des valeurs" value={difference} />

              <div>
                <Label htmlFor="methodeCalcul" className="t-label">Méthode de calcul</Label>
                <Input id="methodeCalcul" className="mt-1" value={state.methodeCalcul} onChange={(e) => set('methodeCalcul', e.target.value)} />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <NumberField id="montantAccord" label="Montant accord" value={state.montantAccord} onChange={(v) => set('montantAccord', v)} parse={num} />
              <NumberField id="franchise" label="Franchise" value={state.franchise} onChange={(v) => set('franchise', v)} parse={num} />
              <NumberField id="montantDeplacement" label="Montant déplacement" value={state.montantDeplacement} onChange={(v) => set('montantDeplacement', v)} parse={num} />
              <NumberField id="montantHonoraires" label="Montant honoraires" value={state.montantHonoraires} onChange={(v) => set('montantHonoraires', v)} parse={num} />

              <ComputedField label="Total d'indemnisation" value={totalIndemnisation} emphasis />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={loading}>
            Déposer le dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({
  id, label, value, onChange, parse,
}: {
  id: string; label: string; value: number;
  onChange: (v: number) => void; parse: (s: string) => number;
}) {
  return (
    <div>
      <Label htmlFor={id} className="t-label">{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        className="mt-1 tabular-nums"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parse(e.target.value))}
      />
    </div>
  );
}

/**
 * Derived amount — element-specs §10 (GOV.UK summary list: a key over a
 * value; a read-only derived figure is TEXT, not a disabled input). The
 * emphasised total is a detail-tile figure (§6 / dataviz stat-tile contract:
 * Inter 600, 24 px, never Outfit on a number), tabular digits.
 */
function ComputedField({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className="border-t border-hairline pt-3">
      <p className="t-label">{label}</p>
      <p className={emphasis ? 'mt-1 text-2xl font-semibold tabular-nums text-ink' : 't-body mt-1 font-semibold tabular-nums'}>{value}</p>
    </div>
  );
}
