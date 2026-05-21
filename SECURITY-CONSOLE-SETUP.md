# SECURITY-CONSOLE-SETUP

Manual Firebase Console steps required to complete the security hardening initiated on branch `auto-2026-05-20`. Code changes in that branch close the public read/write leak, gate all `/api/*` routes behind ID-token auth, and add App Check scaffolding — but they only take effect once the steps below are performed in the Firebase Console, GCP Console, and hosting environment.

Project ID: `studio-9568416614-6523a`
Storage bucket: `gs://studio-9568416614-6523a.firebasestorage.app`

Work through the sections in order. Section 1 must happen first — until the rules and config are deployed, every other mitigation is theoretical.

---

## 1. Deploy the new rules and config (FIRST)

**WHAT.** Ship the 11 inner commits on `auto-2026-05-20` so the locked-down Firestore rules, locked-down Storage rules, server-side auth, App Check init, CSP headers, and CORS list are actually live.

**WHY.** Until deployment, `firebasestorage.googleapis.com` URLs with a download token are world-readable. The original leak URL — `https://firebasestorage.googleapis.com/v0/b/studio-9568416614-6523a.firebasestorage.app/o/dossiers%2FlXObR07huwKAncITV3BI%2Fdocuments%2F1778683207442_img160.jpg?alt=media&token=` — still serves the JPG to anyone who has ever seen the link, including search engines and former employees, until new rules deploy.

**STEPS.**

1. Review the 11 inner commits to confirm scope:
   ```bash
   git log auto-2026-05-20 --oneline -n 11
   ```
   Expected commits include `[rules-lockdown]`, `[firestore-rules]` x2, `[server-auth]`, `[api-auth]`, `[client-auth]` x2, `[api-ratelimit]`, `[security-headers]`, `[ci-hygiene]`, `[storage-cors]`, `[app-check]`.
2. Merge to `main`:
   ```bash
   git checkout main
   git merge --no-ff auto-2026-05-20
   git push origin main
   ```
   The push-to-GitHub Firebase Hosting deploy takes ~10 minutes.
3. For a direct deploy path that bypasses the GitHub pipeline:
   ```bash
   firebase deploy --only firestore:rules,storage:rules,hosting,functions
   ```
4. Watch the deploy logs in the Firebase Console under Hosting and Firestore until both report the new ruleset version.

**VERIFY.**

- Open the original leak URL in a fresh incognito window:
  `https://firebasestorage.googleapis.com/v0/b/studio-9568416614-6523a.firebasestorage.app/o/dossiers%2FlXObR07huwKAncITV3BI%2Fdocuments%2F1778683207442_img160.jpg?alt=media&token=`
  Expected response: HTTP 403 with `Permission denied. Could not access bucket`. If the JPG renders, the deploy did not take — re-check the Storage rules tab in the Console for ruleset version timestamp.
- Curl an `/api/*` route without an Authorization header — expect HTTP 401:
  ```bash
  curl -i https://<your-hosting-domain>/api/send-email
  ```
- In the Firestore Rules Playground, simulate an unauthenticated `get` on `/users/{anyId}` — expect Deny.

---

## 2. Provision Firebase Admin SDK service account

**WHAT.** Generate a service-account JSON key and expose its three fields as environment variables so the `requireAuth` middleware can verify ID tokens server-side.

**WHY.** The code in `server-auth` commit `f6a96f7` and `api-auth` commit `1ebeeaf` calls `admin.auth().verifyIdToken()` inside every `/api/*` route. Without the three env vars below, the `firebase-admin` SDK fails to initialize and every API route returns 401 — including `send-email`, the various `cron-*` routes, FCM token registration, and the reverse-geocode proxy. Effectively the entire server tier is offline until this is set.

**STEPS.**

1. Firebase Console → gear icon → **Project Settings** → **Service Accounts** tab.
2. Confirm the language toggle is on **Node.js**, then click **Generate new private key**. Confirm the modal warning, then save the downloaded JSON somewhere secure (a password manager vault, not the repo, not Drive).
3. Open the JSON. Extract three fields:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`
4. For the private key, keep the literal `\n` escape sequences in place rather than converting them to real newlines. The init code in `src/lib/firebase-admin.ts` does `privateKey.replace(/\\n/g, '\n')` at runtime.
5. Set the env vars in the hosting environment:
   - **Firebase App Hosting** (the path this project uses): open `apphosting.yaml` and add under `env:`
     ```yaml
     - variable: FIREBASE_ADMIN_PROJECT_ID
       value: studio-9568416614-6523a
     - variable: FIREBASE_ADMIN_CLIENT_EMAIL
       secret: firebase-admin-client-email
     - variable: FIREBASE_ADMIN_PRIVATE_KEY
       secret: firebase-admin-private-key
     ```
     Then create the secret values via:
     ```bash
     firebase apphosting:secrets:set firebase-admin-client-email
     firebase apphosting:secrets:set firebase-admin-private-key
     ```
   - Alternatively, define them under Firebase Console → App Hosting → backend → Settings → Environment variables.
6. Redeploy so the new env vars are picked up.
7. Treat the JSON key as a credential of last resort — rotate every 90 days via the same Service Accounts panel.

**VERIFY.**

- Hit any `/api/*` route with a valid Bearer ID token (grab one from devtools → Application → IndexedDB → `firebase-installations-database` or by calling `getIdToken()` in the console):
  ```bash
  curl -i -H "Authorization: Bearer <ID_TOKEN>" https://<host>/api/reverse-geocode?lat=33.5&lng=-7.6
  ```
  Expect HTTP 200. Without the env vars set, the same call returns 401 with a `firebase-admin not initialized` message in the server logs.

---

## 3. Provision Firebase App Check

**WHAT.** Register the web app with App Check using reCAPTCHA v3, then turn on enforcement for Firestore and Storage so requests from any client without a valid attestation token are rejected.

**WHY.** Even with locked-down security rules, an authenticated user could exfiltrate data they have legitimate access to via a scripted client (curl, headless browser, scraper). App Check binds requests to the official web app, raising the cost of automated abuse.

**STEPS.**

1. Visit https://www.google.com/recaptcha/admin/create. Register a new v3 site for the hosting domain and any custom domains. Copy the **site key** (public) and **secret key** (private).
2. Firebase Console → **App Check** → select the web app → **Register**. Pick **reCAPTCHA v3** as the provider, paste the secret key.
3. Set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to the site key in the hosting env vars (same place as Section 2). The client init in commit `9236310` is env-gated on this variable — App Check stays disabled until it is present.
4. In the App Check panel, the providers list for Firestore and Storage starts in **Unenforced** mode. Leave it unenforced for 24–48 hours and watch the **Verified requests / Unverified requests** chart.
5. Once verified-request percentage is consistently > 95%, click each service (Cloud Firestore, Cloud Storage) and switch to **Enforce**.
6. Defer enforcement on **Cloud Functions** until functions are confirmed to call App-Check-aware code paths, otherwise scheduled functions break.
7. Local development debug token:
   - In Chrome devtools console on `localhost`, run `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` then reload. A token UUID prints to the console.
   - In Firebase Console → App Check → web app → Manage debug tokens → Add token. Paste the UUID and give it a name like `Younes-Laptop`.

**VERIFY.**

- After enforcement, attempt a direct REST call to Firestore from a context without App Check:
  ```bash
  curl -i "https://firestore.googleapis.com/v1/projects/studio-9568416614-6523a/databases/(default)/documents/dossiers"
  ```
  Expect HTTP 401 / 403 even if you supply a valid auth token.
- The live app continues to function normally because the client SDK auto-attaches App Check tokens.

---

## 4. Firebase Auth password policy and lockout

**WHAT.** Tighten the default Firebase Auth password requirements and turn on the two abuse-prevention toggles.

**WHY.** The Firebase default minimum password length is 6 characters with no complexity rules — trivially brute-forceable. Email enumeration also defaults to leaking whether an email is registered via differential error messages. Account-abuse protection adds rate-limits to sign-in attempts so password-spray attacks slow to a crawl.

**STEPS.**

1. Firebase Console → **Authentication** → **Settings** tab → **Password policy**.
2. Set:
   - Minimum length: **12**
   - Require uppercase: **on**
   - Require lowercase: **on**
   - Require numeric: **on**
   - Require non-alphanumeric: optional (recommended on, but check sign-up flow for friction)
3. Same Settings tab → **User actions** → toggle **Email enumeration protection** to **on**. Sign-in errors then return a generic message regardless of whether the email exists.
4. Same tab → **User account abuse protection** → toggle **on**. This applies Google's adaptive rate-limits to sign-in attempts per IP and per account.
5. Communicate the new password length to active users — existing passwords are grandfathered, but next reset enforces the new rule.

**VERIFY.**

- Sign up a fresh test account with a 6-character password — expect `auth/password-does-not-meet-requirements`.
- Attempt to sign in to a nonexistent email three times — expect a generic `auth/invalid-credential` error, not `auth/user-not-found`.

---

## 5. MFA enforcement for Admin and Directeur roles

**WHAT.** Enable a second factor (TOTP or SMS) on the Auth tenant, then enroll all accounts with role `Admin` or `Directeur` manually.

**WHY.** Admin and Directeur roles have read-everything access and can mutate role assignments. A compromised password on those accounts is an immediate breach of every dossier. Operational roles can tolerate single-factor for now; high-privilege roles cannot.

**STEPS.**

1. Firebase Console → **Authentication** → **Sign-in method** → **Multi-factor authentication** → **Add**.
2. Choose **Time-based one-time password (TOTP)** as the first factor (works offline, no SMS cost, no SIM-swap risk). Optionally add SMS as a fallback for users without a TOTP app.
3. Click each Admin / Directeur user under **Users** tab → **Manage MFA** → enroll a factor on their behalf, or coordinate with each user to enroll via the app's account settings page.
4. **Caveat.** Firebase has no native per-role MFA enforcement — there is no rule like "deny sign-in for `Admin` without MFA". Recommended pattern is a client-side guard added later: read `multiFactor.enrolledFactors` after sign-in, and if the user's Firestore `role` is `Admin` or `Directeur` but the factor list is empty, force them to an enroll-or-sign-out screen. File this as a follow-up task.
5. Document the enrolled factors in the team password manager so a lost-device flow does not lock everyone out.

**VERIFY.**

- An Admin account that has enrolled TOTP is prompted for the code on next sign-in.
- The list under each user's **Manage MFA** view shows at least one factor for every Admin / Directeur.

---

## 6. Enable Cloud Audit Logs

**WHAT.** Turn on Data Access audit logs for Firestore and Storage in GCP Cloud Audit Logs.

**WHY.** Replaces the originally-considered "custom audit Cloud Function" approach. IAM Audit Logs capture the actor identity (UID via Firebase Auth integration) reliably, are tamper-resistant, and don't require code in the hot path. Without them, post-incident investigation cannot reconstruct who read what.

**STEPS.**

1. GCP Console → **IAM & Admin** → **Audit Logs**.
2. Filter the service list for `Cloud Firestore API`. Click it, then in the right panel tick **Data Read**, **Data Write**, and **Admin Read**. Save.
3. Repeat for `Cloud Storage` — tick Data Read, Data Write, Admin Read.
4. Default retention for the `_Default` log bucket is 30 days. For longer retention, GCP Console → **Logging** → **Logs Storage** → edit the `_Default` bucket and raise retention to 365+ days. Note that Data Access logs can be voluminous — budget accordingly.
5. Optionally create a log-based metric / alert in **Logging** → **Logs-based Metrics** for unusual patterns (e.g., > 1000 reads from a single UID in 5 minutes).

**VERIFY.**

- Trigger a Firestore read from the app, then GCP Console → **Logging** → **Logs Explorer** → query:
  ```
  protoPayload.serviceName="firestore.googleapis.com"
  protoPayload.methodName=~"Read"
  ```
  Confirm an entry appears with the calling user's UID in `protoPayload.authenticationInfo.principalEmail`.

---

## 7. Schedule Firestore backups

**WHAT.** Set up a daily managed-export backup of the entire Firestore database with 30+ day retention.

**WHY.** Security rules close the door on read; backups close the door on ransom and accidental destruction. A malicious or careless wipe of `dossiers/` is otherwise unrecoverable.

**STEPS.**

1. GCP Console → **Firestore** → **Backups** in the left sidebar.
2. Click **Set up schedule** → daily, retention 30 days. Choose a backup-window time during low traffic.
3. The destination bucket is auto-created (`gs://studio-9568416614-6523a-backups` or similar) — keep it separate from the main storage bucket.
4. Lock the backup bucket against deletion: GCP Console → **Cloud Storage** → backup bucket → **Protection** → enable **Bucket Lock** with the same retention period.
5. Restore runbook (keep accessible):
   ```bash
   # List available backups
   gcloud firestore backups list --location=us-central1

   # Restore a backup into a NEW database (never overwrite live)
   gcloud firestore databases restore \
     --source-backup=projects/studio-9568416614-6523a/locations/us-central1/backups/<BACKUP_ID> \
     --destination-database=restored-YYYY-MM-DD
   ```
6. Once a quarter, perform a dry-run restore into a throwaway database and spot-check `dossiers/lXObR07huwKAncITV3BI` exists. Untested backups are not backups.

**VERIFY.**

- 24 hours after enabling, the Backups panel shows a `SUCCESSFUL` entry with a non-zero document count.

---

## 8. Apply Storage CORS config

**WHAT.** Push a `cors.json` allowlist to the Storage bucket so only the listed origins can issue browser fetches.

**WHY.** Default Firebase Storage CORS is wide open — any origin can issue a fetch and have the browser surface the response. Restricting CORS doesn't replace rules (the URL is still reachable by curl), but it prevents a malicious site from rendering JPG previews in a victim's authenticated session.

**STEPS.**

1. From the `cors.json` committed in `storage-cors` commit `937b425`, confirm the `origin` list covers production hosting domains and any preview channels in active use.
2. Apply via `gsutil`:
   ```bash
   gsutil cors set cors.json gs://studio-9568416614-6523a.firebasestorage.app
   ```
3. To add a new custom domain later, edit `cors.json`, add the origin, and re-run the same `gsutil cors set` command.
4. Do not include `"*"` in the origin list. If a third-party tool needs read access, generate a signed URL instead.

**VERIFY.**

- Read the live config back:
  ```bash
  gsutil cors get gs://studio-9568416614-6523a.firebasestorage.app
  ```
  Expect the response to match `cors.json` exactly.
- From browser devtools console on a non-allowlisted origin, run `fetch('https://firebasestorage.googleapis.com/v0/b/.../o/dossiers...')` and confirm a CORS error in the console.

---

## 9. Rotate Storage download tokens for known-leaked files

**WHAT.** Invalidate the download tokens on files whose URLs are known or suspected to have escaped — most importantly the file in the original report.

**WHY.** A Storage download token is permanent until rotated, even after rules tighten — Firebase honors the token regardless of the caller's auth state. The original leak file at `dossiers/lXObR07huwKAncITV3BI/documents/1778683207442_img160.jpg` had its URL distributed; the token on it is therefore considered burnt.

**STEPS.**

1. Targeted approach (recommended). Re-upload the file via the app's normal upload flow. Each upload generates a fresh token and orphans the previous one. Specifically:
   - Open the dossier `lXObR07huwKAncITV3BI` in the app.
   - Delete the file `1778683207442_img160.jpg` from the dossier UI (this triggers `delete` permission via Storage rules).
   - Re-upload the same JPG.
2. Console approach. Firebase Console → **Storage** → navigate to `dossiers/lXObR07huwKAncITV3BI/documents/` → click the file → **File location** panel → next to **Download URL**, click **Create new download token** (and revoke the old one via the same menu).
3. Mass rotation is **not** recommended. The bucket holds thousands of dossier documents; rotating all tokens en masse would break every existing in-app reference until the client re-fetches. Limit rotation to files with confirmed or suspected external exposure.
4. Build a list of suspect files from `_Default` Cloud Logging if available (Section 6): query `protoPayload.resourceName=~"dossiers/.+/documents/"` filtered to anonymous principals over the last 90 days.

**VERIFY.**

- Re-open the original leak URL in incognito — expect HTTP 403 (rules block) **and** the token in the URL is no longer valid (would also 403 even without rules).

---

## 10. Switch CSP from report-only to enforcement

**WHAT.** Once the report-only CSP runs clean for several days, flip the header name from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` so violations are blocked rather than just logged.

**WHY.** Enforced CSP is the only browser-level defense against an XSS payload exfiltrating data to an attacker-controlled host. Until enforced, it logs and forgets — useful as a discovery tool, not as a mitigation.

**STEPS.**

1. Confirm `next.config.ts` currently emits `Content-Security-Policy-Report-Only` (from `security-headers` commit `e155a68`).
2. For 3–7 days, monitor:
   - Browser devtools console → look for `[Report Only] Refused to ...` warnings during normal app use. Click through every major flow: login, dossier create, photo upload, PDF export, FCM registration, map view, chat.
   - If a reporting endpoint is configured, check its dashboard for violation entries.
3. For each genuine violation, either:
   - Add the source to the CSP directive in `next.config.ts` (e.g., extra hostname to `connect-src`), or
   - Remove the inline `script` / `style` / `<img src="data:...">` from the offending component.
4. Once devtools is silent across all flows, change the header key in `next.config.ts`:
   ```ts
   { key: 'Content-Security-Policy', value: cspValue }
   ```
   (Drop the `-Report-Only` suffix.) Commit, deploy.
5. After deploy, walk through the same flows once more on production. If a real violation slipped through, the page breaks — be prepared to hotfix-revert.

**VERIFY.**

- Curl the response headers of a production page and confirm `Content-Security-Policy:` (no `-Report-Only`) is present:
  ```bash
  curl -sI https://<host>/ | grep -i content-security-policy
  ```
- Inject a test inline script via devtools → expect `Refused to execute inline script` and a blocked execution (not just a warning).

---

## 11. Run `npm run audit:security` regularly

**WHAT.** Periodically execute the audit script added in commit `9f4715b` and act on the findings.

**WHY.** As of the audit at branch creation, the repo had 47 npm vulnerabilities including 3 critical: `protobufjs` (prototype pollution chain via `firebase-admin` transitive), `handlebars` (RCE in template compilation, transitive via genkit or similar). Vulns accumulate fast in a Next.js + Firebase + AI stack. Without CI, this is the only forcing function.

**STEPS.**

1. Run weekly:
   ```bash
   npm run audit:security
   ```
2. For auto-fixable findings:
   ```bash
   npm audit fix
   ```
   Then re-run the typecheck and a smoke build to confirm nothing regressed.
3. For findings that require a major version bump (no auto-fix), schedule a dependency upgrade ticket. Track them in a `SECURITY-DEBT.md` if a tracker isn't set up. Critical-severity findings get priority — ship a fix within 7 days.
4. When CI is eventually set up (e.g., GitHub Actions), wire the audit script into the pipeline and fail the build on critical findings.

**VERIFY.**

- After each `npm audit fix`, the script's summary line reports `0 critical, 0 high` (or a documented reason for any remaining items, e.g., pinned by a Firebase SDK).

---

## 12. Review SMTP credentials

**WHAT.** Audit the `SMTP_USER` and `SMTP_PASS` env vars consumed by `/api/send-email`, and rotate or replace them.

**WHY.** If the SMTP credentials belong to a personal Gmail or a shared mailbox, every outbound email from the app authenticates as that human's identity. Compromise of the credential = full inbox access on a personal account. Also, Gmail rate-limits transactional sending and may silently drop bursts.

**STEPS.**

1. Locate the current values in the hosting env config (Firebase App Hosting → Backend → Settings → Environment variables, or `apphosting.yaml` secrets).
2. If `SMTP_USER` points at a personal Gmail (`@gmail.com` outside the workspace) or a generic shared mailbox:
   - Create a dedicated transactional sender. Two options:
     - **Workspace mailbox.** `noreply@slaouiglobal.com` with an app-password generated specifically for SMTP. Better for low volume.
     - **Transactional provider.** SendGrid / Postmark / Resend. Better for deliverability at scale and gives bounce/complaint webhooks. SendGrid free tier covers low volume.
   - Update `SMTP_USER`, `SMTP_PASS`, and if needed `SMTP_HOST` / `SMTP_PORT` to point at the new sender. For SendGrid: `smtp.sendgrid.net:587`, user `apikey`, pass = API key.
3. Regardless of provider, rotate the password / API key immediately if there is any reason to suspect exposure (commit history scan, shared screenshots, leaked .env).
4. Confirm `/api/send-email` is the only consumer of the SMTP credentials by grepping the repo for `SMTP_USER`. If other call sites exist, audit them too.

**VERIFY.**

- Trigger an outbound email via the app's normal flow. Confirm the email arrives, the `From:` header is the new sender, and DKIM passes in the recipient's view-original.

---

## 13. PWA service worker cache audit

**WHAT.** Open the browser devtools on a deployed page and confirm the service worker (`public/sw.js`) is not caching authenticated `/api/*` responses.

**WHY.** Service workers cache responses by URL; if `/api/dossiers` ends up in the SW cache, a different user signing into the same browser sees the prior user's data until the cache evicts. On shared kiosk-style devices (common in operational settings), this is a multi-user data leak that bypasses every other control listed in this document.

**STEPS.**

1. Deploy the latest service worker.
2. Sign into the app as a test user. Walk through several flows that hit `/api/*` (e.g., send-email, reverse-geocode).
3. Open Chrome devtools → **Application** tab → **Service Workers** in the sidebar. Confirm the active worker matches the deployed `sw.js`.
4. Same tab → **Cache Storage** in the sidebar. Expand each cache entry (`workbox-runtime-...`, `static-assets-...`, etc.) and visually scan for any entry whose request URL starts with `/api/`.
5. If any are found, edit `public/sw.js` (or the workbox config that generates it) to add a `denylist` / `urlPattern` exclusion for `/api/` from the runtime caching strategies. Re-deploy.
6. Recommended SW pattern for API calls is `NetworkOnly` (no cache) or `NetworkFirst` with a very short max-age and the `Vary: Authorization` response header set server-side.
7. While in the same panel, scan for cached responses that contain PII in their URL (e.g., dossier IDs in query strings) — same risk applies.

**VERIFY.**

- After the cleanup, return to devtools → Cache Storage. No entries with `/api/` in the URL.
- Sign out, sign in as a different test user, navigate to a fetched route. Network panel shows a fresh request (status 200, not "from ServiceWorker") for `/api/*` calls.

---

## Done checklist

- [ ] Section 1 — leak URL returns 403 in incognito
- [ ] Section 2 — `/api/*` returns 200 with Bearer token
- [ ] Section 3 — App Check enforcement on Firestore + Storage
- [ ] Section 4 — password policy + abuse protection on
- [ ] Section 5 — every Admin / Directeur has MFA enrolled
- [ ] Section 6 — Data Access logs flowing in Logs Explorer
- [ ] Section 7 — first successful daily backup recorded
- [ ] Section 8 — `gsutil cors get` matches `cors.json`
- [ ] Section 9 — original leak file re-uploaded, old token dead
- [ ] Section 10 — CSP enforcing (header name has no `-Report-Only`)
- [ ] Section 11 — `npm run audit:security` clean for critical
- [ ] Section 12 — SMTP sender rotated / migrated to transactional
- [ ] Section 13 — no `/api/` entries in service worker Cache Storage
