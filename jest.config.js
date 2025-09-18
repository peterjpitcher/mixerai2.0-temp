module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
      diagnostics: {
        warnOnly: true,
      },
      isolatedModules: false,
    }],
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
  modulePathIgnorePatterns: [
    '/.next/',
  ],
}; 
