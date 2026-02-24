'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fillApi, type FillSurveyVO, type SurveyQuestionVO, type SubmitItemDTO } from '@/services/api'

function parseConfig(c: string | null | undefined): Record<string, unknown> {
  if (!c) return {}
  try {
    return JSON.parse(c) as Record<string, unknown>
  } catch {
    return {}
  }
}

export default function FillPage() {
  const params = useParams()
  const id = Number(params.id)
  const [meta, setMeta] = useState<FillSurveyVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ code: number; message: string } | null>(null)
  const [answers, setAnswers] = useState<Record<number, SubmitItemDTO>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [thankYou, setThankYou] = useState('')
  const startTime = useState(Date.now())[0]

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

  const setAnswer = (questionId: number, item: Partial<SubmitItemDTO>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, ...item },
    }))
  }

  const validate = (): boolean => {
    if (!meta?.questions) return true
    for (const q of meta.questions) {
      if (q.required !== false) {
        const a = answers[q.id!]
        const has =
          (a?.optionIndex != null) ||
          (a?.optionIndices?.length) ||
          (a?.textValue != null && a.textValue.trim() !== '') ||
          (a?.scaleValue != null)
        if (!has) {
          alert(`请完成必填题：${q.title || '题目'}`)
          return false
        }
      }
    }
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!meta || !validate()) return
    setSubmitting(true)
    const items = Object.values(answers).filter(
      (a) =>
        a.optionIndex != null ||
        (a.optionIndices && a.optionIndices.length > 0) ||
        (a.textValue != null && a.textValue !== '') ||
        a.scaleValue != null
    )
    const durationSeconds = Math.round((Date.now() - startTime) / 1000)
    fillApi
      .submit(id, { items, durationSeconds })
      .then(() => setSubmitted(true))
      .catch((err) => {
        const d = err?.response?.data
        alert(d?.message ?? '提交失败')
      })
      .finally(() => setSubmitting(false))
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
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">提交成功</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{thankYou}</p>
        </div>
      </div>
    )
  }
  if (!meta) return null

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{meta.title}</h1>
        {meta.description && <p className="text-gray-600 whitespace-pre-wrap">{meta.description}</p>}
      </div>
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {meta.questions?.map((q, i) => (
            <div key={q.id} className="bg-white rounded-lg shadow p-4">
              <div className="font-medium text-gray-800 mb-2">
                {i + 1}. {q.title}
                {q.required !== false && <span className="text-red-500"> *</span>}
              </div>
              <FillControl question={q} answer={answers[q.id!]} setAnswer={(a) => setAnswer(q.id!, a)} />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '提交中...' : '提交'}
          </button>
        </div>
      </form>
    </div>
  )
}

function FillControl({
  question,
  answer,
  setAnswer,
}: {
  question: SurveyQuestionVO
  answer?: SubmitItemDTO
  setAnswer: (a: Partial<SubmitItemDTO>) => void
}) {
  const config = parseConfig(question.config)
  const options = (config.options as { label?: string }[]) ?? []

  switch (question.type) {
    case 'SINGLE_CHOICE':
      return (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={answer?.optionIndex === i}
                onChange={() => setAnswer({ optionIndex: i })}
              />
              {opt.label ?? `选项${i + 1}`}
            </label>
          ))}
        </div>
      )
    case 'MULTIPLE_CHOICE':
      const indices = answer?.optionIndices ?? []
      return (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={indices.includes(i)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...indices, i].sort((a, b) => a - b)
                    : indices.filter((x) => x !== i)
                  setAnswer({ optionIndices: next })
                }}
              />
              {opt.label ?? `选项${i + 1}`}
            </label>
          ))}
        </div>
      )
    case 'SHORT_TEXT':
      return (
        <input
          type="text"
          value={answer?.textValue ?? ''}
          onChange={(e) => setAnswer({ textValue: e.target.value })}
          placeholder={(config.placeholder as string) ?? ''}
          className="w-full border rounded px-3 py-2"
        />
      )
    case 'LONG_TEXT':
      return (
        <textarea
          value={answer?.textValue ?? ''}
          onChange={(e) => setAnswer({ textValue: e.target.value })}
          placeholder={(config.placeholder as string) ?? ''}
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      )
    case 'SCALE':
      const min = (config.scaleMin as number) ?? 1
      const max = (config.scaleMax as number) ?? 5
      const left = (config.scaleLeftLabel as string) ?? ''
      const right = (config.scaleRightLabel as string) ?? ''
      return (
        <div>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{left}</span>
            <span>{right}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
              <label key={v} className="flex items-center gap-1">
                <input
                  type="radio"
                  name={`scale-${question.id}`}
                  checked={answer?.scaleValue === v}
                  onChange={() => setAnswer({ scaleValue: v })}
                />
                {v}
              </label>
            ))}
          </div>
        </div>
      )
    default:
      return (
        <input
          type="text"
          value={answer?.textValue ?? ''}
          onChange={(e) => setAnswer({ textValue: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
      )
  }
}
