/**
 * The fields a dossier may not go without — ONE list for every place that
 * says « required » (owner ruling 2026-10-14):
 *  - the Informations save refuses to leave any of them blank, on every save
 *    from the first one (`blankRequiredPaths` in field-validation.ts);
 *  - each carries a red asterisk in the Informations form, and nothing else
 *    announces them (the « N champs requis manquants » line is gone);
 *  - the step rail, the tab badge and the dossier to-do count the blank ones.
 *
 * It is the union of what was « required » before: the creation fields
 * (réf, compagnie, the role's expert), the step-1 list (nature, marque,
 * matricule, assuré, dates) and the « Envoyer au chiffrage » identifications.
 * The matricule may be given as the véhicule's immatriculation instead.
 *
 * Each entry maps a French label to the Firestore dossier path(s) where the
 * value may live (legacy shapes included); the FIRST path is the form field
 * that carries the asterisk and the error.
 */

export interface RequiredField {
  /** Human-readable French label, returned as-is by getMissingRequiredFields. */
  label: string;
  /** Dotted dossier paths; the field counts as filled if ANY path has a value. */
  paths: string[];
}

/** The required fields of a dossier whose role (`expertRank`) is given, in form order. */
export function requiredFieldsFor(expertRank?: string | null): RequiredField[] {
  return [
    { label: 'Réf Dossier', paths: ['refExpert'] },
    { label: 'Compagnie', paths: ['compagnie'] },
    { label: 'Nature du dossier', paths: ['nature'] },
    {
      label: 'Matricule véhicule',
      paths: ['matricule', 'vehicule.immatriculation', 'vehicule.registration'],
    },
    { label: 'Date sinistre', paths: ['dateSinistre'] },
    { label: 'Date requête', paths: ['dateRequete'] },
    { label: "Nom de l'expert", paths: [`experts.${expertRank || '1er'}.nom`] },
    {
      label: "Nom de l'assuré",
      paths: ['assure.nom', 'assure'],
    },
    { label: 'Marque véhicule', paths: ['vehicule.marque', 'vehicule.brand'] },
  ];
}

/** The list for a « 1er expert » dossier. */
export const REQUIRED_FIELDS: RequiredField[] = requiredFieldsFor('1er');

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
 * Whether `field` has a value on `obj` (a dossier, or the Informations
 * form, which has the same paths).
 */
export function requiredFieldFilled(obj: any, field: RequiredField): boolean {
  return field.paths.some((p) => {
    const v = readPath(obj, p);
    // `assure` alone may be a legacy string — accept it if non-empty. The
    // current shape is a block ({ nom, telephone, … }) whose name is read
    // through `assure.nom`; the block itself never counts as a name.
    if (p === 'assure') return typeof v === 'string' && !isEmpty(v);
    return !isEmpty(v);
  });
}

/**
 * Labels (French) of the required fields that are still empty on `dossier`.
 * Returns `[]` for a null/undefined dossier.
 */
export function getMissingRequiredFields(dossier: any): string[] {
  if (!dossier) return [];
  return requiredFieldsFor(dossier.expertRank)
    .filter((f) => !requiredFieldFilled(dossier, f))
    .map((f) => f.label);
}

/**
 * Identification a dossier must carry before it goes to the chiffreur (QA bug
 * Chiffreur 001): without them the chiffreur received a row named by a random
 * Firestore id with no assuré or plate. Returns the French labels missing.
 */
export function missingIdentification(dossier: any): string[] {
  const d = dossier || {};
  const has = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : v != null && v !== '';
  const assure = typeof d.assure === 'string' ? d.assure : d.assure?.nom;
  const out: string[] = [];
  if (!has(d.refExpert)) out.push('Réf. expert');
  if (!has(assure)) out.push("Nom de l'assuré");
  if (!has(d.matricule) && !has(d.vehicule?.immatriculation)) out.push('Matricule');
  return out;
}
