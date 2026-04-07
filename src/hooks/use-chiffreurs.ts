'use client';

import { useState, useEffect } from "react";
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
} from "firebase/firestore";
import { useFirestore } from "@/firebase";

export interface Chiffreur {
  id: string;
  nom: string;
  email: string;
  phone?: string;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export function useChiffreurs() {
  const db = useFirestore();
  const [chiffreurs, setChiffreurs] = useState<Chiffreur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "chiffreurs"), orderBy("nom"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setChiffreurs(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chiffreur))
        );
        setLoading(false);
      },
      (err) => {
        console.error("useChiffreurs error:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [db]);

  async function addChiffreur(data: Omit<Chiffreur, "id">) {
    if (!db) return;
    await addDoc(collection(db, "chiffreurs"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  async function updateChiffreur(id: string, data: Partial<Omit<Chiffreur, "id">>) {
    if (!db) return;
    await updateDoc(doc(db, "chiffreurs", id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async function deleteChiffreur(id: string) {
    if (!db) return;
    await deleteDoc(doc(db, "chiffreurs", id));
  }

  return { chiffreurs, loading, error, addChiffreur, updateChiffreur, deleteChiffreur };
}
