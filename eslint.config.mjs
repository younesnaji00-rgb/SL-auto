// Flat ESLint config (ESLint 9). `npm run lint` runs it; `next build` also
// honours it because eslint.ignoreDuringBuilds is false in next.config.ts.
// eslint-config-next 15.x ships eslintrc-style configs, hence FlatCompat.
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'SL-auto-main/**', 'android/**', 'capacitor-webdir/**', 'functions/**', 'public/**', 'demo-hosting/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // The marketing site uses plain <img> deliberately (static assets, no optimizer on Cloud Run).
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // Pre-existing patterns in scripts/, tailwind.config.ts and shadcn/ui
      // stubs; warnings so they show up without blocking `next build`.
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
];
