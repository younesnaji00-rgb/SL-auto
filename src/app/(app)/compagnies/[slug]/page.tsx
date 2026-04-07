import { redirect } from 'next/navigation';

/**
 * Standard dynamic route to prevent Next.js optional catch-all conflict.
 * All company-specific logic is handled in the main page via search params.
 */
export default function CompagnieRedirect() {
  redirect('/compagnies');
}
