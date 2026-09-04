/**
 * Gmail compose URL builder.
 *
 * Pure string-building helper extracted from the (now-deleted)
 * modal-decision-status.tsx. Used by the "Envoyer par mail" flow
 * (see task #36) and any future email-dispatch surfaces.
 */

import { BRAND } from './brand';
import { getLocale } from '@/i18n';

export interface BuildGmailComposeUrlOptions {
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Build a Gmail "compose" URL that opens in a new tab with the
 * given recipient, subject, and body pre-filled.
 *
 * Mirrors the historic builder that lived in modal-decision-status.tsx:
 *   `https://mail.google.com/mail/?view=cm&to=...&su=...&body=...`
 */
export function buildGmailComposeUrl(opts: BuildGmailComposeUrlOptions): string {
  const params = new URLSearchParams();
  params.set('view', 'cm');
  params.set('to', opts.to.trim());
  params.set('su', opts.subject);
  params.set('body', opts.body);
  if (opts.cc && opts.cc.length > 0) {
    params.set('cc', opts.cc.join(','));
  }
  if (opts.bcc && opts.bcc.length > 0) {
    params.set('bcc', opts.bcc.join(','));
  }
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * Task #36 — canonical subject + plain-text body for the "Envoyer par mail"
 * accord flow. Kept here so the dialog default and any future programmatic
 * caller stay in sync.
 */
export function buildAccordEmailTemplate(numero: string): {
  subject: string;
  body: string;
} {
  const ref = numero && numero.trim().length > 0 ? numero : '—';
  if (getLocale() === 'en') {
    return {
      subject: `${BRAND.emailSubjectTag} Appraisal agreement - File No. ${ref}`,
      body:
        `Hello,\n\n` +
        `Please find attached the appraisal agreement for file No. ${ref}.\n\n` +
        `Best regards,\n\n` +
        `${BRAND.emailSignature}`,
    };
  }
  return {
    subject: `${BRAND.emailSubjectTag} Accord expertise - Dossier N° ${ref}`,
    body:
      `Madame, Monsieur,\n\n` +
      `Veuillez trouver ci-joint l'accord d'expertise concernant le dossier N° ${ref}.\n\n` +
      `Cordialement,\n\n` +
      `${BRAND.emailSignature}`,
  };
}
