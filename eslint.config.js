import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', 'vertical-stack-in-card.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['tests/**/*.ts', '*.config.ts', '*.config.mjs', '*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
