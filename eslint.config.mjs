import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // assets/ は scripts/build-design.mjs の生成物
    ignores: ['**/node_modules/**', '**/lib/**', 'packages/*/dist/**', 'assets/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/tests/**/*.ts', '*.config.*', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // デモページのスクリプトはブラウザで動く素の JS。
    files: ['examples/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        console: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FocusEvent: 'readonly',
        Miyabarrier: 'readonly',
      },
    },
  },
  {
    // ビルド用スクリプトは Node で動く（ライブラリ本体は Node に依存しない）。
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
);
