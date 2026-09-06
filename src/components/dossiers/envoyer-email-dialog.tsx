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
import { Check, Loader2 } from 'lucide-react';

import { useFirestore } from '@/firebase';
import { setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
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
import { INPUT_EMAIL, INPUT_TEXT } from '@/lib/input-attrs';
import { FormErrorSummary, useFormErrors, type FieldRule } from '@/components/ui/form';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  findLatestChiffrageDocs,
  type LatestChiffrageDoc,
} from '@/lib/find-latest-chiffrage-docs';
import { apiFetch } from '@/lib/api-fetch';
import { useT } from '@/i18n';

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
  const t = useT();
  const db = useFirestore();
  const { toast } = useToast();

  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sources, setSources] = useState<LatestChiffrageDoc[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Success morph (owner option I1, motion-spec §5): spinner → ✓ « Envoyé »
  // held ~1.2s before the dialog closes — reserved for this rare (F3) send.
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (open) setSent(false);
  }, [open]);

  const refLabel = refExpert?.trim() || t('Sans Ref.');

  // Default body — set once when dialog opens.
  const defaultBody = useMemo(
    () =>
      `${t('Bonjour, veuillez trouver ci-joint le dernier document du dossier')} ${refLabel}. ${t('Cordialement.')}`,
    [refLabel, t],
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
      ? `${t('Dossier')} ${refLabel} — ${stage}`
      : `${t('Dossier')} ${refLabel}`;
    setSubject(newSubject);
    // Intentionally re-derive even if user typed — slice 1 keeps it simple.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sources, checked, refLabel]);

  // Validation on submit; the e-mail address also re-checks on blur once it
  // looks plausible (Baymard's "after reaching correct character length"
  // carve-out — §2.6). Messages appear inline AND in the summary (NN/g: a
  // summary "shouldn't be the only indication").
  const formErrors = useFormErrors(
    { recipient, checkedCount: checked.size },
    React.useMemo<FieldRule<{ recipient: string; checkedCount: number }>[]>(
      () => [
        {
          id: 'email-recipient',
          label: t('Destinataire'),
          format: true,
          plausible: (v) => v.recipient.includes('@') && v.recipient.trim().length > 4,
          validate: (v) =>
            !v.recipient.trim()
              ? t("Renseignez l'adresse du destinataire.")
              : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.recipient.trim())
                ? null
                : t('Adresse e-mail invalide.'),
        },
        {
          id: 'email-sources',
          label: t('Documents à joindre'),
          validate: (v) => (v.checkedCount > 0 ? null : t('Sélectionnez au moins un document à joindre.')),
        },
      ],
      [t],
    ),
  );

  const toggle = (sourceId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  };

  const handleSubmit = async () => {
    // Errors are never toasts (D §5): they belong under the field and in the
    // summary at the top of the body (§2.6 / GOV.UK error summary).
    if (!formErrors.validateAll()) return;
    const picked = sources.filter((s) => checked.has(s.sourceId));

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
      const res = await apiFetch('/api/send-email', {
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
        if (db && dossierId) {
          try {
            const dRef = doc(db, 'dossiers', dossierId);
            const dSnap = await getDoc(dRef);
            if (!dSnap.data()?.dateEnvoiAccordDevis) {
              await setDoc(dRef, { dateEnvoiAccordDevis: serverTimestamp() }, { merge: true });
            }
          } catch (err) {
            console.warn('[EnvoyerEmailDialog] failed to denorm dateEnvoiAccordDevis', err);
          }
        }
        setSent(true);
        window.setTimeout(() => onOpenChange(false), 1200);
        toast({ title: t('Email envoyé') });
        return;
      }

      toast({
        title: data?.error || t("Erreur lors de l'envoi de l'email"),
        variant: 'destructive',
      });
    } catch (err) {
      console.error('[EnvoyerEmailDialog] submit failed', err);
      toast({
        title: t("Erreur lors de l'envoi de l'email"),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // §2.6: the primary is NEVER disabled — a disabled button is a dead end
  // that never says why (Smashing, "Frustrating design patterns: disabled
  // buttons"). Validation runs on submit and the summary names the fix.
  const canSubmit = !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Dialog — element-specs §13 (M3 dialogs: brief headline + one line;
          confirm at the edge, dismissive `outline` to its left; bottom sheet
          below `lg`). 2xl because the message body needs the width. */}
      <DialogContent
        // Two text fields, a textarea and a checkbox list -> full-screen on a
        // phone (research 2.4); the desktop 2xl dialog is unchanged.
        fullScreen
        primary={{
          label: sent ? t('Envoyé') : t('Envoyer'),
          onClick: handleSubmit,
          disabled: sent || !canSubmit,
          loading: isSubmitting,
        }}
        dirty={recipient.trim().length > 0 && !sent}
        className="lg:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="t-title">{t('Envoyer un email')}</DialogTitle>
          <DialogDescription>
            {t('Sélectionnez les documents à joindre puis rédigez votre message.')}
          </DialogDescription>
        </DialogHeader>

        {/* Form — element-specs §9 (GOV.UK: visible label above each 40 px
            control, single column, rows 16 apart; the address field carries
            no sample value — an empty input, never a placeholder-as-label). */}
        <div className="space-y-4">
          <FormErrorSummary errors={formErrors.summary} />
          <div className="space-y-1">
            <Label htmlFor="email-recipient">{t('Destinataire')}</Label>
            <Input
              id="email-recipient"
              {...INPUT_EMAIL}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              {...formErrors.fieldProps('email-recipient')}
            />
            {formErrors.errors['email-recipient'] && (
              <p className="flex items-start gap-1.5 text-[13px] font-medium text-status-danger-fg">
                <AlertCircle aria-hidden className="mt-px h-4 w-4 shrink-0" />
                {formErrors.errors['email-recipient']}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email-subject">{t('Objet')}</Label>
            <Input
              id="email-subject"
              {...INPUT_TEXT}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email-body">{t('Message')}</Label>
            <Textarea
              id="email-body"
              minRows={4}
              maxRows={10}
              autoCapitalize="sentences"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="space-y-1" id="email-sources" tabIndex={-1}>
            <Label>{t('Documents à joindre')}</Label>
            {formErrors.errors['email-sources'] && (
              <p className="flex items-start gap-1.5 text-[13px] font-medium text-status-danger-fg">
                <AlertCircle aria-hidden className="mt-px h-4 w-4 shrink-0" />
                {formErrors.errors['email-sources']}
              </p>
            )}
            {loading ? (
              <div className="flex items-center gap-2 text-[13px] text-ink-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                {t('Chargement des documents…')}
              </div>
            ) : sources.length === 0 ? (
              <p className="t-caption">
                {t("Aucun accord ou proposition d'accord disponible pour ce dossier.")}
              </p>
            ) : (
              // Attachment rows — element-specs §4 (M3 lists: 44 px one-line
              // rows, hairlines only, leading control, headline 600 + supporting
              // text in the row; no box-in-box inside the dialog).
              <div className="divide-y divide-hairline">
                {sources.map((s) => {
                  const id = `email-source-${s.sourceId}`;
                  return (
                    <label
                      key={s.sourceId}
                      htmlFor={id}
                      className="flex min-h-[44px] cursor-pointer items-start gap-2.5 py-2.5 text-sm text-ink"
                    >
                      <Checkbox
                        id={id}
                        checked={checked.has(s.sourceId)}
                        onCheckedChange={() => toggle(s.sourceId)}
                        className="mt-0.5"
                      />
                      <span className="leading-snug">
                        <span className="font-medium">{t(s.label)} — {t(s.stage)}</span>{' '}
                        <span className="text-ink-3">
                          {t('(dernier document mis à jour par le chiffreur)')}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer §13: [Annuler outline] [Envoyer default] — the dismissive
            action stays visible (outline, not ghost). */}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="max-md:hidden"
          >
            {t('Annuler')}
          </Button>
          <Button onClick={handleSubmit} disabled={sent || !canSubmit} loading={isSubmitting} className="max-md:h-12 max-md:text-[15px] max-md:font-semibold">
            {sent ? <Check className="h-4 w-4" /> : null}
            {sent ? t('Envoyé') : isSubmitting ? t('Envoi…') : t('Envoyer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EnvoyerEmailDialog;
