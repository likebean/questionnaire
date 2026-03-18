import { expect, test } from '@playwright/test'

type TitleMetrics = {
  left: number
  top: number
  width: number
  fontSize: string
  lineHeight: string
  fontWeight: string
}

type OptionMetrics = {
  row: { left: number; top: number; width: number } | null
  decorator: { left: number; top: number } | null
  label: { left: number; top: number } | null
  input: { left: number; top: number; width: number } | null
}

type CardMetrics = {
  edit: boolean
  number: TitleMetrics | null
  title: TitleMetrics | null
  star: {
    left: number
    top: number
    width: number
    fontSize: string
    lineHeight: string
    fontWeight: string
  } | null
  option: OptionMetrics
}

const paritySurveyId = 'mock-title-option-parity'

test.describe('问卷编辑态/显示态 同位渲染', () => {
  test('第一题：序号/标题/星号 与选项行在两态下保持一致', async ({ page }) => {
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

    await page.route(`**/api/surveys/${paritySurveyId}*`, async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const isSurveyDetailGet =
        req.method() === 'GET'
        && url.pathname.startsWith(`/api/surveys/${paritySurveyId}`)
        && !url.pathname.includes('/questions/')
      if (!isSurveyDetailGet) {
        await route.fallback()
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'ok',
          data: {
            id: paritySurveyId,
            title: '同位渲染校验',
            description: '',
            status: 'DRAFT',
            questions: [
              {
                id: 1001,
                surveyId: paritySurveyId,
                sortOrder: 0,
                type: 'SINGLE_CHOICE',
                title: '<p><strong>新单选题</strong></p>',
                required: true,
                config: JSON.stringify({
                  layout: 'vertical',
                  optionsRandom: false,
                  defaultOptionIndex: 1,
                  options: [
                    { sortOrder: 0, label: '选项1' },
                    { sortOrder: 1, label: '选项2', allowFill: true },
                    { sortOrder: 2, label: '选项3' },
                  ],
                }),
              },
            ],
          },
        }),
      })
    })

    await page.route(`**/api/surveys/${paritySurveyId}/questions/1001*`, async (route) => {
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

    await page.goto(`/surveys/${paritySurveyId}/edit`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: '编辑问卷' })).toBeVisible({ timeout: 15000 })

    const captureMetrics = async (): Promise<CardMetrics> => page.evaluate(() => {
      const card = document.querySelectorAll('.group.bg-white.border-b')[0] as HTMLElement | undefined
      if (!card) throw new Error('first card not found')
      const cardRect = card.getBoundingClientRect()
      const isEdit = card.className.includes('border-l-4')
      const pick = (el: Element | null) => {
        if (!el) return null
        const rect = (el as HTMLElement).getBoundingClientRect()
        const cs = window.getComputedStyle(el as HTMLElement)
        return {
          left: Math.round(rect.left - cardRect.left),
          top: Math.round(rect.top - cardRect.top),
          width: Math.round(rect.width),
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          fontWeight: cs.fontWeight,
        }
      }

      const numberEl = isEdit
        ? card.querySelector('.question-title-number')
        : card.querySelector('.sd-question__title .sd-element__num')
      const titleEl = isEdit
        ? card.querySelector('.rich-title-quill--compact .ql-editor')
        : card.querySelector('.sd-question__title .sv-string-viewer')
      const starEl = isEdit ? null : card.querySelector('.sd-question__required-text')

      const pseudoStar = (() => {
        if (!isEdit) return null
        const editor = card.querySelector('.rich-title-quill--required.rich-title-quill--display .ql-editor') as HTMLElement | null
        if (!editor) return null
        const cs = window.getComputedStyle(editor, '::after')
        return {
          left: 0,
          top: 0,
          width: 0,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          fontWeight: cs.fontWeight,
        }
      })()

      const optionRow = card.querySelector('.sd-item.sd-selectbase__item')
      const optionDeco = card.querySelector('.sd-item__decorator')
      const optionLabel = card.querySelector('.sd-item__control-label')
      const inlineInput = card.querySelector('input[placeholder=\"请填写\"]')

      const pickSimple = (el: Element | null) => {
        if (!el) return null
        const rect = (el as HTMLElement).getBoundingClientRect()
        return {
          left: Math.round(rect.left - cardRect.left),
          top: Math.round(rect.top - cardRect.top),
          width: Math.round(rect.width),
        }
      }

      const row = pickSimple(optionRow)
      const deco = pickSimple(optionDeco)
      const label = pickSimple(optionLabel)
      const input = pickSimple(inlineInput)

      return {
        edit: isEdit,
        number: pick(numberEl),
        title: pick(titleEl),
        star: (pick(starEl) ?? pseudoStar),
        option: {
          row,
          decorator: deco ? { left: deco.left, top: deco.top } : null,
          label: label ? { left: label.left, top: label.top } : null,
          input,
        },
      }
    })

    const editMetrics = await captureMetrics()
    await page.getByRole('button', { name: '完成编辑' }).click()
    await expect(page.locator('.group.bg-white.border-b').first()).not.toHaveClass(/border-l-4/)
    const nonEditMetrics = await captureMetrics()

    expect(editMetrics.edit).toBeTruthy()
    expect(nonEditMetrics.edit).toBeFalsy()

    // 标题行：序号/标题/星号 字号、行高、字重一致
    expect(editMetrics.number?.fontSize).toBe(nonEditMetrics.number?.fontSize)
    expect(editMetrics.number?.lineHeight).toBe(nonEditMetrics.number?.lineHeight)
    expect(editMetrics.number?.fontWeight).toBe(nonEditMetrics.number?.fontWeight)
    expect(editMetrics.title?.fontSize).toBe(nonEditMetrics.title?.fontSize)
    expect(editMetrics.title?.lineHeight).toBe(nonEditMetrics.title?.lineHeight)
    expect(editMetrics.title?.fontWeight).toBe(nonEditMetrics.title?.fontWeight)
    expect(editMetrics.star?.fontSize).toBe(nonEditMetrics.star?.fontSize)
    expect(editMetrics.star?.lineHeight).toBe(nonEditMetrics.star?.lineHeight)
    expect(editMetrics.star?.fontWeight).toBe(nonEditMetrics.star?.fontWeight)

    // 标题行：位置与间距一致（允许 1px 浮动）
    expect(Math.abs((editMetrics.number?.left ?? 0) - (nonEditMetrics.number?.left ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.number?.top ?? 0) - (nonEditMetrics.number?.top ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.title?.left ?? 0) - (nonEditMetrics.title?.left ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.title?.top ?? 0) - (nonEditMetrics.title?.top ?? 0))).toBeLessThanOrEqual(1)
    const editNumTitleGap = (editMetrics.title?.left ?? 0) - ((editMetrics.number?.left ?? 0) + (editMetrics.number?.width ?? 0))
    const nonNumTitleGap = (nonEditMetrics.title?.left ?? 0) - ((nonEditMetrics.number?.left ?? 0) + (nonEditMetrics.number?.width ?? 0))
    expect(Math.abs(editNumTitleGap - nonNumTitleGap)).toBeLessThanOrEqual(1)

    // 选项行：单选按钮/文本/填空输入位置一致（允许 1px 浮动）
    expect(Math.abs((editMetrics.option.row?.left ?? 0) - (nonEditMetrics.option.row?.left ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.option.row?.top ?? 0) - (nonEditMetrics.option.row?.top ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.option.decorator?.left ?? 0) - (nonEditMetrics.option.decorator?.left ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.option.decorator?.top ?? 0) - (nonEditMetrics.option.decorator?.top ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.option.label?.left ?? 0) - (nonEditMetrics.option.label?.left ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.option.label?.top ?? 0) - (nonEditMetrics.option.label?.top ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.option.input?.left ?? 0) - (nonEditMetrics.option.input?.left ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.option.input?.top ?? 0) - (nonEditMetrics.option.input?.top ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((editMetrics.option.input?.width ?? 0) - (nonEditMetrics.option.input?.width ?? 0))).toBeLessThanOrEqual(1)
  })
})

