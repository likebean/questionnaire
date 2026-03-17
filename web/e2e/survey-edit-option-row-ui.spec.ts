import { test, expect } from '@playwright/test'

test.describe('问卷编辑页 选项行 UI', () => {
  test('选项按钮与文字同排，点击仅切换视觉，默认由图标设置', async ({ page }) => {
    const surveyId = 'mock-ui-style'

    await page.route('**/api/auth/me', async (route) => {
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

    await page.route(`**/api/surveys/${surveyId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            id: surveyId,
            title: 'UI测试问卷',
            description: '',
            status: 'DRAFT',
            questions: [
              {
                id: 101,
                surveyId,
                sortOrder: 0,
                type: 'SINGLE_CHOICE',
                title: '你最喜欢的颜色是？',
                required: true,
                config: JSON.stringify({
                  layout: 'vertical',
                  optionsRandom: false,
                  defaultOptionIndex: 0,
                  options: [
                    { sortOrder: 0, label: '红色' },
                    { sortOrder: 1, label: '蓝色' },
                    { sortOrder: 2, label: '绿色' },
                  ],
                }),
              },
            ],
          },
        }),
      })
    })

    await page.route(`**/api/surveys/${surveyId}/questions/101`, async (route) => {
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

    await page.goto(`/surveys/${surveyId}/edit`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: '编辑问卷' })).toBeVisible()
    const firstRow = page
      .locator('.sd-item.sd-selectbase__item')
      .filter({ hasText: '红色' })
      .first()
    await expect(firstRow).toBeVisible()

    const firstDecorator = firstRow.locator('.sd-item__decorator').first()
    const firstText = firstRow.locator('.sd-item__control-label').first()
    await expect(firstDecorator).toBeVisible()
    await expect(firstText).toBeVisible()

    const decoratorBox = await firstDecorator.boundingBox()
    const textBox = await firstText.boundingBox()
    expect(decoratorBox).not.toBeNull()
    expect(textBox).not.toBeNull()
    if (decoratorBox && textBox) {
      const decoratorMidY = decoratorBox.y + decoratorBox.height / 2
      const textMidY = textBox.y + textBox.height / 2
      expect(Math.abs(decoratorMidY - textMidY)).toBeLessThan(14)
    }

    const secondRow = page
      .locator('.sd-item.sd-selectbase__item')
      .filter({ hasText: '蓝色' })
      .first()
    await secondRow.locator('.sd-item__control-label').click()
    await expect(secondRow).toHaveClass(/sd-item--checked/)
    await expect(page.locator('button[title="设为默认"]').nth(0)).toHaveClass(/bg-blue-50/)
    await expect(page.locator('button[title="设为默认"]').nth(1)).not.toHaveClass(/bg-blue-50/)

    await page.locator('button[title="设为默认"]').nth(1).click()
    await expect(page.locator('button[title="设为默认"]').nth(0)).not.toHaveClass(/bg-blue-50/)
    await expect(page.locator('button[title="设为默认"]').nth(1)).toHaveClass(/bg-blue-50/)
  })
})
