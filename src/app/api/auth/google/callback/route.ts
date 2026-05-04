import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getOAuth2Client } from '@/lib/gmail-client';
import { initializeFirebase } from '@/firebase';

/**
 * GET /api/auth/google/callback?code={code}&state={uid}
 *
 * Exchanges the OAuth `code` for tokens, persists the refresh token at
 * `users/{uid}/integrations/gmail`, then redirects the user back to /dossiers.
 *
 * TODO(admin): swap to Firebase Admin in production. The client SDK is used
 * here because Firebase Admin is not configured in this repo.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing required query params: code and state' },
      { status: 400 }
    );
  }

  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    return NextResponse.json(
      {
        error:
          'No refresh_token returned by Google. The user may have already granted consent; revoke access and retry, or ensure prompt=consent is set.',
      },
      { status: 400 }
    );
  }

  const { db } = initializeFirebase();
  const tokenRef = doc(db, 'users', state, 'integrations', 'gmail');
  await setDoc(tokenRef, {
    refreshToken: tokens.refresh_token,
    scope: tokens.scope,
    obtainedAt: serverTimestamp(),
  });

  return NextResponse.redirect(new URL('/dossiers', request.url));
}
