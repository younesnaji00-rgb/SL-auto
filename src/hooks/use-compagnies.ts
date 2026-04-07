'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export type Compagnie = {
  id: string;
  nom: string;
  couleur: string;
  createdAt: any;
};

const DEFAULT_COMPAGNIES = [
  { nom: 'Allianz', couleur: '#3b82f6' },
  { nom: 'RMA', couleur: '#ef4444' },
  { nom: 'Sanlam', couleur: '#22c55e' },
  { nom: 'Wafa', couleur: '#f59e0b' },
  { nom: 'ATLANTA', couleur: '#8b5cf6' },
  { nom: 'Saham', couleur: '#ec4899' },
  { nom: 'Zurich Assurance', couleur: '#06b6d4' },
  { nom: 'MCMA', couleur: '#14b8a6' },
];

export function useCompagnies() {
  const db = useFirestore();
  const [compagnies, setCompagnies] = useState<Compagnie[]>([]);
  const [loading, setLoading] = useState(true);
  const seeded = useRef(false);

  useEffect(() => {
    if (!db) return;
    const colRef = collection(db, 'compagnies');
    const q = query(colRef, orderBy('nom', 'asc'));

    const unsub = onSnapshot(q, async (snap) => {
      if (snap.docs.length === 0 && !seeded.current) {
        seeded.current = true;
        for (const c of DEFAULT_COMPAGNIES) {
          await addDoc(colRef, { nom: c.nom, couleur: c.couleur, createdAt: serverTimestamp() });
        }
        return;
      }
      setCompagnies(
        snap.docs.map((d) => ({
          id: d.id,
          nom: d.data().nom ?? '',
          couleur: d.data().couleur ?? '#6b7280',
          createdAt: d.data().createdAt,
        }))
      );
      setLoading(false);
    });
    return unsub;
  }, [db]);

  const addCompagnie = async (nom: string, couleur?: string) => {
    if (!db || !nom.trim()) return;
    await addDoc(collection(db, 'compagnies'), {
      nom: nom.trim(),
      couleur: couleur ?? '#6b7280',
      createdAt: serverTimestamp(),
    });
  };

  const deleteCompagnie = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'compagnies', id));
  };

  const updateCompagnie = async (id: string, data: Partial<{ nom: string; couleur: string }>) => {
    if (!db) return;
    await updateDoc(doc(db, 'compagnies', id), data);
  };

  return { compagnies, loading, addCompagnie, deleteCompagnie, updateCompagnie };
}
