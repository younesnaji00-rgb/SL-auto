'use client';

import { useCurrentUser } from '@/hooks/use-current-user';

/**
 * Downloads are closed to the Agent de terrain (owner ruling 2026-09-25):
 * they import, and delete what they imported, nothing else. « Télécharger »,
 * « Ouvrir » in a new tab and the long-press « save image » all count.
 */
export function useCanDownload(): boolean {
  const { profile } = useCurrentUser();
  return profile?.role !== 'Agent de Terrain';
}
