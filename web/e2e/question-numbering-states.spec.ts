import { expect, test } from '@playwright/test'

test.describe('题目序号 多状态校验', () => {
  test('编辑态/预览态/填报态序号应正确递增', async ({ page }) => {
    const surveyId = 'mock-question-numbering'
    const questions = [
      {
        id: 101,
        surveyId,
        sortOrder: 0,
        type: 'SINGLE_CHOICE',
        title: '<p><strong>这是一个用于验证必填星号与标题首行对齐的超长问题标题这是一个用于验证必填星号与标题首行对齐的超长问题标题</strong></p>',
        required: true,
        config: JSON.stringify({
          layout: 'vertical',
          optionsRandom: false,
          options: [
            { sortOrder: 0, label: 'A1' },
            { sortOrder: 1, label: 'A2' },
          ],
        }),
      },
      {
        id: 102,
        surveyId,
        sortOrder: 1,
        type: 'SINGLE_CHOICE',
        title: '<p><strong>问题二</strong></p>',
        required: true,
        config: JSON.stringify({
          layout: 'vertical',
          optionsRandom: false,
          options: [
            { sortOrder: 0, label: 'B1' },
            { sortOrder: 1, label: 'B2' },
          ],
        }),
      },
      {
        id: 103,
        surveyId,
        sortOrder: 2,
        type: 'SINGLE_CHOICE',
        title: '<p><strong>问题三</strong></p>',
        required: true,
        config: JSON.stringify({
          layout: 'vertical',
          optionsRandom: false,
          options: [
            { sortOrder: 0, label: 'C1' },
            { sortOrder: 1, label: 'C2' },
          ],
        }),
      },
    ]

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
            email: null,
            phone: null,
            identityType: 'LOCAL',
            departmentId: null,
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
              title: '序号验证问卷',
              description: '',
              status: 'DRAFT',
              questions,
            },
          }),
        })
        return
      }
      await route.fallback()
    })

    await page.route(`**/api/surveys/${surveyId}/questions/*`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'ok', data: null }),
        })
        return
      }
      await route.fallback()
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
              title: '序号验证问卷',
              description: '',
              thankYouText: '感谢您的填写！',
              questions,
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

    await page.goto(`/surveys/${surveyId}/edit`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: '编辑问卷' })).toBeVisible({ timeout: 15000 })

    // 编辑态（默认第一题）
    await expect(page.locator('.question-title-number').first()).toHaveText('1.')

    // 其余预览态应递增为 2,3
    const initialPreviewNums = page.locator('.edit-question-preview .sd-question__title .sd-element__num')
    await expect(initialPreviewNums).toHaveCount(2)
    const initialPreviewTexts = (await initialPreviewNums.allTextContents()).map((s) => s.trim())
    expect(initialPreviewTexts).toEqual(['2.', '3.'])

    // 切到第二题编辑态
    const secondCard = page.locator('div.group.bg-white.border-b.border-gray-200').nth(1)
    await secondCard.hover()
    await secondCard.locator('.edit-question-actions button').filter({ hasText: '编辑' }).click()
    await expect(page.locator('.question-title-number').first()).toHaveText('2.')

    // 完成编辑后，全部预览态应为 1,2,3
    await page.getByRole('button', { name: '完成编辑' }).click()
    const allPreviewNums = page.locator('.edit-question-preview .sd-question__title .sd-element__num')
    await expect(allPreviewNums).toHaveCount(3)
    const allPreviewTexts = (await allPreviewNums.allTextContents()).map((s) => s.trim())
    expect(allPreviewTexts).toEqual(['1.', '2.', '3.'])
    const previewTitleText = page.locator('.edit-question-preview .sd-question__title .sv-string-viewer').first()
    const previewTitleStar = page.locator('.edit-question-preview .sd-question__title .sd-question__required-text').first()
    const previewTitleTextBox = await previewTitleText.boundingBox()
    const previewTitleStarBox = await previewTitleStar.boundingBox()
    expect(previewTitleTextBox).not.toBeNull()
    expect(previewTitleStarBox).not.toBeNull()
    if (previewTitleTextBox && previewTitleStarBox) {
      expect(Math.abs(previewTitleTextBox.y - previewTitleStarBox.y)).toBeLessThan(6)
    }

    // 填报态应为 1,2,3
    await page.goto(`/fill/${surveyId}`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 15000 })
    const fillNums = page.locator('.fill-page-surveyjs .sd-question__title .sd-element__num')
    await expect(fillNums).toHaveCount(3)
    const fillTexts = (await fillNums.allTextContents()).map((s) => s.trim())
    expect(fillTexts).toEqual(['1.', '2.', '3.'])
    const fillTitleText = page.locator('.fill-page-surveyjs .sd-question__title .sv-string-viewer').first()
    const fillTitleStar = page.locator('.fill-page-surveyjs .sd-question__title .sd-question__required-text').first()
    const fillTitleTextBox = await fillTitleText.boundingBox()
    const fillTitleStarBox = await fillTitleStar.boundingBox()
    expect(fillTitleTextBox).not.toBeNull()
    expect(fillTitleStarBox).not.toBeNull()
    if (fillTitleTextBox && fillTitleStarBox) {
      expect(Math.abs(fillTitleTextBox.y - fillTitleStarBox.y)).toBeLessThan(6)
    }

    await page.screenshot({
      path: 'test-results/question-numbering-states.png',
      fullPage: true,
    })
  })

  test('预览态与填报态：所有题目标题与必填星号保持同一行（含不同题型）', async ({ page }) => {
    const surveyId = 'mock-star-inline-all-types'
    const questions = [
      {
        id: 201,
        surveyId,
        sortOrder: 0,
        type: 'SINGLE_CHOICE',
        title: '<p>单选题标题</p>',
        required: true,
        config: JSON.stringify({
          options: [{ sortOrder: 0, label: 'A' }],
        }),
      },
      {
        id: 202,
        surveyId,
        sortOrder: 1,
        type: 'SCALE',
        title: '<p>量表题标题</p>',
        required: true,
        config: JSON.stringify({
          scaleMin: 1,
          scaleMax: 5,
        }),
      },
      {
        id: 203,
        surveyId,
        sortOrder: 2,
        type: 'LONG_TEXT',
        title: '<p>多行填空标题</p>',
        required: true,
        config: JSON.stringify({}),
      },
    ]

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
            email: null,
            phone: null,
            identityType: 'LOCAL',
            departmentId: null,
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
              title: '星号同行验证',
              description: '',
              status: 'DRAFT',
              questions,
            },
          }),
        })
        return
      }
      await route.fallback()
    })

    await page.route(`**/api/surveys/${surveyId}/questions/*`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'ok', data: null }),
        })
        return
      }
      await route.fallback()
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
              title: '星号同行验证',
              description: '',
              thankYouText: '感谢您的填写！',
              questions,
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

    await page.goto(`/surveys/${surveyId}/edit`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: '编辑问卷' })).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: '完成编辑' }).click()

    const previewDiffs = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('.edit-question-preview .sd-question__title'))
      return titles.map((title) => {
        const text = title.querySelector('.sv-string-viewer')
        const star = title.querySelector('.sd-question__required-text')
        if (!text || !star) return null
        const t = text.getBoundingClientRect()
        const s = star.getBoundingClientRect()
        return Math.round(s.y - t.y)
      })
    })
    expect(previewDiffs.length).toBe(questions.length)
    previewDiffs.forEach((diff) => expect(Math.abs(diff ?? 99)).toBeLessThan(6))

    await page.goto(`/fill/${surveyId}?preview=1`, { waitUntil: 'networkidle' })
    await expect(page.getByText(/预览模式/)).toBeVisible({ timeout: 10000 })
    const fillDiffs = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('.fill-page-surveyjs .sd-question__title'))
      return titles.map((title) => {
        const text = title.querySelector('.sv-string-viewer')
        const star = title.querySelector('.sd-question__required-text')
        if (!text || !star) return null
        const t = text.getBoundingClientRect()
        const s = star.getBoundingClientRect()
        return Math.round(s.y - t.y)
      })
    })
    expect(fillDiffs.length).toBe(questions.length)
    fillDiffs.forEach((diff) => expect(Math.abs(diff ?? 99)).toBeLessThan(6))

    await page.screenshot({
      path: 'test-results/question-star-inline-all-types.png',
      fullPage: true,
    })
  })
})
