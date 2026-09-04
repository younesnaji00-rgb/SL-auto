'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { useFirestore, useAuth } from '@/firebase';
import { useCurrentUser, canValidateRapport } from '@/hooks/use-current-user';
import { hasPermission, SUB_PERMISSIONS } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { useT } from '@/i18n';

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
  const t = useT();
  const db = useFirestore();
  const auth = useAuth();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!profile) return null;
  // Effective validation right = role gate, overridable by the per-user
  // `/dossiers#validation` permission (grant or deny on /utilisateurs/[uid]).
  const canValidate = hasPermission(
    profile,
    SUB_PERMISSIONS.DOSSIERS_VALIDATION,
    canValidateRapport(profile.role),
  );
  if (!canValidate) return null;

  const handleClick = async () => {
    if (alreadyValidated) {
      toast({ title: t('Déjà validé'), description: t('Ce dossier a déjà été validé.') });
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
        profile?.nom,
      );
      toast({
        title: t('Dossier validé'),
        description: t('Le rapport peut maintenant être généré.'),
      });
    } catch (e: any) {
      toast({
        title: t('Erreur'),
        description: e?.message ?? String(e),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Emphasis follows the job (blueprint §6): solid while the validation is
    // undone, tonal once done.
    <Button
      onClick={handleClick}
      disabled={submitting || alreadyValidated}
      loading={submitting}
      className={className}
      variant={alreadyValidated ? 'tonal' : 'default'}
      data-tour="dosd-rapport-valider"
    >
      {!submitting && <ShieldCheck />}
      {alreadyValidated ? t('Dossier validé') : t('Valider le dossier')}
    </Button>
  );
}

export default ValiderDossierButton;
