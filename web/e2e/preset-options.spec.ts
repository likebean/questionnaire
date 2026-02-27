/**
 * 预定义选项库 E2E：校管登录后，打开新增预定义组弹窗，验证统一弹窗交互（叉叉/遮罩/ESC）与按钮文案。
 * 需先启动后端；运行前会先登录 admin/admin123。
 */
import { test, expect } from '@playwright/test'

test.describe('预定义选项库', () => {
  test.beforeEach(async ({ page }) => {
    const health = await page.request.get('http://localhost:8080/api/health').catch(() => null)
    if (!health || health.status() !== 200) {
      test.skip(true, '后端未启动')
      return
    }
    await page.goto('/auth/login')
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: '本地登录' }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('新增预定义组弹窗：叉叉/遮罩/ESC 关闭，且无左下角取消按钮', async ({ page }) => {
    await page.goto('/preset-options')
    await expect(page.getByRole('heading', { name: '预定义选项库' })).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: '新增预定义组' }).click()

    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.getByText('新增预定义组')).toBeVisible()

    // 不应出现“取消”按钮（新增态）
    await expect(dialog.getByRole('button', { name: '取消' })).toHaveCount(0)

    // 右上角叉叉（aria-label=关闭）可关闭
    await dialog.locator('button[aria-label="关闭"]').click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    // ESC 可关闭
    await page.getByRole('button', { name: '新增预定义组' }).click()
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    // 点击遮罩可关闭
    await page.getByRole('button', { name: '新增预定义组' }).click()
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await page.locator('div.fixed.inset-0.z-50.bg-black\\/20').click({ position: { x: 5, y: 5 } })
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  })
})

