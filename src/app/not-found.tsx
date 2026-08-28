import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRAND.defaultLocale === 'fr' ? 'Page introuvable' : 'Page not found'} · ${BRAND.productName}`,
  robots: { index: false, follow: false },
};

// Brand-aware 404. Demo (English, marketing site) sends people back to /site;
// firm builds (French, app only) send them to the app.
export default function NotFound() {
  const fr = BRAND.defaultLocale === 'fr';
  const homeHref = BRAND.id === 'demo' ? '/site' : '/dashboard';
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {fr ? 'Cette page n’existe pas.' : 'This page doesn’t exist.'}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          {fr
            ? 'Le lien est peut-être périmé ou l’adresse contient une faute de frappe.'
            : 'The link may be out of date or the address has a typo.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={homeHref}
            className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {fr ? 'Retour à l’accueil' : 'Back to home'}
          </Link>
          {BRAND.id === 'demo' ? (
            <Link href="/site/contact" className="inline-flex h-11 items-center rounded-full border border-border px-5 text-[14px] font-semibold transition-colors hover:bg-muted">
              Contact us
            </Link>
          ) : (
            <Link href="/login" className="inline-flex h-11 items-center rounded-full border border-border px-5 text-[14px] font-semibold transition-colors hover:bg-muted">
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
