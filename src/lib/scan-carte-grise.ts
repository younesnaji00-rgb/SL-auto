import { doc, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, type FirebaseStorage } from 'firebase/storage';

/**
 * Carte Grise scanner — fired from the typed-documents grid right after a file
 * lands in the `Carte grise` slot. Calls `/api/scan-carte-grise` and merges
 * the extracted matricule / matricule antérieur into the dossier so they show
 * up in the dossiers table without the gestionnaire having to type them.
 *
 * Behaviour:
 *  - Always overwrites: if the AI returns a value, it wins (consistent with
 *    the import-step rescan flow which removed the never-overwrite gate).
 *  - Skips a field whose extracted value equals the existing one (no-op write).
 *  - Best-effort: on failure logs and returns null; the upload itself never
 *    fails because the scan failed.
 */
export async function scanAndPersistCarteGrise({
  db,
  storage,
  dossierId,
  storagePath,
  contentType,
}: {
  db: Firestore;
  storage: FirebaseStorage;
  dossierId: string;
  storagePath: string;
  contentType?: string;
}): Promise<{ registration: string | null; previousRegistration: string | null } | null> {
  try {
    const url = await getDownloadURL(storageRef(storage, storagePath));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    const base64 = await blobToBase64(blob);
    const ct =
      contentType ||
      blob.type ||
      (storagePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    const r = await fetch('/api/scan-carte-grise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: base64, contentType: ct }),
    });
    if (!r.ok) {
      let detail = '';
      try {
        detail = (await r.text()) || '';
      } catch {
        /* ignore */
      }
      console.warn(`[scan-carte-grise] api ${r.status}${detail ? ` — ${detail}` : ''}`);
      return null;
    }

    const parsed = (await r.json()) as {
      registration: string | null;
      previousRegistration: string | null;
    };

    const updates: Record<string, any> = {};
    if (parsed.registration) {
      updates.matricule = parsed.registration;
      updates['vehicule.immatriculation'] = parsed.registration;
    }
    if (parsed.previousRegistration) {
      updates['vehicule.immatriculationAnterieur'] = parsed.previousRegistration;
    }
    if (Object.keys(updates).length === 0) return parsed;

    updates.updatedAt = serverTimestamp();
    await updateDoc(doc(db, 'dossiers', dossierId), updates);
    return parsed;
  } catch (e) {
    console.error('[scan-carte-grise] failed:', e);
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string) || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
