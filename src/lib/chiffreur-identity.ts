/**
 * « Is this chiffrage mine? » — one rule for the chiffreur's queue AND the
 * dashboard (QA bug 029).
 *
 * A chiffrage names its chiffreur through the `chiffreurs` DIRECTORY
 * (`assignedChiffreurId` = directory doc id, not an auth uid), plus a copy of
 * the directory's name, e-mail and — once linked — the auth uid. The queue
 * page resolved all of this, but the dashboard (the chiffreur's landing
 * page) compared the directory id to the auth uid and the name exactly, so a
 * dossier « envoyé au chiffrage » never showed in « Ma file ».
 */

/** Letters and digits only, accent- and case-insensitive — for name matching. */
export function compactName(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export interface ChiffreurPerson {
  uid?: string | null;
  email?: string | null;
  nom?: string | null;
  prenom?: string | null;
}

interface DirectoryEntry {
  id: string;
  uid?: string | null;
  email?: string | null;
  nom?: string | null;
}

interface AssignedChiffrage {
  assignedChiffreurId?: string | null;
  assignedChiffreurUid?: string | null;
  assignedChiffreurEmail?: string | null;
  assignedChiffreurNom?: string | null;
}

function nameKeys(p: ChiffreurPerson): string[] {
  const nom = compactName(p.nom);
  if (!nom) return [];
  const full = compactName(`${p.prenom ?? ''} ${p.nom ?? ''}`);
  const rev = compactName(`${p.nom ?? ''} ${p.prenom ?? ''}`);
  return Array.from(new Set([nom, full, rev].filter(Boolean)));
}

/** Directory entries that are this person: by uid, then login e-mail, then name. */
export function directoryIdsFor(directory: ReadonlyArray<DirectoryEntry>, p: ChiffreurPerson | null | undefined): Set<string> {
  if (!p) return new Set();
  const uid = p.uid || '';
  const email = String(p.email ?? '').toLowerCase().trim();
  const names = nameKeys(p);
  return new Set(
    directory
      .filter(
        (c) =>
          (uid && c.uid === uid) ||
          (email && String(c.email ?? '').toLowerCase().trim() === email) ||
          (names.length > 0 && names.includes(compactName(c.nom))),
      )
      .map((c) => c.id),
  );
}

/** True when the chiffrage is assigned to this person, by any of its identity links. */
export function isChiffrageMine(
  c: AssignedChiffrage,
  p: ChiffreurPerson,
  directoryIds?: ReadonlySet<string> | null,
): boolean {
  const uid = p.uid || '';
  const email = String(p.email ?? '').toLowerCase().trim();
  if (uid && (c.assignedChiffreurUid === uid || c.assignedChiffreurId === uid)) return true;
  if (c.assignedChiffreurId && directoryIds?.has(c.assignedChiffreurId)) return true;
  if (email && String(c.assignedChiffreurEmail ?? '').toLowerCase().trim() === email) return true;
  const names = nameKeys(p);
  return names.length > 0 && names.includes(compactName(c.assignedChiffreurNom));
}
