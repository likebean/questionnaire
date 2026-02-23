/**
 * 角色管理 E2E：校管登录后，列表查、新增角色、编辑、删除。
 */
import { test, expect } from '@playwright/test'

test.describe('角色管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: '本地登录' }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('查：角色列表页展示标题、新增按钮、搜索与表格', async ({ page }) => {
    await page.goto('/roles')
    await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: '新增角色' })).toBeVisible()
    await expect(page.getByPlaceholder('编码或名称')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByText('加载中')).not.toBeVisible({ timeout: 10000 })
  })

  test('增：新增角色后跳回列表且列表中有该角色', async ({ page }) => {
    const code = `E2E_ROLE_${Date.now()}`
    const name = `E2E角色-${Date.now()}`
    await page.goto('/roles')
    await page.getByRole('link', { name: '新增角色' }).click()
    await expect(page).toHaveURL('/roles/new')
    await expect(page.getByRole('heading', { name: '新增角色' })).toBeVisible()
    await page.getByPlaceholder('如 SCHOOL_ADMIN').fill(code)
    await page.getByPlaceholder('如 校管').fill(name)
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page).toHaveURL('/roles', { timeout: 10000 })
    await expect(page.getByText(code)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(name)).toBeVisible()
  })

  test('改：编辑角色名称并保存后跳回列表', async ({ page }) => {
    await page.goto('/roles')
    await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible({ timeout: 10000 })
    const firstEdit = page.locator('table a[href^="/roles/"]').first()
    if ((await firstEdit.count()) === 0) {
      test.skip(true, '当前无角色可编辑')
      return
    }
    await firstEdit.click()
    await expect(page).toHaveURL(/\/roles\/\d+/)
    await expect(page.getByRole('heading', { name: '编辑角色' })).toBeVisible({ timeout: 5000 })
    const nameInput = page.locator('form').getByRole('textbox').nth(1)
    await nameInput.fill('')
    const newName = `E2E编辑角色-${Date.now()}`
    await nameInput.fill(newName)
    await page.getByRole('button', { name: '保存' }).first().click()
    await expect(page).toHaveURL('/roles', { timeout: 10000 })
    await expect(page.getByText(newName)).toBeVisible({ timeout: 5000 })
  })

  test('删：删除角色时出现确认弹层，确认后列表更新', async ({ page }) => {
    const code = `E2E_DEL_${Date.now()}`
    const name = `E2E待删角色-${Date.now()}`
    await page.goto('/roles/new')
    await page.getByPlaceholder('如 SCHOOL_ADMIN').fill(code)
    await page.getByPlaceholder('如 校管').fill(name)
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page).toHaveURL('/roles', { timeout: 10000 })
    await expect(page.getByText(code)).toBeVisible({ timeout: 5000 })
    const row = page.locator(`tr:has-text("${code}")`)
    await row.locator('button[title="删除"]').click()
    await expect(page.getByText('确认删除')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(name).first()).toBeVisible()
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.getByText('确认删除')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(code)).not.toBeVisible()
  })
})
