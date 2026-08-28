// Flat ESLint config (ESLint 9). `npm run lint` runs it; `next build` also
// honours it because eslint.ignoreDuringBuilds is false in next.config.ts.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals.js';
import nextTypescript from 'eslint-config-next/typescript.js';

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'SL-auto-main/**', 'android/**', 'capacitor-webdir/**', 'functions/**', 'public/**', 'demo-hosting/**'],
  },
  {
    rules: {
      // The marketing site uses plain <img> deliberately (static assets, no optimizer on Cloud Run).
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
