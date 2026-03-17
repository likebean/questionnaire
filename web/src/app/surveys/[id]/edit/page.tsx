'use client'

import { useEffect, useRef, useState, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Model } from 'survey-core'
import { FlatLight } from 'survey-core/themes'
import { Survey } from 'survey-react-ui'
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
  presetOptionsApi,
  type SurveyDetailVO,
  type SurveyQuestionVO,
  type ApiResponse,
  type PresetOptionCategoryVO,
} from '@/services/api'
import {
  AlignLeft,
  EyeOff,
  Image as ImageIcon,
  Keyboard,
  Plus,
  SquarePen,
  Star,
  Trash2,
} from 'lucide-react'
import { singleQuestionToSurveyJson } from '@/lib/surveyJson'
import { RichTitleEditor } from '@/app/_components/RichTitleEditor'
import 'survey-core/survey-core.min.css'
import '@/app/fill/fill.css'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'
const flatLightThemeStyle = FlatLight.cssVariables as unknown as CSSProperties

const TYPES = [
  { value: 'SINGLE_CHOICE', label: '单选题', icon: 'fa-dot-circle' },
  { value: 'MULTIPLE_CHOICE', label: '多选题', icon: 'fa-check-square' },
  { value: 'SHORT_TEXT', label: '填空-单行', icon: 'fa-align-left' },
  { value: 'LONG_TEXT', label: '填空-多行', icon: 'fa-paragraph' },
  { value: 'SCALE', label: '量表', icon: 'fa-sliders-h' },
]

function getDefaultConfigForType(type: string): string {
  switch (type) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      return JSON.stringify({ options: [{ sortOrder: 0, label: '选项1' }] })
    case 'SHORT_TEXT':
    case 'LONG_TEXT':
      return JSON.stringify({})
    case 'SCALE':
      return JSON.stringify({ scaleMin: 1, scaleMax: 5 })
    default:
      return JSON.stringify({ options: [{ sortOrder: 0, label: '选项1' }] })
  }
}

function getDefaultTitleForType(type: string): string {
  const t = TYPES.find((x) => x.value === type)
  return t ? `新${t.label}` : '新题目'
}

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
  hidden?: boolean
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
    hidden: x.hidden === true,
    imageUrl: x.imageUrl as string | undefined,
    imageData: x.imageData as string | undefined,
  }))
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
}

function getOptionPlainLabel(opt: OptionItem, index: number): string {
  const text = stripHtml(opt.label)
  return text || `选项${index + 1}`
}

function getInt(config: Record<string, unknown>, key: string, def: number): number {
  const v = config[key]
  if (typeof v === 'number') return v
  return def
}

/** 非编辑态：与填写页一致的题目展示（样式同填写，可本地交互但不保存） */
function QuestionFillPreview({ question, index }: { question: SurveyQuestionVO; index: number }) {
  const surveyModel = useMemo(() => {
    const json = singleQuestionToSurveyJson(question)
    const model = new Model(json)
    model.applyTheme(FlatLight)
    model.showNavigationButtons = false
    model.showCompletedPage = false
    return model
  }, [question])
  return (
    <div
      className="fill-page-card fill-page-surveyjs w-full bg-white overflow-hidden select-none"
      aria-label={`题目 ${index + 1} 预览`}
    >
      <Survey model={surveyModel} id={`survey-preview-${question.id}`} />
    </div>
  )
}

function SortableQuestionCard({
  question,
  index,
  totalCount,
  surveyId,
  typeLabel,
  isEditing,
  onStartEdit,
  onUpdate,
  onDelete,
  onCopy,
  onMoveUp,
  onMoveDown,
  onMoveFirst,
  onMoveLast,
  onFinishEdit,
}: {
  question: SurveyQuestionVO
  index: number
  totalCount: number
  surveyId: string
  typeLabel: string
  isEditing: boolean
  onStartEdit: () => void
  onUpdate: (patch: Partial<SurveyQuestionVO>) => void
  onDelete: () => void
  onCopy: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveFirst: () => void
  onMoveLast: () => void
  onFinishEdit: () => void
}) {
  const id = `q-${question.id}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const config = parseConfig(question.config)
  const isChoiceQuestion = question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE'
  const canMoveUp = index > 0
  const canMoveDown = index < totalCount - 1

  const setChoiceConfig = (patch: Record<string, unknown>) => {
    if (!isChoiceQuestion) return
    onUpdate({ config: JSON.stringify({ ...config, ...patch }) })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        'group bg-white border-b border-gray-200 overflow-hidden ' +
        (isEditing ? ' border-l-4 border-l-blue-500 bg-blue-50/30' : ' hover:bg-gray-50/50 ') +
        (isDragging ? ' opacity-60 z-10' : '')
      }
    >
      {isEditing ? (
        <div className="px-4 pt-10 pb-0 bg-gray-50/50 relative">
          <div
            data-no-edit
            className="absolute top-0 left-0 right-0 flex justify-center pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-[1]"
          >
            <button
              type="button"
              className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none rounded hover:bg-gray-100/80"
              title="拖拽排序"
              {...attributes}
              {...listeners}
            >
              <i className="fas fa-grip-vertical text-sm" />
            </button>
          </div>
          <QuestionEditor
            surveyId={surveyId}
            question={question}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onCopy={onCopy}
            hideActions
            compact
          />
          <div className="mt-4 pt-3 pb-3 border-t border-gray-200/50 bg-gray-100/30 -mx-4 px-4 flex flex-wrap items-center justify-between gap-3 rounded-b">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.required !== false}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                必填
              </label>
              <span className="text-sm text-gray-500">{typeLabel}</span>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {isChoiceQuestion && (
                <>
                  <select
                    value={config.optionsRandom === true ? 'random' : 'fixed'}
                    onChange={(e) => setChoiceConfig({ optionsRandom: e.target.value === 'random' })}
                    className="inline-block w-36 shrink-0 rounded border border-gray-300 bg-white px-2 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    title="选项随机"
                  >
                    <option value="fixed">选项不随机排列</option>
                    <option value="random">选项随机排列</option>
                  </select>
                  <select
                    value={(config.layout as string) ?? 'vertical'}
                    onChange={(e) => setChoiceConfig({ layout: e.target.value })}
                    className="inline-block w-32 shrink-0 rounded border border-gray-300 bg-white px-2 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    title="选项排列"
                  >
                    <option value="vertical">选项竖排</option>
                    <option value="horizontal">选项横排</option>
                  </select>
                </>
              )}
              <button
                type="button"
                onClick={onFinishEdit}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
                style={{ borderRadius: 2 }}
              >
                <i className="fas fa-check text-[11px] opacity-90" />
                <span>完成编辑</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="edit-question-preview hover:bg-gray-50/50 relative">
          <div
            data-no-edit
            className="absolute top-0 left-0 right-0 flex justify-center pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-[1]"
          >
            <button
              type="button"
              className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none rounded hover:bg-gray-100/80"
              title="拖拽排序"
              {...attributes}
              {...listeners}
            >
              <i className="fas fa-grip-vertical text-sm" />
            </button>
          </div>
          <QuestionFillPreview question={question} index={index} />
          <div
            data-no-edit
            className="edit-question-actions absolute right-5 bottom-5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10"
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              style={{ borderRadius: 2 }}
            >
              <i className="fas fa-pen text-[11px] opacity-90" />
              <span>编辑</span>
            </button>
            <button type="button" onClick={onCopy} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors" style={{ borderRadius: 2 }}>
              <i className="fas fa-copy text-[11px] opacity-70" />
              <span>复制</span>
            </button>
            <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50 hover:border-red-200 transition-colors" style={{ borderRadius: 2 }}>
              <i className="fas fa-trash-alt text-[11px] opacity-70" />
              <span>删除</span>
            </button>
            {canMoveUp && (
              <>
                <button type="button" onClick={onMoveUp} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors" style={{ borderRadius: 2 }}>
                  <i className="fas fa-chevron-up text-[11px] opacity-70" />
                  <span>上移</span>
                </button>
                <button type="button" onClick={onMoveFirst} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors" style={{ borderRadius: 2 }}>
                  <i className="fas fa-angles-up text-[11px] opacity-70" />
                  <span>最前</span>
                </button>
              </>
            )}
            {canMoveDown && (
              <>
                <button type="button" onClick={onMoveDown} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors" style={{ borderRadius: 2 }}>
                  <i className="fas fa-chevron-down text-[11px] opacity-70" />
                  <span>下移</span>
                </button>
                <button type="button" onClick={onMoveLast} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors" style={{ borderRadius: 2 }}>
                  <i className="fas fa-angles-down text-[11px] opacity-70" />
                  <span>最后</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SortableOptionRow({
  questionType,
  index,
  opt,
  onOptionChange,
  onInsertAfter,
  onRemove,
  onOpenLabelEditor,
  onOpenDescriptionEditor,
  onOpenImageEditor,
  onTogglePreviewSelected,
  previewSelected,
  onToggleDefault,
  isDefault,
  compact = false,
}: {
  questionType: string
  index: number
  opt: OptionItem
  onOptionChange: (patch: Partial<OptionItem>) => void
  onInsertAfter: () => void
  onRemove: () => void
  onOpenLabelEditor: () => void
  onOpenDescriptionEditor: () => void
  onOpenImageEditor: () => void
  onTogglePreviewSelected: () => void
  previewSelected: boolean
  onToggleDefault: () => void
  isDefault: boolean
  compact?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `opt-${index}` })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const isMultipleChoice = questionType === 'MULTIPLE_CHOICE'
  const itemClassName = isMultipleChoice
    ? 'sd-item sd-checkbox sd-selectbase__item sv-q-col-1'
    : 'sd-item sd-radio sd-selectbase__item sv-q-col-1'
  const itemCheckedClassName = isMultipleChoice
    ? 'sd-item--checked sd-checkbox--checked'
    : 'sd-item--checked sd-radio--checked'
  const decoratorClassName = isMultipleChoice ? 'sd-checkbox__decorator' : 'sd-radio__decorator'
  const inputControlClassName = isMultipleChoice
    ? 'sd-visuallyhidden sd-item__control sd-checkbox__control'
    : 'sd-visuallyhidden sd-item__control sd-radio__control'
  const controlId = `edit-opt-${questionType}-${index}`
  const actionButtonClass = (active = false, danger = false) =>
    [
      'option-row-action-btn inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-[12px] transition-colors',
      danger
        ? 'border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300'
        : active
          ? 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100'
          : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700',
    ].join(' ')
  const iconClassName = 'h-4 w-4'

  const mainRow = (
    <div
      className={[
        'flex items-center gap-1.5 py-0',
        opt.hidden === true ? 'opacity-70' : '',
      ].join(' ')}
    >
      <button
        type="button"
        className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none shrink-0"
        title="拖拽排序"
        {...attributes}
        {...listeners}
      >
        <i className="fas fa-grip-vertical text-xs" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="sd-selectbase">
          <div className={[itemClassName, previewSelected ? itemCheckedClassName : ''].join(' ')}>
            <label
              className="sd-selectbase__label"
            >
              <input
                id={controlId}
                type={isMultipleChoice ? 'checkbox' : 'radio'}
                checked={previewSelected}
                className={inputControlClassName}
                onChange={onTogglePreviewSelected}
              />
              <span className={`sd-item__decorator ${decoratorClassName}`} />
              <span className={`sd-item__control-label ${opt.hidden === true ? 'line-through' : ''}`}>
                <span className="sv-string-viewer">{getOptionPlainLabel(opt, index)}</span>
              </span>
            </label>
          </div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <button type="button" onClick={onOpenLabelEditor} className={actionButtonClass()} title="编辑选项文字">
          <SquarePen className={iconClassName} />
        </button>
        <button
          type="button"
          onClick={onOpenDescriptionEditor}
          className={actionButtonClass(Boolean(opt.description?.trim()))}
          title="编辑说明"
        >
          <AlignLeft className={iconClassName} />
        </button>
        <button type="button" onClick={onInsertAfter} className={actionButtonClass()} title="在下方插入选项">
          <Plus className={iconClassName} />
        </button>
        <button type="button" onClick={onRemove} className={actionButtonClass(false, true)} title="删除选项">
          <Trash2 className={iconClassName} />
        </button>
        <button
          type="button"
          onClick={onOpenImageEditor}
          className={actionButtonClass(Boolean(opt.imageData || opt.imageUrl))}
          title="编辑图片"
        >
          <ImageIcon className={iconClassName} />
        </button>
        <button
          type="button"
          onClick={() => onOptionChange({ allowFill: opt.allowFill !== true })}
          className={actionButtonClass(opt.allowFill === true)}
          title="允许填空"
        >
          <Keyboard className={iconClassName} />
        </button>
        <button
          type="button"
          onClick={onToggleDefault}
          className={actionButtonClass(isDefault)}
          title="设为默认"
        >
          <Star className={[iconClassName, isDefault ? 'fill-current' : ''].join(' ')} />
        </button>
        <button
          type="button"
          onClick={() => onOptionChange({ hidden: opt.hidden !== true })}
          className={actionButtonClass(opt.hidden === true)}
          title={opt.hidden === true ? '取消隐藏' : '隐藏选项'}
        >
          <EyeOff className={iconClassName} />
        </button>
      </div>
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[compact ? 'py-0' : 'mb-1', isDragging ? ' opacity-50' : ''].join(' ')}
    >
      {mainRow}
    </div>
  )
}

function OptionEditDialog({
  open,
  title,
  onClose,
  onSave,
  saveText = '保存',
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  onSave: () => void
  saveText?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-3xl max-h-[90vh] rounded-xl border border-gray-200 shadow-lg flex flex-col overflow-hidden bg-white focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 left-0 w-full bg-white border-b border-gray-100 z-20 px-6 pt-6 pb-3 flex items-center min-h-[56px]">
          <div className="flex-1">
            <h2 className="text-lg font-semibold leading-none tracking-tight text-left text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none !bg-transparent hover:!bg-transparent focus:!bg-transparent active:!bg-transparent"
            aria-label="关闭"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-gray-400"
            >
              <path d="M15 5 5 15" />
              <path d="m5 5 10 10" />
            </svg>
            <span className="sr-only">关闭</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-sm"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            {saveText}
          </button>
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
  const [editingId, setEditingId] = useState<number | null>(null)
  const confirmedForQuestion = useRef<number | null>(null)

  useEffect(() => {
    if (!id) return
    surveysApi
      .getDetail(id)
      .then((res: ApiResponse<SurveyDetailVO>) => {
        if (res?.data) {
          setSurvey(res.data)
          if (res.data.questions?.length) {
            setEditingId(res.data.questions[0]?.id ?? null)
          }
          confirmedForQuestion.current = null
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

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

  const handleAddQuestionByType = (type: string) => {
    if (!id) return
    surveysApi
      .addQuestion(id, {
        type,
        title: getDefaultTitleForType(type),
        required: true,
        config: getDefaultConfigForType(type),
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
          setEditingId(res.data!.id!)
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
    setSurvey((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        questions: prev.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
      }
    })
    surveysApi.updateQuestion(id, qId, patch).catch((e) => {
      alert(e?.response?.data?.message || '保存失败')
      surveysApi
        .getDetail(id)
        .then((res: ApiResponse<SurveyDetailVO>) => {
          if (res?.data) setSurvey(res.data)
        })
        .catch(() => {})
    })
  }

  const handleDeleteQuestion = (qId: number) => {
    if (!id || !survey) return
    const needConfirm = survey.status === 'COLLECTING' || survey.status === 'PAUSED'
    const msg = needConfirm ? '修改题目会影响已回收数据与统计，确定删除该题？' : '确定删除该题？'
    if (!window.confirm(msg)) return
    surveysApi.deleteQuestion(id, qId).then(() => {
      const next = survey.questions.filter((q) => q.id !== qId)
      const nextEditingId =
        editingId === qId ? next[0]?.id ?? null : editingId
      setSurvey({ ...survey, questions: next })
      setEditingId(nextEditingId ?? null)
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
          if (detailRes?.data) setSurvey(detailRes.data)
        })
      }
    })
  }

  const applyReorder = (newOrder: number[]) => {
    if (!survey) return
    const needConfirm = survey.status === 'COLLECTING' || survey.status === 'PAUSED'
    if (needConfirm && !window.confirm('调整题目顺序会影响已回收数据与统计，是否继续？')) return
    surveysApi.updateQuestionOrder(id!, newOrder).then(() => {
      const reordered = newOrder.map((oid) => survey!.questions!.find((q) => q.id === oid)!).filter(Boolean)
      setSurvey({ ...survey!, questions: reordered })
    })
  }

  const handleMoveQuestionUp = (index: number) => {
    if (!survey?.questions?.length || index <= 0) return
    const ids = survey.questions.map((q) => q.id!).filter(Boolean)
    const next = arrayMove(ids, index, index - 1)
    applyReorder(next)
  }
  const handleMoveQuestionDown = (index: number) => {
    if (!survey?.questions?.length || index >= survey.questions.length - 1) return
    const ids = survey.questions.map((q) => q.id!).filter(Boolean)
    const next = arrayMove(ids, index, index + 1)
    applyReorder(next)
  }
  const handleMoveQuestionFirst = (index: number) => {
    if (!survey?.questions?.length || index <= 0) return
    const ids = survey.questions.map((q) => q.id!).filter(Boolean)
    const next = arrayMove(ids, index, 0)
    applyReorder(next)
  }
  const handleMoveQuestionLast = (index: number) => {
    if (!survey?.questions?.length || index >= survey.questions.length - 1) return
    const ids = survey.questions.map((q) => q.id!).filter(Boolean)
    const next = arrayMove(ids, index, ids.length - 1)
    applyReorder(next)
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
          <a
            href={`/fill/${id}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-sm"
          >
            预览
          </a>
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
        <div className="w-56 shrink-0 bg-white rounded-lg shadow-card p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">题型</div>
          <p className="text-xs text-gray-500 mb-3">点击题型添加题目</p>
          <div className="space-y-1">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleAddQuestionByType(t.value)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-sm transition-colors text-left"
              >
                <i className={`fas ${t.icon} w-4 text-gray-400`} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <DndContext
            sensors={questionSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleQuestionDragEnd}
          >
            <SortableContext items={questionSortableIds} strategy={verticalListSortingStrategy}>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {survey.questions?.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 border-b border-gray-200">
                    暂无题目，从左侧点击题型添加
                  </div>
                ) : (
                  survey.questions?.map((q, i) => {
                    const typeLabel = TYPES.find((t) => t.value === q.type)?.label ?? q.type
                    return (
                      <SortableQuestionCard
                        key={q.id}
                        question={q}
                        index={i}
                        totalCount={survey.questions?.length ?? 0}
                        surveyId={id}
                        typeLabel={typeLabel}
                        isEditing={editingId === q.id}
                        onStartEdit={() => setEditingId(q.id ?? null)}
                        onUpdate={(patch) => handleUpdateQuestion(q.id!, patch)}
                        onDelete={() => handleDeleteQuestion(q.id!)}
                        onCopy={() => handleCopyQuestion(q.id!)}
                        onMoveUp={() => handleMoveQuestionUp(i)}
                        onMoveDown={() => handleMoveQuestionDown(i)}
                        onMoveFirst={() => handleMoveQuestionFirst(i)}
                        onMoveLast={() => handleMoveQuestionLast(i)}
                        onFinishEdit={() => setEditingId(null)}
                      />
                    )
                  })
                )}
              </div>
            </SortableContext>
          </DndContext>
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
  hideActions = false,
  cardHeader,
  compact = false,
}: {
  surveyId: string
  question: SurveyQuestionVO
  onUpdate: (patch: Partial<SurveyQuestionVO>) => void
  onDelete: () => void
  onCopy: () => void
  hideActions?: boolean
  cardHeader?: { index: number; typeLabel: string }
  compact?: boolean
}) {
  const config = parseConfig(question.config)
  const options = getOptions(config)
  const [showBatchAdd, setShowBatchAdd] = useState(false)
  const [batchAddText, setBatchAddText] = useState('')
  const [presetTree, setPresetTree] = useState<PresetOptionCategoryVO[] | null>(null)
  const [presetLoading, setPresetLoading] = useState(false)
  const [presetLoadError, setPresetLoadError] = useState<string | null>(null)
  const [optionDialog, setOptionDialog] = useState<{ index: number; mode: 'label' | 'description' | 'image' } | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [descriptionPopupDraft, setDescriptionPopupDraft] = useState(false)
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const [imageDataDraft, setImageDataDraft] = useState<string | undefined>(undefined)
  const [previewSelectedIndices, setPreviewSelectedIndices] = useState<number[]>(() => {
    if (question.type === 'SINGLE_CHOICE') {
      return typeof config.defaultOptionIndex === 'number' ? [config.defaultOptionIndex] : []
    }
    if (question.type === 'MULTIPLE_CHOICE') {
      return Array.isArray(config.defaultOptionIndices)
        ? (config.defaultOptionIndices as number[]).filter((x) => Number.isInteger(x))
        : []
    }
    return []
  })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    if (question.type === 'SINGLE_CHOICE') {
      setPreviewSelectedIndices(typeof config.defaultOptionIndex === 'number' ? [config.defaultOptionIndex] : [])
      return
    }
    if (question.type === 'MULTIPLE_CHOICE') {
      setPreviewSelectedIndices(
        Array.isArray(config.defaultOptionIndices)
          ? (config.defaultOptionIndices as number[]).filter((x) => Number.isInteger(x))
          : []
      )
      return
    }
    setPreviewSelectedIndices([])
  }, [question.id, question.type])

  useEffect(() => {
    if (!showBatchAdd) return
    if (presetTree || presetLoading) return
    setPresetLoading(true)
    setPresetLoadError(null)
    presetOptionsApi
      .getTree()
      .then((res) => {
        if (res?.code === 200) setPresetTree(res.data ?? [])
        else setPresetLoadError(res?.message || '加载预定义选项失败')
      })
      .catch((e) => setPresetLoadError(e?.response?.data?.message || '加载预定义选项失败'))
      .finally(() => setPresetLoading(false))
  }, [showBatchAdd, presetTree, presetLoading])

  const setConfigPatch = (patch: Record<string, unknown>) => {
    const next = { ...config, ...patch }
    onUpdate({ config: JSON.stringify(next) })
  }

  const setConfig = (key: string, value: unknown) => {
    setConfigPatch({ [key]: value })
  }

  const setOptions = (opts: OptionItem[]) => {
    setConfig('options', opts.map((opt, i) => ({ ...opt, sortOrder: i })))
  }

  const getDefaultConfigPatch = (updater: (current: number | number[] | undefined) => number | number[] | undefined) => {
    if (question.type === 'SINGLE_CHOICE') {
      return { defaultOptionIndex: updater(config.defaultOptionIndex as number | undefined) }
    }
    if (question.type === 'MULTIPLE_CHOICE') {
      return { defaultOptionIndices: updater(config.defaultOptionIndices as number[] | undefined) }
    }
    return {}
  }

  const isDefaultOption = (index: number) =>
    question.type === 'SINGLE_CHOICE'
      ? config.defaultOptionIndex === index
      : Array.isArray(config.defaultOptionIndices) && config.defaultOptionIndices.includes(index)

  const isPreviewSelected = (index: number) => previewSelectedIndices.includes(index)

  const togglePreviewSelected = (index: number) => {
    if (question.type === 'MULTIPLE_CHOICE') {
      setPreviewSelectedIndices((prev) =>
        prev.includes(index) ? prev.filter((x) => x !== index) : [...prev, index].sort((a, b) => a - b)
      )
      return
    }
    setPreviewSelectedIndices([index])
  }

  const toggleDefaultOption = (index: number) => {
    if (question.type === 'SINGLE_CHOICE') {
      setConfig('defaultOptionIndex', config.defaultOptionIndex === index ? undefined : index)
      return
    }
    if (question.type === 'MULTIPLE_CHOICE') {
      const current = (config.defaultOptionIndices as number[] | undefined) ?? []
      const next = current.includes(index) ? current.filter((x) => x !== index) : [...current, index].sort((a, b) => a - b)
      setConfig('defaultOptionIndices', next.length ? next : undefined)
    }
  }

  const patchOptionAt = (index: number, patch: Partial<OptionItem>) => {
    const next = options.slice()
    next[index] = { ...next[index], ...patch }
    const nextPatch: Record<string, unknown> = {
      options: next.map((opt, i) => ({ ...opt, sortOrder: i })),
    }
    if (patch.hidden === true) {
      Object.assign(nextPatch, getDefaultConfigPatch((current) => {
        if (typeof current === 'number') return current === index ? undefined : current
        if (Array.isArray(current)) {
          const filtered = current.filter((x) => x !== index)
          return filtered.length ? filtered : undefined
        }
        return current
      }))
    }
    setConfigPatch(nextPatch)
  }

  const addOptionAt = (index: number | null, patch?: Partial<OptionItem>) => {
    const insertIndex = index == null ? options.length : index
    const next = options.slice()
    next.splice(insertIndex, 0, {
      sortOrder: insertIndex,
      label: `选项${options.length + 1}`,
      ...patch,
    })
    setConfigPatch({
      options: next.map((opt, i) => ({ ...opt, sortOrder: i })),
      ...getDefaultConfigPatch((current) => {
      if (typeof current === 'number') return current >= insertIndex ? current + 1 : current
      if (Array.isArray(current)) return current.map((x) => (x >= insertIndex ? x + 1 : x))
      return current
      }),
    })
    setPreviewSelectedIndices((prev) => prev.map((x) => (x >= insertIndex ? x + 1 : x)))
  }

  const removeOptionAt = (index: number) => {
    const next = options.filter((_, i) => i !== index)
    setConfigPatch({
      options: next.map((opt, i) => ({ ...opt, sortOrder: i })),
      ...getDefaultConfigPatch((current) => {
      if (typeof current === 'number') {
        if (current === index) return undefined
        return current > index ? current - 1 : current
      }
      if (Array.isArray(current)) {
        const filtered = current
          .filter((x) => x !== index)
          .map((x) => (x > index ? x - 1 : x))
        return filtered.length ? filtered : undefined
      }
      return current
      }),
    })
    setPreviewSelectedIndices((prev) => prev.filter((x) => x !== index).map((x) => (x > index ? x - 1 : x)))
  }

  const reorderOptions = (oldIndex: number, newIndex: number) => {
    const moveIndex = (value: number) => {
      if (value === oldIndex) return newIndex
      if (oldIndex < newIndex && value > oldIndex && value <= newIndex) return value - 1
      if (oldIndex > newIndex && value >= newIndex && value < oldIndex) return value + 1
      return value
    }
    const reordered = arrayMove(options, oldIndex, newIndex)
    setConfigPatch({
      options: reordered.map((opt, i) => ({ ...opt, sortOrder: i })),
      ...getDefaultConfigPatch((current) => {
        if (typeof current === 'number') return moveIndex(current)
        if (Array.isArray(current)) return current.map(moveIndex).sort((a, b) => a - b)
        return current
      }),
    })
    setPreviewSelectedIndices((prev) => prev.map(moveIndex).sort((a, b) => a - b))
  }

  const openOptionDialog = (index: number, mode: 'label' | 'description' | 'image') => {
    const opt = options[index]
    if (!opt) return
    setOptionDialog({ index, mode })
    setLabelDraft(opt.label ?? '')
    setDescriptionDraft(opt.description ?? '')
    setDescriptionPopupDraft(opt.descriptionOpenInPopup === true)
    setImageUrlDraft(opt.imageUrl ?? '')
    setImageDataDraft(opt.imageData)
  }

  const closeOptionDialog = () => {
    setOptionDialog(null)
    setLabelDraft('')
    setDescriptionDraft('')
    setDescriptionPopupDraft(false)
    setImageUrlDraft('')
    setImageDataDraft(undefined)
  }

  const saveOptionDialog = () => {
    if (!optionDialog) return
    if (optionDialog.mode === 'label') {
      patchOptionAt(optionDialog.index, { label: labelDraft || `选项${optionDialog.index + 1}` })
    } else if (optionDialog.mode === 'description') {
      patchOptionAt(optionDialog.index, {
        description: descriptionDraft.trim() || undefined,
        descriptionOpenInPopup: descriptionDraft.trim() ? descriptionPopupDraft : undefined,
      })
    } else if (optionDialog.mode === 'image') {
      patchOptionAt(optionDialog.index, {
        imageUrl: imageUrlDraft.trim() || undefined,
        imageData: imageDataDraft,
      })
    }
    closeOptionDialog()
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

  const compactInputClass = 'block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

  const typeLabel = TYPES.find((t) => t.value === question.type)?.label ?? question.type
  const activeDialogOption = optionDialog ? options[optionDialog.index] : null

  const optionDialogNode = (
    <OptionEditDialog
      open={optionDialog != null}
      title={
        optionDialog?.mode === 'label'
          ? '编辑选项文字'
          : optionDialog?.mode === 'description'
            ? '编辑选项说明'
            : '编辑选项图片'
      }
      onClose={closeOptionDialog}
      onSave={saveOptionDialog}
    >
      {optionDialog?.mode === 'label' && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500">支持富文本，用于该选项在题目中的展示文字。</div>
          <RichTitleEditor
            value={labelDraft}
            onChange={setLabelDraft}
            placeholder={`选项${(optionDialog?.index ?? 0) + 1}`}
          />
        </div>
      )}
      {optionDialog?.mode === 'description' && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>说明文字或链接</label>
            <input
              type="text"
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              className={inputClass}
              placeholder="说明文字或链接 https://..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={descriptionPopupDraft}
              onChange={(e) => setDescriptionPopupDraft(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            链接点击时弹窗打开
          </label>
        </div>
      )}
      {optionDialog?.mode === 'image' && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>图片外链</label>
            <input
              type="text"
              value={imageUrlDraft}
              onChange={(e) => setImageUrlDraft(e.target.value)}
              className={inputClass}
              placeholder="图片外链 https://..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer text-sm">
              本地上传
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
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
                    if (data?.startsWith('data:image/')) setImageDataDraft(data)
                  }
                  reader.readAsDataURL(file)
                }}
              />
            </label>
            {(imageDataDraft || imageUrlDraft || activeDialogOption?.imageData || activeDialogOption?.imageUrl) && (
              <>
                <img
                  src={imageDataDraft || imageUrlDraft || activeDialogOption?.imageData || activeDialogOption?.imageUrl}
                  alt=""
                  className="h-16 w-16 object-cover border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageDataDraft(undefined)
                    setImageUrlDraft('')
                  }}
                  className="text-red-600 hover:bg-red-50 px-3 py-2 rounded text-sm"
                >
                  清除图片
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500">外链与上传二选一或只填其一；上传 &lt;512KB，支持 jpg/png/gif/webp</p>
        </div>
      )}
    </OptionEditDialog>
  )

  const optionsEditor = (
    <div style={flatLightThemeStyle}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event
          if (!over || active.id === over.id) return
          const oldI = Number(String(active.id).replace(/^opt-/, ''))
          const newI = Number(String(over.id).replace(/^opt-/, ''))
          if (Number.isNaN(oldI) || Number.isNaN(newI)) return
          reorderOptions(oldI, newI)
        }}
      >
        <SortableContext items={options.map((_, i) => `opt-${i}`)} strategy={verticalListSortingStrategy}>
          {options.map((opt, i) => (
            <SortableOptionRow
              key={i}
              questionType={question.type}
              index={i}
              opt={opt}
              onOptionChange={(patch) => patchOptionAt(i, patch)}
              onInsertAfter={() => addOptionAt(i + 1)}
              onRemove={() => removeOptionAt(i)}
              onOpenLabelEditor={() => openOptionDialog(i, 'label')}
              onOpenDescriptionEditor={() => openOptionDialog(i, 'description')}
              onOpenImageEditor={() => openOptionDialog(i, 'image')}
              onTogglePreviewSelected={() => togglePreviewSelected(i)}
              previewSelected={isPreviewSelected(i)}
              onToggleDefault={() => toggleDefaultOption(i)}
              isDefault={isDefaultOption(i)}
              compact={compact}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? 'pt-0.5 border-t border-gray-100' : ''}`}>
        <button
          type="button"
          onClick={() => addOptionAt(null)}
          className="text-blue-600 hover:underline text-sm"
        >
          添加选项
        </button>
        <button
          type="button"
          onClick={() => addOptionAt(null, { label: '其他', allowFill: true })}
          className="text-blue-600 hover:underline text-sm"
        >
          添加「其他」
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
        <div className={`mt-3 ${compact ? 'p-3 bg-white' : 'p-4 bg-gray-50'} rounded-lg border border-gray-200`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className={compact ? 'text-xs text-gray-600 mb-1' : labelClass}>每行一个选项，可直接粘贴 Excel 列或文本</label>
              <textarea
                value={batchAddText}
                onChange={(e) => setBatchAddText(e.target.value)}
                className={(compact ? compactInputClass : inputClass) + ' mt-1'}
                rows={compact ? 4 : 6}
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
            <div>
              <div className="text-sm font-medium text-gray-700 mb-3">预定义选项</div>
              {!compact && <p className="text-xs text-gray-500 mb-3">点击按钮将选项写入左侧文本框，再点「确定添加」生效。</p>}
              {presetLoading ? (
                <div className="text-sm text-gray-500">加载中...</div>
              ) : presetLoadError ? (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">{presetLoadError}</div>
              ) : !presetTree?.length ? (
                <div className="text-sm text-gray-500">暂无预定义选项</div>
              ) : (
                <div className={compact ? 'grid grid-cols-4 gap-1.5 max-h-32 overflow-auto' : 'max-h-[260px] overflow-auto'}>
                  <div className={compact ? '' : 'grid grid-cols-4 gap-2'}>
                    {presetTree.flatMap((cat) =>
                      (cat.groups ?? []).map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            const lines = (g.items ?? [])
                              .map((it) => stripHtml(it.label ?? '').trim())
                              .filter((s) => s.length > 0)
                              .join('\n')
                            if (!lines) return
                            setBatchAddText(lines)
                          }}
                          className={compact ? 'px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-xs truncate' : 'px-2 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-sm text-center truncate'}
                          title={`${cat.category} - ${g.name}`}
                        >
                          {g.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex-1 min-w-[200px]">
            <RichTitleEditor
              value={question.title ?? ''}
              onChange={(html) => onUpdate({ title: html })}
              placeholder="问题名称"
              className="rich-title-quill--compact"
            />
          </div>
        </div>
        {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && (
          <>
            {optionsEditor}
            {question.type === 'MULTIPLE_CHOICE' && (
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">最少选</span>
                <input type="number" min={0} value={getInt(config, 'minChoices', 0)} onChange={(e) => setConfig('minChoices', parseInt(e.target.value, 10) || 0)} className={compactInputClass + ' w-16'} />
                <span className="text-gray-600">最多选</span>
                <input type="number" min={1} value={config.maxChoices === undefined || config.maxChoices === null ? '' : Number(config.maxChoices)} onChange={(e) => setConfig('maxChoices', e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 1)} className={compactInputClass + ' w-16'} placeholder="不限" />
              </div>
            )}
          </>
        )}
        {(question.type === 'SHORT_TEXT' || question.type === 'LONG_TEXT') && (
          <div className="flex flex-wrap gap-3 text-sm">
            <input type="text" value={(config.placeholder as string) ?? ''} onChange={(e) => setConfig('placeholder', e.target.value)} className={compactInputClass + ' flex-1 min-w-[120px]'} placeholder="占位提示" />
            <select value={(config.validationType as string) ?? 'none'} onChange={(e) => setConfig('validationType', e.target.value)} className={compactInputClass + ' w-24'}><option value="none">无校验</option><option value="number">数字</option><option value="email">邮箱</option><option value="phone">手机</option></select>
          </div>
        )}
        {question.type === 'SCALE' && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <input type="number" value={(config.scaleMin as number) ?? 1} onChange={(e) => setConfig('scaleMin', parseInt(e.target.value, 10) || 1)} className={compactInputClass + ' w-16'} />
            <span className="text-gray-500">至</span>
            <input type="number" value={(config.scaleMax as number) ?? 5} onChange={(e) => setConfig('scaleMax', parseInt(e.target.value, 10) || 5)} className={compactInputClass + ' w-16'} />
            <input type="text" value={(config.scaleLeftLabel as string) ?? ''} onChange={(e) => setConfig('scaleLeftLabel', e.target.value)} className={compactInputClass + ' w-24'} placeholder="左端点" />
            <input type="text" value={(config.scaleRightLabel as string) ?? ''} onChange={(e) => setConfig('scaleRightLabel', e.target.value)} className={compactInputClass + ' w-24'} placeholder="右端点" />
          </div>
        )}
        {optionDialogNode}
      </div>
    )
  }

  return (
    <div>
      {cardHeader && (
        <div className="mb-3 pb-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-500">
            #{cardHeader.index}. {cardHeader.typeLabel}
          </span>
        </div>
      )}
      <div className="mb-4">
        <label className={labelClass}>题目标题</label>
        <RichTitleEditor
          value={question.title ?? ''}
          onChange={(html) => onUpdate({ title: html })}
          placeholder="问题名称"
          className="mt-1"
        />
      </div>
      <div className="mb-4">
        <label className={labelClass}>题型</label>
        <p className="text-sm text-gray-600 mt-1">{typeLabel}</p>
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">选项顺序：</span>
              <select
                value={config.optionsRandom === true ? 'random' : 'fixed'}
                onChange={(e) => setConfig('optionsRandom', e.target.value === 'random')}
                className={inputClass + ' w-36 py-1'}
              >
                <option value="fixed">选项不随机排列</option>
                <option value="random">选项随机排列</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">排列：</span>
              <select
                value={(config.layout as string) ?? 'vertical'}
                onChange={(e) => setConfig('layout', e.target.value)}
                className={inputClass + ' w-28 py-1'}
              >
                <option value="vertical">竖向排列</option>
                <option value="horizontal">横向排列</option>
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
          <label className={labelClass}>选项（拖拽排序）</label>
          {optionsEditor}
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
      {!hideActions && (
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
      )}
      {optionDialogNode}
    </div>
  )
}
