'use client';

import { useSyncExternalStore } from 'react';
import { BRAND } from '@/lib/brand';
import { useCurrentUser } from '@/hooks/use-current-user';
import { tutorialsEnabledFor } from './access';
import { isTourRunning, subscribeTourActive } from './tour';

const serverSnapshot = () => false;

/**
 * True when the UI should expose the affordances the guided journey relies
 * on (self-addressed rappels, HTML mission import, gallery photo import,
 * own position as the agent's GPS…):
 *  - always on the demo brand (a prospect explores alone);
 *  - otherwise only for a role allowed to take the tutorials, and only
 *    WHILE a tour is running — real work never sees them.
 */
export function useTutorialMode(): boolean {
  const { profile } = useCurrentUser();
  const running = useSyncExternalStore(subscribeTourActive, isTourRunning, serverSnapshot);
  if (BRAND.id === 'demo') return true;
  return running && tutorialsEnabledFor(profile?.role);
}
