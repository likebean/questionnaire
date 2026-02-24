'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  surveysApi,
  type SurveyDetailVO,
  type AnalyticsResponse,
  type AnalyticsQuestionVO,
  type ApiResponse,
} from '@/services/api'

export default function AnalyticsPage() {
  const params = useParams()
  const id = Number(params.id)
  const [survey, setSurvey] = useState<SurveyDetailVO | null>(null)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!id) return
    surveysApi.getDetail(id).then((res: ApiResponse<SurveyDetailVO>) => {
      if (res?.data) setSurvey(res.data)
    })
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    surveysApi
      .getAnalytics(id)
      .then((res: ApiResponse<AnalyticsResponse>) => {
        if (res?.data) setData(res.data)
      })
      .catch(() => setData({ questions: [] }))
      .finally(() => setLoading(false))
  }, [id])

  const handleExport = () => {
    if (!id) return
    setExporting(true)
    surveysApi
      .exportResponses(id)
      .then((blob) => {
        const url = URL.createObjectURL(blob as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `responses-${id}.csv`
        a.click()
        URL.revokeObjectURL(url)
      })
      .finally(() => setExporting(false))
  }

  if (!survey) return <div className="max-w-4xl">加载中...</div>

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link href="/surveys" className="text-blue-600 hover:underline">
          我的问卷
        </Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link href={`/surveys/${id}/edit`} className="text-blue-600 hover:underline">
          {survey.title}
        </Link>
        <span className="text-gray-400 mx-2">/</span>
        <span>统计分析</span>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">单题统计</h1>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {exporting ? '导出中...' : '导出 Excel'}
        </button>
      </div>
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : !data?.questions?.length ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          暂无数据
        </div>
      ) : (
        <div className="space-y-6">
          {data.questions.map((q) => (
            <div key={q.questionId} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-800 mb-2">{q.title}</h3>
              <SummaryBlock question={q} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryBlock({ question }: { question: AnalyticsQuestionVO }) {
  const s = question.summary
  if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
    const opts = Array.isArray(s) ? (s as { optionIndex: number; label: string; count: number; ratio: number }[]) : []
    return (
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">选项</th>
            <th className="text-left py-2">人数</th>
            <th className="text-left py-2">占比</th>
          </tr>
        </thead>
        <tbody>
          {opts.map((o) => (
            <tr key={o.optionIndex} className="border-b">
              <td className="py-2">{o.label}</td>
              <td className="py-2">{o.count}</td>
              <td className="py-2">{(o.ratio * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (question.type === 'SCALE') {
    const scale = s as { avg?: number; distribution?: { value: number; count: number }[] }
    return (
      <div className="space-y-2">
        <p>平均分：{(scale?.avg ?? 0).toFixed(2)}</p>
        {scale?.distribution?.length ? (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">分值</th>
                <th className="text-left py-2">人数</th>
              </tr>
            </thead>
            <tbody>
              {scale.distribution.map((d) => (
                <tr key={d.value} className="border-b">
                  <td className="py-2">{d.value}</td>
                  <td className="py-2">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    )
  }
  const list = Array.isArray(s) ? (s as string[]) : []
  return (
    <ul className="list-disc list-inside text-sm text-gray-600 max-h-48 overflow-auto">
      {list.slice(0, 50).map((t, i) => (
        <li key={i}>{t || '—'}</li>
      ))}
      {list.length > 50 && <li>… 共 {list.length} 条</li>}
    </ul>
  )
}
