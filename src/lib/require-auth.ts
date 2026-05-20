import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';

import { adminAuth } from './firebase-admin';

export type AuthContext = { uid: string; token: DecodedIdToken };

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const header = req.headers.get('authorization') ?? '';

  if (!header.startsWith('Bearer ')) {
    throw new AuthError('Missing or malformed Authorization header', 401);
  }

  const idToken = header.slice('Bearer '.length).trim();

  if (!idToken) {
    throw new AuthError('Empty bearer token', 401);
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth().verifyIdToken(idToken, true);
  } catch (cause) {
    const err = new AuthError('Invalid or expired token', 401);
    (err as AuthError & { cause?: unknown }).cause = cause;
    throw err;
  }

  return { uid: decoded.uid, token: decoded };
}

export function authErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return null;
}
