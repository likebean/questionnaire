import { expect, test } from '@playwright/test'

test.describe('填写页 选项说明行为', () => {
  test('普通说明支持内联/弹窗，链接说明支持弹窗/新页面', async ({ page }) => {
    const surveyId = 'mock-fill-option-description'
    const helpA = 'https://example.com/help-a'
    const helpB = 'https://example.com/help-b'

    await page.addInitScript(() => {
      const openCalls: Array<{ url: string; target: string | undefined; features: string | undefined }> = []
      ;(window as unknown as { __descOpenCalls: typeof openCalls }).__descOpenCalls = openCalls
      const nativeOpen = window.open.bind(window)
      window.open = ((url?: string | URL, target?: string, features?: string) => {
        openCalls.push({ url: String(url ?? ''), target, features })
        return nativeOpen(url as string, target, features)
      }) as typeof window.open
    })

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
              title: '说明行为测试',
              description: '',
              thankYouText: '感谢您的填写！',
              questions: [
                {
                  id: 981,
                  surveyId,
                  sortOrder: 0,
                  type: 'SINGLE_CHOICE',
                  title: '<p><strong>请选择</strong></p>',
                  required: true,
                  config: JSON.stringify({
                    layout: 'vertical',
                    optionsRandom: false,
                    options: [
                      { sortOrder: 0, label: '内联说明', description: '<p>这是内联说明</p>', descriptionDisplayMode: 'inline' },
                      { sortOrder: 1, label: '弹窗说明', description: '<p>这是弹窗说明</p>', descriptionDisplayMode: 'popup' },
                      { sortOrder: 2, label: '链接弹窗', description: helpA, descriptionLinkOpenMode: 'popup', descriptionOpenInPopup: true },
                      { sortOrder: 3, label: '链接新页', description: helpB, descriptionLinkOpenMode: 'newTab' },
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
    const question = page.locator('.fill-page-surveyjs .sd-question').first()
    await expect(question).toBeVisible()

    const inlineOption = question.locator('.sd-item').filter({ hasText: '内联说明' }).first()
    await expect(inlineOption.locator('.fill-choice-description-inline')).toContainText('这是内联说明')

    const textPopupOption = question.locator('.sd-item').filter({ hasText: '弹窗说明' }).first()
    await textPopupOption.locator('.fill-choice-description-link').click()
    await expect(page.locator('.fill-choice-description-preview-overlay.is-open')).toHaveCount(1)
    await expect(page.locator('.fill-choice-description-preview-content')).toContainText('这是弹窗说明')
    await page.locator('.fill-choice-description-preview-close').click()
    await expect(page.locator('.fill-choice-description-preview-overlay.is-open')).toHaveCount(0)

    const popupLinkOption = question.locator('.sd-item').filter({ hasText: '链接弹窗' }).first()
    const popupA = page.waitForEvent('popup')
    await popupLinkOption.locator('.fill-choice-description-link').click()
    const popupPageA = await popupA
    await popupPageA.close()

    const newTabLinkOption = question.locator('.sd-item').filter({ hasText: '链接新页' }).first()
    const popupB = page.waitForEvent('popup')
    await newTabLinkOption.locator('.fill-choice-description-link').click()
    const popupPageB = await popupB
    await popupPageB.close()

    const openCalls = await page.evaluate(() =>
      (window as unknown as { __descOpenCalls: Array<{ url: string; target?: string; features?: string }> }).__descOpenCalls
    )
    const popupModeCall = openCalls.find((x) => x.url.includes('help-a'))
    const newTabModeCall = openCalls.find((x) => x.url.includes('help-b'))
    expect(popupModeCall?.features ?? '').toContain('width=')
    expect(newTabModeCall).toBeUndefined()
  })
})

