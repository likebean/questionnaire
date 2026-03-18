import { expect, test } from '@playwright/test'

test.describe('填写页 多选最少/最多选择', () => {
  test('设置至少选2项时，仅选1项提交会触发校验，补足后可提交成功', async ({ page }) => {
    const surveyId = 'mock-fill-multi-limits'
    let submitCount = 0

    await page.route(`**/api/fill/${surveyId}**`, async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const path = url.pathname

      if (req.method() === 'GET' && path === `/api/fill/${surveyId}`) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'ok',
            data: {
              id: surveyId,
              title: '多选最少选择测试',
              description: '',
              thankYouText: '感谢填写',
              questions: [
                {
                  id: 9902,
                  surveyId,
                  sortOrder: 0,
                  type: 'MULTIPLE_CHOICE',
                  title: '<p><strong>请选择至少两项</strong></p>',
                  required: true,
                  config: JSON.stringify({
                    layout: 'vertical',
                    optionsRandom: false,
                    minChoices: 2,
                    maxChoices: 3,
                    options: [
                      { sortOrder: 0, label: '选项A' },
                      { sortOrder: 1, label: '选项B' },
                      { sortOrder: 2, label: '选项C' },
                    ],
                  }),
                },
              ],
            },
          }),
        })
        return
      }

      if (req.method() === 'GET' && path === `/api/fill/${surveyId}/draft`) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'ok', data: [] }),
        })
        return
      }

      if (req.method() === 'POST' && path === `/api/fill/${surveyId}/draft`) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'ok', data: null }),
        })
        return
      }

      if (req.method() === 'POST' && path === `/api/fill/${surveyId}/submit`) {
        submitCount += 1
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'ok', data: null }),
        })
        return
      }

      await route.fallback()
    })

    await page.goto(`/fill/${surveyId}`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 15000 })

    const itemByText = (text: string) =>
      page.locator('.fill-page-surveyjs .sd-item').filter({ hasText: text }).first()

    // 仅选1项：校验失败，不会进入成功页，也不会调用 submit 接口
    await itemByText('选项A').locator('.sd-item__control-label').click()
    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByRole('heading', { name: '提交成功' })).toHaveCount(0)
    await expect(page.locator('.fill-page-surveyjs .sd-question.sd-question--error')).toHaveCount(1)
    expect(submitCount).toBe(0)

    // 选满2项：校验通过，提交成功
    await itemByText('选项B').locator('.sd-item__control-label').click()
    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible({ timeout: 8000 })
    expect(submitCount).toBe(1)
  })
})
