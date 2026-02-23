import { test, expect } from '@playwright/test'

test.describe('首页', () => {
  test('打开首页应显示问卷系统标题', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '问卷系统' })).toBeVisible({ timeout: 10000 })
  })

  test('后端联通时显示健康状态 UP', async ({ page }) => {
    test.skip(true, '首页当前不展示健康状态，仅保留用例待后续展示时启用')
    await page.goto('/')
    await expect(page.getByText('UP')).toBeVisible({ timeout: 15000 })
  })

  test('显示服务名 questionnaire-api', async ({ page }) => {
    test.skip(true, '首页当前不展示服务名，仅保留用例待后续展示时启用')
    await page.goto('/')
    await expect(page.getByText('questionnaire-api')).toBeVisible({ timeout: 15000 })
  })
})
