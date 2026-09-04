'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale, SUPPORTED_LOCALES, LOCALE_NAMES, type Locale } from '@/i18n';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

/**
 * Compact language selector (globe icon + current language code).
 * Shown in the sidebar footer and on the login page.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  // Brand-gated: the firm's deployment hides language switching entirely.
  if (!BRAND.showLanguageSwitcher) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-1.5 px-2 text-muted-foreground hover:text-foreground', className)}
          aria-label={LOCALE_NAMES[locale]}
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        {SUPPORTED_LOCALES.map((l: Locale) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLocale(l)}
            className={cn('cursor-pointer', l === locale && 'font-semibold')}
          >
            {LOCALE_NAMES[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
