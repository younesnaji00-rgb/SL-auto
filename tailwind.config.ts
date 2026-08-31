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
      // Elevation (Stripe levels 1–2): tonal cards get level 1, popovers level 2.
      boxShadow: {
        card: '0 1px 2px hsl(var(--shadow-color) / 0.05), 0 1px 3px hsl(var(--shadow-color) / 0.06)',
        raised: '0 8px 24px hsl(var(--shadow-color) / 0.10), 0 2px 6px hsl(var(--shadow-color) / 0.05)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // Ink ladder (Apple HIG label → quaternaryLabel), slate-navy hue.
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          '2': 'hsl(var(--ink-2))',
          '3': 'hsl(var(--ink-3))',
          '4': 'hsl(var(--ink-4))',
          solid: 'hsl(var(--ink-solid))',
        },
        'on-ink': 'hsl(var(--on-ink))',
        'heading-bg': 'hsl(var(--heading-bg))',
        'heading-fg': 'hsl(var(--heading-fg))',
        // Neutral ladder (Radix-style): page → surface-1 (card) → surface-2 (hover/header)
        surface: {
          '1': 'hsl(var(--surface-1))',
          '2': 'hsl(var(--surface-2))',
          '3': 'hsl(var(--surface-3))',
          '4': 'hsl(var(--surface-4))',
        },
        hairline: {
          DEFAULT: 'hsl(var(--hairline))',
          strong: 'hsl(var(--hairline-strong))',
        },
        // Semantic status pairs (bg + fg), light and dark, ≥ 4.5:1
        status: {
          'success-bg': 'hsl(var(--status-success-bg))',
          'success-fg': 'hsl(var(--status-success-fg))',
          'warning-bg': 'hsl(var(--status-warning-bg))',
          'warning-fg': 'hsl(var(--status-warning-fg))',
          'danger-bg': 'hsl(var(--status-danger-bg))',
          'danger-fg': 'hsl(var(--status-danger-fg))',
          'info-bg': 'hsl(var(--status-info-bg))',
          'info-fg': 'hsl(var(--status-info-fg))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          active: 'hsl(var(--sidebar-active))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
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
