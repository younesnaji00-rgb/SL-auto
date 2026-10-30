import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, doc, addDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Firestore } from 'firebase/firestore';
import { getAllPending, dequeueUpload, updateQueueItem, type PendingUpload } from './upload-queue';
import { MAX_UPLOAD_ATTEMPTS, dossierIdOfPath, hasGivenUp, retryDelayMs } from './upload-status';
import { scanAndPersistVehicleIds, vehicleIdHintForSlot } from '@/lib/scan-vehicle-ids';
import { syncGarageDocs } from '@/lib/devis-extract';
import { isEditableDocType } from '@/lib/devis-schema';
import { clearUploadFailure, reportUploadFailure, type UploadReporter } from './upload-failure-report';

type SyncListener = () => void;
const listeners: Set<SyncListener> = new Set();

export function onSyncChange(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

const errorCode = (err: unknown): string | undefined => (err as { code?: string } | null)?.code;
const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

class UploadProcessor {
  private processing = false;
  // Asked to run while a run was going (a « Réessayer » mid-run): run again
  // when it ends instead of leaving the file for the next trigger.
  private rerun = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  // Who is signed in here: the reports of abandoned files carry it.
  private reporter: UploadReporter | null = null;
  // Abandoned files whose placeholder was already looked at this session.
  private reviewed = new Set<string>();

  setReporter(reporter: UploadReporter | null): void {
    this.reporter = reporter;
  }

  /**
   * An abandoned file, once per session: dropped from the list when nobody
   * waits for it any more (its document was deleted, or the slot got its
   * file from another device) — these used to stay in the red count forever.
   * Otherwise reported to `upload_failures` if it never was (the files
   * abandoned before the reports existed).
   */
  private async reviewGivenUp(db: Firestore, item: PendingUpload): Promise<void> {
    if (!this.reviewed.has(item.id)) {
      const placeholderId: string | undefined = item.firestoreMetadata?._placeholderDocId;
      if (placeholderId) {
        try {
          const snap = await getDoc(doc(db, item.firestoreDocPath, placeholderId));
          const data = snap.exists() ? snap.data() : null;
          this.reviewed.add(item.id);
          if (!data || (data.url && !data.pendingUpload)) {
            await dequeueUpload(item.id);
            clearUploadFailure(db, item.id);
            return;
          }
        } catch {
          // Unreachable for now: look again on the next run.
        }
      } else {
        this.reviewed.add(item.id);
      }
    }
    if (!item.reportedAt && this.reporter) {
      if (await reportUploadFailure(db, item, this.reporter)) {
        await updateQueueItem(item.id, { reportedAt: Date.now() });
      }
    }
  }

  async processQueue(storage: FirebaseStorage, db: Firestore): Promise<void> {
    if (this.processing) {
      this.rerun = true;
      return;
    }
    // Nothing to gain while offline — and every attempt used to count toward
    // the limit, so five quick tries on a dead connection abandoned the
    // file for good (QA bug AT 003). useOfflineSync runs the queue again on
    // the offline → online flip.
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.processing = true;
    // Shortest wait among the files that failed this run and have attempts
    // left. Nothing re-ran the queue before the next reload, so the banner
    // said « en cours d'envoi » about files nobody was sending (2026-10-05).
    let nextDelay: number | null = null;

    try {
      const pending = await getAllPending();

      for (const item of pending) {
        // Given up: waits for the user's « Réessayer » or « Supprimer ».
        if (hasGivenUp(item)) {
          await this.reviewGivenUp(db, item).catch(() => {});
          continue;
        }
        const placeholderId: string | undefined = item.firestoreMetadata?._placeholderDocId;
        const placeholderRef = placeholderId ? doc(db, item.firestoreDocPath, placeholderId) : null;

        try {
          await updateQueueItem(item.id, { status: 'uploading', lastAttemptAt: Date.now() });

          if (placeholderRef) {
            const snap = await getDoc(placeholderRef);
            const data = snap.exists() ? snap.data() : null;
            // Its document was deleted meanwhile (from its slot, or with the
            // dossier): nobody waits for this file any more. Or another tab
            // of this browser already sent it.
            if (!data || (data.url && !data.pendingUpload)) {
              await dequeueUpload(item.id);
              if (item.reportedAt) clearUploadFailure(db, item.id);
              continue;
            }
          }

          // 1. Upload file to Firebase Storage
          const fileRef = ref(storage, item.storagePath);
          await uploadBytes(fileRef, item.fileBlob);
          const downloadURL = await getDownloadURL(fileRef);

          // 2. Update the placeholder Firestore doc with real URL if a placeholderDocId exists
          if (placeholderRef) {
            try {
              await updateDoc(placeholderRef, {
                url: downloadURL,
                pendingUpload: deleteField(),
                uploadFailed: deleteField(),
                uploadError: deleteField(),
                dateUpload: serverTimestamp(),
              });
            } catch (err) {
              if (errorCode(err) !== 'not-found') throw err;
              // Deleted while the file was on its way: drop the copy just sent.
              await deleteObject(fileRef).catch(() => {});
            }
          } else {
            // No placeholder — create a new doc
            const { _placeholderDocId, ...metadata } = item.firestoreMetadata ?? {};
            await addDoc(collection(db, item.firestoreDocPath), {
              ...metadata,
              url: downloadURL,
              dateUpload: serverTimestamp(),
            });
          }

          // 3. Remove from queue — and from the list of unsent files others see.
          await dequeueUpload(item.id);
          if (item.reportedAt) clearUploadFailure(db, item.id);
          // An odometer / constructor-plate photo taken offline is read now
          // that it went (the read at capture time had no network).
          const idHint = vehicleIdHintForSlot(item.firestoreMetadata?.type);
          const idDossier = dossierIdOfPath(item.firestoreDocPath);
          if (idHint && idDossier) {
            void scanAndPersistVehicleIds({ db, storage, dossierId: idDossier, sources: [{ blob: item.fileBlob, name: item.fileName }], hint: idHint });
          }
          // A garage devis / facture sent late is read like one sent at once
          // (QA Chiffreur #012): into the dossier's table and its chiffrage's.
          const slotType = item.firestoreMetadata?.type;
          if (idDossier && typeof slotType === 'string' && isEditableDocType(slotType)) {
            void syncGarageDocs({ db, storage, dossierId: idDossier, docType: slotType, added: [{ storagePath: item.storagePath, name: item.fileName }] });
          }
        } catch (err) {
          console.warn(`[UploadProcessor] Failed to process ${item.fileName}:`, err);
          const offline = typeof navigator !== 'undefined' && !navigator.onLine;
          const retryCount = offline ? item.retryCount : item.retryCount + 1;
          const failed = { status: 'failed' as const, retryCount, lastError: errorMessage(err), lastErrorCode: errorCode(err) };
          await updateQueueItem(item.id, failed);
          if (hasGivenUp({ retryCount })) {
            // Tell the others (the owner, an admin): the file stays on this
            // device only. Not awaited, for the same stalled-connection reason.
            void reportUploadFailure(db, { ...item, ...failed, lastAttemptAt: Date.now() }, this.reporter)
              .then((ok) => (ok ? updateQueueItem(item.id, { reportedAt: Date.now() }) : undefined))
              .catch(() => {});
            // Out of attempts: say so on the placeholder instead of leaving it
            // « En attente… » forever with the pièce silently missing.
            // Not awaited: on a stalled connection the acknowledgement never
            // comes and the queue would stay locked until the next reload.
            if (placeholderRef) {
              void updateDoc(placeholderRef, {
                uploadFailed: true,
                uploadError: errorMessage(err),
              }).catch(() => {});
            }
          } else if (!offline) {
            const wait = retryDelayMs(retryCount);
            nextDelay = nextDelay === null ? wait : Math.min(nextDelay, wait);
          }
        } finally {
          notifyListeners();
        }
      }
    } finally {
      this.processing = false;
      notifyListeners();
      if (this.rerun) {
        this.rerun = false;
        void this.processQueue(storage, db).catch(() => {});
      } else if (nextDelay !== null) {
        this.timer = setTimeout(() => {
          this.timer = null;
          void this.processQueue(storage, db).catch(() => {});
        }, nextDelay);
      }
    }
  }

  /**
   * « Réessayer » on files the queue gave up on: ONE more attempt, now. A
   * failure puts them straight back on the list with the new reason instead
   * of hiding them behind another round of automatic retries. Resolves once
   * the files are back in the queue, not when they are sent: an upload on a
   * weak connection can take minutes (the SDK itself retries for up to 10),
   * and the list must not stay frozen that long.
   */
  async retry(storage: FirebaseStorage, db: Firestore, items: PendingUpload[]): Promise<void> {
    for (const item of items) {
      await updateQueueItem(item.id, { status: 'pending', retryCount: MAX_UPLOAD_ATTEMPTS - 1 });
      const placeholderId: string | undefined = item.firestoreMetadata?._placeholderDocId;
      if (placeholderId) {
        // Its slot reads « En attente… » again while the file is retried.
        void updateDoc(doc(db, item.firestoreDocPath, placeholderId), {
          uploadFailed: deleteField(),
          uploadError: deleteField(),
        }).catch(() => {});
      }
    }
    notifyListeners();
    void this.processQueue(storage, db).catch(() => {});
  }

  /**
   * « Supprimer »: the file leaves this device for good, and so does the
   * placeholder that stood for it in the dossier — a document with no file
   * behind it only makes people wait for it. Returns the placeholder's data
   * when one was removed, for the caller's audit trail.
   */
  async discard(storage: FirebaseStorage, db: Firestore, item: PendingUpload): Promise<Record<string, any> | null> {
    const placeholderId: string | undefined = item.firestoreMetadata?._placeholderDocId;
    let removed: Record<string, any> | null = null;
    let sent = false;
    if (placeholderId) {
      const placeholderRef = doc(db, item.firestoreDocPath, placeholderId);
      const snap = await getDoc(placeholderRef).catch(() => null);
      const data = snap?.exists() ? snap.data() : null;
      sent = Boolean(data?.url) && !data?.pendingUpload;
      if (data && !sent) {
        removed = data;
        // Not awaited: applied locally at once and synced when the connection
        // allows — the button must not hang on a device that is offline.
        void deleteDoc(placeholderRef).catch((err) => console.warn('[UploadProcessor] placeholder delete failed:', err));
      }
    }
    // The path belongs to this upload alone; an attempt that died after the
    // upload itself leaves a file nothing points at.
    if (!sent) void deleteObject(ref(storage, item.storagePath)).catch(() => {});
    await dequeueUpload(item.id);
    clearUploadFailure(db, item.id);
    notifyListeners();
    return removed;
  }
}

export const uploadProcessor = new UploadProcessor();
