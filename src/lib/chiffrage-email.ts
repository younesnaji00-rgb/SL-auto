/**
 * Gmail compose URL builder.
 *
 * Pure string-building helper extracted from the (now-deleted)
 * modal-decision-status.tsx. Used by the "Envoyer par mail" flow
 * (see task #36) and any future email-dispatch surfaces.
 */

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
