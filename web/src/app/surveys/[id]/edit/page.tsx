'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  surveysApi,
  type SurveyDetailVO,
  type SurveyQuestionVO,
  type ApiResponse,
} from '@/services/api'

const TYPES = [
  { value: 'SINGLE_CHOICE', label: '单选题' },
  { value: 'MULTIPLE_CHOICE', label: '多选题' },
  { value: 'SHORT_TEXT', label: '填空-单行' },
  { value: 'LONG_TEXT', label: '填空-多行' },
  { value: 'SCALE', label: '量表' },
]

function parseConfig(c: string | null | undefined): Record<string, unknown> {
  if (!c) return {}
  try {
    return JSON.parse(c) as Record<string, unknown>
  } catch {
    return {}
  }
}

function getOptions(config: Record<string, unknown>): { sortOrder: number; label: string }[] {
  const o = config.options
  if (!Array.isArray(o)) return [{ sortOrder: 0, label: '选项1' }]
  return o.map((x: { sortOrder?: number; label?: string }, i: number) => ({
    sortOrder: x.sortOrder ?? i,
    label: x.label ?? `选项${i + 1}`,
  }))
}

function getInt(config: Record<string, unknown>, key: string, def: number): number {
  const v = config[key]
  if (typeof v === 'number') return v
  return def
}

export default function EditSurveyPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)
  const [survey, setSurvey] = useState<SurveyDetailVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const confirmedForQuestion = useRef<number | null>(null)

  useEffect(() => {
    if (!id) return
    surveysApi
      .getDetail(id)
      .then((res: ApiResponse<SurveyDetailVO>) => {
        if (res?.data) {
          setSurvey(res.data)
          setTitle(res.data.title ?? '')
          setDescription(res.data.description ?? '')
          if (res.data.questions?.length && !selectedId)
            setSelectedId(res.data.questions[0].id ?? null)
          confirmedForQuestion.current = null
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const selected = survey?.questions?.find((q) => q.id === selectedId)
  const isDraft = survey?.status === 'DRAFT'

  const handleSaveBasic = () => {
    if (!id) return
    const needConfirm = survey?.status === 'COLLECTING' || survey?.status === 'PAUSED'
    if (needConfirm && !window.confirm('修改题目会影响已回收数据与统计，是否继续？')) return
    setSaving(true)
    surveysApi
      .updateBasic(id, { title, description })
      .then(() => setSaving(false))
      .catch(() => setSaving(false))
  }

  const handlePublish = () => {
    if (!id) return
    setPublishing(true)
    surveysApi
      .publish(id)
      .then(() => {
        if (survey) setSurvey({ ...survey, status: 'COLLECTING' })
      })
      .catch((e) => alert(e?.response?.data?.message || '发布失败'))
      .finally(() => setPublishing(false))
  }

  const handleAddQuestion = () => {
    if (!id) return
    surveysApi
      .addQuestion(id, {
        type: 'SINGLE_CHOICE',
        title: '新题目',
        required: true,
        config: JSON.stringify({ options: [{ sortOrder: 0, label: '选项1' }] }),
      })
      .then((res) => {
        if (res?.data?.id) {
          setSurvey((s) =>
            s
              ? {
                  ...s,
                  questions: [...(s.questions || []), { ...res.data!, id: res.data!.id }],
                }
              : s
          )
          setSelectedId(res.data!.id!)
        }
      })
  }

  const handleUpdateQuestion = (qId: number, patch: Partial<SurveyQuestionVO>) => {
    if (!id || !survey) return
    const needConfirm = survey.status === 'COLLECTING' || survey.status === 'PAUSED'
    if (needConfirm && confirmedForQuestion.current !== qId) {
      if (!window.confirm('修改题目会影响已回收数据与统计，是否继续？')) return
      confirmedForQuestion.current = qId
    }
    surveysApi.updateQuestion(id, qId, patch).then(() => {
      setSurvey({
        ...survey,
        questions: survey.questions.map((q) =>
          q.id === qId ? { ...q, ...patch } : q
        ),
      })
    })
  }

  const handleDeleteQuestion = (qId: number) => {
    if (!id || !survey) return
    const needConfirm = survey.status === 'COLLECTING' || survey.status === 'PAUSED'
    const msg = needConfirm ? '修改题目会影响已回收数据与统计，确定删除该题？' : '确定删除该题？'
    if (!window.confirm(msg)) return
    surveysApi.deleteQuestion(id, qId).then(() => {
      const next = survey.questions.filter((q) => q.id !== qId)
      setSurvey({ ...survey, questions: next })
      setSelectedId(next[0]?.id ?? null)
    })
  }

  if (loading || !survey) {
    return (
      <div className="max-w-4xl">
        <p className="text-gray-500">加载中...</p>
        <Link href="/surveys" className="text-blue-600 hover:underline mt-2 inline-block">
          返回列表
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl flex gap-6">
      <div className="flex-1">
        <div className="mb-4 flex gap-2 items-center">
          <Link href="/surveys" className="text-blue-600 hover:underline">
            我的问卷
          </Link>
          <span className="text-gray-400">/</span>
          <span>编辑</span>
        </div>
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">问卷标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">问卷说明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={2}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSaveBasic}
              disabled={saving}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              {saving ? '保存中...' : isDraft ? '保存草稿' : '保存'}
            </button>
            {isDraft && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {publishing ? '发布中...' : '发布'}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-56 bg-white rounded-lg shadow p-2">
            <div className="font-medium text-gray-700 mb-2">题目列表</div>
            {survey.questions?.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedId(q.id ?? null)}
                className={
                  'w-full text-left px-2 py-2 rounded mb-1 ' +
                  (selectedId === q.id ? 'bg-blue-100' : 'hover:bg-gray-100')
                }
              >
                {i + 1}. {(q.title || '').slice(0, 12)}
                {(q.title || '').length > 12 ? '…' : ''}
              </button>
            ))}
            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full mt-2 border border-dashed rounded py-2 text-gray-500 hover:bg-gray-50"
            >
              添加题目
            </button>
          </div>
          <div className="flex-1 bg-white rounded-lg shadow p-4">
            {selected ? (
              <QuestionEditor
                question={selected}
                onUpdate={(patch) => handleUpdateQuestion(selected.id!, patch)}
                onDelete={() => handleDeleteQuestion(selected.id!)}
              />
            ) : (
              <p className="text-gray-500">请选择或添加题目</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionEditor({
  question,
  onUpdate,
  onDelete,
}: {
  question: SurveyQuestionVO
  onUpdate: (patch: Partial<SurveyQuestionVO>) => void
  onDelete: () => void
}) {
  const config = parseConfig(question.config)
  const options = getOptions(config)

  const setConfig = (key: string, value: unknown) => {
    const next = { ...config, [key]: value }
    onUpdate({ config: JSON.stringify(next) })
  }

  const setOptions = (opts: { sortOrder: number; label: string }[]) => {
    setConfig('options', opts)
  }

  return (
    <div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">题目标题</label>
        <input
          type="text"
          value={question.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">题目说明（选填）</label>
        <input
          type="text"
          value={question.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value || undefined })}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">题型</label>
        <select
          value={question.type}
          onChange={(e) => onUpdate({ type: e.target.value })}
          className="border rounded px-3 py-2"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={question.required !== false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
          />
          必填
        </label>
      </div>
      {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700">选项</label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                value={opt.label}
                onChange={(e) => {
                  const next = options.slice()
                  next[i] = { ...next[i], label: e.target.value }
                  setOptions(next)
                }}
                className="flex-1 border rounded px-2 py-1"
              />
              <button
                type="button"
                onClick={() => setOptions(options.filter((_, j) => j !== i))}
                className="text-red-600 text-sm"
              >
                删除
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOptions([...options, { sortOrder: options.length, label: `选项${options.length + 1}` }])}
            className="text-blue-600 text-sm"
          >
            添加选项
          </button>
          {question.type === 'MULTIPLE_CHOICE' && (
            <div className="mt-2 flex gap-4">
              <div>
                <label className="block text-sm text-gray-700">最少选</label>
                <input
                  type="number"
                  min={0}
                  value={getInt(config, 'minChoices', 0)}
                  onChange={(e) => setConfig('minChoices', parseInt(e.target.value, 10) || 0)}
                  className="border rounded px-2 py-1 w-20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">最多选（空=不限）</label>
                <input
                  type="number"
                  min={1}
                  value={config.maxChoices === undefined || config.maxChoices === null ? '' : Number(config.maxChoices)}
                  onChange={(e) => setConfig('maxChoices', e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 1)}
                  className="border rounded px-2 py-1 w-20"
                  placeholder="不限"
                />
              </div>
            </div>
          )}
        </div>
      )}
      {(question.type === 'SHORT_TEXT' || question.type === 'LONG_TEXT') && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700">占位提示</label>
          <input
            type="text"
            value={(config.placeholder as string) ?? ''}
            onChange={(e) => setConfig('placeholder', e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </div>
      )}
      {question.type === 'SCALE' && (
        <div className="mb-3 flex gap-4">
          <div>
            <label className="block text-sm text-gray-700">最小值</label>
            <input
              type="number"
              value={(config.scaleMin as number) ?? 1}
              onChange={(e) => setConfig('scaleMin', parseInt(e.target.value, 10) || 1)}
              className="border rounded px-2 py-1 w-20"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">最大值</label>
            <input
              type="number"
              value={(config.scaleMax as number) ?? 5}
              onChange={(e) => setConfig('scaleMax', parseInt(e.target.value, 10) || 5)}
              className="border rounded px-2 py-1 w-20"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-700">左端点</label>
            <input
              type="text"
              value={(config.scaleLeftLabel as string) ?? ''}
              onChange={(e) => setConfig('scaleLeftLabel', e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-700">右端点</label>
            <input
              type="text"
              value={(config.scaleRightLabel as string) ?? ''}
              onChange={(e) => setConfig('scaleRightLabel', e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="mt-4 text-red-600 hover:underline text-sm"
      >
        删除此题
      </button>
    </div>
  )
}
