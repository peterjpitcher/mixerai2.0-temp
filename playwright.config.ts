import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'tests/playwright',
  timeout: 120 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54545',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'playwright-test-key',
      NEXT_PUBLIC_ENABLE_TEST_MOCKS: '1',
    },
  },
});
