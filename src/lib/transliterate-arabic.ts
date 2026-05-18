export const ARABIC_TO_LATIN: Record<string, string> = {
  'أ': 'A',
  'ب': 'B',
  'ت': 'T',
  'ث': 'TH',
  'ج': 'J',
  'ح': 'H',
  'خ': 'KH',
  'د': 'D',
  'ذ': 'Z',
  'ر': 'R',
  'ز': 'Z',
  'س': 'S',
  'ش': 'SH',
  'ص': 'S',
  'ض': 'D',
  'ط': 'T',
  'ظ': 'Z',
  'ع': 'A',
  'غ': 'GH',
  'ف': 'F',
  'ق': 'Q',
  'ك': 'K',
  'ل': 'L',
  'م': 'M',
  'ن': 'N',
  'ه': 'H',
  'و': 'W',
  'ي': 'Y',
};

export function transliterateArabic(s: string | null | undefined): string | null | undefined {
  if (s === null || s === undefined || s === '') return s;
  if (typeof s !== 'string') return s;
  return Array.from(s).map(ch => ARABIC_TO_LATIN[ch] ?? ch).join('');
}
