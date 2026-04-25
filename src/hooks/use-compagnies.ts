'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export type Compagnie = {
  id: string;
  nom: string;
  couleur: string;
  logoUrl?: string;
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
    const q = query(colRef, orderBy('order', 'asc'));

    const unsub = onSnapshot(q, async (snap) => {
      if (snap.docs.length === 0 && !seeded.current) {
        seeded.current = true;
        for (let i = 0; i < DEFAULT_COMPAGNIES.length; i++) {
          const c = DEFAULT_COMPAGNIES[i];
          // Write both `label` (for useOptions compatibility) and `nom` (for this hook)
          await addDoc(colRef, { label: c.nom, nom: c.nom, couleur: c.couleur, order: i, active: true, createdAt: serverTimestamp() });
        }
        return;
      }
      setCompagnies(
        snap.docs.map((d) => ({
          id: d.id,
          nom: d.data().label || d.data().nom || '',
          couleur: d.data().couleur ?? '#6b7280',
          logoUrl: d.data().logoUrl || undefined,
          createdAt: d.data().createdAt,
        }))
      );
      setLoading(false);
    });
    return unsub;
  }, [db]);

  // Prefetch compagnie logos so the sidebar dropdown renders instantly.
  // We don't keep the Image instances; the browser HTTP cache holds the response.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    for (const c of compagnies) {
      if (c.logoUrl) {
        const img = new window.Image();
        img.src = c.logoUrl;
      }
    }
  }, [compagnies]);

  const addCompagnie = async (nom: string, couleur?: string) => {
    if (!db || !nom.trim()) return;
    const colRef = collection(db, 'compagnies');
    // Write both `label` and `nom` for cross-hook compatibility
    await addDoc(colRef, {
      label: nom.trim(),
      nom: nom.trim(),
      couleur: couleur ?? '#6b7280',
      order: compagnies.length,
      active: true,
      createdAt: serverTimestamp(),
    });
  };

  const deleteCompagnie = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'compagnies', id));
  };

  const updateCompagnie = async (id: string, data: Partial<{ nom: string; couleur: string }>) => {
    if (!db) return;
    // Sync both `label` and `nom` fields
    const update: any = { ...data };
    if (data.nom) update.label = data.nom;
    await updateDoc(doc(db, 'compagnies', id), update);
  };

  return { compagnies, loading, addCompagnie, deleteCompagnie, updateCompagnie };
}
