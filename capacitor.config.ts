import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor shell for the SL-auto Android app.
 *
 * The previous Android app was a Trusted Web Activity (TWA) — essentially
 * Chrome in a box — which cannot run background location. This Capacitor shell
 * loads the SAME deployed web app in a native WebView and adds a plugin bridge,
 * which is what lets `@capacitor-community/background-geolocation` track the
 * Agent de Terrain every minute even when the app is backgrounded / the screen
 * is locked.
 *
 * Because the web app is a Next.js server app (API routes + SSR) it is NOT a
 * static export, so we load the REMOTE hosted URL rather than bundling assets.
 * That also means your normal push-to-GitHub deploy keeps shipping the web app
 * unchanged — the APK just points at it.
 *
 * ── ⚠️ SET THIS BEFORE BUILDING ──────────────────────────────────────────────
 * `PRODUCTION_URL` must be the EXACT origin the app is served from. This is the
 * Firebase App Hosting URL for project `studio-9568416614-6523a`. If you later
 * point a custom domain at the app, update this and re-run `npx cap sync android`.
 */
const PRODUCTION_URL = 'https://sl-auto--studio-9568416614-6523a.europe-west4.hosted.app';

const config: CapacitorConfig = {
  appId: 'ma.slaouiglobal.slauto',
  appName: 'SL-auto',
  // Placeholder dir Capacitor copies on `sync`. The WebView immediately
  // navigates to `server.url`, so these assets are only a fallback.
  webDir: 'capacitor-webdir',
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
