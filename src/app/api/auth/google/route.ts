import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/gmail-client';

/**
 * GET /api/auth/google?uid={uid}
 *
 * Generates the Google OAuth consent URL and redirects the user to it.
 * The `uid` is round-tripped through `state` so the callback knows which
 * Firestore user document to write the refresh token under.
 */
export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid');
  if (!uid) {
    return NextResponse.json(
      { error: 'Missing required query param: uid' },
      { status: 400 }
    );
  }

  const client = getOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.compose'],
    state: uid,
  });

  return NextResponse.redirect(url);
}
