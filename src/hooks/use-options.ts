'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export type Option = {
  id: string;
  label: string;
  order: number;
  active: boolean;
  /**
   * Optional zone — currently only populated for `options_agents` docs that
   * mirror an Agent de Terrain user's zone (see task #1). Callers that don't
   * care about zones simply ignore this field.
   */
  zone?: string;
};

/**
 * Hook to listen to a dynamic option collection.
 * Seeding is now handled centrally in src/lib/seed-options.ts
 */
export function useOptions(collectionName: string, defaultValues: string[] = []) {
  const db = useFirestore();
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const colRef = collection(db, collectionName);
    const q = query(colRef, orderBy('order', 'asc'));

    const unsub = onSnapshot(q, 
      (snap) => {
        const results = snap.docs.map(d => {
          const data = d.data() as any;
          const opt: Option = {
            id: d.id,
            label: data.label || '',
            order: data.order || 0,
            active: data.active ?? true,
          };
          if (typeof data.zone === 'string' && data.zone.trim()) {
            opt.zone = data.zone.trim();
          }
          return opt;
        });

        setOptions(results);
        setLoading(false);
      },
      (error) => {
        console.error(`[useOptions] Error reading ${collectionName}:`, error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [db, collectionName]);

  const addOption = async (label: string) => {
    if (!db || !label.trim()) return;
    const colRef = collection(db, collectionName);
    const nextOrder = options.length > 0 ? Math.max(...options.map(o => o.order)) + 1 : 0;
    
    await addDoc(colRef, {
      label: label.trim(),
      order: nextOrder,
      active: true,
      createdAt: serverTimestamp(),
    });
  };

  const updateOption = async (id: string, newLabel: string) => {
    if (!db || !newLabel.trim()) return;
    await updateDoc(doc(db, collectionName, id), {
      label: newLabel.trim(),
      updatedAt: serverTimestamp(),
    });
  };

  const deleteOption = async (id: string) => {
    if (!db || !id) return;
    try {
      // Explicitly delete the document from Firestore
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      console.error(`[useOptions] Failed to delete from ${collectionName}:`, err);
      throw err;
    }
  };

  return { options, addOption, updateOption, deleteOption, loading };
}
