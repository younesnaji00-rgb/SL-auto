'use client';

import { useCompagnies } from '@/hooks/use-compagnies';

export function CompagnieLogosPreload() {
  const { compagnies } = useCompagnies();
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {compagnies.map((c) =>
        c.logoUrl ? (
          <img
            key={c.id}
            src={c.logoUrl}
            alt=""
            loading="eager"
            decoding="async"
          />
        ) : null
      )}
    </div>
  );
}
