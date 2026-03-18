import { expect, test } from '@playwright/test'

test.describe('问卷编辑页 多选题规则', () => {
  test('支持勾选多项后设置互斥，且至少/至多下拉正确写入配置', async ({ page }) => {
    const surveyId = 'mock-multi-choice-rules'
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
      if (!isSurveyDetailGet) {
        await route.fallback()
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            id: surveyId,
            title: '多选规则测试',
            status: 'DRAFT',
            questions: [
              {
                id: 901,
                surveyId,
                sortOrder: 0,
                type: 'MULTIPLE_CHOICE',
                title: '<p><strong>请选择多个</strong></p>',
                required: true,
                config: JSON.stringify({
                  layout: 'vertical',
                  optionsRandom: false,
                  options: [
                    { sortOrder: 0, label: '选项1' },
                    { sortOrder: 1, label: '选项2' },
                    { sortOrder: 2, label: '选项3' },
                    { sortOrder: 3, label: '选项4' },
                  ],
                }),
              },
            ],
          },
        }),
      })
    })

    await page.route(`**/api/surveys/${surveyId}/questions/901*`, async (route) => {
      if (route.request().method() === 'PUT') {
        const payload = route.request().postDataJSON() as Record<string, unknown>
        const configText = payload.config
        if (typeof configText === 'string') {
          try {
            putConfigs.push(JSON.parse(configText) as Record<string, unknown>)
          } catch {
            // ignore
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

    // 多选题选项控件为 checkbox
    await expect(page.locator('#edit-opt-MULTIPLE_CHOICE-0')).toHaveAttribute('type', 'checkbox')

    const rows = page.locator('.sd-item.sd-selectbase__item')
    await expect(rows).toHaveCount(4)
    await expect(rows.first()).toHaveClass(/sd-item--allowhover/)
    await expect(rows.first()).toHaveClass(/sd-checkbox--allowhover/)
    await expect(rows.first().locator('.sd-checkbox__svg')).toHaveCount(1)

    // 先勾选两项，再点“互斥”
    await rows.nth(0).locator('.sd-item__control-label').click()
    await rows.nth(1).locator('.sd-item__control-label').click()
    await page.locator('.option-row-action-btn[title="互斥"]').nth(0).click()

    await expect(page.locator('.option-row-action-btn[title="互斥"]').nth(0)).toHaveClass(/bg-blue-50/)
    await expect(page.locator('.option-row-action-btn[title="互斥"]').nth(1)).toHaveClass(/bg-blue-50/)

    await expect.poll(() => {
      const latest = putConfigs[putConfigs.length - 1]
      const options = (latest?.options as Array<Record<string, unknown>> | undefined) ?? []
      return `${options[0]?.exclusive === true}-${options[1]?.exclusive === true}`
    }).toBe('true-true')

    const minSelect = page.locator('select[title="至少选"]').first()
    const maxSelect = page.locator('select[title="至多选"]').first()
    await expect(minSelect).toBeVisible()
    await expect(maxSelect).toBeVisible()

    const minValues = await minSelect.locator('option').evaluateAll((list) =>
      list.map((opt) => (opt as HTMLOptionElement).value)
    )
    const maxValues = await maxSelect.locator('option').evaluateAll((list) =>
      list.map((opt) => (opt as HTMLOptionElement).value)
    )
    expect(minValues).toEqual(['1', '2', '3', '4'])
    expect(maxValues).toEqual(['1', '2', '3', '4'])

    await minSelect.selectOption('2')
    await maxSelect.selectOption('3')
    await expect.poll(() => {
      const latest = putConfigs[putConfigs.length - 1]
      return `${String(latest?.minChoices)}-${String(latest?.maxChoices)}`
    }).toBe('2-3')

    // max 小于 min 时会自动联动修正 min
    await maxSelect.selectOption('1')
    await expect.poll(() => {
      const latest = putConfigs[putConfigs.length - 1]
      return `${String(latest?.minChoices)}-${String(latest?.maxChoices)}`
    }).toBe('1-1')

    // 取消必填后，至少选下拉应允许 0
    await page.getByLabel('必填').first().uncheck()
    await expect.poll(async () => minSelect.inputValue()).toBe('1')
    const minValuesAfterRequiredOff = await minSelect.locator('option').evaluateAll((list) =>
      list.map((opt) => (opt as HTMLOptionElement).value)
    )
    expect(minValuesAfterRequiredOff).toEqual(['0', '1', '2', '3', '4'])
  })
})
