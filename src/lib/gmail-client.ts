/**
 * gmail-client
 *
 * Helpers for the Gmail OAuth flow (slice 2 of the Gmail integration).
 *
 * Required environment variables:
 *   - GOOGLE_OAUTH_CLIENT_ID      OAuth 2.0 client id from Google Cloud Console
 *   - GOOGLE_OAUTH_CLIENT_SECRET  OAuth 2.0 client secret
 *   - GOOGLE_OAUTH_REDIRECT_URI   Must match exactly the redirect URI registered
 *                                 with the OAuth client (the
 *                                 `/api/auth/google/callback` route).
 *
 * Token storage layout (Firestore):
 *   users/{uid}/integrations/gmail  (single doc, NOT a subcollection)
 *     { refreshToken: string, scope: string, obtainedAt: Timestamp }
 *
 * TODO(admin): swap to Firebase Admin in production. We use the client SDK
 * here because Firebase Admin is not configured in this repo. App Router
 * route handlers run server-side, so the client SDK works at runtime as long
 * as Firestore security rules permit the writes/reads, but in production we
 * should re-issue these calls with the Admin SDK and a service account.
 */

import { google, type gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[gmail-client] Missing required environment variable: ${name}`
    );
  }
  return value;
}

/**
 * Builds a fresh OAuth2 client from environment variables.
 * Throws a clear error if any of the required env vars is missing.
 */
export function getOAuth2Client(): OAuth2Client {
  const clientId = requireEnv('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_OAUTH_CLIENT_SECRET');
  const redirectUri = requireEnv('GOOGLE_OAUTH_REDIRECT_URI');

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Loads the stored refresh token for `uid` from Firestore at
 * `users/{uid}/integrations/gmail`, sets credentials on a fresh OAuth2 client
 * and returns a Gmail API client bound to it.
 *
 * Throws if no token document exists for that user.
 */
export async function getGmailForUser(uid: string): Promise<gmail_v1.Gmail> {
  // TODO(admin): swap to Firebase Admin in production.
  const { db } = initializeFirebase();
  const tokenRef = doc(db, 'users', uid, 'integrations', 'gmail');
  const snap = await getDoc(tokenRef);

  if (!snap.exists()) {
    throw new Error('Gmail not authorized for user');
  }

  const data = snap.data() as { refreshToken?: string };
  if (!data.refreshToken) {
    throw new Error('Gmail not authorized for user');
  }

  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: data.refreshToken });

  return google.gmail({ version: 'v1', auth: client });
}
