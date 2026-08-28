import nodemailer from 'nodemailer';

/** Shared SMTP transport (env-configured), used by /api/send-email and /api/site-contact. */
export function createMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export const MAIL_FROM = () => process.env.SMTP_FROM || process.env.SMTP_USER;
