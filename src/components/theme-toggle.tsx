'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

/**
 * Compact light/dark toggle for public pages (login). Brand-gated with the
 * language switcher so the firm's deployment stays unchanged.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!BRAND.showLanguageSwitcher || !mounted) return null;

  const dark = theme === 'dark';
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('px-2 text-muted-foreground hover:text-foreground', className)}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
