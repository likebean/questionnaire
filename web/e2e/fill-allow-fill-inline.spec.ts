import { expect, test } from '@playwright/test'

test.describe('填写页 允许填空（无隐藏题）', () => {
  test('不创建 Comment 隐藏题时，仍可草稿恢复并提交 textValue', async ({ page }) => {
    const surveyId = 'mock-fill-inline-no-hidden'
    const questionId = 301
    const commentText = '内联填空内容-自动化验证'
    const draftPayloads: any[] = []
    let submitPayload: any = null

    await page.route('**/api/auth/me*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            id: 'u-tester',
            nickname: '测试员',
            email: null,
            phone: null,
            identityType: 'LOCAL',
            departmentId: null,
            roleCodes: ['ADMIN'],
          },
        }),
      })
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
              title: '填写页允许填空验证',
              description: '',
              thankYouText: '感谢您的填写！',
              questions: [
                {
                  id: questionId,
                  surveyId,
                  sortOrder: 0,
                  type: 'SINGLE_CHOICE',
                  title: '请选择一项',
                  required: true,
                  config: JSON.stringify({
                    layout: 'vertical',
                    optionsRandom: false,
                    options: [
                      { sortOrder: 0, label: '选项A', allowFill: true },
                      { sortOrder: 1, label: '选项B' },
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
        const latestDraftPayload = draftPayloads[draftPayloads.length - 1]
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            message: 'ok',
            data: latestDraftPayload?.items ?? [],
          }),
        })
        return
      }

      if (req.method() === 'POST' && path === `/api/fill/${surveyId}/draft`) {
        draftPayloads.push(req.postDataJSON())
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, message: 'ok', data: null }),
        })
        return
      }

      if (req.method() === 'POST' && path === `/api/fill/${surveyId}/submit`) {
        submitPayload = req.postDataJSON()
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

    // 若没有隐藏题，页面中只应有一条题目（单选题本体）
    await expect(page.locator('.fill-page-surveyjs .sd-question')).toHaveCount(1)

    const optionA = page
      .locator('.fill-page-surveyjs .sd-item')
      .filter({ hasText: '选项A' })
      .first()
    await optionA.locator('.sd-item__control-label').click()

    const inlineInput = page.locator('.fill-page-surveyjs input.fill-choice-inline-input').first()
    await expect(inlineInput).toBeVisible()
    await inlineInput.click()
    await page.keyboard.type(commentText)
    await expect(page.locator('.fill-page-surveyjs input[placeholder="请填写"]:visible')).toHaveCount(1)
    await expect(page.locator('.fill-page-surveyjs')).not.toContainText(`${questionId}-Comment`)

    await expect.poll(() => {
      for (let i = draftPayloads.length - 1; i >= 0; i--) {
        const item = draftPayloads[i]?.items?.find(
          (it: any) => Number(it.questionId) === questionId && Number(it.optionIndex) === 0
        )
        if (item) return item.textValue ?? ''
      }
      return ''
    }).toBe(commentText)

    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.fill-page-surveyjs .sd-question')).toHaveCount(1)

    const optionAAfterReload = page
      .locator('.fill-page-surveyjs .sd-item')
      .filter({ hasText: '选项A' })
      .first()
    await optionAAfterReload.locator('.sd-item__control-label').click()
    const inlineInputAfterReload = page.locator('.fill-page-surveyjs input.fill-choice-inline-input').first()
    await expect(inlineInputAfterReload).toBeVisible()
    await expect(inlineInputAfterReload).toHaveValue(commentText)

    await page.screenshot({
      path: 'test-results/fill-inline-no-hidden-comment.png',
      fullPage: true,
    })

    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByRole('heading', { name: '提交成功' })).toBeVisible({ timeout: 8000 })

    await expect.poll(() => {
      const item = submitPayload?.items?.find(
        (it: any) => Number(it.questionId) === questionId && Number(it.optionIndex) === 0
      )
      return item?.textValue ?? ''
    }).toBe(commentText)
  })
})
