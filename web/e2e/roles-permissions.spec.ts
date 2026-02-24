import { test, expect } from '@playwright/test'

test.describe('角色与权限管理', () => {
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

  test('校管登录后可见角色管理、权限管理菜单', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: '角色管理' })).toBeVisible()
    await expect(page.getByRole('link', { name: '权限管理' })).toBeVisible()
  })

  test('角色管理页：列表与搜索', async ({ page }) => {
    await page.goto('/roles')
    await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: '新增角色' })).toBeVisible()
    await expect(page.getByPlaceholder('编码或名称')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('权限管理页：列表与筛选', async ({ page }) => {
    await page.goto('/permissions')
    await expect(page.getByRole('heading', { name: '权限管理' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByPlaceholder('名称/资源类型/操作')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('用户编辑页：可见角色分配区块', async ({ page }) => {
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible({ timeout: 10000 })
    const firstEdit = page.locator('table a[href^="/users/"]').first()
    if ((await firstEdit.count()) === 0) {
      test.skip()
      return
    }
    await firstEdit.click()
    await expect(page).toHaveURL(/\/users\/[^/]+\/?$/)
    await expect(page.getByText('角色分配')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: '保存角色' })).toBeVisible()
  })
})
