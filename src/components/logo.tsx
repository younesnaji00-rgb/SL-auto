import React from 'react';

const Logo = ({
  collapsed = false,
  className = '',
  onDark = false,
}: {
  collapsed?: boolean;
  className?: string;
  /** Render for a dark surface regardless of theme (e.g. the navy sidebar). */
  onDark?: boolean;
}) => {
  const invert = onDark ? 'invert' : 'dark:invert';
  return (
    <div className={`flex items-center -space-x-1 min-w-0 overflow-hidden ${className}`} aria-label="SL Auto Expertise">
      <img
        src="/images/logo.png"
        alt="SL Auto Expertise"
        className={`${invert} shrink-0 object-contain transition-[height,width] duration-300 motion-reduce:transition-none ${collapsed ? 'h-8 w-8' : 'h-10 w-auto'}`}
      />
      {!collapsed && (
        <img
          src="/images/auto-expertise.png"
          alt="Auto Expertise"
          className={`h-6 w-auto ${invert} min-w-0 object-contain`}
        />
      )}
    </div>
  );
};

export default Logo;
