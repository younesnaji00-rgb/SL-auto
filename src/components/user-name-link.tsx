'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { displayUserName } from '@/lib/display-user';

interface UserNameLinkProps {
  /** The audit / workflow / observation entry — anything with `userNom`
   *  and `user` (email) fields. */
  entry: { userNom?: string | null; user?: string | null } | null | undefined;
  /** Optional extra classes for the rendered span. */
  className?: string;
  /** Optional custom rendering of the name (e.g. stacked over two rows);
   *  the link / fallback logic is unchanged. */
  children?: React.ReactNode;
}

/**
 * Renders the user's display name (or "Utilisateur inconnu" per round 8
 * P-LOG-NAME-FALLBACK) wrapped in a Link to `/utilisateurs?email=<email>`
 * so the gestionnaire can jump to that user's record. Round 9 item 002.
 *
 * If no email is present on the entry, renders an unwrapped span (no
 * broken link).
 */
export function UserNameLink({ entry, className, children }: UserNameLinkProps) {
  const label = children ?? displayUserName(entry);
  const email = entry?.user?.trim();
  const linkClass = cn(
    'text-foreground hover:text-primary hover:underline underline-offset-2',
    className,
  );
  if (!email) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link
      href={`/utilisateurs?email=${encodeURIComponent(email)}`}
      className={linkClass}
    >
      {label}
    </Link>
  );
}
