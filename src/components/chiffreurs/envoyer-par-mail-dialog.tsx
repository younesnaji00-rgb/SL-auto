'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Task #36 — Dialog for sending an accord document by email.
 *
 * Caller is expected to pre-filter `documents` to accord/proposition types
 * (via `parseAccordDocType != null`). The dialog is presentational — it does
 * not touch Firestore or the /api/send-email endpoint; the parent's `onSend`
 * callback is responsible for the POST + status transition.
 */
export interface EnvoyerParMailDialogDoc {
  id: string;
  type: string;
  name: string;
  url: string;
}

export interface EnvoyerParMailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: EnvoyerParMailDialogDoc[];
  defaultRecipient?: string;
  dossierNumero: string;
  onSend: (payload: {
    documentId: string;
    recipient: string;
    subject: string;
    body: string;
  }) => Promise<void>;
}

export function EnvoyerParMailDialog({
  open,
  onOpenChange,
  documents,
  defaultRecipient,
  dossierNumero,
  onSend,
}: EnvoyerParMailDialogProps) {
  const [documentId, setDocumentId] = useState<string>('');
  const [recipient, setRecipient] = useState<string>(defaultRecipient ?? '');
  const subject = `[SL-AUTO] Accord expertise - Dossier N° ${dossierNumero}`;
  const [body, setBody] = useState(
    `Madame, Monsieur,\n\nVeuillez trouver ci-joint l'accord d'expertise concernant le dossier N° ${dossierNumero}.\n\nCordialement,\n\nL'équipe SL Auto Expertise`,
  );
  const [sending, setSending] = useState(false);

  // Reset when `open` flips to true (in case the dialog is re-opened).
  useEffect(() => {
    if (open) {
      setDocumentId(documents[0]?.id ?? '');
      setRecipient(defaultRecipient ?? '');
      setBody(
        `Madame, Monsieur,\n\nVeuillez trouver ci-joint l'accord d'expertise concernant le dossier N° ${dossierNumero}.\n\nCordialement,\n\nL'équipe SL Auto Expertise`,
      );
      setSending(false);
    }
  }, [open, documents, defaultRecipient, dossierNumero]);

  const canSend = Boolean(documentId) && recipient.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend({ documentId, recipient: recipient.trim(), subject, body });
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Envoyer par mail</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Document</label>
            <Select value={documentId} onValueChange={setDocumentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un document" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.type} — {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {documents.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Aucun accord disponible pour ce dossier.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Destinataire</label>
            <Input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="nom@compagnie.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Objet</label>
            <Input value={subject} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
