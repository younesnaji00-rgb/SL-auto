import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface InboundAttachment {
  filename: string;
  url: string;
}

export async function POST(req: NextRequest) {
  try {
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
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
