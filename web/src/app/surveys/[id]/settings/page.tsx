'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { surveysApi, type SurveyDetailVO, type UpdateSettingsDTO, type ApiResponse } from '@/services/api'

export default function SettingsPage() {
  const params = useParams()
  const id = Number(params.id)
  const [survey, setSurvey] = useState<SurveyDetailVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [limitOnce, setLimitOnce] = useState(true)
  const [allowAnonymous, setAllowAnonymous] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [thankYouText, setThankYouText] = useState('')
  const [fillUrl, setFillUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    surveysApi
      .getDetail(id)
      .then((res: ApiResponse<SurveyDetailVO>) => {
        if (res?.data) {
          setSurvey(res.data)
          setLimitOnce(res.data.limitOncePerUser !== false)
          setAllowAnonymous(res.data.allowAnonymous === true)
          setStartTime(res.data.startTime ? res.data.startTime.slice(0, 16) : '')
          setEndTime(res.data.endTime ? res.data.endTime.slice(0, 16) : '')
          setThankYouText(res.data.thankYouText ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    surveysApi.getFillUrl(id).then((res) => {
      const path = res?.data?.fillUrl ?? `/fill/${id}`
      setFillUrl(typeof window !== 'undefined' ? `${window.location.origin}${path}` : path)
    })
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
    }
    surveysApi
      .updateSettings(id, dto)
      .then(() => setSaving(false))
      .catch(() => setSaving(false))
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(fillUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading || !survey) {
    return (
      <div>
        <p className="text-gray-500">加载中...</p>
        <Link href="/surveys" className="text-blue-600 hover:underline mt-2 inline-block">
          返回列表
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/surveys" className="text-blue-600 hover:underline">
          我的问卷
        </Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link href={`/surveys/${id}/edit`} className="text-blue-600 hover:underline">
          {survey.title}
        </Link>
        <span className="text-gray-400 mx-2">/</span>
        <span>设置</span>
      </div>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={limitOnce}
              onChange={(e) => setLimitOnce(e.target.checked)}
            />
            每人限填一次
          </label>
          <p className="text-sm text-gray-500 mt-1">开启后仅登录用户可填，且每个用户只能提交一次</p>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowAnonymous}
              onChange={(e) => setAllowAnonymous(e.target.checked)}
            />
            允许匿名填写
          </label>
          <p className="text-sm text-gray-500 mt-1">匿名时不记录填写人</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">开始时间（选填）</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">结束时间（选填）</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">感谢语（提交成功后展示）</label>
          <textarea
            value={thankYouText}
            onChange={(e) => setThankYouText(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            rows={3}
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <hr />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">填写链接</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={fillUrl}
              className="flex-1 border rounded px-3 py-2 bg-gray-50 text-sm"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              {copied ? '已复制' : '复制链接'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
