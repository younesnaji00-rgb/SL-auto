/**
 * Shared Firestore listener cache.
 * Deduplicates onSnapshot subscriptions so multiple components
 * watching the same path share a single listener.
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
  let entry = cache.get(key);

  if (entry) {
    // Reuse existing listener
    entry.subscribers.set(id, { onData, onError });

    // Immediately replay last data if available
    const cachedData = entry.hasData ? entry.lastData : undefined;
    const hasCache = entry.hasData;

    return {
      unsubscribe: () => {
        const e = cache.get(key);
        if (!e) return;
        e.subscribers.delete(id);
        if (e.subscribers.size === 0) {
          e.unsubscribe();
          cache.delete(key);
        }
      },
      cachedData,
      hasCache,
    };
  }

  // Create new listener
  const subscribers = new Map<symbol, Subscriber<any>>();
  subscribers.set(id, { onData, onError });

  const unsub = startListener(
    (data: T) => {
      const e = cache.get(key);
      if (e) {
        e.lastData = data;
        e.hasData = true;
      }
      for (const sub of subscribers.values()) {
        sub.onData(data);
      }
    },
    (error: Error) => {
      for (const sub of subscribers.values()) {
        sub.onError(error);
      }
    }
  );

  cache.set(key, {
    subscribers,
    unsubscribe: unsub,
    lastData: undefined,
    hasData: false,
  });

  return {
    unsubscribe: () => {
      const e = cache.get(key);
      if (!e) return;
      e.subscribers.delete(id);
      if (e.subscribers.size === 0) {
        e.unsubscribe();
        cache.delete(key);
      }
    },
    cachedData: undefined,
    hasCache: false,
  };
}
