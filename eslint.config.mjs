import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';

import noDirectEntityMutationRule from './eslint/rules/no-direct-entity-mutation.mjs';
import { hexagonalArchitectureConfigs } from './eslint/rules/hexagonal-architecture.mjs';

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
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'prefer-const': 'error',
      eqeqeq: 'error',
      'entity-domain/no-direct-entity-mutation': 'error',
    },
  },

  // Hexagonal Architecture rules for Domain layer
  {
    files: ['**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/application/**', '**/infrastructure/**'],
              message: 'Domain layer should only import from domain layer',
            },
          ],
        },
      ],
    },
  },

  // Hexagonal Architecture rules for Application layer
  {
    files: ['**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**'],
              message: 'Application layer should only import from domain and application layers',
            },
          ],
        },
      ],
    },
  },

  // Hexagonal Architecture rules for Infrastructure layer
  {
    files: ['**/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/application/**'],
              message:
                'Infrastructure layer should only import from domain and infrastructure layers',
            },
          ],
        },
      ],
    },
  },
];
