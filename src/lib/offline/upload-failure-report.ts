/**
 * Unsent files, visible beyond the device that holds them (owner request
 * 2026-10-14: « me and the user shall need what files in what dossiers didn't
 * send »).
 *
 * A file the queue gave up on lives in THAT device's IndexedDB only; nobody
 * else could know it was missing. Each one is now mirrored to
 * `upload_failures/{queueItemId}` — who, which device, which dossier and slot,
 * why, how many attempts — and the mirror is removed when the file finally
 * goes, or when it is dropped. The file itself can only be sent from the
 * device that holds it.
 */

import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import type { PendingUpload } from './upload-queue';
import { describeUploadFailure, dossierIdOfPath } from './upload-status';

export const UPLOAD_FAILURES = 'upload_failures';

/** Who is signed in on this device — set by useOfflineSync. */
export interface UploadReporter {
  uid: string;
  nom?: string;
  email?: string;
  role?: string;
}

/** The `upload_failures` document. */
export interface UploadFailureReport {
  uid: string;
  userName: string;
  userEmail: string | null;
  userRole: string | null;
  device: string;
  dossierId: string | null;
  docPath: string;
  placeholderId: string | null;
  fileName: string;
  fileSize: number;
  contentType: string;
  /** « photo », « document », « pièce jointe » or « devis ». */
  kind: UploadKind;
  /** The photo phase or the document slot (« avant », « Devis Garage »). */
  slot: string | null;
  attempts: number;
  lastError: string | null;
  lastErrorCode: string | null;
  /** French sentence, as the device's list says it. */
  reason: string;
  queuedAt: Timestamp;
  lastAttemptAt: Timestamp | null;
  reportedAt: unknown;
}

export type UploadKind = 'photo' | 'document' | 'pièce jointe' | 'devis';

/** What the queued file was meant to become. */
export function uploadKindOf(item: Pick<PendingUpload, 'firestoreDocPath'>): UploadKind {
  const p = item.firestoreDocPath ?? '';
  if (p.endsWith('/photos')) return 'photo';
  if (p.endsWith('/_pending_attachments')) return 'pièce jointe';
  if (p.startsWith('chiffrages')) return 'devis';
  return 'document';
}

/** The photo phase or the document slot the file was dropped into. */
export function uploadSlotOf(item: Pick<PendingUpload, 'firestoreMetadata'>): string | null {
  const m = item.firestoreMetadata ?? {};
  const v = m.type ?? m.typeDocument ?? m.category ?? null;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

const PHOTO_PHASES: Record<string, string> = { avant: 'avant', en_cours: 'en cours', apres: 'après' };

/** « Photo · avant », « Devis Garage », « Pièce jointe » — what the file was meant to be. */
export function uploadWhatLabel(kind: UploadKind, slot: string | null): string {
  if (kind === 'photo') return slot ? `Photo · ${PHOTO_PHASES[slot] ?? slot.replace(/_/g, ' ')}` : 'Photo';
  if (kind === 'pièce jointe') return 'Pièce jointe d’un commentaire';
  if (kind === 'devis') return slot ? `Devis du chiffreur · ${slot}` : 'Devis du chiffreur';
  return slot ?? 'Document';
}

/** « Android · Chrome », « Windows · Edge » — enough to tell two devices apart. */
export function deviceLabel(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string {
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iPhone / iPad'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'Mac'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Appareil inconnu';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /SamsungBrowser/i.test(ua)
      ? 'Samsung Internet'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : '';
  return browser ? `${os} · ${browser}` : os;
}

export function buildUploadFailureReport(item: PendingUpload, who: UploadReporter): UploadFailureReport {
  const failure = describeUploadFailure(item);
  return {
    uid: who.uid,
    userName: (who.nom || who.email || who.uid).trim(),
    userEmail: who.email ?? null,
    userRole: who.role ?? null,
    device: deviceLabel(),
    dossierId: dossierIdOfPath(item.firestoreDocPath),
    docPath: item.firestoreDocPath,
    placeholderId: item.firestoreMetadata?._placeholderDocId ?? null,
    fileName: item.fileName,
    fileSize: item.fileSize ?? 0,
    contentType: item.contentType ?? '',
    kind: uploadKindOf(item),
    slot: uploadSlotOf(item),
    attempts: item.retryCount,
    lastError: item.lastError ?? null,
    lastErrorCode: item.lastErrorCode ?? null,
    reason: failure.reason,
    queuedAt: Timestamp.fromMillis(item.createdAt || Date.now()),
    lastAttemptAt: item.lastAttemptAt ? Timestamp.fromMillis(item.lastAttemptAt) : null,
    reportedAt: serverTimestamp(),
  };
}

/** Writes (or refreshes) the report of an abandoned file. Never throws. */
export async function reportUploadFailure(db: Firestore, item: PendingUpload, who: UploadReporter | null): Promise<boolean> {
  if (!who?.uid) return false;
  try {
    await setDoc(doc(db, UPLOAD_FAILURES, item.id), buildUploadFailureReport(item, who));
    return true;
  } catch (err) {
    console.warn('[upload-failure-report] report failed:', err);
    return false;
  }
}

/** The file went, or was dropped: its report goes too. Never throws, never waits for the server. */
export function clearUploadFailure(db: Firestore, itemId: string): void {
  void deleteDoc(doc(db, UPLOAD_FAILURES, itemId)).catch(() => {});
}
