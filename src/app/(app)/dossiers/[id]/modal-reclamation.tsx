'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useAuth } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type ModalReclamationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
};

export default function ModalReclamation({ open, onOpenChange, dossierId }: ModalReclamationProps) {
  const [reclamationText, setReclamationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setReclamationText('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reclamationText.trim() || !db || !dossierId) return;
    
    setIsSubmitting(true);
    try {
      // We log this into the history subcollection so it shows up in the timeline
      await addDoc(collection(db, 'dossiers', dossierId, 'historique'), {
        action: 'Réclamation soumise',
        details: reclamationText,
        user: auth?.currentUser?.email || auth?.currentUser?.displayName || 'Admin',
        date: serverTimestamp(),
        type: 'reclamation'
      });

      toast({ title: "Réclamation soumise" });
      onOpenChange(false);
    } catch (e: any) {
      console.error('Error submitting reclamation:', e);
      toast({ 
        variant: 'destructive', 
        title: "Erreur lors de la soumission",
        description: e.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Soumettre une Réclamation</DialogTitle>
          <DialogDescription>
            Elle sera ajoutée à l'historique du dossier.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Textarea 
              placeholder="Sujet de la réclamation..." 
              value={reclamationText}
              onChange={(e) => setReclamationText(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={isSubmitting || !reclamationText.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Soumettre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
