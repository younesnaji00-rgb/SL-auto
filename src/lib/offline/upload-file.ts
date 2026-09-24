import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Firestore } from 'firebase/firestore';
import { enqueueUpload } from './upload-queue';
import { uploadProcessor } from './upload-processor';

const MAX_OFFLINE_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/** Storage error codes that mean "the wire dropped", not "the server said no". */
const NETWORK_STORAGE_CODES = new Set([
  'storage/retry-limit-exceeded',
  'storage/canceled',
  'storage/server-file-wrong-size',
  'unavailable',
]);

export function isNetworkFailure(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const code = (err as { code?: string } | null)?.code;
  if (code && NETWORK_STORAGE_CODES.has(code)) return true;
  // No blanket `TypeError` rule any more (QA bug AT 003): any programming
  // error is a TypeError too, and treating it as « offline » queued a
  // placeholder and toasted success for an upload that could never happen.
  // Real transport failures still match on their message below.
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return msg.includes('network') || msg.includes('failed to fetch');
}

export interface UploadFileParams {
  storage: FirebaseStorage;
  db: Firestore;
  file: File | Blob;
  fileName: string;
  storagePath: string;
  firestoreDocPath: string;
  firestoreMetadata: Record<string, any>;
}

export interface UploadFileResult {
  queued: boolean;
  url?: string;
  placeholderDocId?: string;
  /**
   * Id of the Firestore metadata doc that was created for this upload.
   * Populated for both online uploads and queued (offline) uploads — the
   * offline placeholder doc is the same doc that will be updated once the
   * queued upload completes, so its id is stable.
   */
  docId?: string;
}

export async function uploadFileWithOfflineSupport(
  params: UploadFileParams
): Promise<UploadFileResult> {
  const { storage, db, file, fileName, storagePath, firestoreDocPath, firestoreMetadata } = params;

  if (navigator.onLine) {
    try {
      // Try direct upload
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // Save metadata to Firestore
      const docRef = await addDoc(collection(db, firestoreDocPath), {
        ...firestoreMetadata,
        url,
        dateUpload: serverTimestamp(),
      });

      return { queued: false, url, docId: docRef.id };
    } catch (err) {
      // Only a *network* failure earns the offline queue. Anything else
      // (Storage rules, wrong bucket, CORS, quota…) would be retried up to
      // 5 times against the same wall and leave a URL-less placeholder
      // behind a "Document uploadé" toast — the slot then shows "Déposer"
      // again as if nothing happened. Surface those to the caller instead.
      if (!isNetworkFailure(err)) throw err;
      console.warn(`[upload] réseau indisponible pour "${fileName}", mise en file d'attente`, err);
    }
  }

  // Check file size limit for offline queue
  if (file.size > MAX_OFFLINE_FILE_SIZE) {
    throw new Error(
      `Le fichier "${fileName}" est trop volumineux pour la file d'attente hors ligne (max ${MAX_OFFLINE_FILE_SIZE / 1024 / 1024} Mo).`
    );
  }

  // Create a placeholder Firestore doc so it appears in the UI immediately
  const placeholderRef = await addDoc(collection(db, firestoreDocPath), {
    ...firestoreMetadata,
    url: null,
    pendingUpload: true,
    dateUpload: serverTimestamp(),
    _localCreatedAt: Date.now(),
  });

  // Queue the file for upload when back online
  await enqueueUpload({
    fileBlob: file instanceof File ? file : file,
    fileName,
    fileSize: file.size,
    contentType: file instanceof File ? file.type : 'application/octet-stream',
    storagePath,
    firestoreDocPath,
    firestoreMetadata: {
      ...firestoreMetadata,
      _placeholderDocId: placeholderRef.id,
    },
  });

  // The sync hook only drains the queue on mount and on an offline→online
  // flip; an item enqueued mid-session would otherwise sit until a reload.
  // Fire-and-forget: if we're still offline the processor fails fast and the
  // network-status effect will pick it up later.
  void uploadProcessor.processQueue(storage, db).catch(() => {});

  return { queued: true, placeholderDocId: placeholderRef.id, docId: placeholderRef.id };
}
