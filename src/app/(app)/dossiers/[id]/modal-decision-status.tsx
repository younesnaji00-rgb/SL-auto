'use client';

import React, { useState, useMemo } from 'react';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useOptions } from '@/hooks/use-options';
import { statuses as defaultStatuses } from '@/lib/dossiers-data';
import { logHistorique, logWorkflow } from './log-historique';

interface ModalDecisionStatusProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  currentStatus: string;
  assureEmail: string;
  assureNom: string;
  dossierRef: string;
}

export default function ModalDecisionStatus({
  open,
  onOpenChange,
  dossierId,
  currentStatus,
  assureEmail,
  assureNom,
  dossierRef,
}: ModalDecisionStatusProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { user: currentUser } = useUser();
  const { toast } = useToast();

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
  const [email, setEmail] = useState(assureEmail || '');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedStatus('');
      setObservation('');
      setEmail(assureEmail || '');
      setSendEmail(!!assureEmail);
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

    try {
      // Update dossier status
      const dossierDocRef = doc(db, 'dossiers', dossierId);
      await updateDoc(dossierDocRef, { statut: selectedStatus });

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

      // Send email notification if enabled and email provided
      if (sendEmail && email.trim()) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email.trim(),
              subject: `Mise à jour de votre dossier ${dossierRef} — ${selectedStatus}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">
                    Mise à jour de votre dossier
                  </h2>
                  <p>Bonjour <strong>${assureNom || 'Madame, Monsieur'}</strong>,</p>
                  <p>Nous vous informons que le statut de votre dossier <strong>${dossierRef}</strong> a été mis à jour :</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Ancien statut</td>
                      <td style="padding: 10px; border: 1px solid #e5e7eb;">${currentStatus || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Nouveau statut</td>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; color: #1e40af; font-weight: bold;">${selectedStatus}</td>
                    </tr>
                    ${observation ? `
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Observation</td>
                      <td style="padding: 10px; border: 1px solid #e5e7eb;">${observation}</td>
                    </tr>` : ''}
                  </table>
                  <p>Cordialement,<br/><strong>Service Expertise</strong></p>
                </div>
              `,
            }),
          });
          toast({ title: 'Statut mis à jour', description: `Notification envoyée à ${email}.` });
        } catch {
          toast({ title: 'Statut mis à jour', description: "Le statut a été changé mais l'email n'a pas pu être envoyé." });
        }
      } else {
        toast({ title: 'Statut mis à jour', description: `Le statut a été changé en "${selectedStatus}".` });
      }

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
            Changer le statut du dossier et notifier l&apos;assuré par email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status selector */}
          <div className="space-y-2">
            <Label>Nouveau statut <span className="text-red-500">*</span></Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un statut" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentStatus && (
              <p className="text-xs text-muted-foreground">
                Statut actuel : <span className="font-medium">{currentStatus}</span>
              </p>
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
          <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Notification par email
              </Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm text-muted-foreground">Envoyer</span>
              </label>
            </div>
            {sendEmail && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label className="text-xs text-muted-foreground">Email de l&apos;assuré</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1"
                  />
                  {assureEmail && email === assureEmail && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                </div>
                {!email.trim() && (
                  <p className="text-xs text-amber-600">
                    Aucun email renseigné. L&apos;email ne sera pas envoyé.
                  </p>
                )}
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
