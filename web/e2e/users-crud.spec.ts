/**
 * 用户管理增删改查 E2E：校管登录后，列表查、新增、编辑、删除用户。
 * 需先启动后端；运行前会先登录 admin/admin123。
 */
import { test, expect } from '@playwright/test'

test.describe('用户管理增删改查', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel(/用户名/).fill('admin')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: '本地登录' }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('查：用户列表页展示标题、新增按钮、搜索与表格', async ({ page }) => {
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: '新增用户' })).toBeVisible()
    await expect(page.getByPlaceholder('输入用户ID或昵称')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByText('加载中')).not.toBeVisible({ timeout: 10000 })
  })

  test('增：新增用户后跳回列表且列表中有该用户', async ({ page }) => {
    const newId = `e2e-user-${Date.now()}`
    const newNickname = `E2E测试用户-${Date.now()}`

    await page.goto('/users')
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible({ timeout: 10000 })
    await page.getByRole('link', { name: '新增用户' }).click()
    await expect(page).toHaveURL('/users/new')
    await expect(page.getByRole('heading', { name: '新增用户' })).toBeVisible()

    await page.getByPlaceholder('请输入用户ID').fill(newId)
    await page.getByPlaceholder('请输入昵称').fill(newNickname)
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page).toHaveURL('/users', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible()
    await expect(page.getByText(newId)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(newNickname)).toBeVisible()
  })

  test('改：编辑用户昵称并保存后跳回列表', async ({ page }) => {
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible({ timeout: 10000 })
    const firstEdit = page.locator('table a[href^="/users/"]').first()
    if ((await firstEdit.count()) === 0) {
      test.skip(true, '当前无用户可编辑')
      return
    }
    await firstEdit.click()
    await expect(page).toHaveURL(/\/users\/[^/]+/)
    await expect(page.getByRole('heading', { name: '编辑用户' })).toBeVisible({ timeout: 5000 })

    const nicknameInput = page.getByPlaceholder('请输入昵称').first()
    await nicknameInput.fill('')
    const editedName = `E2E编辑-${Date.now()}`
    await nicknameInput.fill(editedName)
    await page.getByRole('button', { name: '保存' }).first().click()

    await expect(page).toHaveURL('/users', { timeout: 10000 })
    await expect(page.getByText(editedName)).toBeVisible({ timeout: 5000 })
  })

  test('删：删除用户时出现确认弹层，确认后列表更新', async ({ page }) => {
    const newId = `e2e-del-${Date.now()}`
    const newNickname = `E2E待删-${Date.now()}`

    await page.goto('/users/new')
    await page.getByPlaceholder('请输入用户ID').fill(newId)
    await page.getByPlaceholder('请输入昵称').fill(newNickname)
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page).toHaveURL('/users', { timeout: 10000 })
    await expect(page.getByText(newId)).toBeVisible({ timeout: 5000 })

    const row = page.locator(`tr:has-text("${newId}")`)
    await row.locator('button[title="删除"]').click()
    await expect(page.getByText('确认删除')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(newNickname).first()).toBeVisible()
    await page.getByRole('button', { name: '确认' }).click()

    await expect(page.getByText('确认删除')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(newId)).not.toBeVisible()
  })
})
