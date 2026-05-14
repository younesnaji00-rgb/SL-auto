import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';
import { mapToAccorde } from './docType-accorde';
import { buildDocFamilies, type DocTypeLike } from './doc-family';

type DocLike = DocTypeLike & { url?: string | null; pendingUpload?: boolean };

/**
 * Materialise any missing 2ème accord / 2ème proposition placeholder docs
 * for a dossier whose round-1 counterpart is already filled. Mirrors the
 * client-side synthesis in `TypedDocumentsGrid.familiesForRender` so the
 * chiffreur actually sees the slots the gestionnaire previewed.
 *
 * Idempotent — a 2ème slot that already exists (real doc or placeholder)
 * is left alone. Per family + per kind: only the kind whose 1er is filled
 * (real, non-pending) gets a 2ème placeholder.
 *
 * Returns the list of `type` labels actually written.
 */
export async function materializeMissing2emeSlots(
  db: Firestore,
  dossierId: string,
  allDocs: DocLike[],
  createdByUid: string,
): Promise<string[]> {
  const families = buildDocFamilies(allDocs);
  const existingTypes = new Set(
    allDocs.map((d) => (d.type || d.typeDocument || '').trim()).filter(Boolean),
  );
  const isFilled = (label: string): boolean =>
    allDocs.some((d) => {
      const t = (d.type || d.typeDocument || '').trim();
      return t === label && !!d.url && !d.pendingUpload;
    });
  const toWrite: string[] = [];
  for (const fam of families) {
    const accord1 = mapToAccorde(fam.parent, 'accord', 1);
    const prop1 = mapToAccorde(fam.parent, 'proposition-accord', 1);
    const accord2 = mapToAccorde(fam.parent, 'accord', 2);
    const prop2 = mapToAccorde(fam.parent, 'proposition-accord', 2);
    if (isFilled(accord1) && !existingTypes.has(accord2)) toWrite.push(accord2);
    if (isFilled(prop1) && !existingTypes.has(prop2)) toWrite.push(prop2);
  }
  if (toWrite.length === 0) return [];
  const col = collection(db, 'dossiers', dossierId, 'documents');
  await Promise.all(
    toWrite.map((label) =>
      addDoc(col, {
        type: label,
        pendingUpload: true,
        storagePath: null,
        url: null,
        createdAt: serverTimestamp(),
        createdBy: createdByUid,
      }),
    ),
  );
  return toWrite;
}
