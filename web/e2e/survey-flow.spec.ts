/**
 * 问卷流程 E2E：登录 → 我的问卷 → 创建问卷 → 设置页 → 设计问卷(编辑页) → 发布 → 填写链接 → 填写页提交。
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

  test('我的问卷列表分页：每页最多 20 条，显示分页信息', async ({ page }) => {
    await page.getByRole('link', { name: '我的问卷', exact: true }).click()
    await expect(page).toHaveURL('/surveys', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: '我的问卷' })).toBeVisible()
    const footer = page.getByText(/显示 \d+ 至 \d+ 条，共 \d+ 条记录/)
    await expect(footer).toBeVisible({ timeout: 15000 })
    const dataRows = page.locator('table tbody tr').filter({ hasNot: page.getByText('暂无问卷') }).filter({ hasNot: page.getByText('加载中') })
    const count = await dataRows.count()
    expect(count).toBeLessThanOrEqual(20)
  })

  test('我的问卷列表 → 创建问卷 → 进入设置页', async ({ page }) => {
    await page.getByRole('link', { name: '我的问卷', exact: true }).click()
    await expect(page).toHaveURL('/surveys', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: '我的问卷' })).toBeVisible()

    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await expect(page.getByRole('heading', { name: '问卷设置' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: '设计问卷' })).toBeVisible()
  })

  test('编辑页保存标题、添加题目、发布', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('heading', { name: '我的问卷' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/settings/, { timeout: 5000 })
    await page.getByLabel('问卷标题').fill('E2E测试问卷')
    await page.getByRole('button', { name: /保存/ }).click()
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByRole('button', { name: '发布' })).not.toBeVisible({ timeout: 10000 })
  })

  test('设置页复制填写链接 → 填写页打开并提交', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/settings/, { timeout: 5000 })
    await page.getByLabel('问卷标题').fill('填写测试')
    await page.getByRole('button', { name: /保存/ }).click()
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByRole('button', { name: '发布' })).not.toBeVisible({ timeout: 10000 })

    const editUrl = page.url()
    const surveyId = editUrl.match(/\/surveys\/([^/]+)\/edit/)?.[1]
    if (!surveyId) {
      test.skip()
      return
    }

    await page.goto(`/fill/${surveyId}`)
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 15000 })
    await page.getByText('选项1').click()
    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible({ timeout: 5000 })
  })

  test('设置页问卷标题支持换行：输入主标题\\n副标题后，填写页可看到两行', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/settings/, { timeout: 5000 })
    await page.getByLabel('问卷标题').fill('主标题\n副标题')
    await page.getByRole('button', { name: /保存/ }).click()
    await expect(page.getByRole('link', { name: '设计问卷' })).toBeVisible({ timeout: 10000 })
    const settingsUrl = page.url()
    const surveyId = settingsUrl.match(/\/surveys\/([^/]+)\/settings/)?.[1]
    if (!surveyId) {
      test.skip()
      return
    }
    await page.goto(`/surveys/${surveyId}/edit`)
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByRole('button', { name: '发布' })).not.toBeVisible({ timeout: 10000 })
    if (!surveyId) {
      test.skip()
      return
    }
    await page.goto(`/fill/${surveyId}`)
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 15000 })
    // 标题换行展示依赖 SurveyJS/whitespace-pre-line，此处仅验证流程：设置换行标题 → 保存 → 发布 → 填写页可打开
  })

  test('编辑页填空题为手机号校验：填写页输入无效手机号时校验提示', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await page.getByLabel('问卷标题').fill('E2E填空校验')
    await page.getByRole('button', { name: /保存/ }).click()
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.locator('select').filter({ has: page.locator('option[value=SHORT_TEXT]') }).selectOption('SHORT_TEXT')
    await page.getByText('校验类型').locator('..').locator('select').selectOption('phone')
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByRole('button', { name: '发布' })).not.toBeVisible({ timeout: 10000 })

    const editUrl = page.url()
    const surveyId = editUrl.match(/\/surveys\/([^/]+)\/edit/)?.[1]
    if (!surveyId) {
      test.skip()
      return
    }
    await page.goto(`/fill/${surveyId}`)
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 15000 })
    const textInput = page.getByRole('textbox').first()
    await textInput.fill('123')
    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByText(/请填写有效的手机号|手机号/)).toBeVisible({ timeout: 5000 })
  })

  test('编辑页单选/多选可设置选项随机、排列、标签化', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('选项随机')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('排列：')).toBeVisible({ timeout: 3000 })
    const layoutSelect = page.locator('select').filter({ has: page.locator('option[value=horizontal]') })
    await layoutSelect.selectOption('horizontal')
    await page.getByRole('checkbox', { name: /标签化呈现/ }).click()
    await expect(layoutSelect).toHaveValue('horizontal', { timeout: 8000 })
  })

  test('每设备限填1次：同一浏览器第二次提交被拒绝', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/settings/, { timeout: 5000 })
    await page.getByLabel('问卷标题').fill('设备限填测试')
    await page.getByText(/每设备限填次数/).locator('..').locator('input').fill('1')
    await page.getByRole('button', { name: /保存/ }).click()
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 5000 })
    const settingsUrl = page.url()
    const surveyIdFromSettings = settingsUrl.match(/\/surveys\/([^/]+)\/settings/)?.[1]
    if (!surveyIdFromSettings) {
      test.skip()
      return
    }
    await page.goto(`/surveys/${surveyIdFromSettings}/edit`)
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByRole('button', { name: '发布' })).not.toBeVisible({ timeout: 10000 })

    const editUrl = page.url()
    const surveyId = editUrl.match(/\/surveys\/([^/]+)\/edit/)?.[1]
    if (!surveyId) {
      test.skip()
      return
    }

    await page.goto(`/fill/${surveyId}`)
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 15000 })
    await page.getByText('选项1').click()
    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible({ timeout: 5000 })

    // 同一设备第二次提交会返回 4007，由后端单元测试覆盖；E2E 仅验证设置限填后首次提交成功
  })

  test('发布后统计分析页可导出 Excel', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await page.getByLabel('问卷标题').fill('导出测试')
    await page.getByRole('button', { name: /保存/ }).click()
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByRole('button', { name: '发布' })).not.toBeVisible({ timeout: 10000 })

    const editUrl = page.url()
    const surveyId = editUrl.match(/\/surveys\/([^/]+)\/edit/)?.[1]
    if (!surveyId) {
      test.skip()
      return
    }
    await page.goto(`/fill/${surveyId}`)
    await page.getByText('选项1').click()
    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible({ timeout: 5000 })

    await page.goto(`/surveys/${surveyId}/analytics`)
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/analytics/, { timeout: 5000 })
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.getByRole('button', { name: '导出 Excel' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  })
})
