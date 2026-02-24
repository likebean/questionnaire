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

  if (!survey) return <div className="p-0">加载中...</div>

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">单题统计</h1>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
        >
          {exporting ? '导出中...' : '导出 CSV'}
        </button>
      </div>
      <div className="mb-4 flex gap-2 items-center text-sm text-gray-600">
        <Link href="/surveys" className="text-blue-600 hover:underline">
          我的问卷
        </Link>
        <span className="text-gray-400">/</span>
        <Link href={`/surveys/${id}/edit`} className="text-blue-600 hover:underline">
          {survey.title}
        </Link>
        <span className="text-gray-400">/</span>
        <span>统计分析</span>
      </div>
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : !data?.questions?.length ? (
        <div className="bg-white rounded-lg shadow-card p-8 text-center text-gray-500">
          暂无数据
        </div>
      ) : (
        <div className="space-y-6">
          {data.questions.map((q) => (
            <div key={q.questionId} className="bg-white rounded-lg shadow-card p-6">
              <h3 className="font-medium text-gray-800 mb-3">{q.title}</h3>
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
    const maxRatio = opts.length ? Math.max(...opts.map((o) => o.ratio)) : 0
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-gray-600 mb-2">柱状图</div>
        <div className="space-y-3">
          {opts.map((o) => (
            <div key={o.optionIndex}>
              <div className="flex justify-between text-sm text-gray-700 mb-1">
                <span className="truncate mr-2">{o.label}</span>
                <span className="text-gray-500 shrink-0">{o.count} 人 ({(o.ratio * 100).toFixed(1)}%)</span>
              </div>
              <div className="h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded transition-all duration-300"
                  style={{ width: `${maxRatio > 0 ? (o.ratio / maxRatio) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="text-sm font-medium text-gray-600 mt-4 mb-2">数据表</div>
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
      </div>
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
