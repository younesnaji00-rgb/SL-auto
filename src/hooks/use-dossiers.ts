'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { ref, deleteObject, listAll } from 'firebase/storage';
import { useFirestore, useStorage } from '@/firebase';
import type { Dossier } from '@/lib/dossiers-data';

export function useDossiers(allowedCompagnies?: string[]) {
    const db = useFirestore();
    const storage = useStorage();
    const [dossiers, setDossiers] = useState<Dossier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stabilize the array reference to avoid re-subscribing on every render
    const compagniesKey = allowedCompagnies ? JSON.stringify(allowedCompagnies.map(c => c.toLowerCase().trim()).sort()) : '';
    const allowed = useMemo(() => compagniesKey ? JSON.parse(compagniesKey) as string[] : null, [compagniesKey]);

    useEffect(() => {
        if (!db) return;
        setLoading(true);
        const q = query(collection(db, 'dossiers'), orderBy('createdAt', 'desc'));

        const unsub = onSnapshot(q,
            (snapshot) => {
                let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dossier));

                // Filter by user's allowed companies
                if (allowed && allowed.length > 0) {
                    results = results.filter(d => allowed.includes((d.compagnie || '').toLowerCase().trim()));
                }

                setDossiers(results);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('useDossiers error:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [db, allowed]);

    const deleteDossier = async (dossierId: string): Promise<void> => {
        if (!db) throw new Error('DB not initialized');

        // List of subcollections to purge manually because Firestore doesn't auto-delete nested data
        const subcollections = [
            'documents', 
            'photos', 
            'commentaires', 
            'chiffrage', 
            'missions', 
            'reclamations', 
            'planifications', 
            'planificationHistory', 
            'historique', 
            'rapport_pieces'
        ];

        try {
            console.log(`Starting cleanup for dossier: ${dossierId}`);
            
            // 1. Delete all subcollections items
            for (const sub of subcollections) {
                const subRef = collection(db, 'dossiers', dossierId, sub);
                const subSnap = await getDocs(subRef).catch(() => ({ docs: [] }));
                const deletePromises = (subSnap as any).docs.map((docSnap: any) => deleteDoc(docSnap.ref));
                await Promise.all(deletePromises);
            }

            // 2. Recursive cleanup of Storage folder
            if (storage) {
                const storagePath = `dossiers/${dossierId}`;
                const storageRef = ref(storage, storagePath);
                
                const deleteStorageFolder = async (folderRef: any) => {
                    try {
                        const list = await listAll(folderRef).catch(() => ({ items: [], prefixes: [] }));
                        // Delete all files in current level
                        const fileDeletes = list.items.map(item => deleteObject(item).catch(err => console.warn('File delete skip:', err)));
                        // Recursively enter subfolders
                        const folderDeletes = list.prefixes.map((subFolder: any) => deleteStorageFolder(subFolder));
                        await Promise.all([...fileDeletes, ...folderDeletes]);
                    } catch (e) {
                        console.warn('Storage cleanup detail error:', e);
                    }
                };

                await deleteStorageFolder(storageRef).catch(e => console.warn('Storage cleanup skipped:', e));
            }

            // 3. Delete the main document
            const mainRef = doc(db, 'dossiers', dossierId);
            await deleteDoc(mainRef);
            
            console.log(`Cleanup complete for dossier: ${dossierId}`);
        } catch (err) {
            console.error('Dossier deletion failed:', err);
            throw err;
        }
    };

    return { dossiers, loading, error, deleteDossier };
}
