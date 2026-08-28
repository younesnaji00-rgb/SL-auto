'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';

export function ContactForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch('/api/site-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      (window as unknown as { plausible?: (e: string) => void }).plausible?.('Contact sent');
      router.push('/site/contact/thank-you');
    } catch {
      setError('Network error. Please try again or email us directly.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate={false} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] font-semibold">Your name</span>
          <input name="name" required maxLength={120} autoComplete="name" className="site-input mt-1.5" />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Work email</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" className="site-input mt-1.5" />
        </label>
      </div>
      <label className="block">
        <span className="text-[13px] font-semibold">
          Firm <span className="font-normal text-[var(--muted)]">(optional)</span>
        </span>
        <input name="firm" maxLength={160} autoComplete="organization" className="site-input mt-1.5" />
      </label>
      <label className="block">
        <span className="text-[13px] font-semibold">How can we help?</span>
        <textarea
          name="message"
          required
          maxLength={4000}
          rows={6}
          placeholder="Tell us about your caseload, or paste the questions you would ask on a walkthrough."
          className="site-input mt-1.5 resize-y"
        />
      </label>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-[oklch(0.8_0.1_25)] bg-[oklch(0.97_0.02_25)] px-4 py-3 text-[14px] text-[oklch(0.45_0.15_25)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <p className="text-[12.5px] text-[var(--muted)]">We reply from a human inbox. No newsletter, no tracking.</p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--teal)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--teal-deep)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {busy ? 'Sending' : 'Send message'}
          {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </form>
  );
}
