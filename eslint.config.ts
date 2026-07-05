import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import ts from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist/**',
  ]),

  ...ts.configs.recommended,

  prettier,
]);
