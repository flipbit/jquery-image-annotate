import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run demo:ci',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
