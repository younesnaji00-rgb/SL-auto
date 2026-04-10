import React from 'react';

const Logo = ({ collapsed = false, className = '' }: { collapsed?: boolean; className?: string }) => (
  <div className={`flex items-center -space-x-1 min-w-0 overflow-hidden ${className}`} aria-label="SL Auto Expertise">
    <img
      src="/images/logo.png"
      alt="SL Auto Expertise"
      className={`dark:invert shrink-0 object-contain transition-all duration-300 ${collapsed ? 'h-8 w-8' : 'h-10 w-auto'}`}
    />
    {!collapsed && (
      <img
        src="/images/auto-expertise.png"
        alt="Auto Expertise"
        className="h-6 w-auto dark:invert min-w-0 object-contain"
      />
    )}
  </div>
);

export default Logo;
