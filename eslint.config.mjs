import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

import noDirectEntityMutationRule from './eslint/rules/no-direct-entity-mutation.mjs';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/jest.config.js',
      '**/*.config.js',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      '**/test/**',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  // Global settings
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mjs', '*.js', '*.cjs', '*.ts', '*.tsx'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'entity-domain': {
        rules: {
          'no-direct-entity-mutation': noDirectEntityMutationRule,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'prefer-const': 'error',
      eqeqeq: 'error',
      'entity-domain/no-direct-entity-mutation': 'error',
    },
  },
];
