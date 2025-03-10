import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        module: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      'no-useless-escape': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Special overrides for specific files with known unused variables
  {
    files: ['src/services/deck.service.ts'],
    rules: {
      'no-unused-vars': 'off'
    }
  },
  {
    files: ['src/services/import.service.ts'],
    rules: {
      'no-unused-vars': 'off'
    }
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.js',
      '**/__tests__/**',
      '**/*.test.ts'
    ],
  },
]; 