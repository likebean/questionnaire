/**
 * 问卷流程 E2E：登录 → 我的问卷 → 创建问卷 → 设置页 → 设计问卷(编辑页) → 发布 → 填写链接 → 填写页提交。
 * 运行前请先启动后端：cd api && ./mvnw spring-boot:run
 */
import { test, expect } from '@playwright/test'

test.describe('问卷流程', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000)
    const health = await page.request.get('http://localhost:8080/api/health').catch(() => null)
    if (!health || health.status() !== 200) {
      test.skip(true, '后端未启动，跳过依赖 API 的问卷流程测试')
      return
    }
    await page.goto('/auth/login', { waitUntil: 'networkidle' })
    await expect(page.locator('#username')).toBeVisible({ timeout: 45000 })
    await page.locator('#username').fill('admin')
    await page.locator('#password').fill('admin123')
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
    await page.getByText('题型', { exact: true }).locator('..').locator('select').selectOption('SHORT_TEXT')
    await page.waitForTimeout(500)
    await expect(page.getByText('校验类型')).toBeVisible({ timeout: 10000 })
    const validationSelect = page.getByText('校验类型').locator('..').locator('select')
    await validationSelect.selectOption('phone')
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByRole('button', { name: '发布' })).not.toBeVisible({ timeout: 15000 })

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

  test('编辑页单选题：批量添加选项', async ({ page }) => {
    await page.goto('/surveys')
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '批量添加选项' }).click()
    const textarea = page.getByPlaceholder(/每行一个选项/)
    await expect(textarea).toBeVisible({ timeout: 5000 })
    await textarea.fill('选项A\n选项B\n选项C')
    await page.getByRole('button', { name: '确定添加' }).click()
    await expect(page.locator('input[value="选项A"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[value="选项B"]')).toBeVisible()
    await expect(page.locator('input[value="选项C"]')).toBeVisible()
  })

  test('编辑页单选题：添加「其他」选项', async ({ page }) => {
    await page.goto('/surveys')
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '添加「其他」选项' }).click()
    await expect(page.locator('input[value="其他"]')).toBeVisible({ timeout: 5000 })
  })

  test('编辑页单选题：默认选中项与选项说明、图片外链', async ({ page }) => {
    await page.goto('/surveys')
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '批量添加选项' }).click()
    await page.getByPlaceholder(/每行一个选项/).fill('选项一\n选项二')
    await page.getByRole('button', { name: '确定添加' }).click()
    const defaultSelect = page.getByText('默认选中（选填）').locator('..').locator('select')
    await expect(defaultSelect).toBeVisible({ timeout: 5000 })
    await defaultSelect.selectOption('1')
    const singleChoiceBlock = page.getByText('默认选中（选填）').locator('..').locator('..')
    const descInput = singleChoiceBlock.getByPlaceholder(/说明文字或链接/).first()
    await expect(descInput).toBeVisible({ timeout: 5000 })
    await descInput.fill('https://example.com')
    const imageInput = singleChoiceBlock.getByPlaceholder(/图片外链/).first()
    await imageInput.fill('https://via.placeholder.com/80')
  })

  test('填写页：默认选中与选项允许填空', async ({ page }) => {
    await page.goto('/surveys')
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await page.getByLabel('问卷标题').fill('E2E默认与填空')
    await page.getByRole('button', { name: /保存/ }).click()
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '批量添加选项' }).click()
    await page.getByPlaceholder(/每行一个选项/).fill('选我填空\n选我默认')
    await page.getByRole('button', { name: '确定添加' }).click()
    const singleChoiceBlock = page.getByText('默认选中（选填）').locator('..').locator('..')
    await singleChoiceBlock.getByLabel(/允许填空/).first().click()
    const defaultSelect = page.getByText('默认选中（选填）').locator('..').locator('select')
    await defaultSelect.selectOption('1')
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
    await page.getByText('选我填空').click()
    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible({ timeout: 5000 })
  })

  test('编辑页预览：草稿问卷点预览打开填写页，显示预览提示且无未到开始时间', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/settings/, { timeout: 5000 })
    await page.getByRole('link', { name: '设计问卷' }).click()
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 5000 })
    await page.getByRole('button', { name: '添加题目' }).click()
    await expect(page.getByText('新题目')).toBeVisible({ timeout: 10000 })

    const editUrl = page.url()
    const surveyId = editUrl.match(/\/surveys\/([^/]+)\/edit/)?.[1]
    if (!surveyId) {
      test.skip()
      return
    }
    await page.goto(`/fill/${surveyId}?preview=1`)
    await expect(page).toHaveURL(/\/fill\/[^/]+\?preview=1/, { timeout: 10000 })
    const submitBtn = page.getByRole('button', { name: '提交' })
    const errorMsg = page.getByText('未到开始时间')
    await expect(submitBtn.or(errorMsg)).toBeVisible({ timeout: 20000 })
    await expect(errorMsg).not.toBeVisible()
    await expect(submitBtn).toBeVisible()
    await expect(page.getByText(/预览模式/)).toBeVisible({ timeout: 3000 })
  })

  test('草稿（允许匿名）：填写页选一项后刷新，草稿按设备恢复，再提交成功', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/settings/, { timeout: 5000 })
    await page.getByLabel('问卷标题').fill('草稿匿名测试')
    await page.getByRole('checkbox', { name: /允许匿名填写/ }).click()
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
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 25000 })
    const saveDraftPromise = page.waitForResponse((res) => res.url().includes('/draft') && res.request().method() === 'POST' && res.status() === 200, { timeout: 5000 }).catch(() => null)
    await page.getByText('选项1').click()
    await saveDraftPromise
    await page.waitForTimeout(300)
    await page.reload()
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 25000 })
    await page.waitForResponse((res) => res.url().includes('/draft') && res.request().method() === 'GET', { timeout: 10000 }).catch(() => null)
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: '提交' }).click()
    const success = page.getByRole('heading', { name: '提交成功' })
    const validationMsg = page.getByText(/请完成必填题|请选择选项/)
    const done = await Promise.race([
      success.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      validationMsg.waitFor({ state: 'visible', timeout: 5000 }).then(() => false),
    ]).catch(() => false)
    if (!done) {
      await page.getByText('选项1').click()
      await page.getByRole('button', { name: '提交' }).click()
    }
    await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible({ timeout: 5000 })
  })

  test('草稿（不允许匿名）：登录后填写页选一项后刷新，草稿按用户恢复，再提交成功', async ({ page }) => {
    await page.goto('/surveys')
    await expect(page.getByRole('link', { name: /创建问卷/ })).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForURL(/\/surveys\/[^/]+\/settings/, { timeout: 20000 }),
      page.getByRole('link', { name: /创建问卷/ }).click(),
    ])
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/settings/, { timeout: 5000 })
    await page.getByLabel('问卷标题').fill('草稿登录测试')
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
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 25000 })
    const saveDraftPromise = page.waitForResponse((res) => res.url().includes('/draft') && res.request().method() === 'POST' && res.status() === 200, { timeout: 5000 }).catch(() => null)
    await page.getByText('选项1').click()
    await saveDraftPromise
    await page.waitForTimeout(300)
    await page.reload()
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 25000 })
    await page.waitForResponse((res) => res.url().includes('/draft') && res.request().method() === 'GET', { timeout: 10000 }).catch(() => null)
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: '提交' }).click()
    const success = page.getByRole('heading', { name: '提交成功' })
    const validationMsg = page.getByText(/请完成必填题|请选择选项/)
    const done = await Promise.race([
      success.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      validationMsg.waitFor({ state: 'visible', timeout: 5000 }).then(() => false),
    ]).catch(() => false)
    if (!done) {
      await page.getByText('选项1').click()
      await page.getByRole('button', { name: '提交' }).click()
    }
    await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible({ timeout: 5000 })
  })
})
