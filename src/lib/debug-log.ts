'use client';

/**
 * Paired backend ↔ frontend diagnostic logging.
 *
 * `apiFetch` (src/lib/api-fetch.ts) logs what the server returned under
 * `[apiFetch]`. `logFrontend` logs what the UI actually derived from that
 * payload — the values that reach component state and the rendered fields —
 * under `[frontend]`, so the two halves can be diffed in the console.
 *
 * Filter the console on `apiFetch` or `frontend` to isolate either side, or on
 * a route name (e.g. `scan-devis`) to see one round-trip end to end.
 */
export function logFrontend(source: string, fields: unknown): void {
  try {
    console.debug(`[frontend] ${source}`, fields);

    // A flat object also prints as one row per field — the quickest way to
    // eyeball every value the UI took against the [apiFetch] payload above it.
    if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
      const rows = Object.entries(fields as Record<string, unknown>).map(
        ([field, value]) => ({
          field,
          value:
            value === undefined
              ? '(undefined)'
              : value === null
                ? '(null)'
                : typeof value === 'object'
                  ? JSON.stringify(value)
                  : value,
          type: value === null ? 'null' : typeof value,
        })
      );
      if (rows.length > 0) console.table(rows);
    }
  } catch {
    // Diagnostics must never break the UI they are observing.
  }
}
