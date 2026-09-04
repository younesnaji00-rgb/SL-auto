import { redirect } from 'next/navigation';
import { BRAND } from '@/lib/brand';

export default function Home() {
  // Demo brand: the public root is the marketing site. Firm: straight to the app.
  redirect(BRAND.id === 'demo' ? '/site' : '/dashboard');
}
