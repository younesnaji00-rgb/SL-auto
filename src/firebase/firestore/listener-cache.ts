/**
 * Shared Firestore listener cache.
 * Deduplicates onSnapshot subscriptions so multiple components
 * watching the same path share a single listener.
 *
 * A listener that reports an error is DEAD — Firestore never re-subscribes
 * it. Its entry is dropped at once, so the next component asking for the same
 * data starts a fresh listener instead of inheriting the dead one's last
 * snapshot, frozen for as long as any subscriber stayed mounted (QA bugs
 * 046 / 047: « Nouvelle planification créée », list unchanged).
 */

type Subscriber<T> = {
  onData: (data: T) => void;
  onError: (error: Error) => void;
};

interface CacheEntry<T> {
  subscribers: Map<symbol, Subscriber<T>>;
  unsubscribe: () => void;
  lastData: T | undefined;
  hasData: boolean;
}

const cache = new Map<string, CacheEntry<any>>();

export function subscribe<T>(
  key: string,
  startListener: (
    onData: (data: T) => void,
    onError: (error: Error) => void
  ) => () => void,
  onData: (data: T) => void,
  onError: (error: Error) => void
): { unsubscribe: () => void; cachedData: T | undefined; hasCache: boolean } {
  const id = Symbol();

  // Bound to ONE entry: after a dead entry was dropped and replaced, a late
  // unsubscribe from the old one must not tear down its successor.
  const release = (entry: CacheEntry<T>) => () => {
    entry.subscribers.delete(id);
    if (entry.subscribers.size === 0) {
      entry.unsubscribe();
      if (cache.get(key) === entry) cache.delete(key);
    }
  };

  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (existing) {
    // Reuse the live listener and replay its last data, if any.
    existing.subscribers.set(id, { onData, onError });
    return {
      unsubscribe: release(existing),
      cachedData: existing.hasData ? existing.lastData : undefined,
      hasCache: existing.hasData,
    };
  }

  const entry: CacheEntry<T> = {
    subscribers: new Map([[id, { onData, onError }]]),
    unsubscribe: () => {},
    lastData: undefined,
    hasData: false,
  };
  cache.set(key, entry);

  entry.unsubscribe = startListener(
    (data: T) => {
      entry.lastData = data;
      entry.hasData = true;
      for (const sub of [...entry.subscribers.values()]) sub.onData(data);
    },
    (error: Error) => {
      if (cache.get(key) === entry) cache.delete(key);
      for (const sub of [...entry.subscribers.values()]) sub.onError(error);
    }
  );

  return { unsubscribe: release(entry), cachedData: undefined, hasCache: false };
}
