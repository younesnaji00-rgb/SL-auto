import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getGmailForUser } from '@/lib/gmail-client';

/**
 * POST /api/email/draft
 *
 * Creates a Gmail draft on behalf of `uid` using the user's stored OAuth
 * refresh token (slice 3 of the Gmail integration). Builds an RFC 2822
 * multipart/mixed MIME message with a UTF-8 text/plain body and N PDF
 * attachments fetched from the provided URLs, then submits the base64URL
 * encoded raw message to `gmail.users.drafts.create`.
 *
 * Request body:
 *   {
 *     uid: string,
 *     to: string,
 *     subject: string,
 *     body: string,
 *     attachments: Array<{ url: string; filename: string }>
 *   }
 *
 * Responses:
 *   200 { draftId, gmailDraftUrl }
 *   400 { error: 'invalid_body' }                 — malformed input
 *   401 { error: 'needsReauth' }                  — token missing/revoked
 *   413 { error: 'tooLarge' }                     — payload > 25 MB
 *   500 { error: string }                         — other Gmail errors
 */

const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB Gmail hard cap on drafts.

interface InboundAttachment {
  url: string;
  filename: string;
}

interface InboundBody {
  uid?: unknown;
  to?: unknown;
  subject?: unknown;
  body?: unknown;
  attachments?: unknown;
}

function isAttachmentArray(value: unknown): value is InboundAttachment[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (a) =>
      a !== null &&
      typeof a === 'object' &&
      typeof (a as InboundAttachment).url === 'string' &&
      typeof (a as InboundAttachment).filename === 'string'
  );
}

/**
 * Encodes a string as a single MIME header value, RFC 2047 style if it
 * contains non-ASCII characters. We use a permissive heuristic: if the value
 * is pure ASCII, return as-is; otherwise wrap as encoded-word UTF-8 base64.
 */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) {
    return value;
  }
  const b64 = Buffer.from(value, 'utf-8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}

/** Splits a base64 string into 76-character lines per RFC 2045. */
function chunkBase64(b64: string): string {
  return b64.replace(/(.{76})/g, '$1\r\n');
}

export async function POST(request: Request) {
  // 1. Parse + validate body.
  let raw: InboundBody;
  try {
    raw = (await request.json()) as InboundBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { uid, to, subject, body, attachments } = raw;

  if (
    typeof uid !== 'string' ||
    !uid ||
    typeof to !== 'string' ||
    !to ||
    typeof subject !== 'string' ||
    typeof body !== 'string' ||
    !isAttachmentArray(attachments)
  ) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // 2. Fetch each attachment, convert to base64. Track running total against
  // Gmail's 25 MB cap. The cap is checked against the binary payload size;
  // base64 expansion is roughly ×1.37 but the limit is on the final raw
  // message, so we conservatively stop once binary bytes alone exceed 25 MB.
  let totalBytes = 0;
  const encodedAttachments: Array<{
    filename: string;
    contentBase64: string;
  }> = [];

  for (const att of attachments) {
    const res = await fetch(att.url);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch attachment: ${att.filename}` },
        { status: 500 }
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    totalBytes += buf.byteLength;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: 'tooLarge' }, { status: 413 });
    }
    encodedAttachments.push({
      filename: att.filename,
      contentBase64: chunkBase64(buf.toString('base64')),
    });
  }

  // 3. Build RFC 2822 multipart/mixed MIME message.
  const boundary = `==SL-AUTO-${crypto.randomUUID()}==`;
  const lines: string[] = [];
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${encodeHeader(subject)}`);
  lines.push('MIME-Version: 1.0');

  if (encodedAttachments.length === 0) {
    // Single-part text/plain message — no multipart wrapping needed, but we
    // still keep it simple and consistent by using multipart with one part.
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(body);
    lines.push(`--${boundary}--`);
  } else {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(body);
    for (const att of encodedAttachments) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: application/pdf; name="${att.filename}"`);
      lines.push(
        `Content-Disposition: attachment; filename="${att.filename}"`
      );
      lines.push('Content-Transfer-Encoding: base64');
      lines.push('');
      lines.push(att.contentBase64);
    }
    lines.push(`--${boundary}--`);
  }

  const mime = lines.join('\r\n');

  // Final 25 MB guard against the encoded raw message.
  if (Buffer.byteLength(mime, 'utf-8') > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: 'tooLarge' }, { status: 413 });
  }

  const rawEncoded = Buffer.from(mime, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // 4. Acquire Gmail client. Missing/revoked token → 401 needsReauth.
  let gmail;
  try {
    gmail = await getGmailForUser(uid);
  } catch {
    return NextResponse.json({ error: 'needsReauth' }, { status: 401 });
  }

  // 5. Submit the draft.
  try {
    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: { message: { raw: rawEncoded } },
    });

    const draftId = response.data.id;
    return NextResponse.json({
      draftId,
      gmailDraftUrl: `https://mail.google.com/mail/u/0/#drafts/${draftId}`,
    });
  } catch (err: unknown) {
    const status =
      typeof err === 'object' && err !== null && 'code' in err
        ? Number((err as { code?: unknown }).code)
        : NaN;
    if (status === 401) {
      return NextResponse.json({ error: 'needsReauth' }, { status: 401 });
    }
    const message =
      err instanceof Error && err.message ? err.message : 'gmail_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
