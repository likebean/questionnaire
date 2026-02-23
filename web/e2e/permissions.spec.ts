/**
 * 权限管理 E2E：校管登录后，列表查、筛选、编辑权限（名称/描述）。
 * 权限为种子数据，无新增/删除入口，仅测列表与编辑。
 */
import { test, expect } from '@playwright/test'

test.describe('权限管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: '本地登录' }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('查：权限列表页展示标题、搜索、资源类型筛选与表格', async ({ page }) => {
    await page.goto('/permissions')
    await expect(page.getByRole('heading', { name: '权限管理' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByPlaceholder('名称/资源类型/操作')).toBeVisible()
    await expect(page.getByPlaceholder('筛选').first()).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByText('加载中')).not.toBeVisible({ timeout: 10000 })
  })

  test('筛选：按资源类型输入后列表更新', async ({ page }) => {
    await page.goto('/permissions')
    await expect(page.getByRole('heading', { name: '权限管理' })).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder('筛选').first().fill('survey')
    await expect(page.getByText('加载中')).not.toBeVisible({ timeout: 10000 })
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })
  })

  test('改：编辑权限描述并保存后跳回列表', async ({ page }) => {
    await page.goto('/permissions')
    await expect(page.getByRole('heading', { name: '权限管理' })).toBeVisible({ timeout: 10000 })
    const firstEdit = page.locator('table a[href^="/permissions/"]').first()
    if ((await firstEdit.count()) === 0) {
      test.skip(true, '当前无权限可编辑')
      return
    }
    await firstEdit.click()
    await expect(page).toHaveURL(/\/permissions\/\d+/)
    await expect(page.getByRole('heading', { name: '编辑权限' })).toBeVisible({ timeout: 5000 })
    const descInput = page.getByPlaceholder('可选').first()
    await descInput.fill('')
    const newDesc = `E2E描述-${Date.now()}`
    await descInput.fill(newDesc)
    await page.getByRole('button', { name: '保存' }).first().click()
    await expect(page).toHaveURL('/permissions', { timeout: 10000 })
    await expect(page.getByText(newDesc)).toBeVisible({ timeout: 5000 })
  })
})
