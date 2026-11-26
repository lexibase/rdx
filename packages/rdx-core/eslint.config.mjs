import { config } from '@rdx/eslint-config/base'

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    // The base config re-enables the core rule after typescript-eslint, but the
    // core rule cannot read TypeScript types. Use the typed rule with the same
    // underscore convention for intentionally unused arguments.
    files: ['**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
]
