'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { useFirestore, useAuth } from '@/firebase';
import { useCurrentUser, canValidateRapport } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';

export interface ValiderDossierButtonProps {
  dossierId: string;
  alreadyValidated: boolean;
  className?: string;
}

export function ValiderDossierButton({
  dossierId,
  alreadyValidated,
  className,
}: ValiderDossierButtonProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!profile || !canValidateRapport(profile.role)) return null;

  const handleClick = async () => {
    if (alreadyValidated) {
      toast({ title: 'Déjà validé', description: 'Ce dossier a déjà été validé.' });
      return;
    }
    if (!db) return;
    setSubmitting(true);
    try {
      const uid = auth?.currentUser?.uid ?? '';
      const userEmail = auth?.currentUser?.email || profile.email || 'Admin';
      await updateDoc(doc(db, 'dossiers', dossierId), {
        directorValidated: {
          by: uid,
          at: serverTimestamp(),
          role: profile.role,
        },
      });
      await logHistorique(
        db,
        dossierId,
        'Dossier validé',
        userEmail,
        `Validation par ${profile.role}`,
        'validation',
      );
      toast({
        title: 'Dossier validé',
        description: 'Le rapport peut maintenant être généré.',
      });
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e?.message ?? String(e),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={submitting || alreadyValidated}
      className={className}
      variant={alreadyValidated ? 'outline' : 'default'}
    >
      <ShieldCheck className="h-4 w-4 mr-2" />
      {alreadyValidated ? 'Dossier validé' : 'Valider le dossier'}
    </Button>
  );
}

export default ValiderDossierButton;
