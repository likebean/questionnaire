import type { FillSurveyVO, SurveyQuestionVO } from '@/services/api'
import { normalizeOptionLabelHtml, sanitizeRichTextHtml } from '@/lib/richText'

export function parseConfig(c: string | null | undefined): Record<string, unknown> {
  if (!c) return {}
  try {
    return JSON.parse(c) as Record<string, unknown>
  } catch {
    return {}
  }
}

const VALIDATION_MESSAGES: Record<string, string> = {
  number: '请填写有效数字',
  integer: '请填写整数',
  email: '请填写有效的邮箱地址',
  phone: '请填写有效的手机号（11位）',
  idcard: '请填写有效的身份证号（15或18位）',
  url: '请填写有效的网址',
  regex: '格式不符合要求',
}

export function buildTextValidators(config: Record<string, unknown>): { type: string; text?: string; regex?: string; minLength?: number; maxLength?: number }[] {
  const validationType = (config.validationType as string) || 'none'
  if (validationType === 'none') {
    const maxLen = typeof config.maxLength === 'number' && config.maxLength > 0 ? config.maxLength : undefined
    if (maxLen) return [{ type: 'text', maxLength: maxLen, text: `长度不能超过 ${maxLen} 个字符` }]
    return []
  }
  const list: { type: string; text?: string; regex?: string; minLength?: number; maxLength?: number }[] = []
  const maxLen = typeof config.maxLength === 'number' && config.maxLength > 0 ? config.maxLength : undefined
  if (maxLen) list.push({ type: 'text', maxLength: maxLen, text: `长度不能超过 ${maxLen} 个字符` })

  switch (validationType) {
    case 'number':
      list.push({ type: 'regex', regex: '^-?\\d+(\\.\\d+)?$', text: VALIDATION_MESSAGES.number })
      break
    case 'integer':
      list.push({ type: 'regex', regex: '^-?\\d+$', text: VALIDATION_MESSAGES.integer })
      break
    case 'email':
      list.push({ type: 'email', text: VALIDATION_MESSAGES.email })
      break
    case 'phone':
      list.push({ type: 'regex', regex: '^1[3-9]\\d{9}$', text: VALIDATION_MESSAGES.phone })
      break
    case 'idcard':
      list.push({ type: 'regex', regex: '^\\d{15}$|^\\d{17}[0-9Xx]$', text: VALIDATION_MESSAGES.idcard })
      break
    case 'url':
      list.push({ type: 'regex', regex: '^(https?|ftp)://[^\\s/$.?#].[^\\s]*$', text: VALIDATION_MESSAGES.url })
      break
    case 'regex': {
      const regex = (config.regexPattern as string)?.trim()
      if (regex) list.push({ type: 'regex', regex, text: VALIDATION_MESSAGES.regex })
      break
    }
    default:
      break
  }
  return list
}

type OptItem = {
  label?: string
  allowFill?: boolean
  hidden?: boolean
  imageData?: string
  imageUrl?: string
  description?: string
  descriptionOpenInPopup?: boolean
}

export function questionToElements(q: SurveyQuestionVO): Record<string, unknown>[] {
  const config = parseConfig(q.config)
  const name = String(q.id!)
  const base: Record<string, unknown> = {
    name,
    title: sanitizeRichTextHtml(q.title || '题目') || '题目',
    isRequired: q.required !== false,
    ...(q.description != null && q.description !== '' ? { description: q.description } : {}),
  }
  const opts = (config.options as OptItem[] | undefined) ?? []
  const visibleOpts = opts
    .map((opt, index) => ({ opt, index }))
    .filter(({ opt }) => opt?.hidden !== true)
  const hasOther = config.hasOtherOption === true
  const otherAllowFill = config.otherAllowFill === true

  const layout = (config.layout as string) === 'horizontal' ? 'horizontal' : 'vertical'
  const optionsAsTags = config.optionsAsTags === true
  const optionsRandom = config.optionsRandom === true
  const defaultOptionIndex = config.defaultOptionIndex as number | undefined
  const defaultOptionIndices = config.defaultOptionIndices as number[] | undefined

  function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  switch (q.type) {
    case 'SINGLE_CHOICE': {
      let choices: { value: number | string; text: string; imageLink?: string; description?: string; descriptionOpenInPopup?: boolean }[] = visibleOpts.map(({ opt: o, index: i }) => ({
        value: i,
        text: normalizeOptionLabelHtml(o?.label, `选项${i + 1}`),
        ...((o?.imageData || o?.imageUrl) ? { imageLink: o.imageData || o.imageUrl } : {}),
        ...(o?.description ? { description: o.description, descriptionOpenInPopup: o.descriptionOpenInPopup === true } : {}),
      }))
      if (hasOther) choices.push({ value: 'other', text: '其他' })
      if (optionsRandom) choices = shuffle(choices)
      const allowFillIndices = visibleOpts
        .map(({ opt: o, index: i }) => (o?.allowFill ? i : -1))
        .filter((i: number) => i >= 0)
      const visibleIfComment = allowFillIndices.length > 0
        ? allowFillIndices.map((i: number) => `{${name}} = ${i}`).join(' or ')
        : null
      const elements: Record<string, unknown>[] = [
        {
          ...base,
          type: 'radiogroup',
          choices,
          showOtherItem: hasOther,
          otherText: '其他',
          showCommentArea: hasOther && otherAllowFill,
          colCount: layout === 'horizontal' ? choices.length : 1,
          ...(defaultOptionIndex != null && visibleOpts.some(({ index }) => index === defaultOptionIndex) ? { defaultValue: defaultOptionIndex } : {}),
          ...(optionsAsTags && { className: 'fill-options-as-tags' }),
        },
      ]
      if (visibleIfComment) {
        elements.push({
          type: 'comment',
          name: `${name}-Comment`,
          title: '',
          visibleIf: visibleIfComment,
          isRequired: false,
          placeholder: '请填写',
        })
      }
      return elements
    }
    case 'MULTIPLE_CHOICE': {
      let choices: { value: number | string; text: string; imageLink?: string; description?: string; descriptionOpenInPopup?: boolean }[] = visibleOpts.map(({ opt: o, index: i }) => ({
        value: i,
        text: normalizeOptionLabelHtml(o?.label, `选项${i + 1}`),
        ...((o?.imageData || o?.imageUrl) ? { imageLink: o.imageData || o.imageUrl } : {}),
        ...(o?.description ? { description: o.description, descriptionOpenInPopup: o.descriptionOpenInPopup === true } : {}),
      }))
      if (hasOther) choices.push({ value: 'other', text: '其他' })
      if (optionsRandom) choices = shuffle(choices)
      const allowFillIndices = visibleOpts
        .map(({ opt: o, index: i }) => (o?.allowFill ? i : -1))
        .filter((i: number) => i >= 0)
      const visibleIfComment = allowFillIndices.length > 0
        ? allowFillIndices.map((i: number) => `{${name}} contains ${i}`).join(' or ')
        : null
      const elements: Record<string, unknown>[] = [
        {
          ...base,
          type: 'checkbox',
          choices,
          showOtherItem: hasOther,
          otherText: '其他',
          showCommentArea: hasOther && otherAllowFill,
          colCount: layout === 'horizontal' ? choices.length : 1,
          ...(Array.isArray(defaultOptionIndices)
            ? {
                defaultValue: defaultOptionIndices.filter((index) => visibleOpts.some(({ index: visibleIndex }) => visibleIndex === index)),
              }
            : {}),
          ...(optionsAsTags && { className: 'fill-options-as-tags' }),
        },
      ]
      if (visibleIfComment) {
        elements.push({
          type: 'comment',
          name: `${name}-Comment`,
          title: '',
          visibleIf: visibleIfComment,
          isRequired: false,
          placeholder: '请填写',
        })
      }
      return elements
    }
    case 'SHORT_TEXT': {
      const textValidators = buildTextValidators(config)
      return [{
        ...base,
        type: 'text',
        placeholder: (config.placeholder as string) ?? '',
        maxLength: typeof config.maxLength === 'number' && config.maxLength > 0 ? config.maxLength : undefined,
        validators: textValidators.length ? textValidators : undefined,
      }]
    }
    case 'LONG_TEXT': {
      const commentValidators = buildTextValidators(config)
      return [{
        ...base,
        type: 'comment',
        placeholder: (config.placeholder as string) ?? '',
        rows: 3,
        maxLength: typeof config.maxLength === 'number' && config.maxLength > 0 ? config.maxLength : undefined,
        validators: commentValidators.length ? commentValidators : undefined,
      }]
    }
    case 'SCALE': {
      const min = (config.scaleMin as number) ?? 1
      const max = (config.scaleMax as number) ?? 5
      return [{
        ...base,
        type: 'rating',
        rateMin: min,
        rateMax: max,
        minRateDescription: (config.scaleLeftLabel as string) ?? '',
        maxRateDescription: (config.scaleRightLabel as string) ?? '',
        displayMode: 'buttons',
      }]
    }
    default:
      return [{ ...base, type: 'text' }]
  }
}

export function metaToSurveyJson(meta: FillSurveyVO): Record<string, unknown> {
  const elements = (meta.questions ?? []).flatMap((q) => questionToElements(q))
  return {
    title: meta.title,
    description: meta.description ?? '',
    showQuestionNumbers: 'on',
    elements,
  }
}

/** 单题预览：用于设计页非编辑态，与填写页展示一致 */
export function singleQuestionToSurveyJson(question: SurveyQuestionVO): Record<string, unknown> {
  return {
    title: '',
    description: '',
    showQuestionNumbers: 'on',
    elements: questionToElements(question),
  }
}
