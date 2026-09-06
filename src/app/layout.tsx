import type { Metadata, Viewport } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import './mobile.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { PwaRegister } from '@/components/pwa-register';
import { LocaleProvider } from '@/i18n';
import { BRAND } from '@/lib/brand';

// Display face (headings, KPI values) — the brand's voice.
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
});

// Text face (UI, tables, forms) — legible at 13–14 px with tabular figures.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: BRAND.productName,
  description: BRAND.appDescription,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND.shortName,
  },
  icons: {
    icon: [
      { url: `${BRAND.iconsPath}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${BRAND.iconsPath}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: `${BRAND.iconsPath}/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f766e',
  // Let the app draw under the status bar / display cutout area when
  // running in fullscreen PWA mode. Combine with safe-area CSS inset
  // padding where needed.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={BRAND.defaultLocale} suppressHydrationWarning className={cn(outfit.variable, inter.variable)}>
      <body className={cn('font-body antialiased')}>
        {/* Density zoom (DESIGN.md §6): 0.9 on 1080p monitors, 1.1 on 1440p,
            1 elsewhere — from the PHYSICAL screen height so OS scaling and
            browser zoom don't fool it. Runs before paint; re-evaluated on
            resize (window moved to another monitor).
            MONITORS ONLY (mobile pass 2026-09-06): a 1080p phone held in
            landscape reports screen.height × dpr ≈ 1080 and got the 0.9 desk
            zoom, shrinking every touch target; tablets are similar. The tiers
            now require a fine pointer + hover (a mouse) and a ≥ 1024 px
            viewport — touch devices always stay at 1. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function z(){var v=1;try{var m=window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');if(m.matches){var d=window.devicePixelRatio||1;var h=Math.round(screen.height*d);if(Math.abs(h-1080)<=8)v=0.9;else if(Math.abs(h-1440)<=8)v=1.1;}}catch(e){}document.documentElement.style.setProperty('--app-zoom',String(v));}z();window.addEventListener('resize',z);})();`,
          }}
        />
        {/* Light by default, and the OS preference does NOT get a vote
            (`enableSystem={false}`). Cream & Ink is a light design: the dark
            token set exists only for people who pick it from the theme toggle.
            Following prefers-color-scheme instead flipped every phone in dark
            mode to the dark palette — most visibly on the marketing site,
            whose headings inherit the global `text-heading-fg` rule and so
            turned pale teal on cream. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LocaleProvider>
            <FirebaseClientProvider>
              <PwaRegister />
              {children}
              <Toaster />
            </FirebaseClientProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
