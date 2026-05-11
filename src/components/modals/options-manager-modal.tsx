'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Trash2, Plus, Check, X, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineLoader } from '@/components/ui/inline-loader';
import { useOptions } from '@/hooks/use-options';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFirestore } from '@/firebase';
import { reconcileCanonicalStatuts } from '@/lib/seed-options';

interface OptionsManagerModalProps {
  collectionName: string;
  title: string;
  defaultValues?: string[];
  trigger?: React.ReactNode;
}

export function OptionsManagerModal({
  collectionName,
  title,
  defaultValues = [],
  trigger
}: OptionsManagerModalProps) {
  const { isAdmin, canDelete } = useCurrentUser();
  const { options, addOption, updateOption, deleteOption, loading } = useOptions(collectionName, defaultValues);
  const { toast } = useToast();
  const db = useFirestore();

  // Only admins can manage options
  if (!isAdmin) return null;

  const [newOption, setNewOption] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const handleAdd = async () => {
    if (!newOption.trim()) return;
    setIsAdding(true);
    try {
      await addOption(newOption);
      setNewOption('');
      toast({ title: "Option ajoutée" });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Erreur lors de l'ajout" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editLabel.trim()) return;
    try {
      await updateOption(id, editLabel);
      setEditingId(null);
      toast({ title: "Option mise à jour" });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erreur lors de la modification" });
    }
  };

  const handleSyncCanonical = async () => {
    if (!db) return;
    setIsSyncing(true);
    try {
      const added = await reconcileCanonicalStatuts(db);
      if (added > 0) {
        toast({ title: `${added} statut${added > 1 ? 's' : ''} canonique${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''}` });
      } else {
        toast({ title: 'Rien à synchroniser', description: 'Tous les statuts canoniques sont déjà présents.' });
      }
    } catch (e: any) {
      console.error('[sync canonical statuts]', e);
      toast({ variant: 'destructive', title: 'Erreur de synchronisation', description: e?.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteOption(id);
      toast({ title: "Option supprimée" });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Erreur lors de la suppression" });
    } finally {
      setIsDeleting(null);
      setDeleteTarget(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onPointerDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Gérer : {title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nouvelle option..."
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button type="button" size="icon" onClick={handleAdd} loading={isAdding} disabled={!newOption.trim()}>
              {isAdding ? null : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="flex justify-center py-4"><InlineLoader label="Chargement des options…" /></div>
            ) : options.length === 0 ? (
              <EmptyState
                icon={<Settings />}
                title="Aucune option"
                description="Ajoutez votre première option avec le champ ci-dessus."
                dashed={false}
                className="border-0 bg-transparent py-6"
              />
            ) : (
              options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2 group p-1 rounded-md hover:bg-muted/50">
                  {editingId === opt.id ? (
                    <>
                      <Input
                        className="h-8 text-sm"
                        value={editLabel}
                        autoFocus
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(opt.id)}
                      />
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleUpdate(opt.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium px-2">{opt.label}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            loading={isDeleting === opt.id}
                            onClick={() => setDeleteTarget({ id: opt.id, label: opt.label })}
                          >
                            {isDeleting === opt.id ? null : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-[10px] text-muted-foreground italic flex-1">Les modifications sont appliquées instantanément partout dans l&apos;application.</p>
          {collectionName === 'options_statuts' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              onClick={handleSyncCanonical}
              loading={isSyncing}
            >
              {isSyncing ? null : <RefreshCw className="h-3.5 w-3.5" />}
              Synchroniser les statuts canoniques
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteTarget?.label} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les enregistrements qui utilisent cette valeur conserveront l&apos;ancien texte, mais elle ne sera plus proposée dans les listes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDelete(deleteTarget.id);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
