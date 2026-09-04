import 'server-only';

import {
  getApps,
  getApp,
  initializeApp,
  cert,
  applicationDefault,
  type App,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  if (getApps().length) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
  });
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/**
 * OAuth2 access token of the admin credential (service account / ADC).
 * Lets server code call Google REST APIs — the demo-reset route feeds it to
 * the seed module, which writes through the Firestore REST API.
 */
export async function adminAccessToken(): Promise<string> {
  const cred = getAdminApp().options.credential;
  if (!cred) throw new Error('No admin credential available');
  const { access_token: token } = await cred.getAccessToken();
  if (!token) throw new Error('Admin credential returned no access token');
  return token;
}
