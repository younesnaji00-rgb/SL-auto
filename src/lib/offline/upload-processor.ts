import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, addDoc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Firestore } from 'firebase/firestore';
import { getAllPending, dequeueUpload, updateQueueItem } from './upload-queue';

const MAX_RETRIES = 5;

type SyncListener = () => void;
const listeners: Set<SyncListener> = new Set();

export function onSyncChange(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

class UploadProcessor {
  private processing = false;

  async processQueue(storage: FirebaseStorage, db: Firestore): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const pending = await getAllPending();

      for (const item of pending) {
        if (item.retryCount >= MAX_RETRIES) continue;

        try {
          await updateQueueItem(item.id, { status: 'uploading' });

          // 1. Upload file to Firebase Storage
          const fileRef = ref(storage, item.storagePath);
          await uploadBytes(fileRef, item.fileBlob);
          const downloadURL = await getDownloadURL(fileRef);

          // 2. Update the placeholder Firestore doc with real URL if a placeholderDocId exists
          if (item.firestoreMetadata._placeholderDocId) {
            const placeholderId = item.firestoreMetadata._placeholderDocId;
            const docRef = doc(db, item.firestoreDocPath, placeholderId);
            await updateDoc(docRef, {
              url: downloadURL,
              pendingUpload: deleteField(),
              dateUpload: serverTimestamp(),
            });
          } else {
            // No placeholder — create a new doc
            const { _placeholderDocId, ...metadata } = item.firestoreMetadata;
            await addDoc(collection(db, item.firestoreDocPath), {
              ...metadata,
              url: downloadURL,
              dateUpload: serverTimestamp(),
            });
          }

          // 3. Remove from queue
          await dequeueUpload(item.id);
          notifyListeners();
        } catch (err) {
          console.warn(`[UploadProcessor] Failed to process ${item.fileName}:`, err);
          await updateQueueItem(item.id, {
            status: 'failed',
            retryCount: item.retryCount + 1,
          });
        }
      }
    } finally {
      this.processing = false;
      notifyListeners();
    }
  }
}

export const uploadProcessor = new UploadProcessor();
