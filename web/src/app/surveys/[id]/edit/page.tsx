'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  surveysApi,
  type SurveyDetailVO,
  type SurveyQuestionVO,
  type ApiResponse,
} from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

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

type OptionItem = {
  sortOrder: number
  label: string
  description?: string
  descriptionOpenInPopup?: boolean
  allowFill?: boolean
  /** 图片外链 URL */
  imageUrl?: string
  /** 图片 data URL（base64），上传后存于此；展示时优先于 imageUrl */
  imageData?: string
}
function getOptions(config: Record<string, unknown>): OptionItem[] {
  const o = config.options
  if (!Array.isArray(o)) return [{ sortOrder: 0, label: '选项1' }]
  return o.map((x: Record<string, unknown>, i: number) => ({
    sortOrder: (x.sortOrder as number) ?? i,
    label: (x.label as string) ?? `选项${i + 1}`,
    description: x.description as string | undefined,
    descriptionOpenInPopup: x.descriptionOpenInPopup === true,
    allowFill: x.allowFill === true,
    imageUrl: x.imageUrl as string | undefined,
    imageData: x.imageData as string | undefined,
  }))
}

function getInt(config: Record<string, unknown>, key: string, def: number): number {
  const v = config[key]
  if (typeof v === 'number') return v
  return def
}

function SortableQuestionRow({
  question,
  index,
  isSelected,
  onSelect,
}: {
  question: SurveyQuestionVO
  index: number
  isSelected: boolean
  onSelect: () => void
}) {
  const id = `q-${question.id}`
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        'flex items-center gap-1 rounded-lg mb-1 ' +
        (isSelected ? 'bg-blue-50' : '') +
        (isDragging ? ' opacity-50 z-10' : '')
      }
    >
      <button
        type="button"
        className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        title="拖拽排序"
        {...attributes}
        {...listeners}
      >
        <i className="fas fa-grip-vertical text-xs" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className={
          'flex-1 text-left px-2 py-2 text-sm truncate min-w-0 ' +
          (isSelected ? 'text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50')
        }
      >
        {index + 1}. {(question.title || '').slice(0, 10)}
        {(question.title || '').length > 10 ? '…' : ''}
      </button>
    </div>
  )
}

function SortableOptionRow({
  index,
  opt,
  onOptionChange,
  onRemove,
  inputClass,
  labelClass,
}: {
  index: number
  opt: OptionItem
  onOptionChange: (patch: Partial<OptionItem>) => void
  onRemove: () => void
  inputClass: string
  labelClass: string
}) {
  const id = `opt-${index}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={'mb-3 p-2 rounded-lg border border-gray-100 ' + (isDragging ? ' opacity-50' : '')}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none shrink-0"
          title="拖拽排序"
          {...attributes}
          {...listeners}
        >
          <i className="fas fa-grip-vertical text-xs" />
        </button>
        <input
          type="text"
          value={opt.label}
          onChange={(e) => onOptionChange({ label: e.target.value })}
          className={inputClass + ' flex-1 min-w-0'}
          placeholder="选项文案"
        />
        <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 text-sm shrink-0">
          <input
            type="checkbox"
            checked={opt.allowFill === true}
            onChange={(e) => onOptionChange({ allowFill: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>允许填空</span>
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm shrink-0"
        >
          删除
        </button>
      </div>
      <div className="mt-3 ml-8 space-y-4 text-sm">
        {/* 说明与行为 */}
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-gray-600 font-medium">
            <i className="fas fa-info-circle text-gray-400" />
            <span>选项说明</span>
          </div>
          <input
            type="text"
            value={opt.description ?? ''}
            onChange={(e) => onOptionChange({ description: e.target.value || undefined })}
            className={inputClass + ' w-full'}
            placeholder="说明文字或链接 https://..."
          />
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
              <input
                type="checkbox"
                checked={opt.descriptionOpenInPopup === true}
                onChange={(e) => onOptionChange({ descriptionOpenInPopup: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>链接点击时弹窗打开</span>
            </label>
          </div>
        </div>

        {/* 选项图片 */}
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-gray-600 font-medium">
            <i className="fas fa-image text-gray-400" />
            <span>选项图片</span>
          </div>
          <input
            type="text"
            value={opt.imageUrl ?? ''}
            onChange={(e) => onOptionChange({ imageUrl: e.target.value?.trim() || undefined })}
            className={inputClass + ' w-full'}
            placeholder="图片外链 https://..."
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              id={`opt-image-${id}`}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                const MAX_BYTES = 512 * 1024
                if (file.size > MAX_BYTES) {
                  alert(`图片请小于 ${MAX_BYTES / 1024}KB，当前约 ${Math.round(file.size / 1024)}KB`)
                  return
                }
                const reader = new FileReader()
                reader.onload = () => {
                  const data = reader.result as string
                  if (data?.startsWith('data:image/')) onOptionChange({ imageData: data })
                }
                reader.readAsDataURL(file)
              }}
            />
            <label
              htmlFor={`opt-image-${id}`}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer text-sm shrink-0"
            >
              本地上传
            </label>
            {(opt.imageData || opt.imageUrl) && (
              <>
                <img
                  src={opt.imageData || opt.imageUrl}
                  alt=""
                  className="h-12 w-12 object-cover rounded border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {opt.imageData && (
                  <button
                    type="button"
                    onClick={() => onOptionChange({ imageData: undefined })}
                    className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-sm"
                  >
                    移除上传图
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-gray-500">外链与上传二选一或只填其一；上传 &lt;512KB，支持 jpg/png/gif/webp</p>
        </div>
      </div>
    </div>
  )
}

export default function EditSurveyPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [survey, setSurvey] = useState<SurveyDetailVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const confirmedForQuestion = useRef<number | null>(null)

  useEffect(() => {
    if (!id) return
    surveysApi
      .getDetail(id)
      .then((res: ApiResponse<SurveyDetailVO>) => {
        if (res?.data) {
          setSurvey(res.data)
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

  const handlePublish = () => {
    if (!id) return
    setPublishing(true)
    surveysApi
      .publish(id)
      .then(() => {
        if (survey) setSurvey({ ...survey, status: 'COLLECTING' })
        alert('发布成功')
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

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!id || !survey?.questions?.length || !over || active.id === over.id) return
    const ids = survey.questions.map((q) => q.id!).filter(Boolean)
    const oldIndex = ids.indexOf(Number(String(active.id).replace(/^q-/, '')))
    const newIndex = ids.indexOf(Number(String(over.id).replace(/^q-/, '')))
    if (oldIndex < 0 || newIndex < 0) return
    const needConfirm = survey.status === 'COLLECTING' || survey.status === 'PAUSED'
    if (needConfirm && !window.confirm('调整题目顺序会影响已回收数据与统计，是否继续？')) return
    const next = arrayMove(ids, oldIndex, newIndex)
    surveysApi.updateQuestionOrder(id, next).then(() => {
      const reordered = next.map((oid) => survey.questions!.find((q) => q.id === oid)!).filter(Boolean)
      setSurvey({ ...survey, questions: reordered })
    })
  }

  const questionSortableIds = useMemo(
    () => (survey?.questions ?? []).map((q) => `q-${q.id}`),
    [survey?.questions]
  )
  const questionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const handleCopyQuestion = (qId: number) => {
    if (!id || !survey) return
    const needConfirm = survey.status === 'COLLECTING' || survey.status === 'PAUSED'
    if (needConfirm && !window.confirm('修改题目会影响已回收数据与统计，是否继续？')) return
    surveysApi.copyQuestion(id, qId).then((res) => {
      if (res?.data?.id) {
        surveysApi.getDetail(id).then((detailRes) => {
          if (detailRes?.data) {
            setSurvey(detailRes.data)
            setSelectedId(res.data!.id!)
          }
        })
      }
    })
  }

  if (loading || !survey) {
    return (
      <div className="p-0">
        <p className="text-gray-500">加载中...</p>
        <Link href="/surveys" className="text-blue-600 hover:underline mt-2 inline-block">
          返回列表
        </Link>
      </div>
    )
  }

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">编辑问卷</h1>
          <div className="mt-1 flex gap-2 items-center text-sm text-gray-600">
            <Link href="/surveys" className="text-blue-600 hover:underline">
              我的问卷
            </Link>
            <span className="text-gray-400">/</span>
            <span>{(survey.title || '未命名问卷').replace(/\n[\s\S]*/, '').trim()}-设计</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Link
            href={`/surveys/${id}/settings`}
            className="px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-sm"
          >
            问卷设置
          </Link>
          {isDraft && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              {publishing ? '发布中...' : '发布问卷'}
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-6">
        <div className="w-64 bg-white rounded-lg shadow-card p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">题目列表（拖拽排序）</div>
          <DndContext
            sensors={questionSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleQuestionDragEnd}
          >
            <SortableContext items={questionSortableIds} strategy={verticalListSortingStrategy}>
              {survey.questions?.map((q, i) => (
                <SortableQuestionRow
                  key={q.id}
                  question={q}
                  index={i}
                  isSelected={selectedId === q.id}
                  onSelect={() => setSelectedId(q.id ?? null)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full mt-3 border border-dashed border-gray-300 rounded-lg py-2 text-gray-500 hover:bg-gray-50 text-sm"
          >
            <i className="fas fa-plus mr-1" /> 添加题目
          </button>
        </div>
        <div className="flex-1 bg-white rounded-lg shadow-card p-6">
            {selected ? (
              <QuestionEditor
                surveyId={id}
                question={selected}
                onUpdate={(patch) => handleUpdateQuestion(selected.id!, patch)}
                onDelete={() => handleDeleteQuestion(selected.id!)}
                onCopy={() => handleCopyQuestion(selected.id!)}
              />
            ) : (
              <p className="text-gray-500">请选择或添加题目</p>
            )}
        </div>
      </div>
    </div>
  )
}

function QuestionEditor({
  surveyId,
  question,
  onUpdate,
  onDelete,
  onCopy,
}: {
  surveyId: string
  question: SurveyQuestionVO
  onUpdate: (patch: Partial<SurveyQuestionVO>) => void
  onDelete: () => void
  onCopy: () => void
}) {
  const config = parseConfig(question.config)
  const options = getOptions(config)
  const [showBatchAdd, setShowBatchAdd] = useState(false)
  const [batchAddText, setBatchAddText] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const setConfig = (key: string, value: unknown) => {
    const next = { ...config, [key]: value }
    onUpdate({ config: JSON.stringify(next) })
  }

  const setOptions = (opts: OptionItem[]) => {
    setConfig('options', opts)
  }

  const handleBatchAddOptions = () => {
    const lines = batchAddText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (lines.length === 0) return
    const newOpts: OptionItem[] = lines.map((label, i) => ({
      sortOrder: options.length + i,
      label,
    }))
    setOptions([...options, ...newOpts])
    setBatchAddText('')
    setShowBatchAdd(false)
  }

  return (
    <div>
      <div className="mb-4">
        <label className={labelClass}>题目标题</label>
        <input
          type="text"
          value={question.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="mb-4">
        <label className={labelClass}>题目说明（选填）</label>
        <input
          type="text"
          value={question.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value || undefined })}
          className={inputClass}
        />
      </div>
      <div className="mb-4">
        <label className={labelClass}>题型</label>
        <select
          value={question.type}
          onChange={(e) => onUpdate({ type: e.target.value })}
          className={inputClass}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={question.required !== false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          必填
        </label>
      </div>
      {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={config.optionsRandom === true}
                onChange={(e) => setConfig('optionsRandom', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              选项随机
            </label>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-600 whitespace-nowrap">排列：</span>
              <select
                value={(config.layout as string) ?? 'vertical'}
                onChange={(e) => setConfig('layout', e.target.value)}
                className={inputClass + ' w-28 py-1'}
              >
                <option value="vertical">竖向</option>
                <option value="horizontal">横向</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={config.optionsAsTags === true}
                onChange={(e) => setConfig('optionsAsTags', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              标签化呈现
            </label>
          </div>
          <div className="mb-3">
            <label className={labelClass}>默认选中（选填）</label>
            {question.type === 'SINGLE_CHOICE' ? (
              <select
                value={config.defaultOptionIndex === undefined || config.defaultOptionIndex === null ? '' : Number(config.defaultOptionIndex)}
                onChange={(e) => setConfig('defaultOptionIndex', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                className={inputClass + ' w-48'}
              >
                <option value="">无默认</option>
                {options.map((_, i) => (
                  <option key={i} value={i}>{options[i]?.label || `选项${i + 1}`}</option>
                ))}
              </select>
            ) : (
              <div className="flex flex-wrap gap-2">
                {options.map((_, i) => (
                  <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Array.isArray(config.defaultOptionIndices) && config.defaultOptionIndices.includes(i)}
                      onChange={(e) => {
                        const arr = (config.defaultOptionIndices as number[] | undefined) ?? []
                        const next = e.target.checked ? [...arr, i].sort((a, b) => a - b) : arr.filter((x) => x !== i)
                        setConfig('defaultOptionIndices', next.length ? next : undefined)
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{(options[i]?.label || `选项${i + 1}`).slice(0, 12)}{(options[i]?.label?.length ?? 0) > 12 ? '…' : ''}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <label className={labelClass}>选项（拖拽排序）</label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event
              if (!over || active.id === over.id) return
              const oldI = Number(String(active.id).replace(/^opt-/, ''))
              const newI = Number(String(over.id).replace(/^opt-/, ''))
              if (Number.isNaN(oldI) || Number.isNaN(newI)) return
              setOptions(arrayMove(options, oldI, newI))
            }}
          >
            <SortableContext items={options.map((_, i) => `opt-${i}`)} strategy={verticalListSortingStrategy}>
              {options.map((opt, i) => (
                <SortableOptionRow
                  key={i}
                  index={i}
                  opt={opt}
                  onOptionChange={(patch) => {
                    const next = options.slice()
                    next[i] = { ...next[i], ...patch }
                    setOptions(next)
                  }}
                  onRemove={() => setOptions(options.filter((_, j) => j !== i))}
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              ))}
            </SortableContext>
          </DndContext>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOptions([...options, { sortOrder: options.length, label: `选项${options.length + 1}` }])}
              className="text-blue-600 hover:underline text-sm"
            >
              添加选项
            </button>
            <button
              type="button"
              onClick={() => setOptions([...options, { sortOrder: options.length, label: '其他', allowFill: true }])}
              className="text-blue-600 hover:underline text-sm"
            >
              添加「其他」选项
            </button>
            <button
              type="button"
              onClick={() => setShowBatchAdd((v) => !v)}
              className="text-blue-600 hover:underline text-sm"
            >
              批量添加选项
            </button>
          </div>
          {showBatchAdd && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className={labelClass}>每行一个选项，可直接粘贴 Excel 列或文本</label>
              <textarea
                value={batchAddText}
                onChange={(e) => setBatchAddText(e.target.value)}
                className={inputClass + ' mt-1'}
                rows={6}
                placeholder="每行一个选项，可从 Excel 或文档中复制多行粘贴"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleBatchAddOptions}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 text-sm"
                >
                  确定添加
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBatchAdd(false); setBatchAddText('') }}
                  className="px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          )}
          {question.type === 'MULTIPLE_CHOICE' && (
            <div className="mt-3 flex gap-4">
              <div>
                <label className={labelClass}>最少选</label>
                <input
                  type="number"
                  min={0}
                  value={getInt(config, 'minChoices', 0)}
                  onChange={(e) => setConfig('minChoices', parseInt(e.target.value, 10) || 0)}
                  className={inputClass + ' w-24'}
                />
              </div>
              <div>
                <label className={labelClass}>最多选（空=不限）</label>
                <input
                  type="number"
                  min={1}
                  value={config.maxChoices === undefined || config.maxChoices === null ? '' : Number(config.maxChoices)}
                  onChange={(e) => setConfig('maxChoices', e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 1)}
                  className={inputClass + ' w-24'}
                  placeholder="不限"
                />
              </div>
            </div>
          )}
        </div>
      )}
      {(question.type === 'SHORT_TEXT' || question.type === 'LONG_TEXT') && (
        <div className="mb-4 space-y-4">
          <div>
            <label className={labelClass}>占位提示</label>
            <input
              type="text"
              value={(config.placeholder as string) ?? ''}
              onChange={(e) => setConfig('placeholder', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>校验类型</label>
            <select
              value={(config.validationType as string) ?? 'none'}
              onChange={(e) => setConfig('validationType', e.target.value)}
              className={inputClass}
            >
              <option value="none">无</option>
              <option value="number">数字</option>
              <option value="integer">整数</option>
              <option value="email">邮箱</option>
              <option value="phone">手机号</option>
              <option value="idcard">身份证</option>
              <option value="url">网址</option>
              <option value="regex">正则</option>
            </select>
          </div>
          {(config.validationType as string) === 'regex' && (
            <div>
              <label className={labelClass}>正则表达式</label>
              <input
                type="text"
                value={(config.regexPattern as string) ?? ''}
                onChange={(e) => setConfig('regexPattern', e.target.value)}
                className={inputClass}
                placeholder="如 ^1[3-9]\\d{9}$"
              />
            </div>
          )}
          <div>
            <label className={labelClass}>最大长度（空=不限制）</label>
            <input
              type="number"
              min={1}
              value={config.maxLength === undefined || config.maxLength === null ? '' : Number(config.maxLength)}
              onChange={(e) => setConfig('maxLength', e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 0)}
              className={inputClass + ' w-32'}
              placeholder="不限制"
            />
          </div>
        </div>
      )}
      {question.type === 'SCALE' && (
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>最小值</label>
            <input
              type="number"
              value={(config.scaleMin as number) ?? 1}
              onChange={(e) => setConfig('scaleMin', parseInt(e.target.value, 10) || 1)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>最大值</label>
            <input
              type="number"
              value={(config.scaleMax as number) ?? 5}
              onChange={(e) => setConfig('scaleMax', parseInt(e.target.value, 10) || 5)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>左端点</label>
            <input
              type="text"
              value={(config.scaleLeftLabel as string) ?? ''}
              onChange={(e) => setConfig('scaleLeftLabel', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>右端点</label>
            <input
              type="text"
              value={(config.scaleRightLabel as string) ?? ''}
              onChange={(e) => setConfig('scaleRightLabel', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 text-sm"
        >
          <i className="fas fa-copy mr-1" /> 复制题目
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm"
        >
          删除此题
        </button>
      </div>
    </div>
  )
}
