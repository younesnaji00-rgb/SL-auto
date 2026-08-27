import React from 'react';
import { BRAND } from '@/lib/brand';

/**
 * Brand-driven logo. Renders the brand's image assets when configured,
 * otherwise a styled text wordmark (first letter badge + product name).
 */
/* Wordmark face for brands without a logo asset (imported in globals.css). */
const WORDMARK_FONT = "'Satoshi', var(--font-outfit), ui-sans-serif, sans-serif";

/* Multi-word product names stack: first word on top, the rest beneath. */
const wordmarkLines = (() => {
  const [first, ...rest] = BRAND.productName.split(' ');
  return [first, rest.join(' ')];
})();

const Logo = ({ collapsed = false, className = '' }: { collapsed?: boolean; className?: string }) => {
  if (!BRAND.logoSrc) {
    return (
      <div
        className={`flex items-center gap-2 min-w-0 overflow-hidden ${className}`}
        aria-label={BRAND.productName}
      >
        <span
          className={`shrink-0 grid place-items-center rounded-lg bg-teal-700 text-white font-bold transition-all duration-300 ${
            collapsed ? 'h-8 w-8 text-base' : 'h-9 w-9 text-lg'
          }`}
          style={{ fontFamily: WORDMARK_FONT }}
        >
          {BRAND.productName.charAt(0)}
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-col leading-tight" style={{ fontFamily: WORDMARK_FONT }}>
            <span className="truncate text-lg font-bold tracking-tight text-foreground">
              {wordmarkLines[0]}
            </span>
            {wordmarkLines[1] && (
              <span className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {wordmarkLines[1]}
              </span>
            )}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center -space-x-1 min-w-0 overflow-hidden ${className}`}
      aria-label={BRAND.productName}
    >
      <img
        src={BRAND.logoSrc}
        alt={BRAND.productName}
        className={`dark:invert shrink-0 object-contain transition-all duration-300 ${collapsed ? 'h-8 w-8' : 'h-10 w-auto'}`}
      />
      {!collapsed && BRAND.logoWordmarkSrc && (
        <img
          src={BRAND.logoWordmarkSrc}
          alt=""
          className="h-6 w-auto dark:invert min-w-0 object-contain"
        />
      )}
    </div>
  );
};

export default Logo;
