/**
 * Account-based free trial (white-label deployments).
 *
 * The trial length lives on the brand config (`BRAND.trialDays`, null = no
 * trial — the slaoui deployment). The clock starts at the account's FIRST
 * login, when src/app/login/page.tsx merge-writes `trialStartedAt`
 * (serverTimestamp) onto the user doc. Accounts flagged `trialExempt: true`
 * (the shared showcase demo accounts, seeded by scripts/seed-demo.mjs) never
 * expire. Enforcement lives in two places:
 *
 *   - login (src/app/login/page.tsx): an expired account is blocked BEFORE
 *     signIn, so nothing is authenticated and no single-session claim exists.
 *   - runtime (src/hooks/use-current-user.tsx): an already-signed-in session
 *     that outlives its trial window is evicted when the profile snapshot
 *     shows the expiry.
 */

import { BRAND } from './brand';

/** The trial-related fields read off a users/{uid} profile doc. */
export interface TrialProfileFields {
  /** Firestore Timestamp (or {seconds} / Date / epoch millis) — set once at first login. */
  trialStartedAt?: unknown;
  /** This account never expires (shared showcase accounts). */
  trialExempt?: boolean;
}

export interface TrialStatus {
  /** The user may use the app (no trial, exempt, not started, or still running). */
  active: boolean;
  /** The trial window has lapsed — block/evict this account. */
  expired: boolean;
  /**
   * Whole days remaining (>= 0) once the trial has STARTED; null when no
   * trial applies (brand has none / exempt) or the clock hasn't started yet.
   */
  daysLeft: number | null;
}

const DAY_MS = 86_400_000;

/** Coerce `trialStartedAt` (Timestamp | {seconds} | Date | millis) to epoch millis. */
function startedAtMillis(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return v.getTime();
  const anyV = v as { toMillis?: () => number; seconds?: number };
  if (typeof anyV.toMillis === 'function') return anyV.toMillis();
  if (typeof anyV.seconds === 'number') return anyV.seconds * 1000;
  return null;
}

/** Evaluate the free-trial state for a user profile (doc data or hook profile). */
export function trialStatus(
  profile: TrialProfileFields | null | undefined,
  nowMs: number = Date.now(),
): TrialStatus {
  // No trial on this brand, or an exempt account → nothing to enforce.
  if (BRAND.trialDays == null || profile?.trialExempt === true) {
    return { active: true, expired: false, daysLeft: null };
  }
  const startedMs = startedAtMillis(profile?.trialStartedAt);
  if (startedMs == null) {
    // Trial not started yet — the clock starts at the account's first login.
    return { active: true, expired: false, daysLeft: null };
  }
  const endsMs = startedMs + BRAND.trialDays * DAY_MS;
  const expired = nowMs > endsMs;
  const daysLeft = expired ? 0 : Math.max(0, Math.ceil((endsMs - nowMs) / DAY_MS));
  return { active: !expired, expired, daysLeft };
}
