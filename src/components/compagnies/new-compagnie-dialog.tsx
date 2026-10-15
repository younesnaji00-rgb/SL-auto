'use client';

/**
 * « Nouvelle compagnie » (owner request 2026-10-14) — Admin, the Directeurs and
 * the Responsable des gestionnaires add a compagnie from /compagnies. It lands
 * in the `compagnies` collection, the one list every compagnie picker reads
 * (dossier forms, account forms, filters), so it can be given to a
 * gestionnaire at once.
 *
 * One field: the name. A name already in the list — whatever its case, accents
 * or spacing — is refused, since « ALLIANZ » next to « Allianz » would split a
 * compagnie's dossiers between two scopes.
 */

import React, { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/i18n';
import { INPUT_TEXT } from '@/lib/input-attrs';
import { compagnieKey } from '@/lib/compagnie-name';

/** Card edge colours handed out in turn to new compagnies (per-company data). */
const PALETTE = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#64748b'];

export function NewCompagnieDialog({
  open,
  onOpenChange,
  existing,
  onCreate,
  onCreated,
  initialNom = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The compagnies already in the list: names for the duplicate check, colours to pick an unused one. */
  existing: { nom: string; couleur?: string }[];
  onCreate: (nom: string, couleur: string) => Promise<string | undefined>;
  /** The new entry, e.g. to choose at once who sees it. */
  onCreated?: (id: string, nom: string) => void;
  /** Name the field opens with — a compagnie found on dossiers (« Ajouter à la liste »). */
  initialNom?: string;
}) {
  const t = useT();
  const { toast } = useToast();
  const [nom, setNom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNom(initialNom);
  }, [open, initialNom]);

  const reset = () => {
    setNom('');
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCreate = async () => {
    const name = nom.replace(/\s+/g, ' ').trim();
    if (!name) {
      setError(t('Ce champ est requis.'));
      return;
    }
    if (!/\p{L}/u.test(name)) {
      setError(t('Le nom doit contenir des lettres.'));
      return;
    }
    const twin = existing.find((c) => compagnieKey(c.nom) === compagnieKey(name));
    if (twin) {
      setError(`${t('Cette compagnie existe déjà')} : « ${twin.nom} ».`);
      return;
    }
    const used = new Set(existing.map((c) => (c.couleur || '').toLowerCase()));
    const couleur = PALETTE.find((c) => !used.has(c)) ?? PALETTE[existing.length % PALETTE.length];
    setSaving(true);
    try {
      const id = await onCreate(name, couleur);
      toast({ title: t('Compagnie ajoutée'), description: name });
      handleOpenChange(false);
      if (id) onCreated?.(id, name);
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: String(e?.message ?? e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="lg:max-w-md" dirty={nom.trim() !== initialNom.trim()} onDiscard={reset}>
        <DialogHeader>
          <DialogTitle className="t-title">{t('Nouvelle compagnie')}</DialogTitle>
          <DialogDescription>
            {t('Elle apparaît aussitôt dans les listes de compagnies, dont celle des comptes utilisateurs.')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate();
          }}
        >
          <Label htmlFor="new-compagnie-nom">
            {t('Nom de la compagnie')} <span aria-hidden className="text-status-danger-fg">*</span>
          </Label>
          <Input
            {...INPUT_TEXT}
            id="new-compagnie-nom"
            autoFocus
            autoCapitalize="words"
            aria-required
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'new-compagnie-error' : undefined}
            className={error ? 'border-status-danger-fg ring-1 ring-status-danger-fg' : undefined}
            value={nom}
            onChange={(e) => {
              setNom(e.target.value);
              setError(null);
            }}
          />
          {error && (
            <p id="new-compagnie-error" role="alert" className="t-caption text-status-danger-fg">
              {error}
            </p>
          )}
        </form>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {t('Annuler')}
          </Button>
          <Button onClick={handleCreate} loading={saving}>
            {t('Ajouter')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
