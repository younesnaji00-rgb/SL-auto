# SL-auto Android app — Capacitor + background location

## Why this exists

The Agent de Terrain (AT) location feature publishes the agent's GPS position to
Firestore (`users/{uid}.currentLocation`); the gestionnaire reads it live in the
planification modal. The **web** publisher ([`use-gps-publisher.ts`](../src/hooks/use-gps-publisher.ts))
uses `navigator.geolocation.watchPosition`, which **the browser freezes the
moment the app is backgrounded or the screen locks** — so updates stop and the
gestionnaire sees a stale "position non disponible".

The old Android app was a **Trusted Web Activity (TWA)** — confirmed by
[`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json),
package `ma.slaouiglobal.slauto`. A TWA is just Chrome rendering the PWA, so it
has the **exact same** background limitation. There is no way to get
every-minute background location from a TWA, a service worker, a websocket, or
any other pure-web technique — it's a deliberate browser restriction.

The fix is to ship the Android app as a **Capacitor** app instead. Capacitor
loads the *same* deployed web app in a native WebView and adds a plugin bridge.
We use [`@capacitor-community/background-geolocation`](https://github.com/capacitor-community/background-geolocation),
which runs an Android **foreground service** that keeps delivering the position
**every minute even when the app is backgrounded or the phone is locked**. The
native location callback writes the *same* `users/{uid}.currentLocation` shape,
so **the gestionnaire side needs no changes**.

> The web app is a Next.js server app (API routes + SSR), so it is **not** a
> static export. Capacitor therefore loads the **remote hosted URL** rather than
> bundling assets — meaning your normal push-to-GitHub deploy keeps shipping the
> web app unchanged; the APK just points at it.

## What's already in this repo

| File | Purpose |
| --- | --- |
| [`src/hooks/use-native-bg-geolocation.ts`](../src/hooks/use-native-bg-geolocation.ts) | Native publisher. Inert on web; on the native shell it drives the background-geolocation watcher + a 1-minute heartbeat → Firestore. |
| [`src/hooks/use-gps-publisher.ts`](../src/hooks/use-gps-publisher.ts) | Web publisher. Now **skips** `watchPosition` when running natively (no double-tracking). |
| [`src/components/gps-publisher-host.tsx`](../src/components/gps-publisher-host.tsx) | Mounts the native hook; shows a "Toujours autoriser" banner if background permission is declined. |
| [`capacitor.config.ts`](../capacitor.config.ts) | Capacitor config. **`PRODUCTION_URL` must be set** (see below). |
| `capacitor-webdir/` | Placeholder offline page; WebView immediately navigates to `server.url`. |
| `package.json` | Capacitor deps + `cap:sync` / `cap:open` scripts. |

The native `android/` project is **not** committed — you generate it locally
with `npx cap add android` (below).

---

## Prerequisites (one-time, on your build machine)

You need the Android toolchain installed. If `npx cap run android` fails with
`ERR_SDK_NOT_FOUND: No valid Android SDK root found`, this section is why.

1. **Install [Android Studio](https://developer.android.com/studio)** — it
   bundles the Android SDK and a JDK. Run it once and complete the setup wizard;
   it installs the SDK to `C:\Users\<you>\AppData\Local\Android\Sdk`.
2. This repo cloned, with deps installed: `npm install`.

**Easiest path: build from Android Studio's GUI**, not the CLI. Run
`npx cap open android`, let Gradle sync (first time downloads dependencies), then
use ▶ to run on a device/emulator and **Build → Generate Signed APK** to release.
Android Studio writes `android/local.properties` (the SDK path) for you, so you
never touch environment variables.

> Only if you insist on the CLI (`npx cap run android` / `./gradlew`): set
> `ANDROID_HOME` to the SDK path above, add `%ANDROID_HOME%\platform-tools` to
> `PATH`, and ensure `java` is on `PATH`. The GUI route avoids all of this.

---

## ⚠️ Step 0 — set the production URL

Open [`capacitor.config.ts`](../capacitor.config.ts) and set `PRODUCTION_URL` to
the **exact** origin the current app already opens (where
`/.well-known/assetlinks.json` is served). The committed default is the Firebase
Hosting domain for project `studio-9568416614-6523a`:

```ts
const PRODUCTION_URL = 'https://studio-9568416614-6523a.web.app';
```

If you use a custom domain, put it here instead. **A wrong value = white screen
on launch.**

---

## Step 1 — generate the Android project

```bash
npm install
npx cap add android      # creates android/ from the Capacitor template
npx cap sync android     # copies config + installs the bg-geolocation plugin natively
```

`appId` (`ma.slaouiglobal.slauto`) and `appName` (`SL-auto`) come from
`capacitor.config.ts`, so the package name matches the current app.

---

## Step 2 — add the location permissions

Edit `android/app/src/main/AndroidManifest.xml` and add these inside `<manifest>`
(next to the existing `INTERNET` permission, **as siblings of** `<application>`):

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Notes:
- `ACCESS_BACKGROUND_LOCATION` is what unlocks tracking while backgrounded. At
  runtime the user **must choose "Allow all the time"** (Android shows this as a
  separate prompt). Our hook calls the plugin with `requestPermissions: true`,
  so the prompts appear automatically the first time the AT opens the app.
- `FOREGROUND_SERVICE_LOCATION` is required on Android 14+.
- `POST_NOTIFICATIONS` is for the persistent "SL-auto — suivi de position"
  notification the foreground service displays (Android 13+).
- The plugin declares its own foreground `Service` (with
  `foregroundServiceType="location"`) in its manifest — Gradle merges it
  automatically, so you don't declare the service yourself.

Re-run `npx cap sync android` after editing.

---

## Step 2b — enable push notifications (FCM)

This is what makes **"Demander la localisation de l'AT"** reach an agent whose app
has been **cleared from the background**. The flow already exists end-to-end:

1. The gestionnaire clicks the button → a doc is written to `location_requests`
   ([`use-agent-live-location.ts`](../src/hooks/use-agent-live-location.ts)).
2. The Cloud Function `sendLocationRequestNotification`
   ([`functions/src/index.ts`](../functions/src/index.ts)) sends an FCM
   notification to the agent's `users/{uid}.fcmTokens`.
3. The agent taps the notification → the app foregrounds →
   [`use-gps-publisher.ts`](../src/hooks/use-gps-publisher.ts) publishes a fresh
   position and [`use-native-bg-geolocation.ts`](../src/hooks/use-native-bg-geolocation.ts)
   re-arms the foreground tracking service.

The **only** piece that doesn't work in a pure web/TWA build is step 2's
delivery: the Android System WebView has no Web Push, so the web FCM token never
registers. The native app fixes this with
[`@capacitor/push-notifications`](https://capacitorjs.com/docs/apis/push-notifications)
— [`use-native-push-registration.ts`](../src/hooks/use-native-push-registration.ts)
registers the device's **native** FCM token into the same `fcmTokens` array, so
the existing Cloud Function works unchanged.

### Already done in this repo

- **Firebase Android app registered** — `ma.slaouiglobal.slauto`, App ID
  `1:588304904574:android:1a2e4d156cff69617c832f` (project
  `studio-9568416614-6523a`). No new server key is needed; the Cloud Functions
  send via the Admin SDK on the same project.
- **`android/app/google-services.json`** fetched and committed. To re-pull it:
  ```bash
  firebase apps:sdkconfig ANDROID 1:588304904574:android:1a2e4d156cff69617c832f \
    --out android/app/google-services.json --project studio-9568416614-6523a
  ```
- **Gradle wiring** is already in the committed `android/` project:
  `android/build.gradle` carries `classpath 'com.google.gms:google-services'`,
  and `android/app/build.gradle` conditionally applies the
  `com.google.gms.google-services` plugin when `google-services.json` is present.
- **`POST_NOTIFICATIONS`** is in `AndroidManifest.xml`. The hook calls
  `PushNotifications.requestPermissions()`, so the runtime prompt (Android 13+)
  appears the first time the AT opens the app.
- **Plugin installed & synced** — `@capacitor/push-notifications` is in
  `package.json` and wired into the native project (`npx cap sync android`).

### What still has to happen for it to go live

1. **Deploy the web app** (normal push-to-GitHub → App Hosting). The APK loads
   the *remote* hosted URL, so the registration hook only runs once the deployed
   web app contains it.
2. **Rebuild and redistribute the APK** (Steps 3–5 below). The push plugin is
   native code, so the agents must install the new APK — the hook bridges to
   native code that does not exist in the current build.

> **Verify:** install the APK, log in as an Agent de Terrain, accept the
> notification prompt. On a second device (gestionnaire), open a dossier →
> **Créer une planification**, pick that agent, and click **Demander la
> localisation de l'AT** — even with the agent's app swiped away, a "Demande de
> position" notification should arrive; tapping it opens the app and the
> gestionnaire view fills in within a few seconds.

---

## Step 3 — create a signing key

You no longer have the original TWA keystore, so create a **new** one. Keep it
safe — every future update must be signed with this same key.

```bash
keytool -genkey -v -keystore sl-auto-release.jks \
  -alias sl-auto -keyalg RSA -keysize 2048 -validity 10000
```

> Store `sl-auto-release.jks` and its passwords in a password manager — **not**
> in git. If you lose it, agents will have to reinstall again on the next update.

---

## Step 4 — build the signed release APK

In Android Studio:

1. `npx cap open android` (opens the project).
2. **Build → Generate Signed Bundle / APK → APK**.
3. Select `sl-auto-release.jks`, enter the passwords, choose the **release**
   build variant, finish.
4. Output: `android/app/build/outputs/apk/release/app-release.apk`.

(Or configure `signingConfigs` in `android/app/build.gradle` and run
`cd android && ./gradlew assembleRelease`.)

Bump the version on each release in `android/app/build.gradle`
(`versionCode` +1, `versionName`).

---

## Step 5 — distribute

The web app already serves the APK from a stable URL:
`/downloads/sl-auto.apk` → Firebase Storage `public/sl-auto.apk` (see the
redirect in [`next.config.ts`](../next.config.ts)).

**Upload the new `app-release.apk` to Firebase Storage, overwriting
`public/sl-auto.apk`.** No web redeploy needed — the download link stays the
same.

> **One-time reinstall:** because this APK is signed with a new key, Android
> will not update over the old TWA (signature mismatch). Tell agents to
> **uninstall the old "SL-auto" app and install the new one once**. The package
> name is unchanged, and all future updates (same key) install seamlessly.

Optional: if you rely on Android App Links (https links opening the app), update
`public/.well-known/assetlinks.json` with the **new** key's SHA-256
(`keytool -list -v -keystore sl-auto-release.jks -alias sl-auto`) and redeploy
the web app. Not required for location/tracking to work.

---

## Step 6 — verify on a real device

A physical Android phone is required (background location does not behave
realistically on an emulator).

1. Install the new APK; log in as an Agent de Terrain.
2. Grant location → choose **"Autoriser tout le temps" / "Allow all the time"**,
   and allow notifications. The "SL-auto — suivi de position" notification
   should appear.
3. On a second device, log in as a gestionnaire, open a dossier → **Créer une
   planification**, select that agent. You should see "Position actuelle de
   l'agent".
4. On the AT phone: **lock the screen / switch to another app** and walk around
   (or stay put). Within ~1 minute the gestionnaire view should keep refreshing
   the agent's position and stay "fresh" (no "position non disponible").
5. Leave it backgrounded for 10+ minutes and confirm it never goes stale.

---

## Tracking behaviour (what the hook does)

- Publishes on movement (`distanceFilter: 25 m`) **and** at least once per
  minute via a heartbeat — so a *stationary* agent (parked at a garage) stays
  "fresh" rather than going stale after the 10-minute window.
- Writes the identical `currentLocation: { lat, lng, accuracy, updatedAt }`
  shape the web publisher uses — `useAgentLiveLocation` / the planification modal
  are unchanged.
- On the web (browser / old TWA / PWA) the native hook is a complete no-op; the
  existing foreground web tracking is untouched.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| White screen on launch | `PRODUCTION_URL` wrong, or device offline. Verify the URL loads in the phone's browser. |
| Position only updates when app is open | Background permission is "While using the app", not **"Allow all the time"**. Re-grant in Android Settings → Apps → SL-auto → Permissions → Location. |
| No foreground-service notification | `POST_NOTIFICATIONS` not granted (Android 13+). Re-grant notifications. |
| App won't install over old one | Expected (new signing key). Uninstall the old app first. |
| Goes stale after exactly 10 min | The 10-minute freshness window is in `use-agent-live-location.ts` (`FRESH_MS`). If background writes are flowing every minute this won't trigger; if it still does, check the notification is alive (service was killed by aggressive battery optimisation — exempt the app in battery settings). |
| Can't log in inside the app | Email/password Firebase Auth works fine in a WebView. **Google / OAuth sign-in is blocked by Google in embedded WebViews** (`disallowed_useragent`). If the AT login uses Google sign-in, use `@capacitor-firebase/authentication` (native sign-in) or keep AT login on email/password. Email/password is unaffected. |

## Publishing to Google Play (only if you ever leave direct-APK distribution)

Background location requires a Play **declaration form** + a justification video.
Since you distribute the APK directly via Firebase Storage, this does not apply
today — but note it if you move to the Play Store later.
