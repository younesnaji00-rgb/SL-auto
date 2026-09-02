/**
 * Motion helpers (docs/motion-spec.md §3): programmatic motion — smooth
 * scrolling, WAAPI animations — must honour prefers-reduced-motion the same
 * way the CSS `motion-reduce:` guards do.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `smooth` unless the user asked for reduced motion — then instant. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
