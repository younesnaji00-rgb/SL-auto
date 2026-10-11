/**
 * Input rules for /api/send-email. Pure, so the unit tests and the route
 * share them.
 *
 * The route sends from the firm's own mailbox, so it only takes what the two
 * callers in the app send — the dossier « Envoyer par e-mail » dialog and the
 * chiffrage « Envoyer l'accord » dialog: plain text, a few recipients, and
 * PDFs that already live in the app's Storage bucket.
 */
import { resolveRoleAccess } from '@/lib/role-access';

export const MAX_RECIPIENTS = 10;
export const MAX_SUBJECT_CHARS = 300;
export const MAX_TEXT_CHARS = 20_000;
export const MAX_ATTACHMENTS = 10;
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

/** « a@x.ma, b@y.ma » → the addresses, or null when one is malformed or there are too many. */
export function parseRecipients(to: unknown): string[] | null {
  if (typeof to !== 'string') return null;
  const list = to.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (list.length === 0 || list.length > MAX_RECIPIENTS) return null;
  return list.every((a) => EMAIL.test(a)) ? list : null;
}

/** Roles that send mail in the app: everyone but the agent de terrain side. */
export function canSendEmail(roleLabel: unknown): boolean {
  const { role, scope } = resolveRoleAccess(typeof roleLabel === 'string' ? roleLabel : '');
  return role !== null && role !== 'Agent de Terrain' && scope !== 'terrain';
}

/**
 * A download URL of a file in this project's Storage bucket — the only kind of
 * attachment the app produces. `emulatorHost` (« 127.0.0.1:9199 ») admits the
 * local emulator's URLs too.
 */
export function isStorageDownloadUrl(url: unknown, bucket: string, emulatorHost?: string | null): boolean {
  if (typeof url !== 'string' || !bucket) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.username || u.password) return false;
  const prefix = `/v0/b/${bucket}/o/`;
  if (!u.pathname.startsWith(prefix)) return false;
  if (u.protocol === 'https:' && u.host === 'firebasestorage.googleapis.com') return true;
  return !!emulatorHost && u.protocol === 'http:' && u.host === emulatorHost;
}

/** A filename safe to put in a mail header: no path, no control characters, ≤ 120 chars. */
export function safeAttachmentName(name: unknown): string {
  const base = String(name ?? '').split(/[\\/]/).pop() ?? '';
  const clean = base.replace(/[\u0000-\u001f\u007f"]/g, '').trim().slice(0, 120);
  return clean || 'document.pdf';
}
