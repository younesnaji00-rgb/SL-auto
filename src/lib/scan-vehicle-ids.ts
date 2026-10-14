/**
 * Kilométrage and numéro de châssis from the dossier's photos (owner request
 * 2026-10-14: « it has always been empty since there was no plumbing for
 * it »).
 *
 * Fired after photos land in a dossier — the « Kilométrage » and « Numéro de
 * chassis » document slots, the drop list once it classified a file there,
 * the Photos tab and the agent's camera. One call to `/api/scan-vehicle-ids`
 * per batch, and only while a field is still empty: a value typed or read
 * before is never overwritten. Best effort — a failure never touches the
 * upload, and is only logged.
 */

import { doc, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, type FirebaseStorage } from 'firebase/storage';
import { getDoc } from '@/lib/firestore-logged';
import { apiFetch } from '@/lib/api-fetch';
import { validateFieldValue } from '@/lib/field-validation';
import { emitPrefillFlash } from '@/hooks/use-prefill-flash';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';

/** What the photos are expected to show: the slot says, a phase photo may show either. */
export type VehicleIdHint = 'km' | 'vin' | 'any';

export interface VehiclePhotoSource {
  /** The file in hand (fresh upload, offline queue) — no download needed. */
  blob?: Blob;
  /** Else the stored file. */
  storagePath?: string;
  name?: string;
}

/** The slot a photo of the odometer or of the constructor plate goes to. */
export function vehicleIdHintForSlot(slot: string | null | undefined): VehicleIdHint | null {
  const s = String(slot ?? '').trim();
  if (s === 'Kilométrage') return 'km';
  if (s === 'Numéro de chassis') return 'vin';
  return null;
}

const MAX_PHOTOS_PER_CALL = 12;
const MAX_SIDE = 1600;

const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === '';

/** The dossier's current values, legacy names included (information-tab reads the same). */
function currentValues(d: any): { km: unknown; vin: unknown } {
  const v = d?.vehicule || {};
  return { km: v.km ?? v.kilometrage, vin: v.serie ?? v.chassis };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = (reader.result as string) || '';
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** A photo at most 1600 px on its long side, as JPEG — digits stay legible, the call stays light. */
async function shrink(blob: Blob): Promise<{ data: Blob; type: string }> {
  if (!blob.type.startsWith('image/') || typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return { data: blob, type: blob.type || 'image/jpeg' };
  }
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && blob.size < 1_500_000) {
      bmp.close?.();
      return { data: blob, type: blob.type };
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    return out ? { data: out, type: 'image/jpeg' } : { data: blob, type: blob.type };
  } catch {
    return { data: blob, type: blob.type || 'image/jpeg' };
  }
}

async function loadSource(storage: FirebaseStorage, s: VehiclePhotoSource): Promise<Blob | null> {
  if (s.blob) return s.blob;
  if (!s.storagePath) return null;
  try {
    const res = await fetch(await getDownloadURL(storageRef(storage, s.storagePath)));
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

export async function scanAndPersistVehicleIds({
  db,
  storage,
  dossierId,
  sources,
  hint = 'any',
  user,
}: {
  db: Firestore;
  storage: FirebaseStorage;
  dossierId: string;
  sources: ReadonlyArray<VehiclePhotoSource>;
  hint?: VehicleIdHint;
  user?: { email?: string | null; nom?: string | null };
}): Promise<{ km?: string; vin?: string } | null> {
  try {
    const dossierRef = doc(db, 'dossiers', dossierId);
    const before = currentValues((await getDoc(dossierRef)).data());
    const wantKm = hint !== 'vin' && blank(before.km);
    const wantVin = hint !== 'km' && blank(before.vin);
    if (!wantKm && !wantVin) return null;

    const found: { km?: string; vin?: string } = {};
    const list = sources.slice(0, MAX_PHOTOS_PER_CALL * 3);
    for (let i = 0; i < list.length; i += MAX_PHOTOS_PER_CALL) {
      const stillKm = wantKm && !found.km;
      const stillVin = wantVin && !found.vin;
      if (!stillKm && !stillVin) break;
      const files: { fileBase64: string; contentType: string }[] = [];
      for (const s of list.slice(i, i + MAX_PHOTOS_PER_CALL)) {
        const raw = await loadSource(storage, s);
        if (!raw || !(raw.type.startsWith('image/') || raw.type === 'application/pdf')) continue;
        const { data, type } = await shrink(raw);
        files.push({ fileBase64: await blobToBase64(data), contentType: type });
      }
      if (files.length === 0) continue;
      const r = await apiFetch('/api/scan-vehicle-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, want: { km: stillKm, vin: stillVin } }),
      });
      if (!r.ok) {
        console.warn(`[scan-vehicle-ids] api ${r.status}`);
        return null;
      }
      const out = (await r.json()) as { mileage?: { value?: string } | null; vin?: { value?: string } | null };
      const km = out.mileage?.value ?? '';
      const vin = out.vin?.value ?? '';
      // The same format checks as the Informations form.
      if (stillKm && km && validateFieldValue('km', km) === null) found.km = km;
      if (stillVin && vin && validateFieldValue('vin', vin) === null) found.vin = vin;
    }
    if (!found.km && !found.vin) return null;

    // Read again: someone may have typed a value while the photos were read.
    const now = currentValues((await getDoc(dossierRef)).data());
    const updates: Record<string, any> = {};
    const written: string[] = [];
    const lines: string[] = [];
    if (found.km && blank(now.km)) {
      updates['vehicule.km'] = found.km;
      updates['vehicule.kmSource'] = 'photo-ia';
      written.push('vehicule.km');
      lines.push(`Kilométrage « ${Number(found.km).toLocaleString('fr-FR')} km »`);
    }
    if (found.vin && blank(now.vin)) {
      updates['vehicule.serie'] = found.vin;
      updates['vehicule.serieSource'] = 'photo-ia';
      written.push('vehicule.serie');
      lines.push(`Numéro de série « ${found.vin} »`);
    }
    if (written.length === 0) return null;
    updates.updatedAt = serverTimestamp();
    await updateDoc(dossierRef, updates);
    emitPrefillFlash(dossierId, written);
    void logHistorique(
      db,
      dossierId,
      'Lecture IA des photos',
      user?.email || 'IA',
      `${lines.join(' et ')} lu${lines.length > 1 ? 's' : ''} sur les photos du véhicule.`,
      'document',
      user?.nom ?? undefined,
    );
    return found;
  } catch (e) {
    console.warn('[scan-vehicle-ids] failed (non-fatal)', e);
    return null;
  }
}
