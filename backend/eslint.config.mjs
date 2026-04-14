import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./dto/*.dto', '../*/dto/*.dto'],
              message: 'Use dto barrel exports via index.ts.',
            },
            {
              group: ['./repositories/*.repository', '../*/repositories/*.repository'],
              message: 'Use repository barrel exports via index.ts.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
