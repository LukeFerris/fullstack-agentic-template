import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      // Relax rules for test files
      'max-lines-per-function': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
