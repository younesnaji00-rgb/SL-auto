// Ordered-queue iterator shared by the chiffrage queue page, the chiffrage
// detail page and the devis editor (docs/chiffrage-redesign-spec.md §D1).
//
// The queue page persists its CURRENT filtered+sorted order every time it
// changes; the detail page and the editor read back « où suis-je dans la
// file » to offer Précédent / Suivant and the Mode traitement auto-advance.
// sessionStorage on purpose: the order is a per-tab working context, not
// durable state — the queue itself (Firestore) stays the source of truth.

const ORDER_KEY = 'sl-auto:chiffrage-queue-order';
const MODE_KEY = 'sl-auto:chiffrage-traitement';

export interface QueueOrder {
  /** Ordered chiffrage ids as last rendered by the queue page. */
  ids: string[];
  /** Ids already completed at save time (skipped by nextId iteration). */
  completedIds: string[];
  savedAt: number;
}

export interface QueueContext {
  index: number; // 0-based position of the current id in the order
  total: number;
  prevId: string | null;
  nextId: string | null; // next non-completed, non-skipped id after `index`
}

export interface TraitementState {
  active: boolean;
  startedAt: number;
  /** Ids the user chose « Passer » on — excluded from nextId until restart. */
  skippedIds: string[];
}

const safeRead = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const safeWrite = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota/private-mode failures degrade silently: the buttons just hide.
  }
};

export function saveQueueOrder(ids: string[], completedIds: string[] = []) {
  safeWrite(ORDER_KEY, { ids, completedIds, savedAt: Date.now() } satisfies QueueOrder);
}

export function getQueueOrder(): QueueOrder | null {
  const order = safeRead<QueueOrder>(ORDER_KEY);
  if (!order || !Array.isArray(order.ids) || order.ids.length === 0) return null;
  return order;
}

/**
 * Position of `id` inside the stored order. Returns null when the queue page
 * hasn't stored an order this session or the id isn't part of it.
 */
export function getQueueContext(id: string): QueueContext | null {
  const order = getQueueOrder();
  if (!order) return null;
  const index = order.ids.indexOf(id);
  if (index === -1) return null;
  const traitement = getTraitementState();
  const excluded = new Set([
    ...order.completedIds,
    ...(traitement?.active ? traitement.skippedIds : []),
  ]);
  let nextId: string | null = null;
  for (let i = index + 1; i < order.ids.length; i++) {
    if (!excluded.has(order.ids[i])) { nextId = order.ids[i]; break; }
  }
  return {
    index,
    total: order.ids.length,
    prevId: index > 0 ? order.ids[index - 1] : null,
    nextId,
  };
}

/** First non-completed id of the stored order (Mode traitement entry point). */
export function getFirstActionableId(): string | null {
  const order = getQueueOrder();
  if (!order) return null;
  const done = new Set(order.completedIds);
  return order.ids.find((id) => !done.has(id)) ?? null;
}

export function startTraitement() {
  safeWrite(MODE_KEY, { active: true, startedAt: Date.now(), skippedIds: [] } satisfies TraitementState);
}

export function stopTraitement() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(MODE_KEY); } catch { /* no-op */ }
}

export function getTraitementState(): TraitementState | null {
  const state = safeRead<TraitementState>(MODE_KEY);
  return state?.active ? { ...state, skippedIds: state.skippedIds ?? [] } : null;
}

export function skipInTraitement(id: string) {
  const state = getTraitementState();
  if (!state) return;
  if (!state.skippedIds.includes(id)) state.skippedIds.push(id);
  safeWrite(MODE_KEY, state);
}
