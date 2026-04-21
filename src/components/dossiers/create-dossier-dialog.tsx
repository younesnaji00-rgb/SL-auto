'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions } from '@/hooks/use-options';
import { createEmptyDossier } from '@/lib/create-empty-dossier';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import {
  compagnies as defaultCompagnies,
  natures as defaultNatures,
} from '@/lib/dossiers-data';

// Sentinel used by the select components — Radix Select disallows empty-string
// values on <SelectItem>, so we translate this back to '' when submitting.
const NONE_VALUE = '__none__';

interface CreateDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

export function CreateDossierDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateDossierDialogProps) {
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const { profile } = useCurrentUser();

  const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);
  const { options: dbNatures } = useOptions('options_natures', defaultNatures);

  const [refExpert, setRefExpert] = useState('');
  const [compagnie, setCompagnie] = useState<string>(NONE_VALUE);
  const [nature, setNature] = useState<string>(NONE_VALUE);
  const [assureNom, setAssureNom] = useState('');
  const [matricule, setMatricule] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setRefExpert('');
    setCompagnie(NONE_VALUE);
    setNature(NONE_VALUE);
    setAssureNom('');
    setMatricule('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isCreating) return;
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleCancel = () => {
    if (isCreating) return;
    resetForm();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    const fbUser = auth?.currentUser;
    if (!fbUser || !db) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Utilisateur non connecté.',
      });
      return;
    }
    try {
      setIsCreating(true);
      const userName = profile
        ? `${profile.prenom} ${profile.nom}`.trim() ||
          profile.email ||
          fbUser.email ||
          'Utilisateur'
        : fbUser.displayName || fbUser.email || 'Utilisateur';

      const seed = {
        refExpert: refExpert.trim(),
        compagnie: compagnie === NONE_VALUE ? '' : compagnie,
        nature: nature === NONE_VALUE ? '' : nature,
        assureNom: assureNom.trim(),
        matricule: matricule.trim(),
      };

      const id = await createEmptyDossier({
        db,
        user: {
          uid: fbUser.uid,
          displayName: fbUser.displayName,
          email: fbUser.email,
        },
        seed,
      });
      await logHistorique(
        db,
        id,
        'Création de dossier',
        userName,
        'Dossier créé depuis la liste',
        'statut'
      );
      resetForm();
      onOpenChange(false);
      onCreated?.(id);
    } catch (e: any) {
      console.error('Create dossier error:', e);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: e?.message || 'Impossible de créer le dossier',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
          <DialogDescription>
            Renseignez quelques informations pour pré-remplir le dossier. Tous
            les champs sont facultatifs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="create-ref-expert">Référence expert</Label>
            <Input
              id="create-ref-expert"
              value={refExpert}
              onChange={(e) => setRefExpert(e.target.value)}
              disabled={isCreating}
              placeholder="Ex: SL-2026-001"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-compagnie">Compagnie</Label>
            <Select
              value={compagnie}
              onValueChange={setCompagnie}
              disabled={isCreating}
            >
              <SelectTrigger id="create-compagnie">
                <SelectValue placeholder="Choisir une compagnie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>—</SelectItem>
                {dbCompagnies.map((c) => (
                  <SelectItem key={c.id} value={c.label}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-nature">Nature du dossier</Label>
            <Select
              value={nature}
              onValueChange={setNature}
              disabled={isCreating}
            >
              <SelectTrigger id="create-nature">
                <SelectValue placeholder="Choisir une nature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>—</SelectItem>
                {dbNatures.map((n) => (
                  <SelectItem key={n.id} value={n.label}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-assure-nom">Nom de l'assuré</Label>
            <Input
              id="create-assure-nom"
              value={assureNom}
              onChange={(e) => setAssureNom(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-matricule">Matricule véhicule</Label>
            <Input
              id="create-matricule"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              disabled={isCreating}
              placeholder="Ex: 12345-A-6"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateDossierDialog;
