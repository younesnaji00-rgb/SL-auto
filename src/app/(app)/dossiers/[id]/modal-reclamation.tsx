'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useFirestore, useAuth, useCollection } from '@/firebase';
import { addDoc, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { logWorkflow } from './log-historique';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ModalReclamationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
};

const STATUS_STYLES: Record<string, string> = {
  'Ouverte': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'En cours': 'bg-blue-100 text-blue-800 border-blue-300',
  'Traitée': 'bg-green-100 text-green-800 border-green-300',
  'Fermée': 'bg-gray-100 text-gray-800 border-gray-300',
};

const DESCRIPTION_TRUNCATE_LENGTH = 150;

function ReclamationRow({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);
  const description: string = item.description || '';
  const isTruncated = description.length > DESCRIPTION_TRUNCATE_LENGTH;

  let formattedDate = '';
  try {
    const date = item.createdAt?.toDate?.() ?? new Date(item.createdAt);
    formattedDate = format(date, "d MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    formattedDate = item.date || '—';
  }

  const statusClass = STATUS_STYLES[item.statut] || STATUS_STYLES['Fermée'];

  return (
    <div className="rounded-md border p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium truncate">{item.createdBy || 'Inconnu'}</span>
        </div>
        <Badge variant="outline" className={`shrink-0 text-xs ${statusClass}`}>
          {item.statut}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        <span>{formattedDate}</span>
      </div>

      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
        {isTruncated && !expanded
          ? description.slice(0, DESCRIPTION_TRUNCATE_LENGTH) + '…'
          : description}
      </p>

      {isTruncated && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Réduire
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Voir plus
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function ModalReclamation({ open, onOpenChange, dossierId }: ModalReclamationProps) {
  const [reclamationText, setReclamationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const reclamationsQuery = useMemo(
    () => db ? query(collection(db, 'dossiers', dossierId, 'reclamations'), orderBy('createdAt', 'desc')) : null,
    [db, dossierId]
  );

  const { data: reclamations, loading: reclamationsLoading } = useCollection(reclamationsQuery);

  useEffect(() => {
    if (open) {
      setReclamationText('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reclamationText.trim() || !db || !dossierId) return;

    const userEmail = auth?.currentUser?.email || auth?.currentUser?.displayName || 'Admin';
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'dossiers', dossierId, 'reclamations'), {
        date: new Date().toISOString().split('T')[0],
        objet: reclamationText.trim().substring(0, 100),
        description: reclamationText.trim(),
        statut: 'Ouverte',
        reponse: '',
        createdAt: serverTimestamp(),
        createdBy: userEmail,
      });

      await addDoc(collection(db, 'dossiers', dossierId, 'historique'), {
        action: 'Réclamation soumise',
        details: reclamationText,
        user: userEmail,
        date: serverTimestamp(),
        type: 'reclamation'
      });

      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Réclamation ajoutée', userEmail, userId, 'done', { details: reclamationText.trim().substring(0, 100) });

      toast({ title: "Réclamation soumise" });
      setReclamationText('');
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Soumettre une Réclamation</DialogTitle>
          <DialogDescription>
            Elle sera ajoutée à l&apos;historique du dossier.
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

        <Separator className="my-2" />

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Historique des réclamations</h4>

          {reclamationsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : !reclamations || reclamations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucune réclamation pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {reclamations.map((item: any) => (
                <ReclamationRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
