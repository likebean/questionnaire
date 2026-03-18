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
    expect(metrics!.withImageHeight).toBeGreaterThan(260)
    expect(metrics!.textOnlyHeight).toBeLessThan(180)
    expect(metrics!.withImageHeight - metrics!.textOnlyHeight).toBeGreaterThan(100)

    await expect(page.locator('.fill-page-surveyjs .fill-choice-option-image')).toHaveCount(2)
  })

  test('6~8 列横排在桌面宽度下不会被强制折成单列', async ({ page }) => {
    const surveyId = 'mock-fill-image-cards-8cols'
    const tinyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WvN7WwAAAAASUVORK5CYII='

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
              title: '8列布局问卷',
              description: '',
              thankYouText: '感谢您的填写！',
              questions: [
                {
                  id: 952,
                  surveyId,
                  sortOrder: 0,
                  type: 'SINGLE_CHOICE',
                  title: '<p><strong>8列测试</strong></p>',
                  required: true,
                  config: JSON.stringify({
                    layout: 'horizontal',
                    layoutColumns: 8,
                    optionsRandom: false,
                    options: Array.from({ length: 8 }, (_, i) => ({
                      sortOrder: i,
                      label: `选项${i + 1}`,
                      imageData: tinyImage,
                    })),
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

    const layout = await page.evaluate(() => {
      const root = document.querySelector('.fill-page-surveyjs .sd-selectbase.fill-choice-image-cards.fill-choice-image-cards--horizontal')
      if (!root) return null
      const cols = Array.from(root.querySelectorAll('.sd-selectbase__column'))
      const target = (root.querySelector('.sd-selectbase--multi-column') as HTMLElement | null) ?? (root as HTMLElement)
      const style = getComputedStyle(target)
      const itemRects = Array.from(root.querySelectorAll('.sd-item.sd-selectbase__item')).map((item) => {
        const rect = item.getBoundingClientRect()
        return {
          x: Math.round(rect.left / 2) * 2,
          y: Math.round(rect.top / 2) * 2,
        }
      })
      const uniqueItemX = new Set(itemRects.map((i) => i.x)).size
      const uniqueItemY = new Set(itemRects.map((i) => i.y)).size
      return {
        colCount: cols.length,
        uniqueItemX,
        uniqueItemY,
        itemCount: itemRects.length,
        containerDisplay: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        rootColumnsVar: (root as HTMLElement).style.getPropertyValue('--fill-choice-card-columns').trim(),
      }
    })

    expect(layout).not.toBeNull()
    expect(layout!.itemCount).toBe(8)
    expect(layout!.rootColumnsVar).toBe('8')
    expect(layout!.uniqueItemX).toBeGreaterThan(1)
    if (layout!.colCount > 0) {
      expect(layout!.colCount).toBe(8)
    } else {
      expect(layout!.containerDisplay).toBe('grid')
      expect(layout!.uniqueItemX).toBeGreaterThanOrEqual(6)
      expect(layout!.uniqueItemY).toBeLessThanOrEqual(2)
    }
  })
})
