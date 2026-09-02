import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['var(--font-inter)', 'var(--font-outfit)', 'system-ui', 'sans-serif'],
        headline: ['var(--font-outfit)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        code: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // Material "standard" easing — every layout choreography (focus mode,
      // sidebar, panels) shares it so motion reads as one system.
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      // Elevation (Stripe levels 1–2): tonal cards get level 1, popovers level 2.
      boxShadow: {
        card: '0 1px 2px hsl(var(--shadow-color) / 0.05), 0 1px 3px hsl(var(--shadow-color) / 0.06)',
        raised: '0 8px 24px hsl(var(--shadow-color) / 0.10), 0 2px 6px hsl(var(--shadow-color) / 0.05)',
        // Light contour on light surfaces (buttons, icon buttons, step pills).
        // Owner ruling 2026-09-02: the contour always carries a soft bottom
        // shadow too — the same drop the glass surfaces use (--glass-shadow's
        // last layer), so rimmed elements sit ON the page like glass does.
        rim: 'inset 0 0 0 1px var(--rim-in), inset 0 1.5px 0 var(--rim-top), 0 0 0 1px var(--rim-out), 0 1px 2px hsl(var(--shadow-color) / 0.06), 0 12px 32px -8px hsl(var(--shadow-color) / 0.12)',
        // Light contour on filled (primary / destructive / active) surfaces.
        'rim-filled': 'inset 0 0 0 1px var(--rim-fill-in), inset 0 1.5px 0 var(--rim-fill-top), 0 4px 12px -4px hsl(var(--shadow-color) / 0.3)',
      },
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        // Ink ladder (Apple HIG label → quaternaryLabel), slate-navy hue.
        ink: {
          DEFAULT: 'hsl(var(--ink) / <alpha-value>)',
          '2': 'hsl(var(--ink-2) / <alpha-value>)',
          '3': 'hsl(var(--ink-3) / <alpha-value>)',
          '4': 'hsl(var(--ink-4) / <alpha-value>)',
          solid: 'hsl(var(--ink-solid) / <alpha-value>)',
        },
        'on-ink': 'hsl(var(--on-ink) / <alpha-value>)',
        // Third colour: terracotta (see globals.css for the usage contract).
        tertiary: {
          DEFAULT: 'hsl(var(--tertiary) / <alpha-value>)',
          foreground: 'hsl(var(--tertiary-foreground) / <alpha-value>)',
          deep: 'hsl(var(--tertiary-deep) / <alpha-value>)',
          bg: 'hsl(var(--tertiary-bg) / <alpha-value>)',
        },
        'heading-bg': 'hsl(var(--heading-bg) / <alpha-value>)',
        'heading-fg': 'hsl(var(--heading-fg) / <alpha-value>)',
        // Neutral ladder (Radix-style): page → surface-1 (card) → surface-2 (hover/header)
        surface: {
          '1': 'hsl(var(--surface-1) / <alpha-value>)',
          '2': 'hsl(var(--surface-2) / <alpha-value>)',
          '3': 'hsl(var(--surface-3) / <alpha-value>)',
          '4': 'hsl(var(--surface-4) / <alpha-value>)',
        },
        hairline: {
          DEFAULT: 'hsl(var(--hairline) / <alpha-value>)',
          strong: 'hsl(var(--hairline-strong) / <alpha-value>)',
        },
        // Semantic status pairs (bg + fg), light and dark, ≥ 4.5:1
        status: {
          'success-bg': 'hsl(var(--status-success-bg) / <alpha-value>)',
          'success-fg': 'hsl(var(--status-success-fg) / <alpha-value>)',
          'warning-bg': 'hsl(var(--status-warning-bg) / <alpha-value>)',
          'warning-fg': 'hsl(var(--status-warning-fg) / <alpha-value>)',
          'danger-bg': 'hsl(var(--status-danger-bg) / <alpha-value>)',
          'danger-fg': 'hsl(var(--status-danger-fg) / <alpha-value>)',
          'info-bg': 'hsl(var(--status-info-bg) / <alpha-value>)',
          'info-fg': 'hsl(var(--status-info-fg) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        chart: {
          '1': 'hsl(var(--chart-1) / <alpha-value>)',
          '2': 'hsl(var(--chart-2) / <alpha-value>)',
          '3': 'hsl(var(--chart-3) / <alpha-value>)',
          '4': 'hsl(var(--chart-4) / <alpha-value>)',
          '5': 'hsl(var(--chart-5) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background) / <alpha-value>)',
          foreground: 'hsl(var(--sidebar-foreground) / <alpha-value>)',
          primary: 'hsl(var(--sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground) / <alpha-value>)',
          accent: 'hsl(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground) / <alpha-value>)',
          muted: 'hsl(var(--sidebar-muted) / <alpha-value>)',
          active: 'hsl(var(--sidebar-active) / <alpha-value>)',
          border: 'hsl(var(--sidebar-border) / <alpha-value>)',
          ring: 'hsl(var(--sidebar-ring) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-4px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'row-fade': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-in-down': 'slide-in-down 0.25s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'row-fade': 'row-fade 0.2s ease-out both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
