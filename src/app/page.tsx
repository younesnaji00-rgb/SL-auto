import { redirect } from 'next/navigation';

export default function Home() {
  // SL Auto has no public marketing site: the root is the app.
  redirect('/dashboard');
}
