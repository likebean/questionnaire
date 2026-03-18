import { expect, test } from '@playwright/test'

test.describe('问卷编辑页 选项横排列数', () => {
  test('支持 2~8 列横排并正确写入配置', async ({ page }) => {
    const surveyId = 'mock-choice-columns'
    const putConfigs: Array<Record<string, unknown>> = []

    await page.route('**/api/auth/me*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            id: 'u-admin',
            nickname: '管理员',
            roleCodes: ['ADMIN'],
          },
        }),
      })
    })

    await page.route(`**/api/surveys/${surveyId}*`, async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const isSurveyDetailGet =
        req.method() === 'GET'
        && url.pathname.startsWith(`/api/surveys/${surveyId}`)
        && !url.pathname.includes('/questions/')
      if (isSurveyDetailGet) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'ok',
            data: {
              id: surveyId,
              title: '列数配置测试',
              status: 'DRAFT',
              questions: [
                {
                  id: 801,
                  surveyId,
                  sortOrder: 0,
                  type: 'SINGLE_CHOICE',
                  title: '<p><strong>请选择</strong></p>',
                  required: true,
                  config: JSON.stringify({
                    layout: 'vertical',
                    optionsRandom: false,
                    options: Array.from({ length: 8 }, (_, i) => ({ sortOrder: i, label: `选项${i + 1}` })),
                  }),
                },
              ],
            },
          }),
        })
        return
      }
      await route.fallback()
    })

    await page.route(`**/api/surveys/${surveyId}/questions/801*`, async (route) => {
      if (route.request().method() === 'PUT') {
        const patch = route.request().postDataJSON() as Record<string, unknown>
        const configText = patch.config
        if (typeof configText === 'string') {
          try {
            putConfigs.push(JSON.parse(configText) as Record<string, unknown>)
          } catch {
            // ignore parse error
          }
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'ok', data: null }),
        })
        return
      }
      await route.fallback()
    })

    await page.goto(`/surveys/${surveyId}/edit`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: '编辑问卷' })).toBeVisible({ timeout: 15000 })

    const layoutSelect = page.locator('select[title="选项排列"]').first()
    await expect(layoutSelect).toBeVisible()
    await expect(layoutSelect).toHaveValue('vertical')

    const optionValues = await layoutSelect.locator('option').evaluateAll((options) =>
      options.map((opt) => (opt as HTMLOptionElement).value)
    )
    expect(optionValues).toEqual([
      'vertical',
      'horizontal-2',
      'horizontal-3',
      'horizontal-4',
      'horizontal-5',
      'horizontal-6',
      'horizontal-7',
      'horizontal-8',
    ])

    await layoutSelect.selectOption('horizontal-4')
    await expect.poll(() => {
      const latest = putConfigs[putConfigs.length - 1]
      return latest ? `${latest.layout}-${latest.layoutColumns}` : ''
    }).toBe('horizontal-4')

    await page.getByRole('button', { name: '完成编辑' }).click()
    await expect(page.locator('.edit-question-preview .sd-selectbase--multi-column .sd-selectbase__column.sv-q-column-4')).toHaveCount(4)
    await expect(page.locator('.edit-question-preview .sd-item.sd-selectbase__item')).toHaveCount(8)

    await page.getByRole('button', { name: '编辑' }).first().click({ force: true })
    await expect(layoutSelect).toHaveValue('horizontal-4')
    await layoutSelect.selectOption('vertical')
    await expect.poll(() => {
      const latest = putConfigs[putConfigs.length - 1]
      return latest ? String(latest.layout) : ''
    }).toBe('vertical')
    await expect.poll(() => {
      const latest = putConfigs[putConfigs.length - 1]
      return latest && 'layoutColumns' in latest ? String(latest.layoutColumns) : 'unset'
    }).toBe('unset')
  })
})
