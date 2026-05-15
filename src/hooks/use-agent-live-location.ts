'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';

const FRESH_MS = 10 * 60 * 1000;

export interface AgentLiveLocation {
  lat: number;
  lng: number;
  updatedAtMs: number;
}

export interface UseAgentLiveLocationResult {
  agentUid: string | null;
  location: AgentLiveLocation | null;
  isFresh: boolean;
  requestState: 'idle' | 'pending' | 'sent' | 'error';
  requestLocation: () => Promise<void>;
}

export function useAgentLiveLocation(agentName: string): UseAgentLiveLocationResult {
  const db = useFirestore();
  const [agentUid, setAgentUid] = useState<string | null>(null);
  const [location, setLocation] = useState<AgentLiveLocation | null>(null);
  const [requestState, setRequestState] = useState<'idle' | 'pending' | 'sent' | 'error'>('idle');
  const requestedAtRef = useRef<number | null>(null);

  // Look up the agent's uid by display name.
  useEffect(() => {
    setAgentUid(null);
    setLocation(null);
    setRequestState('idle');
    requestedAtRef.current = null;
    const name = agentName.trim();
    if (!db || !name) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('nom', '==', name), limit(1)),
        );
        if (cancelled) return;
        const found = snap.docs[0];
        setAgentUid(found?.id ?? null);
      } catch (err) {
        console.warn('[use-agent-live-location] uid lookup failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, agentName]);

  // Subscribe in realtime to that user's currentLocation.
  useEffect(() => {
    if (!db || !agentUid) {
      setLocation(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', agentUid), (snap) => {
      const data = snap.data() as any | undefined;
      const loc = data?.currentLocation;
      const updatedAtMs: number | undefined =
        typeof loc?.updatedAt?.toMillis === 'function' ? loc.updatedAt.toMillis() : undefined;
      if (
        typeof loc?.lat === 'number' &&
        typeof loc?.lng === 'number' &&
        typeof updatedAtMs === 'number'
      ) {
        setLocation({ lat: loc.lat, lng: loc.lng, updatedAtMs });
        // If we issued a request and a newer-than-request update arrives, mark as sent
        if (
          requestedAtRef.current != null &&
          updatedAtMs > requestedAtRef.current &&
          (requestState === 'pending' || requestState === 'sent')
        ) {
          setRequestState('idle');
          requestedAtRef.current = null;
        }
      } else {
        setLocation(null);
      }
    });
    return () => unsub();
  }, [db, agentUid, requestState]);

  const requestLocation = useCallback(async () => {
    if (!db || !agentUid) return;
    setRequestState('pending');
    requestedAtRef.current = Date.now();
    try {
      await addDoc(collection(db, 'location_requests'), {
        agentUid,
        requestedAt: serverTimestamp(),
      });
      setRequestState('sent');
    } catch (err) {
      console.warn('[use-agent-live-location] request failed:', err);
      setRequestState('error');
    }
  }, [db, agentUid]);

  const isFresh =
    location != null && Date.now() - location.updatedAtMs < FRESH_MS;

  return { agentUid, location, isFresh, requestState, requestLocation };
}
