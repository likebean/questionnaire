import { defineConfig, devices } from '@playwright/test'

/**
 * E2E 会启动前端（webServer）；完整用户流程（登录、我的问卷等）需先启动后端：
 *   cd api && ./mvnw spring-boot:run
 * 否则与 /api 相关的用例会失败。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
