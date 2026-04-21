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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  type ReformeData,
  computeDifference,
  computeTotalIndemnisation,
  emptyReforme,
} from '@/lib/reforme-schema';

export interface ReformeDialogProps {
  dossierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REFORME_TYPES = ['technique'] as const;

export function ReformeDialog({ dossierId, open, onOpenChange }: ReformeDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const { profile } = useCurrentUser();

  const [state, setState] = useState<ReformeData>(emptyReforme());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !db || !dossierId) return;
    setLoading(true);
    getDoc(doc(db, 'dossiers', dossierId))
      .then((snap) => {
        const data = snap.data() as any;
        if (data?.reforme) {
          setState({ ...emptyReforme(), ...(data.reforme as ReformeData) });
        } else {
          setState(emptyReforme());
        }
      })
      .catch(() => setState(emptyReforme()))
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
      const finalData: ReformeData = {
        ...state,
        difference,
        totalIndemnisation,
        updatedBy: profile?.uid || '',
      };
      await updateDoc(doc(db, 'dossiers', dossierId), {
        reforme: { ...finalData, updatedAt: serverTimestamp() },
        updatedAt: serverTimestamp(),
      });
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réforme</DialogTitle>
          <DialogDescription>
            Renseignez les valeurs de réforme du véhicule. Les montants dérivés sont calculés automatiquement.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-3">
            {/* Left column */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="typeReforme">Type Réforme</Label>
                <Select
                  value={state.typeReforme || 'technique'}
                  onValueChange={(v) => set('typeReforme', v)}
                >
                  <SelectTrigger id="typeReforme"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {REFORME_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <NumberField id="valeurVenale" label="Valeur vénale" value={state.valeurVenale} onChange={(v) => set('valeurVenale', v)} parse={num} />
              <NumberField id="valeurEpave" label="Valeur épave" value={state.valeurEpave} onChange={(v) => set('valeurEpave', v)} parse={num} />
              <NumberField id="valeurAchat" label="Valeur D'achat" value={state.valeurAchat} onChange={(v) => set('valeurAchat', v)} parse={num} />
              <NumberField id="valeurCommerciale" label="Valeur commerciale" value={state.valeurCommerciale} onChange={(v) => set('valeurCommerciale', v)} parse={num} />

              <div className="space-y-1.5">
                <Label htmlFor="difference">La différence des valeurs</Label>
                <Input id="difference" disabled value={difference} className="bg-muted" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="methodeCalcul">La methode de calcul</Label>
                <Input id="methodeCalcul" value={state.methodeCalcul} onChange={(e) => set('methodeCalcul', e.target.value)} />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/30">
                <Label htmlFor="avecTva" className="cursor-pointer">Avec TVA</Label>
                <Switch id="avecTva" checked={state.avecTva} onCheckedChange={(v) => set('avecTva', v)} />
              </div>

              <NumberField id="valeurVenaleRight" label="Valeur Vénale" value={state.valeurVenale} onChange={(v) => set('valeurVenale', v)} parse={num} />
              <NumberField id="montantAccord" label="Montant Accord" value={state.montantAccord} onChange={(v) => set('montantAccord', v)} parse={num} />
              <NumberField id="vetuste" label="Vétusté" value={state.vetuste} onChange={(v) => set('vetuste', v)} parse={num} />
              <NumberField id="franchise" label="Franchise" value={state.franchise} onChange={(v) => set('franchise', v)} parse={num} />
              <NumberField id="montantDeplacement" label="Montant Déplacement" value={state.montantDeplacement} onChange={(v) => set('montantDeplacement', v)} parse={num} />
              <NumberField id="montantHonoraires" label="Montant Honoraires" value={state.montantHonoraires} onChange={(v) => set('montantHonoraires', v)} parse={num} />

              <div className="space-y-1.5">
                <Label htmlFor="totalIndemnisation">Total D'indemnisation</Label>
                <Input id="totalIndemnisation" disabled value={totalIndemnisation} className="bg-muted font-semibold" />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Déposer Le Dossier
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
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parse(e.target.value))}
      />
    </div>
  );
}
