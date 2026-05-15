import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';

initializeApp();

const INVALID_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export const sendLocationRequestNotification = onDocumentCreated(
  {
    document: 'location_requests/{requestId}',
    region: 'europe-west1',
  },
  async (event) => {
    const data = event.data?.data();
    const agentUid: string | undefined = data?.agentUid;
    if (!agentUid) {
      logger.warn('location_request without agentUid', { requestId: event.params.requestId });
      return;
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(agentUid);
    const userSnap = await userRef.get();
    const tokens: string[] = userSnap.get('fcmTokens') ?? [];

    if (tokens.length === 0) {
      logger.info('no fcm tokens registered for agent', { agentUid });
      return;
    }

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Demande de position',
        body: 'Le gestionnaire vous demande votre position actuelle.',
      },
      data: {
        type: 'location_request',
        requestId: event.params.requestId,
      },
      webpush: {
        notification: {
          icon: '/images/auto-expertise.png',
          badge: '/images/auto-expertise.png',
          requireInteraction: false,
        },
        fcmOptions: {
          link: '/',
        },
      },
    });

    const invalidTokens: string[] = [];
    response.responses.forEach((r, i) => {
      if (!r.success && r.error && INVALID_TOKEN_ERRORS.has(r.error.code)) {
        invalidTokens.push(tokens[i]);
      }
    });

    if (invalidTokens.length > 0) {
      await userRef.update({
        fcmTokens: FieldValue.arrayRemove(...invalidTokens),
      });
      logger.info('removed invalid fcm tokens', { agentUid, count: invalidTokens.length });
    }

    logger.info('location request push sent', {
      agentUid,
      requestId: event.params.requestId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  },
);
