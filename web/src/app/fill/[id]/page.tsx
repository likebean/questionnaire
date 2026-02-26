'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Model } from 'survey-core'
import { FlatLight } from 'survey-core/themes'
import { Survey } from 'survey-react-ui'
import { fillApi, type FillSurveyVO, type SurveyQuestionVO, type SubmitItemDTO } from '@/services/api'

function parseConfig(c: string | null | undefined): Record<string, unknown> {
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

function buildTextValidators(config: Record<string, unknown>): { type: string; text?: string; regex?: string; minLength?: number; maxLength?: number }[] {
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

function metaToSurveyJson(meta: FillSurveyVO): Record<string, unknown> {
  const elements = (meta.questions ?? []).map((q) => questionToElement(q))
  return {
    title: meta.title,
    description: meta.description ?? '',
    showQuestionNumbers: 'on',
    elements,
  }
}

function questionToElement(q: SurveyQuestionVO): Record<string, unknown> {
  const config = parseConfig(q.config)
  const name = String(q.id!)
  const base: Record<string, unknown> = {
    name,
    title: q.title || '题目',
    isRequired: q.required !== false,
  }
  const opts = (config.options as { label?: string }[]) ?? []
  const hasOther = config.hasOtherOption === true
  const otherAllowFill = config.otherAllowFill === true

  const layout = (config.layout as string) === 'horizontal' ? 'horizontal' : 'vertical'
  const optionsAsTags = config.optionsAsTags === true
  const optionsRandom = config.optionsRandom === true

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
      let choices: { value: number | string; text: string }[] = opts.map((o, i) => ({ value: i, text: o?.label ?? `选项${i + 1}` }))
      if (hasOther) choices.push({ value: 'other', text: '其他' })
      if (optionsRandom) choices = shuffle(choices)
      return {
        ...base,
        type: 'radiogroup',
        choices,
        showOtherItem: hasOther,
        otherText: '其他',
        showCommentArea: hasOther && otherAllowFill,
        colCount: layout === 'horizontal' ? choices.length : 1,
        ...(optionsAsTags && { className: 'fill-options-as-tags' }),
      }
    }
    case 'MULTIPLE_CHOICE': {
      let choices: { value: number | string; text: string }[] = opts.map((o, i) => ({ value: i, text: o?.label ?? `选项${i + 1}` }))
      if (hasOther) choices.push({ value: 'other', text: '其他' })
      if (optionsRandom) choices = shuffle(choices)
      return {
        ...base,
        type: 'checkbox',
        choices,
        showOtherItem: hasOther,
        otherText: '其他',
        colCount: layout === 'horizontal' ? choices.length : 1,
        ...(optionsAsTags && { className: 'fill-options-as-tags' }),
      }
    }
    case 'SHORT_TEXT': {
      const textValidators = buildTextValidators(config)
      return {
        ...base,
        type: 'text',
        placeholder: (config.placeholder as string) ?? '',
        maxLength: typeof config.maxLength === 'number' && config.maxLength > 0 ? config.maxLength : undefined,
        validators: textValidators.length ? textValidators : undefined,
      }
    }
    case 'LONG_TEXT': {
      const commentValidators = buildTextValidators(config)
      return {
        ...base,
        type: 'comment',
        placeholder: (config.placeholder as string) ?? '',
        rows: 3,
        maxLength: typeof config.maxLength === 'number' && config.maxLength > 0 ? config.maxLength : undefined,
        validators: commentValidators.length ? commentValidators : undefined,
      }
    }
    case 'SCALE': {
      const min = (config.scaleMin as number) ?? 1
      const max = (config.scaleMax as number) ?? 5
      return {
        ...base,
        type: 'rating',
        rateMin: min,
        rateMax: max,
        minRateDescription: (config.scaleLeftLabel as string) ?? '',
        maxRateDescription: (config.scaleRightLabel as string) ?? '',
        displayMode: 'buttons',
      }
    }
    default:
      return { ...base, type: 'text' }
  }
}

function surveyDataToItems(
  data: Record<string, unknown>,
  questions: SurveyQuestionVO[]
): SubmitItemDTO[] {
  const items: SubmitItemDTO[] = []
  for (const q of questions) {
    const name = String(q.id!)
    const value = data[name]
    if (value === undefined || value === null) continue
    const config = parseConfig(q.config)
    const opts = (config.options as unknown[]) ?? []
    const otherIndex = opts.length
    const hasOther = config.hasOtherOption === true

    if (q.type === 'SINGLE_CHOICE') {
      if (value === 'other') {
        const textValue = (data[`${name}-Comment`] as string) ?? ''
        items.push({ questionId: q.id!, optionIndex: otherIndex, textValue })
      } else if (typeof value === 'number') {
        items.push({ questionId: q.id!, optionIndex: value })
      }
    } else if (q.type === 'MULTIPLE_CHOICE') {
      const arr = Array.isArray(value) ? value : [value]
      const optionIndices = arr.filter((v): v is number => typeof v === 'number').sort((a, b) => a - b)
      const hasOtherSel = arr.includes('other')
      if (hasOtherSel) optionIndices.push(otherIndex)
      optionIndices.sort((a, b) => a - b)
      const textValue = hasOtherSel ? ((data[`${name}-Comment`] as string) ?? '') : undefined
      if (optionIndices.length) items.push({ questionId: q.id!, optionIndices, ...(textValue !== undefined && { textValue }) })
    } else if (q.type === 'SHORT_TEXT' || q.type === 'LONG_TEXT' || q.type === 'text' || q.type === 'comment') {
      const textValue = typeof value === 'string' ? value : String(value ?? '')
      if (textValue !== '') items.push({ questionId: q.id!, textValue })
    } else if (q.type === 'SCALE' || q.type === 'rating') {
      const n = Number(value)
      if (!Number.isNaN(n)) items.push({ questionId: q.id!, scaleValue: n })
    } else {
      const textValue = typeof value === 'string' ? value : String(value ?? '')
      if (textValue !== '') items.push({ questionId: q.id!, textValue })
    }
  }
  return items
}

export default function FillPage() {
  const params = useParams()
  const id = params.id as string
  const [meta, setMeta] = useState<FillSurveyVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ code: number; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [thankYou, setThankYou] = useState('感谢您的填写！')
  const startTime = useMemo(() => Date.now(), [])

  useEffect(() => {
    if (!id) return
    fillApi
      .getMetadata(id)
      .then((res) => {
        if (res?.data) {
          setMeta(res.data)
          setThankYou(res.data.thankYouText ?? '感谢您的填写！')
        }
      })
      .catch((err) => {
        const d = err?.response?.data
        setError({
          code: d?.code ?? 500,
          message: d?.message ?? '加载失败',
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  const deviceId = useMemo(() => {
    if (typeof window === 'undefined') return null
    let d = localStorage.getItem('fill_device_id')
    if (!d) {
      d = 'd_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36)
      localStorage.setItem('fill_device_id', d)
    }
    return d
  }, [])

  const surveyModel = useMemo(() => {
    if (!meta) return null
    const json = metaToSurveyJson(meta)
    const model = new Model(json)
    model.applyTheme(FlatLight)
    model.showNavigationButtons = false
    model.showCompletedPage = false
    return model
  }, [meta])

  const handleSubmit = () => {
    if (!surveyModel || !meta) return
    surveyModel.validate()
    if (!surveyModel.hasErrors()) {
      setSubmitting(true)
      const data = surveyModel.data
      const items = surveyDataToItems(data, meta.questions ?? [])
      const durationSeconds = Math.round((Date.now() - startTime) / 1000)
      fillApi
        .submit(id, { items, durationSeconds, deviceId: deviceId ?? undefined })
        .then(() => setSubmitted(true))
        .catch((err) => {
          const d = err?.response?.data
          alert(d?.message ?? '提交失败')
        })
        .finally(() => setSubmitting(false))
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto p-6">加载中...</div>
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error.message}
        </div>
      </div>
    )
  }
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-card p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">提交成功</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{thankYou}</p>
        </div>
      </div>
    )
  }
  if (!meta || !surveyModel) return null

  return (
    <div className="fill-page-wrapper py-8 px-4">
      <div className="fill-page-surveyjs fill-page-card w-full max-w-2xl mx-auto bg-white rounded-xl shadow-card overflow-hidden">
        <Survey
          model={surveyModel}
          id={`survey-${id}`}
        />
        <div className="fill-page-footer">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="sd-btn sd-btn--action"
            style={{ width: '100%', padding: '12px 16px', fontSize: '1rem', fontWeight: 600 }}
          >
            {submitting ? '提交中...' : '提交'}
          </button>
        </div>
      </div>
    </div>
  )
}
