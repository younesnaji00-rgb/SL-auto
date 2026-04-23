export const ACCORDE_MAP: Record<string, string> = {
  'Facture Garage': 'Facture accordé',
  'Devis Garage': 'Devis accordé',
};
export function mapToAccorde(docType: string): string {
  return ACCORDE_MAP[docType] ?? docType;
}
