'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { surveysApi, type SurveyDetailVO, type UpdateSettingsDTO, type ApiResponse } from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

export default function SettingsPage() {
  const params = useParams()
  const id = params.id as string
  const [survey, setSurvey] = useState<SurveyDetailVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [limitOnce, setLimitOnce] = useState(true)
  const [allowAnonymous, setAllowAnonymous] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [thankYouText, setThankYouText] = useState('')
  const [limitByIp, setLimitByIp] = useState(0)
  const [limitByDevice, setLimitByDevice] = useState(0)

  useEffect(() => {
    if (!id) return
    surveysApi
      .getDetail(id)
      .then((res: ApiResponse<SurveyDetailVO>) => {
        if (res?.data) {
          setSurvey(res.data)
          setTitle(res.data.title ?? '')
          setDescription(res.data.description ?? '')
          setLimitOnce(res.data.limitOncePerUser !== false)
          setAllowAnonymous(res.data.allowAnonymous === true)
          setStartTime(res.data.startTime ? res.data.startTime.slice(0, 16) : '')
          setEndTime(res.data.endTime ? res.data.endTime.slice(0, 16) : '')
          setThankYouText(res.data.thankYouText ?? '')
          setLimitByIp(res.data.limitByIp ?? 0)
          setLimitByDevice(res.data.limitByDevice ?? 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = () => {
    if (!id) return
    setSaving(true)
    const dto: UpdateSettingsDTO = {
      limitOncePerUser: limitOnce,
      allowAnonymous,
      startTime: startTime ? `${startTime}:00` : null,
      endTime: endTime ? `${endTime}:00` : null,
      thankYouText: thankYouText || null,
      limitByIp: limitByIp <= 0 ? null : limitByIp,
      limitByDevice: limitByDevice <= 0 ? null : limitByDevice,
    }
    Promise.all([
      surveysApi.updateBasic(id, { title, description }),
      surveysApi.updateSettings(id, dto),
    ])
      .then(() => {
        if (survey) setSurvey({ ...survey, title, description })
        setSaving(false)
      })
      .catch(() => setSaving(false))
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">问卷设置</h1>
      <div className="mb-4 flex gap-2 items-center text-sm text-gray-600">
        <Link href="/surveys" className="text-blue-600 hover:underline">
          我的问卷
        </Link>
        <span className="text-gray-400">/</span>
        <Link href={`/surveys/${id}/edit`} className="text-blue-600 hover:underline whitespace-pre-line">
          {survey.title || '未命名问卷'}
        </Link>
        <span className="text-gray-400">/</span>
        <span>设置</span>
      </div>
      <div className="bg-white rounded-lg shadow-card p-8 space-y-6">
        <div>
          <label htmlFor="settings-survey-title" className={labelClass}>问卷标题</label>
          <textarea
            id="settings-survey-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            rows={2}
            placeholder="未命名问卷，支持换行（第一行为主标题）"
          />
        </div>
        <div>
          <label htmlFor="settings-survey-desc" className={labelClass}>问卷说明</label>
          <textarea
            id="settings-survey-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            rows={3}
            placeholder="选填，填写前展示给填写人"
          />
        </div>
        <hr className="border-gray-200" />
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={limitOnce}
              onChange={(e) => setLimitOnce(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            每人限填一次
          </label>
          <p className="text-sm text-gray-500 mt-1 ml-6">开启后仅登录用户可填，且每个用户只能提交一次</p>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={allowAnonymous}
              onChange={(e) => setAllowAnonymous(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            允许匿名填写
          </label>
          <p className="text-sm text-gray-500 mt-1 ml-6">匿名时不记录填写人</p>
        </div>
        <div>
          <label className={labelClass}>开始时间（选填）</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>结束时间（选填）</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>感谢语（提交成功后展示）</label>
          <textarea
            value={thankYouText}
            onChange={(e) => setThankYouText(e.target.value)}
            className={inputClass}
            rows={3}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>每 IP 限填次数（0=不限制）</label>
            <input
              type="number"
              min={0}
              value={limitByIp}
              onChange={(e) => setLimitByIp(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className={inputClass + ' w-32'}
            />
          </div>
          <div>
            <label className={labelClass}>每设备限填次数（0=不限制）</label>
            <input
              type="number"
              min={0}
              value={limitByDevice}
              onChange={(e) => setLimitByDevice(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className={inputClass + ' w-32'}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <Link
            href={`/surveys/${id}/edit`}
            className="px-5 py-2 rounded-lg font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
          >
            取消
          </Link>
        </div>
      </div>
    </div>
  )
}
