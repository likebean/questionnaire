/**
 * 账号管理 E2E：校管登录后，列表查、新增账号、编辑、删除。
 * 新增账号依赖已有用户（使用 dev-admin 或先建用户）；删除仅删本次创建的账号。
 */
import { test, expect } from '@playwright/test'

test.describe('账号管理', () => {
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

  test('查：账号列表页展示标题、新增按钮、表格', async ({ page }) => {
    await page.goto('/accounts')
    await expect(page.getByRole('heading', { name: '账号管理' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: '新增账号' })).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByText('加载中')).not.toBeVisible({ timeout: 10000 })
  })

  test('增：新增本地账号后跳回列表且列表中有该登录标识', async ({ page }) => {
    const loginId = `e2e-acc-${Date.now()}`
    await page.goto('/users/new')
    const uid = `e2e-user-for-acc-${Date.now()}`
    await page.getByPlaceholder('请输入用户ID').fill(uid)
    await page.getByPlaceholder('请输入昵称').fill('E2E账号用用户')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page).toHaveURL('/users', { timeout: 10000 })

    await page.goto('/accounts/new')
    await expect(page.getByRole('heading', { name: '新增账号' })).toBeVisible()
    await page.getByPlaceholder('请输入用户ID').fill(uid)
    await page.getByPlaceholder('请输入登录标识').fill(loginId)
    await page.locator('select').first().selectOption('local')
    await page.getByPlaceholder('请输入密码').fill('pass123')
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page).toHaveURL('/accounts', { timeout: 10000 })
    await expect(page.getByText(loginId)).toBeVisible({ timeout: 5000 })
  })

  test('改：编辑账号登录标识并保存后跳回列表', async ({ page }) => {
    await page.goto('/accounts')
    await expect(page.getByRole('heading', { name: '账号管理' })).toBeVisible({ timeout: 10000 })
    const firstEdit = page.locator('table a[href^="/accounts/"]').first()
    if ((await firstEdit.count()) === 0) {
      test.skip(true, '当前无账号可编辑')
      return
    }
    await firstEdit.click()
    await expect(page).toHaveURL(/\/accounts\/\d+/)
    await expect(page.getByRole('heading', { name: '编辑账号' })).toBeVisible({ timeout: 5000 })
    const loginInput = page.getByPlaceholder('登录标识').first()
    await loginInput.fill('')
    const newLoginId = `e2e-edited-${Date.now()}`
    await loginInput.fill(newLoginId)
    await page.getByPlaceholder('留空表示不修改密码').fill('newpass123')
    await page.getByRole('button', { name: '保存' }).first().click()
    await expect(page).toHaveURL('/accounts', { timeout: 10000 })
    await expect(page.getByText(newLoginId)).toBeVisible({ timeout: 5000 })
  })

  test('删：删除账号时出现确认弹层，确认后列表更新', async ({ page }) => {
    const loginId = `e2e-del-acc-${Date.now()}`
    const uid = `e2e-del-user-acc-${Date.now()}`
    await page.goto('/users/new')
    await page.getByPlaceholder('请输入用户ID').fill(uid)
    await page.getByPlaceholder('请输入昵称').fill('待删账号用户')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page).toHaveURL('/users', { timeout: 10000 })

    await page.goto('/accounts/new')
    await page.getByPlaceholder('请输入用户ID').fill(uid)
    await page.getByPlaceholder('请输入登录标识').fill(loginId)
    await page.locator('select').first().selectOption('local')
    await page.getByPlaceholder('请输入密码').fill('pwd123')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page).toHaveURL('/accounts', { timeout: 10000 })
    await expect(page.getByText(loginId)).toBeVisible({ timeout: 5000 })

    const row = page.locator(`tr:has-text("${loginId}")`)
    await row.locator('button[title="删除"]').click()
    await expect(page.getByText('确认删除')).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.getByText('确认删除')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(loginId)).not.toBeVisible()
  })
})
