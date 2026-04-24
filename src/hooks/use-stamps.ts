'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export interface Stamp {
  id: string;
  name: string;
  storagePath: string;
  url: string;
  active: boolean;
  createdAt: any;
  createdBy: string;
}

/**
 * Subscribe to the `stamps` collection. By default returns only active stamps
 * (intended for consumers like the devis save flow). Pass `{ includeInactive: true }`
 * for the admin settings page.
 */
export function useStamps(options?: { includeInactive?: boolean }): { stamps: Stamp[]; loading: boolean } {
  const db = useFirestore();
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(true);
  const includeInactive = options?.includeInactive ?? false;

  useEffect(() => {
    if (!db) return;
    const colRef = collection(db, 'stamps');
    const q = includeInactive
      ? query(colRef, orderBy('createdAt', 'desc'))
      : query(colRef, where('active', '==', true), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setStamps(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              name: data.name || '',
              storagePath: data.storagePath || '',
              url: data.url || '',
              active: data.active ?? true,
              createdAt: data.createdAt,
              createdBy: data.createdBy || '',
            };
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error('useStamps: snapshot error', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [db, includeInactive]);

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
