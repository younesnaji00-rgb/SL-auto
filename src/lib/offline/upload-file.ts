import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Firestore } from 'firebase/firestore';
import { enqueueUpload } from './upload-queue';

const MAX_OFFLINE_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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
      await addDoc(collection(db, firestoreDocPath), {
        ...firestoreMetadata,
        url,
        dateUpload: serverTimestamp(),
      });

      return { queued: false, url };
    } catch {
      // Network failed mid-upload — fall through to offline queue
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

  return { queued: true, placeholderDocId: placeholderRef.id };
}
