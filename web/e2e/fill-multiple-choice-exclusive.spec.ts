import { expect, test } from '@playwright/test'

test.describe('填写页 多选互斥', () => {
  test('互斥选项与普通选项切换时，选择状态符合互斥规则', async ({ page }) => {
    const surveyId = 'mock-fill-multi-exclusive'

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
              title: '多选互斥测试',
              description: '',
              thankYouText: '感谢填写',
              questions: [
                {
                  id: 9901,
                  surveyId,
                  sortOrder: 0,
                  type: 'MULTIPLE_CHOICE',
                  title: '<p><strong>请选择</strong></p>',
                  required: true,
                  config: JSON.stringify({
                    layout: 'vertical',
                    optionsRandom: false,
                    options: [
                      { sortOrder: 0, label: '互斥A', exclusive: true },
                      { sortOrder: 1, label: '互斥B', exclusive: true },
                      { sortOrder: 2, label: '普通C' },
                      { sortOrder: 3, label: '普通D' },
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

      if (req.method() === 'POST' && (path === `/api/fill/${surveyId}/draft` || path === `/api/fill/${surveyId}/submit`)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'ok', data: null }),
        })
        return
      }

      await route.fallback()
    })

    await page.goto(`/fill/${surveyId}?preview=1`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 15000 })

    const itemByText = (text: string) =>
      page.locator('.fill-page-surveyjs .sd-item').filter({ hasText: text }).first()
    const checkbox = (text: string) => itemByText(text).locator('input[type="checkbox"]').first()
    const clickLabel = async (text: string) => {
      await itemByText(text).locator('.sd-item__control-label').click()
    }

    await clickLabel('普通C')
    await clickLabel('普通D')
    await expect(checkbox('普通C')).toBeChecked()
    await expect(checkbox('普通D')).toBeChecked()

    await clickLabel('互斥A')
    await expect(checkbox('互斥A')).toBeChecked()
    await expect(checkbox('普通C')).toBeChecked()
    await expect(checkbox('普通D')).toBeChecked()

    await clickLabel('互斥B')
    await expect(checkbox('互斥B')).toBeChecked()
    await expect(checkbox('互斥A')).not.toBeChecked()
    await expect(checkbox('普通C')).toBeChecked()
    await expect(checkbox('普通D')).toBeChecked()

    await clickLabel('普通D')
    await expect(checkbox('普通D')).not.toBeChecked()
    await expect(checkbox('互斥B')).toBeChecked()
  })
})
