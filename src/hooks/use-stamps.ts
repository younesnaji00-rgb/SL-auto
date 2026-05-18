'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';

export interface Stamp {
  id: string;
  name: string;
  storagePath: string;
  url: string;
  active: boolean;
  createdAt: any;
  createdBy: string;
  /**
   * Display name of the user who imported the stamp, denormalized at write
   * time. Optional for back-compat with stamps created before this field
   * was added.
   */
  createdByName?: string;
}

/**
 * Subscribe to the `stamps` collection.
 * - Default: active stamps only (intended for the devis save flow).
 * - `includeInactive: true`: also returns soft-deleted (admin settings page).
 * - `mineOnly: true`: filters to stamps owned by the current user (per-account
 *   scoping for the chiffreur picker). Returns `[]` until the profile resolves.
 */
export function useStamps(
  options?: { includeInactive?: boolean; mineOnly?: boolean },
): { stamps: Stamp[]; loading: boolean } {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(true);
  const includeInactive = options?.includeInactive ?? false;
  const mineOnly = options?.mineOnly ?? false;
  const uid = profile?.uid || '';
  const assignedStampIds = profile?.assignedStampIds || [];

  useEffect(() => {
    if (!db) return;
    if (mineOnly && !uid) {
      // Profile hasn't resolved yet — return empty + loading until it does.
      setStamps([]);
      return;
    }
    const colRef = collection(db, 'stamps');
    // Single-field query — no composite index needed. The active filter runs
    // client-side; the stamps collection is small enough that fetching all
    // and filtering in memory is cheaper than maintaining a composite index.
    const q = query(colRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name || '',
            storagePath: data.storagePath || '',
            url: data.url || '',
            active: data.active ?? true,
            createdAt: data.createdAt,
            createdBy: data.createdBy || '',
            createdByName: data.createdByName || undefined,
          } as Stamp;
        });
        let filtered = includeInactive ? all : all.filter((s) => s.active);
        if (mineOnly) filtered = filtered.filter((s) => assignedStampIds.includes(s.id));
        setStamps(filtered);
        setLoading(false);
      },
      (err) => {
        console.error('useStamps: snapshot error', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [db, includeInactive, mineOnly, uid, assignedStampIds.join(',')]);

  return { stamps, loading };
}

/**
 * Fetches a stamp image by URL, returns a base64 data URL plus natural dimensions.
 * Used by the devis PDF render pipeline. Returns `null` on any failure so callers
 * can gracefully fall back to rendering without a stamp.
 */
export async function loadStampImage(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    const dims: { width: number; height: number } = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('image decode failed'));
      img.src = dataUrl;
    });

    return { dataUrl, width: dims.width, height: dims.height };
  } catch (err) {
    console.warn('loadStampImage failed', err);
    return null;
  }
}
