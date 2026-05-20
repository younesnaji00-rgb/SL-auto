import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';

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
    const body = await req.json();
    const { to, subject } = body as { to?: string; subject?: string };
    const htmlBody: string | undefined = body.html;
    const textBody: string | undefined = body.text ?? body.body;
    const attachments = (body.attachments ?? []) as InboundAttachment[];

    if (!to || !subject || (!htmlBody && !textBody)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and one of html/text/body' },
        { status: 400 }
      );
    }

    // Task #36 — server-side fetch each attachment URL into a Buffer so
    // nodemailer can inline them. Attachments param is optional so existing
    // callers that only pass html keep working unchanged.
    const nmAttachments = await Promise.all(
      attachments.map(async (a) => {
        const res = await fetch(a.url);
        if (!res.ok) {
          throw new Error(`Failed to fetch attachment: ${a.filename}`);
        }
        const buf = Buffer.from(await res.arrayBuffer());
        return { filename: a.filename, content: buf };
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
      to,
      subject,
      ...(htmlBody ? { html: htmlBody } : {}),
      ...(textBody ? { text: textBody } : {}),
      ...(nmAttachments.length > 0 ? { attachments: nmAttachments } : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('Email send error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
