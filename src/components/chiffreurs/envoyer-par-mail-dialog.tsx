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
import { buildAccordEmailTemplate } from '@/lib/chiffrage-email';
import { useT } from '@/i18n';
import { INPUT_EMAIL } from '@/lib/input-attrs';

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
  const t = useT();
  const [documentId, setDocumentId] = useState<string>('');
  const [recipient, setRecipient] = useState<string>(defaultRecipient ?? '');
  const template = buildAccordEmailTemplate(dossierNumero);
  const subject = template.subject;
  const [body, setBody] = useState(template.body);
  const [sending, setSending] = useState(false);

  // Reset when `open` flips to true (in case the dialog is re-opened).
  useEffect(() => {
    if (open) {
      setDocumentId(documents[0]?.id ?? '');
      setRecipient(defaultRecipient ?? '');
      setBody(buildAccordEmailTemplate(dossierNumero).body);
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
      <DialogContent
        // A picker, two fields and a textarea -> full screen on a phone (D 2).
        fullScreen
        primary={{ label: sending ? t('Envoi...') : t('Envoyer'), onClick: handleSend, disabled: !canSend, loading: sending }}
        dirty={recipient.trim().length > 0}
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>{t('Envoyer par mail')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('Document')}</label>
            <Select value={documentId} onValueChange={setDocumentId}>
              <SelectTrigger aria-label={t('Document')}>
                <SelectValue placeholder={t('Choisir un document')} />
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
                {t('Aucun accord disponible pour ce dossier.')}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('Destinataire')}</label>
            <Input
              {...INPUT_EMAIL}
              aria-label={t('Destinataire')}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={t('nom@compagnie.com')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('Objet')}</label>
            <Input value={subject} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('Message')}</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-label={t('Message')}
              minRows={4}
              maxRows={10}
              autoCapitalize="sentences"
              className="md:min-h-[10rem]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            className="max-md:hidden"
          >
            {t('Annuler')}
          </Button>
          <Button onClick={handleSend} disabled={!canSend} className="max-md:h-12 max-md:text-[15px] max-md:font-semibold">
            {sending ? t('Envoi...') : t('Envoyer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
