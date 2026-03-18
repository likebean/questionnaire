import { test, expect } from '@playwright/test'

test.describe('问卷编辑页 选项行 UI', () => {
  test('右侧按钮逐个可操作，且结果符合预期（含截图）', async ({ page }) => {
    const surveyId = 'mock-ui-style'
    const tinyPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WvN7WwAAAAASUVORK5CYII='
    const optionItem = () => page.locator('.sd-item.sd-selectbase__item')
    const actionButton = (title: string) => page.locator(`.option-row-action-btn[title="${title}"]`)
    const shoot = async (name: string) => {
      await page.screenshot({
        path: `test-results/option-actions-${name}.png`,
        fullPage: true,
      })
    }
    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })

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
              title: 'UI测试问卷',
              description: '',
              status: 'DRAFT',
              questions: [
                {
                  id: 101,
                  surveyId,
                  sortOrder: 0,
                  type: 'SINGLE_CHOICE',
                  title: '<p><strong>你最喜欢的颜色是？</strong></p>',
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
        return
      }
      await route.fallback()
    })

    await page.route(`**/api/surveys/${surveyId}/questions/101*`, async (route) => {
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
    await expect(page.getByRole('heading', { name: '编辑问卷' })).toBeVisible({ timeout: 15000 })
    await expect(optionItem()).toHaveCount(3)
    const editTitleNumber = page.locator('.question-title-number').first()
    await expect(editTitleNumber).toHaveText('1.')
    const editTitleNumberFont = await editTitleNumber.evaluate((el) => getComputedStyle(el).fontSize)
    const editTitleFont = await page
      .locator('.rich-title-quill--compact .ql-editor')
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize)
    expect(editTitleNumberFont).toBe(editTitleFont)
    const editTitleNumberBox = await editTitleNumber.boundingBox()
    const editTitleTextBox = await page.locator('.rich-title-quill--compact .ql-editor').first().boundingBox()
    expect(editTitleNumberBox).not.toBeNull()
    expect(editTitleTextBox).not.toBeNull()
    if (editTitleNumberBox && editTitleTextBox) {
      expect(Math.abs(editTitleNumberBox.y - editTitleTextBox.y)).toBeLessThan(6)
    }
    await shoot('00-initial')

    // 1) 编辑选项文字
    await actionButton('编辑选项文字').nth(0).click()
    await expect(page.getByRole('heading', { name: '编辑选项文字' })).toBeVisible()
    const labelDialog = page.locator('[role="dialog"]').last()
    const quillToolbar = labelDialog.locator('.rich-title-quill .ql-toolbar').first()
    await expect(quillToolbar).toBeVisible()
    const quillEditor = labelDialog.locator('.ql-editor[contenteditable="true"]')
    await expect(quillEditor).toBeVisible()
    await expect.poll(async () =>
      quillEditor.evaluate((el) => el === document.activeElement || el.contains(document.activeElement))
    ).toBeTruthy()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('紫色')
    await labelDialog.getByRole('button', { name: '保存' }).click()
    await expect(optionItem().nth(0).locator('.sd-item__control-label')).toContainText('紫色')
    await shoot('01-label-edited')

    // 2) 编辑说明
    await actionButton('编辑说明').nth(0).click()
    await expect(page.getByRole('heading', { name: '编辑选项说明' })).toBeVisible()
    const descDialog = page.locator('[role="dialog"]').last()
    const descQuillToolbar = descDialog.locator('.rich-title-quill .ql-toolbar').first()
    await expect(descQuillToolbar).toBeVisible()
    const descEditor = descDialog.locator('.ql-editor[contenteditable="true"]')
    await expect(descEditor).toBeVisible()
    await descEditor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('https://example.com/help')
    const linkPopupRadio = descDialog.getByRole('radio', { name: '弹窗打开' })
    if (await linkPopupRadio.count()) {
      await linkPopupRadio.check()
    } else {
      await descDialog.getByRole('radio', { name: '点击说明弹窗显示' }).check()
    }
    await descDialog.getByRole('button', { name: '保存' }).click()
    await expect(actionButton('编辑说明').nth(0)).toHaveClass(/bg-blue-50/)
    await shoot('02-description-edited')

    // 3) 编辑图片
    await actionButton('编辑图片').nth(1).click()
    await expect(page.getByRole('heading', { name: '编辑选项图片' })).toBeVisible()
    const imageDialog = page.locator('[role="dialog"]').last()
    await imageDialog.getByPlaceholder('图片外链 https://...').fill(tinyPngDataUrl)
    await imageDialog.getByRole('button', { name: '保存' }).click()
    await expect(actionButton('编辑图片').nth(1)).toHaveClass(/bg-blue-50/)
    await expect(actionButton('编辑图片').nth(1).locator('img')).toHaveCount(1)
    await expect(actionButton('编辑图片').nth(1).locator('img').first()).toBeVisible()
    await shoot('03-image-edited')

    // 4) 允许填空
    await actionButton('允许填空').nth(0).click()
    await expect(actionButton('允许填空').nth(0)).toHaveClass(/bg-blue-50/)
    await shoot('04-allow-fill')

    // 5) 设为默认（切换到第二项）
    await expect(actionButton('设为默认').nth(0)).toHaveClass(/bg-blue-50/)
    await actionButton('设为默认').nth(1).click()
    await expect(actionButton('设为默认').nth(1)).toHaveClass(/bg-blue-50/)
    await expect(actionButton('设为默认').nth(0)).not.toHaveClass(/bg-blue-50/)
    await shoot('05-default-switched')

    // 6) 在下方插入选项
    await actionButton('在下方插入选项').nth(0).click()
    await expect(optionItem()).toHaveCount(4)
    await expect(optionItem().nth(1).locator('.sd-item__control-label')).toContainText('选项4')
    await shoot('06-option-inserted')

    // 7) 删除选项（删除刚插入的第二项）
    await actionButton('删除选项').nth(1).click()
    await expect(optionItem()).toHaveCount(3)
    await expect(page.locator('.sd-item__control-label').filter({ hasText: '选项4' })).toHaveCount(0)
    await shoot('07-option-deleted')

    // 8) 隐藏选项
    const firstHideButton = actionButton('隐藏选项').nth(0)
    await firstHideButton.click()
    await expect(optionItem().nth(0).locator('.sd-item__control-label')).toHaveClass(/line-through/)
    await expect(page.locator('.option-row-action-btn[title="取消隐藏"]').nth(0)).toHaveClass(/bg-blue-50/)
    await shoot('08-option-hidden')

    // 9) 完成编辑后，必填红星与标题在同一行
    await page.getByRole('button', { name: '完成编辑' }).click()
    await expect(page.locator('.edit-question-preview .sd-selectbase.fill-choice-image-cards')).toHaveCount(1)
    await expect(page.locator('.edit-question-preview .sd-item').first().locator('.fill-choice-option-image')).toHaveCount(1)
    await expect(page.locator('.edit-question-preview .sd-item').first().locator('.fill-choice-option-image').first()).toBeVisible()
    const titleText = page.locator('.edit-question-preview .sd-question__title .sv-string-viewer').first()
    const titleNumber = page.locator('.edit-question-preview .sd-question__title .sd-element__num').first()
    const requiredStar = page.locator('.edit-question-preview .sd-question__required-text').first()
    await expect(titleText).toBeVisible()
    await expect(titleNumber).toBeVisible()
    await expect(requiredStar).toBeVisible()
    const previewTitleFont = await titleText.evaluate((el) => getComputedStyle(el).fontSize)
    const previewNumberFont = await titleNumber.evaluate((el) => getComputedStyle(el).fontSize)
    expect(previewNumberFont).toBe(previewTitleFont)
    const previewTitleNumberBox = await titleNumber.boundingBox()
    const previewTitleTextBox = await titleText.boundingBox()
    expect(previewTitleNumberBox).not.toBeNull()
    expect(previewTitleTextBox).not.toBeNull()
    if (previewTitleNumberBox && previewTitleTextBox) {
      expect(Math.abs(previewTitleNumberBox.y - previewTitleTextBox.y)).toBeLessThan(6)
    }
    const titleBox = await titleText.boundingBox()
    const starBox = await requiredStar.boundingBox()
    expect(titleBox).not.toBeNull()
    expect(starBox).not.toBeNull()
    if (titleBox && starBox) {
      const titleMidY = titleBox.y + titleBox.height / 2
      const starMidY = starBox.y + starBox.height / 2
      expect(Math.abs(titleMidY - starMidY)).toBeLessThan(6)
    }
    await shoot('09-required-star-inline')
  })

  test('允许填空在选项下方显示单行输入，不显示 comment 标题', async ({ page }) => {
    const surveyId = 'mock-allow-fill-inline'

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
              title: '允许填空UI测试',
              description: '',
              status: 'DRAFT',
              questions: [
                {
                  id: 201,
                  surveyId,
                  sortOrder: 0,
                  type: 'SINGLE_CHOICE',
                  title: '请选择一个选项',
                  required: true,
                  config: JSON.stringify({
                    layout: 'vertical',
                    optionsRandom: false,
                    options: [
                      { sortOrder: 0, label: '选项A' },
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
      await route.fallback()
    })

    await page.route(`**/api/surveys/${surveyId}/questions/201*`, async (route) => {
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
    await expect(page.getByRole('heading', { name: '编辑问卷' })).toBeVisible({ timeout: 15000 })

    // 先开启“允许填空”
    await page.locator('.option-row-action-btn[title="允许填空"]').nth(0).click()
    await expect(page.locator('.option-row-action-btn[title="允许填空"]').nth(0)).toHaveClass(/bg-blue-50/)

    // 切到预览态验证显示行为
    await page.getByRole('button', { name: '完成编辑' }).click()
    const preview = page.locator('.edit-question-preview').first()
    await expect(preview).toBeVisible()
    await expect(preview.locator('input.fill-choice-inline-input')).toHaveCount(0)

    await preview.locator('.sd-item').filter({ hasText: '选项A' }).first().locator('.sd-item__control-label').click()
    const inlineInput = preview.locator('input.fill-choice-inline-input').first()
    await expect(inlineInput).toBeVisible()
    expect(await inlineInput.evaluate((el) => el.tagName)).toBe('INPUT')
    await expect(preview.locator('textarea[placeholder="请填写"]')).toHaveCount(0)
    await expect(preview.locator('input[placeholder="请填写"]:visible')).toHaveCount(1)
    const selectedItem = preview.locator('.sd-item').filter({ hasText: '选项A' }).first()
    const optionText = selectedItem.locator('.sd-item__control-label .sv-string-viewer, .sd-item__control-label').first()
    const optionTextBox = await optionText.boundingBox()
    const inputBox = await inlineInput.boundingBox()
    expect(optionTextBox).not.toBeNull()
    expect(inputBox).not.toBeNull()
    if (optionTextBox && inputBox) {
      expect(inputBox.y).toBeGreaterThan(optionTextBox.y + optionTextBox.height - 2)
      expect(Math.abs(inputBox.x - optionTextBox.x)).toBeLessThan(12)
    }
    await expect(preview).not.toContainText(/500-comment|201-comment/i)

    await page.screenshot({
      path: 'test-results/option-actions-10-allow-fill-inline-input.png',
      fullPage: true,
    })
  })
})
