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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Trash2, Plus, Check, X, Loader2 } from 'lucide-react';
import { useOptions } from '@/hooks/use-options';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';

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
  const { isAdmin } = useCurrentUser();
  const { options, addOption, updateOption, deleteOption, loading } = useOptions(collectionName, defaultValues);
  const { toast } = useToast();

  // Only admins can manage options
  if (!isAdmin) return null;
  
  const [newOption, setNewOption] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const handleDelete = async (id: string, label: string) => {
    if (confirm(`Supprimer "${label}" ? Cette action est irréversible.`)) {
      setIsDeleting(id);
      try {
        // Direct call to the hook's delete function which targets the Firestore ID
        await deleteOption(id);
        toast({ title: "Option supprimée" });
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Erreur lors de la suppression" });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100 text-blue-600 dark:text-blue-400">
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
            <Button type="button" size="icon" onClick={handleAdd} disabled={isAdding || !newOption.trim()}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : options.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Aucune option.</p>
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
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdate(opt.id)}>
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
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400"
                          onClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          type="button"
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={isDeleting === opt.id}
                          onClick={() => handleDelete(opt.id, opt.label)}
                        >
                          {isDeleting === opt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        <DialogFooter>
          <p className="text-[10px] text-muted-foreground italic">Les modifications sont appliquées instantanément partout dans l'application.</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
