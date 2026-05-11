/**
 * Display the human-readable user name for an audit / observation / workflow
 * entry. Round 8 — Q-7 → B: when `userNom` is missing on a log entry (legacy
 * data persisted only `user` = email), fall back to "Utilisateur inconnu"
 * rather than leaking the email.
 *
 * Pass either the raw entry object or the individual fields.
 */
export function displayUserName(entry: { userNom?: string | null; user?: string | null } | null | undefined): string {
  const nom = entry?.userNom?.trim();
  if (nom) return nom;
  return 'Utilisateur inconnu';
}
