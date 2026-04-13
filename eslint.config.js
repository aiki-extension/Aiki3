import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['public/build/bundle.js', 'public/build/**/*.js']
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.svelte'],
      },
    },
    plugins: {
      svelte,
    },
    rules: {
      ...svelte.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.{js}'],
    languageOptions: {
      parser: tsParser,
    },
    rules: {},
  },
  {
    rules: {
      'no-unused-vars': 'warn',
    },
  },
];
