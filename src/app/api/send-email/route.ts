import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { adminDb } from '@/lib/firebase-admin';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  MAX_RECIPIENTS,
  MAX_SUBJECT_CHARS,
  MAX_TEXT_CHARS,
  canSendEmail,
  isStorageDownloadUrl,
  parseRecipients,
  safeAttachmentName,
} from '@/lib/email-guard';

interface InboundAttachment {
  filename: string;
  url: string;
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 50;
// Per-process map. Multi-instance deployments may allow up to N×limit total.
const emailSendTimestamps = new Map<string, number[]>();

function checkAndRecordSend(uid: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const existing = emailSendTimestamps.get(uid) ?? [];
  const recent = existing.filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    emailSendTimestamps.set(uid, recent);
    return { ok: false, retryAfterSeconds };
  }
  recent.push(now);
  emailSendTimestamps.set(uid, recent);
  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireAuth(req);
    const rl = checkAndRecordSend(uid);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.', retryAfterSeconds: rl.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }
    // The mailbox is the firm's: only the roles that send mail in the app
    // (not the agent de terrain side) may use it, checked on the server.
    const profile = await adminDb().collection('users').doc(uid).get();
    if (!profile.exists || !canSendEmail(profile.get('role'))) {
      return NextResponse.json({ error: "Ce compte n'envoie pas d'e-mails." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }
    const recipients = parseRecipients(body.to);
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    // Plain text only: both callers send text, and HTML from the firm's
    // address is what a phishing mail would need.
    const textBody = typeof (body.text ?? body.body) === 'string' ? String(body.text ?? body.body) : '';
    const attachments: InboundAttachment[] = Array.isArray(body.attachments) ? body.attachments : [];

    if (!recipients) {
      return NextResponse.json({ error: `Destinataire invalide (au plus ${MAX_RECIPIENTS} adresses).` }, { status: 400 });
    }
    if (!subject || subject.length > MAX_SUBJECT_CHARS || !textBody.trim() || textBody.length > MAX_TEXT_CHARS) {
      return NextResponse.json({ error: 'Objet ou message manquant ou trop long.' }, { status: 400 });
    }
    // Attachments are PDFs already in the app's Storage bucket — nothing else
    // is fetched by the server.
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'studio-9568416614-6523a.firebasestorage.app';
    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? null;
    if (attachments.length > MAX_ATTACHMENTS || attachments.some((a) => !isStorageDownloadUrl(a?.url, bucket, emulatorHost))) {
      return NextResponse.json({ error: 'Pièce jointe refusée : seuls les documents du dossier peuvent être joints.' }, { status: 400 });
    }

    // Task #36 — server-side fetch each attachment URL into a Buffer so
    // nodemailer can inline them.
    let totalBytes = 0;
    const nmAttachments = await Promise.all(
      attachments.map(async (a) => {
        const res = await fetch(a.url, { redirect: 'error' });
        if (!res.ok) {
          throw new Error(`Failed to fetch attachment: ${safeAttachmentName(a.filename)}`);
        }
        const buf = Buffer.from(await res.arrayBuffer());
        totalBytes += buf.length;
        if (totalBytes > MAX_ATTACHMENT_BYTES) throw new Error('Attachments too large');
        return { filename: safeAttachmentName(a.filename), content: buf };
      })
    );

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients,
      subject,
      text: textBody,
      ...(nmAttachments.length > 0 ? { attachments: nmAttachments } : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('Email send error:', error?.message ?? 'unknown', error?.code ?? '');
    // The detail stays in the server log; the browser gets a plain message.
    return NextResponse.json(
      { error: "L'e-mail n'a pas pu être envoyé." },
      { status: 500 }
    );
  }
}
