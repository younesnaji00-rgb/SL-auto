import { redirect } from 'next/navigation';

/**
 * EMPTIED 2026-09-07 — this route used to hold the Lionheart Appraisal
 * marketing site (665 lines of another firm's copy, screenshots and contact
 * details), served from the white-label era when one codebase built both
 * products.
 *
 * Lionheart is a separate product in its own repository, and that repository
 * carries the real marketing site (/site plus about, contact, faq, fr, privacy
 * and terms). Keeping a copy here shipped Lionheart's brand inside SL Auto's
 * production bundle, which is the entanglement the repo split was meant to
 * end.
 *
 * SL Auto has no public marketing site, so the route just returns to the app.
 * The file survives only because deleting it is not permitted from here; it can
 * be removed outright.
 */
export default function Site() {
  redirect('/dashboard');
}
