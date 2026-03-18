import { expect, test } from '@playwright/test'

test.describe('填写页 图文卡片模式', () => {
  test('填写态与预览态都使用图文卡片渲染', async ({ page }) => {
    const surveyId = 'mock-fill-image-cards'
    const imageA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WvN7WwAAAAASUVORK5CYII='
    const imageB = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WvN7WwAAAAASUVORK5CYII='

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
              title: '图文卡片问卷',
              description: '',
              thankYouText: '感谢您的填写！',
              questions: [
                {
                  id: 901,
                  surveyId,
                  sortOrder: 0,
                  type: 'SINGLE_CHOICE',
                  title: '<p><strong>请选择图片</strong></p>',
                  required: true,
                  config: JSON.stringify({
                    layout: 'horizontal',
                    optionsRandom: false,
                    options: [
                      { sortOrder: 0, label: '选项1', imageData: imageA },
                      { sortOrder: 1, label: '选项2', imageData: imageB },
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

    await page.goto(`/fill/${surveyId}`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.fill-page-surveyjs .sd-selectbase.fill-choice-image-cards.fill-choice-image-cards--horizontal')).toHaveCount(1)
    await expect(page.locator('.fill-page-surveyjs .sd-item .fill-choice-option-image')).toHaveCount(2)
    await expect(page.locator('.fill-page-surveyjs .sd-item .fill-choice-option-image-zoom')).toHaveCount(2)
    await page.locator('.fill-page-surveyjs .sd-item .fill-choice-option-image-zoom').first().click()
    await expect(page.locator('.fill-choice-image-preview-overlay.is-open')).toHaveCount(1)
    await expect(page.locator('.fill-choice-image-preview-overlay .fill-choice-image-preview-image')).toBeVisible()
    await page.locator('.fill-choice-image-preview-overlay .fill-choice-image-preview-close').click()
    await expect(page.locator('.fill-choice-image-preview-overlay.is-open')).toHaveCount(0)

    await page.goto(`/fill/${surveyId}?preview=1`, { waitUntil: 'networkidle' })
    await expect(page.locator('text=预览模式：仅查看填写效果')).toBeVisible()
    await expect(page.locator('.fill-page-surveyjs .sd-selectbase.fill-choice-image-cards.fill-choice-image-cards--horizontal')).toHaveCount(1)
    await expect(page.locator('.fill-page-surveyjs .sd-item .fill-choice-option-image')).toHaveCount(2)
    await page.locator('.fill-page-surveyjs .sd-item .fill-choice-option-image-zoom').first().click()
    await expect(page.locator('.fill-choice-image-preview-overlay.is-open')).toHaveCount(1)
  })
})
