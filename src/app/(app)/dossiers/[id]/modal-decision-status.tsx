'use client';

import React, { useState, useMemo } from 'react';
import { Loader2, Info, Clock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore, useAuth, useUser } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { useOptions } from '@/hooks/use-options';
import { statuses as defaultStatuses } from '@/lib/dossiers-data';
import { logHistorique, logWorkflow } from './log-historique';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, getStatusDotColor, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { Badge } from '@/components/ui/badge';

interface ModalDecisionStatusProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  currentStatus: string;
  dossierRef: string;
  /** Current observation saved on the dossier */
  currentObservation?: string;
  currentObservationUpdatedAt?: any;
  currentObservationUpdatedBy?: string;
  /** Insured person's email (from dossier.assure.email) */
  assureEmail?: string;
  /** Insured person's name (from dossier.assure.nom) */
  assureNom?: string;
}

export default function ModalDecisionStatus({
  open,
  onOpenChange,
  dossierId,
  currentStatus,
  dossierRef,
  currentObservation,
  currentObservationUpdatedAt,
  currentObservationUpdatedBy,
  assureEmail = '',
  assureNom = '',
}: ModalDecisionStatusProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const { profile } = useCurrentUser();

  const { options: dbStatuses } = useOptions('options_statuts', defaultStatuses);
  const statusOptions = useMemo(
    () =>
      dbStatuses.length > 0
        ? dbStatuses.map((s) => s.label)
        : defaultStatuses,
    [dbStatuses]
  );

  const [selectedStatus, setSelectedStatus] = useState('');
  const [observation, setObservation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [email, setEmail] = useState(assureEmail);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedStatus('');
      setObservation('');
      setSendEmail(true);
      setEmail(assureEmail);
    }
  }, [open, assureEmail]);

  const handleConfirm = async () => {
    if (!selectedStatus) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un statut.' });
      return;
    }
    if (!db) return;

    setIsSaving(true);
    const userEmail = currentUser?.email || auth?.currentUser?.email || 'Admin';
    const userId = currentUser?.uid || auth?.currentUser?.uid || 'system';
    const userName = profile?.nom || userEmail;

    try {
      // Update dossier status + observation
      const dossierDocRef = doc(db, 'dossiers', dossierId);
      const updatePayload: Record<string, any> = { statut: selectedStatus };

      if (observation.trim()) {
        updatePayload.observationDecision = observation.trim();
        updatePayload.observationDecisionUpdatedAt = serverTimestamp();
        updatePayload.observationDecisionUpdatedBy = userName;
      }

      await updateDoc(dossierDocRef, updatePayload);

      // Log historique
      await logHistorique(
        db,
        dossierId,
        selectedStatus,
        userEmail,
        observation || `Statut changé de "${currentStatus}" à "${selectedStatus}".`,
        'statut'
      );

      // Log workflow
      await logWorkflow(db, dossierId, `Décision : ${selectedStatus}`, userEmail, userId, 'done', {
        dossierRef,
        details: observation || `Statut changé en "${selectedStatus}"`,
      });

      // Open Gmail compose with pre-filled email if enabled
      if (sendEmail && email.trim()) {
        const subject = `Mise à jour de votre dossier ${dossierRef} — ${selectedStatus}`;
        const body = [
          `Bonjour ${assureNom || 'Madame, Monsieur'},`,
          '',
          `Nous vous informons que le statut de votre dossier ${dossierRef} a été mis à jour.`,
          '',
          `Ancien statut : ${currentStatus}`,
          `Nouveau statut : ${selectedStatus}`,
          observation ? `\nObservation : ${observation}` : '',
          '',
          'Cordialement,',
          'Service Expertise — SL Auto',
        ].filter(Boolean).join('\n');

        const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank');
      }

      toast({ title: 'Statut mis à jour', description: `Le statut a été changé en "${selectedStatus}".` });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Decision status error:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: error.message || 'Erreur lors du changement de statut.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Décision de statut</DialogTitle>
          <DialogDescription>
            Changer le statut du dossier et ajouter une observation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Previous observation */}
          {currentObservation && (
            <div className={cn("space-y-1 p-3 rounded-lg border border-dashed", currentObservationUpdatedAt ? "bg-amber-50/50 border-amber-300 dark:bg-amber-900/10" : "bg-muted/30")}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Info className="h-3 w-3" /> Observation précédente
              </p>
              <p className="text-sm italic text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {currentObservation}
              </p>
              {currentObservationUpdatedAt && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  Par {currentObservationUpdatedBy || 'N/A'} le {currentObservationUpdatedAt?.toDate ? format(currentObservationUpdatedAt.toDate(), "dd/MM/yyyy 'à' HH:mm", { locale: fr }) : '-'}
                </Badge>
              )}
            </div>
          )}

          {/* Status selector */}
          <div className="space-y-2">
            <Label>Nouveau statut <span className="text-red-500">*</span></Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un statut" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDotColor(s))} />
                      {s}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentStatus && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Statut actuel :
                <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(currentStatus))}>
                  {currentStatus}
                </Badge>
              </div>
            )}
          </div>

          {/* Observation */}
          <div className="space-y-2">
            <Label>Observation</Label>
            <Textarea
              placeholder="Ajouter une observation ou un commentaire..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Email notification */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <Label className="font-medium">Notification par email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(v) => setSendEmail(v === true)}
                />
                <Label htmlFor="sendEmail" className="text-sm cursor-pointer">Envoyer</Label>
              </div>
            </div>
            {sendEmail && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email de l&apos;assuré</Label>
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving || !selectedStatus} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>
            ) : (
              'Confirmer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
