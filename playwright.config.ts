import { defineConfig, devices } from '@playwright/test'

// Rodar: npx playwright install chromium && npm run e2e
// O servidor de produção local é iniciado automaticamente (build + start na porta 3000).
// Se já houver um servidor em http://localhost:3000, ele é reaproveitado fora do CI.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
})
