'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions } from '@/hooks/use-options';
import { createEmptyDossier, type ExpertRole } from '@/lib/create-empty-dossier';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { compagnies as defaultCompagnies } from '@/lib/dossiers-data';

// Sentinel used by the select component — Radix Select disallows empty-string
// values on <SelectItem>, so we translate this back to '' when submitting.
const NONE_VALUE = '__none__';

interface CreateDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
  /** Optional compagnie to pre-fill the dialog (e.g. when opened from compagnie detail). */
  initialCompagnie?: string;
}

export function CreateDossierDialog({
  open,
  onOpenChange,
  onCreated,
  initialCompagnie,
}: CreateDossierDialogProps) {
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const { profile } = useCurrentUser();

  const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);

  const [compagnie, setCompagnie] = useState<string>(initialCompagnie || NONE_VALUE);
  const [expertRole, setExpertRole] = useState<ExpertRole>('1er');
  const [isCreating, setIsCreating] = useState(false);

  React.useEffect(() => {
    if (open && initialCompagnie) {
      setCompagnie(initialCompagnie);
    }
  }, [open, initialCompagnie]);

  const resetForm = () => {
    setCompagnie(initialCompagnie || NONE_VALUE);
    setExpertRole('1er');
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
        compagnie: compagnie === NONE_VALUE ? '' : compagnie,
        expertRole,
        expertName: userName,
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
        `Dossier créé comme ${ROLE_LABELS[expertRole]}`,
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
            Choisissez la compagnie et votre rôle d'expert sur ce dossier.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
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
            <Label>Rôle</Label>
            <RadioGroup
              value={expertRole}
              onValueChange={(v) => setExpertRole(v as ExpertRole)}
              disabled={isCreating}
              className="grid gap-2"
            >
              {(['1er', '2eme', 'arbitre'] as ExpertRole[]).map((role) => (
                <label
                  key={role}
                  htmlFor={`role-${role}`}
                  className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/40"
                >
                  <RadioGroupItem value={role} id={`role-${role}`} />
                  <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </RadioGroup>
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
          <Button onClick={handleConfirm} loading={isCreating}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ROLE_LABELS: Record<ExpertRole, string> = {
  '1er': '1er expert',
  '2eme': '2ème expert',
  arbitre: 'Arbitre',
};

export default CreateDossierDialog;
