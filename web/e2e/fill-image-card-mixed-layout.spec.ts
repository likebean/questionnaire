import { expect, test } from '@playwright/test'

test.describe('填写页 图文卡片混排布局', () => {
  test('有图+无图混排时，多列宽度稳定且无图项保持紧凑', async ({ page }) => {
    const surveyId = 'mock-fill-image-cards-mixed'
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
              title: '图文混排问卷',
              description: '',
              thankYouText: '感谢您的填写！',
              questions: [
                {
                  id: 951,
                  surveyId,
                  sortOrder: 0,
                  type: 'SINGLE_CHOICE',
                  title: '<p><strong>请选择</strong></p>',
                  required: true,
                  config: JSON.stringify({
                    layout: 'horizontal',
                    layoutColumns: 3,
                    optionsRandom: false,
                    defaultOptionIndex: 1,
                    options: [
                      { sortOrder: 0, label: '纯文本1' },
                      { sortOrder: 1, label: '图片2', imageData: imageA },
                      { sortOrder: 2, label: '图片3', imageData: imageB },
                      { sortOrder: 3, label: '纯文本4' },
                      { sortOrder: 4, label: '纯文本5' },
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
    await expect(page.locator('.fill-page-surveyjs .sd-selectbase.fill-choice-image-cards.fill-choice-image-cards--horizontal')).toHaveCount(1)

    const metrics = await page.evaluate(() => {
      const root = document.querySelector('.fill-page-surveyjs .sd-selectbase.fill-choice-image-cards')
      if (!root) return null

      const cols = Array.from(root.querySelectorAll('.sd-selectbase__column')).map((col) => {
        const rect = col.getBoundingClientRect()
        return Math.round(rect.width)
      })
      const textOnlyItem = root.querySelector('.sd-item.fill-choice-image-card-item--text-only')
      const withImageItem = root.querySelector('.sd-item.fill-choice-image-card-item--with-image')
      const textOnlyHeight = textOnlyItem ? Math.round(textOnlyItem.getBoundingClientRect().height) : -1
      const withImageHeight = withImageItem ? Math.round(withImageItem.getBoundingClientRect().height) : -1
      return { cols, textOnlyHeight, withImageHeight }
    })

    expect(metrics).not.toBeNull()
    expect(metrics!.cols.length).toBe(3)
    const maxColWidth = Math.max(...metrics!.cols)
    const minColWidth = Math.min(...metrics!.cols)
    expect(maxColWidth - minColWidth).toBeLessThanOrEqual(2)
    expect(metrics!.textOnlyHeight).toBeLessThan(140)
    expect(metrics!.withImageHeight).toBeGreaterThan(260)

    await expect(page.locator('.fill-page-surveyjs .fill-choice-option-image')).toHaveCount(2)
  })
})

