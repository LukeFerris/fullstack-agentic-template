import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Allow higher complexity for AWS SDK integration code
      'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-statements': ['error', 50],
      'complexity': ['error', 20],
      'sonarjs/cognitive-complexity': ['error', 25],
      'max-depth': ['error', 5],
    },
  },
  {
    files: ['src/**/*.test.ts'],
    rules: {
      // Relax rules for test files
      'max-lines-per-function': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
