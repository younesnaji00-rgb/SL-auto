import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRAND.defaultLocale === 'fr' ? 'Connexion' : 'Sign in'} · ${BRAND.productName}`,
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
