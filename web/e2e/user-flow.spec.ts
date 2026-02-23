/**
 * 完整用户操作 E2E：在真实浏览器中模拟用户从访问到登录、导航的完整流程。
 * 运行前请先启动后端：cd api && ./mvnw spring-boot:run（或 JAVA_HOME=java23 ./mvnw spring-boot:run）
 * 前端可由 Playwright 自动启动（webServer），或先 npm run dev。
 */
import { test, expect } from '@playwright/test'

test.describe('完整用户流程', () => {
  test('未登录访问首页 → 跳转登录页 → 输入账号密码登录 → 首页 → 进入我的问卷 → 返回首页', async ({
    page,
  }) => {
    // 1. 未登录访问首页，应被重定向到登录页
    await page.goto('/')
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: '问卷系统' })).toBeVisible()

    // 2. 在登录页输入用户名、密码，点击本地登录（真实请求后端）
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: '本地登录' }).click()

    // 3. 登录成功后跳转首页，看到欢迎文案和「我的问卷」入口
    await expect(page).toHaveURL('/', { timeout: 15000 })
    await expect(page.getByText('欢迎使用问卷系统')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: '我的问卷', exact: true })).toBeVisible()

    // 4. 点击「我的问卷」，进入问卷列表页（使用 exact 避免与侧栏同名链接重复）
    await page.getByRole('link', { name: '我的问卷', exact: true }).click()
    await expect(page).toHaveURL('/surveys', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: '我的问卷' })).toBeVisible({ timeout: 10000 })
    // 列表可能先显示「加载中」，再显示「暂无问卷」或列表（多元素取其一即可）
    await expect(
      page.getByText(/当前用户|加载中|暂无问卷|问卷 CRUD/).first()
    ).toBeVisible({ timeout: 15000 })

    // 5. 等待列表加载完成（不再显示「加载中」），应看到空状态或当前用户信息
    await expect(page.getByText('加载中')).not.toBeVisible({ timeout: 15000 })
    await expect(
      page.getByText(/当前用户|暂无问卷|问卷 CRUD/).first()
    ).toBeVisible()

    // 6. 点击「返回首页」回到首页
    await page.getByRole('link', { name: '返回首页' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('欢迎使用问卷系统')).toBeVisible()
  })

  test('登录页：错误密码时显示错误信息，不跳转', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByLabel(/密码/).fill('wrong-password')
    await page.getByRole('button', { name: '本地登录' }).click()

    await expect(page.getByText(/用户名或密码错误|登录失败|网络错误/)).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('已登录访问首页直接看到内容，不进入登录页', async ({ page }) => {
    // 先登录
    await page.goto('/auth/login')
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: '本地登录' }).click()
    await expect(page).toHaveURL('/', { timeout: 15000 })

    // 再访问首页，应直接看到内容（不会重定向到登录页）
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByText('欢迎使用问卷系统')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: '我的问卷', exact: true })).toBeVisible()
  })
})
