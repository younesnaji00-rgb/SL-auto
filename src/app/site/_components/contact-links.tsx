'use client';

import { useEffect, useState } from 'react';
import { reveal } from './contact-enc';

/**
 * Scraper-resistant contact details for the public site.
 *
 * The server never emits the email/phone in the HTML or the RSC payload: it
 * passes an encoded string (see contact-enc.ts), which is only decoded in the
 * browser after mount. mailto:/tel: hrefs are attached at the same time, so
 * harvesters that read the markup (or the streamed payload) find nothing,
 * while people see and click a normal link.
 */

function useRevealed(enc: string): string | null {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => setValue(reveal(enc)), [enc]);
  return value;
}

type Props = { enc: string; className?: string; children?: React.ReactNode };

/** Renders the decoded email as a mailto: link; `children` is a leading icon. */
export function ObfuscatedEmail({ enc, className, children }: Props) {
  const email = useRevealed(enc);
  return (
    <a href={email ? `mailto:${email}` : undefined} className={className} aria-label={email ? undefined : 'Email address'}>
      {children}
      {email ?? <span aria-hidden>email</span>}
    </a>
  );
}

/** Renders the decoded phone as a tel: link. */
export function ObfuscatedPhone({ enc, className, children }: Props) {
  const tel = useRevealed(enc);
  return (
    <a href={tel ? `tel:${tel.replace(/[^\d+]/g, '')}` : undefined} className={className} aria-label={tel ? undefined : 'Phone number'}>
      {children}
      {tel ?? <span aria-hidden>phone</span>}
    </a>
  );
}
