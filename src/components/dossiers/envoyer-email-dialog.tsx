'use client';

/**
 * EnvoyerEmailDialog — UI for the "Envoyer un email" action on a dossier.
 * Sends via the server-side SMTP route (`/api/send-email`) using the single
 * configured `SMTP_USER` account. Recipients see all emails as coming from
 * that account; per-user Gmail drafts were considered and dropped (too much
 * OAuth setup for a small team).
 *
 * Source list is populated from `findLatestChiffrageDocs(db, dossierId)`,
 * one row per chiffrage source (Devis Garage, Devis Garage 2, …) with the
 * latest accord/proposition PDF for that source.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';

import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  findLatestChiffrageDocs,
  type LatestChiffrageDoc,
} from '@/lib/find-latest-chiffrage-docs';

interface EnvoyerEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  /** refExpert from the dossier — used in the default subject/body. */
  refExpert?: string;
}

export function EnvoyerEmailDialog({
  open,
  onOpenChange,
  dossierId,
  refExpert,
}: EnvoyerEmailDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();

  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sources, setSources] = useState<LatestChiffrageDoc[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refLabel = refExpert?.trim() || 'Sans Ref.';

  // Default body — set once when dialog opens.
  const defaultBody = useMemo(
    () =>
      `Bonjour, veuillez trouver ci-joint le dernier document du dossier ${refLabel}. Cordialement.`,
    [refLabel],
  );

  // Fetch sources on open.
  useEffect(() => {
    if (!open || !db || !dossierId) return;
    let cancelled = false;
    setLoading(true);
    findLatestChiffrageDocs(db, dossierId)
      .then((res) => {
        if (cancelled) return;
        setSources(res);
        // Default-select the first source so submit always has something.
        if (res.length > 0) setChecked(new Set([res[0].sourceId]));
        else setChecked(new Set());
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[EnvoyerEmailDialog] findLatestChiffrageDocs failed', err);
        setSources([]);
        setChecked(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, db, dossierId]);

  // Reset / seed inputs each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setRecipient('');
    setBody(defaultBody);
    // Subject is computed once sources resolve so we can splice the stage label.
  }, [open, defaultBody]);

  // Recompute the default subject when sources/checked change.
  useEffect(() => {
    if (!open) return;
    const firstChecked = sources.find((s) => checked.has(s.sourceId));
    const stage = firstChecked?.stage ?? '';
    const newSubject = stage
      ? `Dossier ${refLabel} — ${stage}`
      : `Dossier ${refLabel}`;
    setSubject(newSubject);
    // Intentionally re-derive even if user typed — slice 1 keeps it simple.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sources, checked, refLabel]);

  const toggle = (sourceId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  };

  const handleSubmit = async () => {
    const picked = sources.filter((s) => checked.has(s.sourceId));
    if (picked.length === 0) {
      toast({
        title: 'Sélectionnez au moins un document à joindre',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      to: recipient,
      subject,
      text: body,
      attachments: picked.map((s) => ({
        url: s.pdfUrl,
        filename: `${s.label}.pdf`,
      })),
    };

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse failure; handled below
      }

      if (res.ok && data?.success) {
        onOpenChange(false);
        toast({ title: 'Email envoyé' });
        return;
      }

      toast({
        title: data?.error || "Erreur lors de l'envoi de l'email",
        variant: 'destructive',
      });
    } catch (err) {
      console.error('[EnvoyerEmailDialog] submit failed', err);
      toast({
        title: "Erreur lors de l'envoi de l'email",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    recipient.trim().length > 0 && checked.size > 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Envoyer un email
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les documents à joindre puis rédigez votre message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-recipient">Destinataire</Label>
            <Input
              id="email-recipient"
              type="email"
              autoComplete="off"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Objet</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Documents à joindre</Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Chargement des documents…
              </div>
            ) : sources.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Aucun accord ou proposition d'accord disponible pour ce dossier.
              </p>
            ) : (
              <div className="space-y-1.5 rounded-md border p-3">
                {sources.map((s) => {
                  const id = `email-source-${s.sourceId}`;
                  return (
                    <label
                      key={s.sourceId}
                      htmlFor={id}
                      className="flex items-start gap-2.5 cursor-pointer text-sm py-1"
                    >
                      <Checkbox
                        id={id}
                        checked={checked.has(s.sourceId)}
                        onCheckedChange={() => toggle(s.sourceId)}
                        className="mt-0.5"
                      />
                      <span className="leading-snug">
                        {s.label} — {s.stage}{' '}
                        <span className="text-muted-foreground">
                          (dernier document mis à jour par le chiffreur)
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
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
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi…
              </>
            ) : (
              'Envoyer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EnvoyerEmailDialog;
