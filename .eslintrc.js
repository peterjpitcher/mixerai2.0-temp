module.exports = {
  extends: ['next/core-web-vitals', 'next/typescript'],
  rules: {
    'no-console': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'react/no-unescaped-entities': 'off',
    '@next/next/no-img-element': 'off',
    'jsx-a11y/alt-text': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
