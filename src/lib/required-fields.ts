/**
 * Required dossier fields (legacy soft-warning list from the retired creation
 * wizard) and the "what is still missing" helper. Shared by the Informations
 * step banner (`components/dossier-timeline/step-2-information.tsx`) and the
 * step-tab badge on the dossier page.
 *
 * Each entry maps a French label to the Firestore dossier path(s) where the
 * value may live (legacy shapes included).
 */

export interface RequiredField {
  /** Human-readable French label, returned as-is by getMissingRequiredFields. */
  label: string;
  /** Dotted dossier paths; the field counts as filled if ANY path has a value. */
  paths: string[];
}

export const REQUIRED_FIELDS: RequiredField[] = [
  { label: 'Compagnie', paths: ['compagnie'] },
  { label: 'Nature du dossier', paths: ['nature'] },
  { label: 'Marque véhicule', paths: ['vehicule.marque', 'vehicule.brand'] },
  {
    label: 'Matricule véhicule',
    paths: ['matricule', 'vehicule.immatriculation', 'vehicule.registration'],
  },
  {
    label: "Nom de l'assuré",
    paths: ['assure.nom', 'assure'],
  },
  { label: 'Date sinistre', paths: ['dateSinistre'] },
  { label: 'Date requête', paths: ['dateRequete'] },
];

/** French labels of every required field, in display order. */
export const REQUIRED_FIELD_LABELS: string[] = REQUIRED_FIELDS.map((f) => f.label);

// Read a possibly-dotted path from a plain object.
function readPath(obj: any, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function isEmpty(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

/**
 * Labels (French) of the required fields that are still empty on `dossier`.
 * Returns `[]` for a null/undefined dossier.
 */
export function getMissingRequiredFields(dossier: any): string[] {
  if (!dossier) return [];
  const missing: string[] = [];
  for (const { label, paths } of REQUIRED_FIELDS) {
    const hasValue = paths.some((p) => {
      const v = readPath(dossier, p);
      // `assure` alone may be a legacy string — accept it if non-empty.
      if (p === 'assure' && typeof v === 'string') return !isEmpty(v);
      return !isEmpty(v);
    });
    if (!hasValue) missing.push(label);
  }
  return missing;
}
