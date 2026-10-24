import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'public'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
      // LGPD: nenhum console.* com conteúdo do documento. Use `shared/lib/logger.ts`.
      'no-console': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'LGPD: proibido persistir dados no navegador.' },
        { name: 'sessionStorage', message: 'LGPD: proibido persistir dados no navegador.' },
        { name: 'indexedDB', message: 'LGPD: proibido persistir dados no navegador.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'document', property: 'cookie', message: 'LGPD: proibido usar cookies.' },
        { object: 'history', property: 'pushState', message: 'LGPD: nada de dados em history.state/URL.' },
        { object: 'history', property: 'replaceState', message: 'LGPD: nada de dados em history.state/URL.' },
        {
          object: 'window',
          property: 'localStorage',
          message: 'LGPD: proibido persistir dados no navegador.',
        },
        {
          object: 'window',
          property: 'sessionStorage',
          message: 'LGPD: proibido persistir dados no navegador.',
        },
      ],
    },
  },
  {
    files: ['src/shared/lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Testes espionam storage/console para provar que nada vaza.
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off', 'no-console': 'off' },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
