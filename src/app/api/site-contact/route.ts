import { NextRequest, NextResponse } from 'next/server';
import { BRAND } from '@/lib/brand';
import { createMailTransport, MAIL_FROM } from '@/lib/mailer';

/**
 * Public contact form for the demo marketing site (/site/contact).
 * Unauthenticated by design, so it is defended by: demo-brand gate, honeypot
 * field, strict field limits, and a per-IP rate limit (5 / hour / instance).
 */

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(t => t > now - RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export async function POST(req: NextRequest) {
  if (BRAND.id !== 'demo') return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: real users never fill this hidden field.
  if (str(body.website, 200)) return NextResponse.json({ ok: true });

  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const firm = str(body.firm, 160);
  const message = str(body.message, 4000);

  if (!name || !EMAIL_RE.test(email) || !message) {
    return NextResponse.json({ error: 'Please fill in your name, a valid email and a message.' }, { status: 400 });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[site-contact] SMTP not configured; dropping message from', email);
    return NextResponse.json({ error: 'Messaging is not configured on this deployment.' }, { status: 503 });
  }

  const subject = `${BRAND.emailSubjectTag} Website enquiry from ${name}${firm ? ` (${firm})` : ''}`;
  const text = [`Name: ${name}`, `Email: ${email}`, firm ? `Firm: ${firm}` : null, `IP: ${ip}`, '', message].filter(Boolean).join('\n');
  const html = `<p><strong>Name:</strong> ${escapeHtml(name)}<br/><strong>Email:</strong> ${escapeHtml(email)}${
    firm ? `<br/><strong>Firm:</strong> ${escapeHtml(firm)}` : ''
  }</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;

  try {
    await createMailTransport().sendMail({
      from: MAIL_FROM(),
      to: BRAND.companyEmail,
      replyTo: email,
      subject,
      text,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[site-contact] send failed', err);
    return NextResponse.json({ error: 'We could not send your message. Please email us directly.' }, { status: 502 });
  }
}
