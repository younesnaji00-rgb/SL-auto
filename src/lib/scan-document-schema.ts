import { z } from 'zod';

/**
 * Shared schema for the /api/scan-document extraction output.
 *
 * Used by:
 * - the API route (runtime validation of Gemini's response)
 * - the dossier creation form (typed field access)
 * - future eval scripts (to validate `expected/*.json` fixtures match the current shape)
 */

const BoundingBox = z.tuple([z.number(), z.number(), z.number(), z.number()]);

const extractedString = z.object({
  value: z.string().nullable(),
  fileIndex: z.number().int().nullable(),
  box: BoundingBox.nullable(),
});

const extractedDate = z.object({
  value: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  fileIndex: z.number().int().nullable(),
  box: BoundingBox.nullable(),
});

const extractedEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.object({
    value: z.enum(values).nullable(),
    fileIndex: z.number().int().nullable(),
    box: BoundingBox.nullable(),
  });

export const ScanDocumentOutput = z.object({
  expertRank: extractedEnum(['1er expert', '2eme expert', 'Arbitre'] as const),
  dossierType: extractedEnum(['Normale', 'Classique', 'Agrée', 'Forfait'] as const),
  nature: extractedString,
  company: extractedString,
  insuredName: extractedString,
  insuredPhone: extractedString,
  brand: extractedString,
  model: extractedString,
  registration: extractedString,
  registrationW: extractedString,
  intermediaryName: extractedString,
  intermediaryEmail: extractedString,
  refExpert: extractedString,
  companyRef: extractedString,
  policyNumber: extractedString,
  dateOfLoss: extractedDate,
  dateOfRequest: extractedDate,
  dateOfMEC: extractedDate,
  repairerType: extractedEnum(['Agréé', 'Normal'] as const),
  garageName: extractedString,
  adversaireAssure: extractedString,
  adversaireMatricule: extractedString,
  adversaireMarque: extractedString,
  adversairePolice: extractedString,
  adversaireCompagnie: extractedString,
  insuredSubscriber: extractedString,
  insuredCardHolder: extractedString,
  insuredAddress: extractedString,
  chassisNumber: extractedString,
  fiscalPower: extractedString,
  fuelType: extractedString,
});

export type ScanDocumentOutput = z.infer<typeof ScanDocumentOutput>;

/**
 * Safely parse the raw JSON Gemini returns. Returns null on shape mismatch
 * so the caller can fall back to partial extraction instead of crashing.
 */
export function parseScanDocumentOutput(raw: unknown): ScanDocumentOutput | null {
  const result = ScanDocumentOutput.safeParse(raw);
  return result.success ? result.data : null;
}
