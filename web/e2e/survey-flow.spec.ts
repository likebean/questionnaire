/**
 * 问卷流程 E2E：登录 → 我的问卷 → 创建问卷 → 编辑页 → 设置 → 发布 → 填写链接 → 填写页提交。
 * 运行前请先启动后端：cd api && ./mvnw spring-boot:run
 */
import { test, expect } from '@playwright/test'

test.describe('问卷流程', () => {
  test.beforeEach(async ({ page }) => {
    const health = await page.request.get('http://localhost:8080/api/health').catch(() => null)
    if (!health || health.status() !== 200) {
      test.skip(true, '后端未启动，跳过依赖 API 的问卷流程测试')
      return
    }
    await page.goto('/auth/login')
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: '本地登录' }).click()
    await expect(page).toHaveURL('/', { timeout: 15000 })
  })

  test('我的问卷列表 → 创建问卷 → 进入编辑页', async ({ page }) => {
    await page.getByRole('link', { name: '我的问卷', exact: true }).click()
    await expect(page).toHaveURL('/surveys', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: '我的问卷' })).toBeVisible()

    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/\d+\/edit/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await expect(page.getByText(/题目列表|编辑|问卷标题/)).toBeVisible({ timeout: 5000 })
  })

  test('编辑页保存标题、添加题目、发布', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('heading', { name: '我的问卷' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/\d+\/edit/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])

    await page.getByLabel('问卷标题').fill('E2E测试问卷')
    await page.getByRole('button', { name: /保存/ }).first().click()
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByRole('button', { name: '发布' })).not.toBeVisible({ timeout: 10000 })
  })

  test('设置页复制填写链接 → 填写页打开并提交', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/\d+\/edit/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await page.getByLabel('问卷标题').fill('填写测试')
    await page.getByRole('button', { name: /保存/ }).first().click()
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByRole('button', { name: '发布' })).not.toBeVisible({ timeout: 10000 })

    const editUrl = page.url()
    const surveyId = editUrl.match(/\/surveys\/(\d+)\/edit/)?.[1]
    if (!surveyId) {
      test.skip()
      return
    }

    await page.goto(`/surveys/${surveyId}/settings`)
    await expect(page.getByText('填写链接')).toBeVisible({ timeout: 5000 })
    await page.goto(`/fill/${surveyId}`)
    await expect(page.getByText('填写测试')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible()
    await page.getByText('选项1').click()
    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible({ timeout: 5000 })
  })
})
