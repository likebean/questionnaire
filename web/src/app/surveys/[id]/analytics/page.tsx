'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  surveysApi,
  type SurveyDetailVO,
  type AnalyticsResponse,
  type AnalyticsQuestionVO,
  type AnalyticsOptionSummary,
  type AnalyticsScaleSummary,
  type ApiResponse,
} from '@/services/api'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

type ChartType = 'pie' | 'bar'

export default function AnalyticsPage() {
  const params = useParams()
  const id = Number(params.id)
  const [survey, setSurvey] = useState<SurveyDetailVO | null>(null)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [chartTypes, setChartTypes] = useState<Record<number, ChartType>>({})

  const setChartType = useCallback((questionId: number, type: ChartType) => {
    setChartTypes((prev) => ({ ...prev, [questionId]: type }))
  }, [])

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
        <h1 className="text-2xl font-bold text-gray-800">统计分析</h1>
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
        <div className="space-y-8">
          {data.questions.map((q) => (
            <div key={q.questionId} className="bg-white rounded-lg shadow-card p-6">
              <SummaryBlock
                question={q}
                chartType={chartTypes[q.questionId] ?? 'bar'}
                onChartTypeChange={(type) => setChartType(q.questionId, type)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryBlock({
  question,
  chartType,
  onChartTypeChange,
}: {
  question: AnalyticsQuestionVO
  chartType: ChartType
  onChartTypeChange: (t: ChartType) => void
}) {
  const s = question.summary

  if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
    const opts = Array.isArray(s) ? (s as AnalyticsOptionSummary[]) : []
    const chartData = opts.map((o) => ({
      name: o.label,
      value: o.count,
      ratio: o.ratio,
    }))
    const total = opts.reduce((sum, o) => sum + o.count, 0)

    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-800">{question.title}</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500">图表类型：</span>
          <button
            type="button"
            onClick={() => onChartTypeChange('bar')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            柱状图
          </button>
          <button
            type="button"
            onClick={() => onChartTypeChange('pie')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'pie'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            饼图
          </button>
        </div>
        <div className="h-80">
          {chartType === 'pie' ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name} ${value} (${total ? ((value / total) * 100).toFixed(1) : 0}%)`}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => [value ?? 0, '人数']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="人数" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-600">选项</th>
              <th className="text-left py-2 font-medium text-gray-600">人数</th>
              <th className="text-left py-2 font-medium text-gray-600">占比</th>
            </tr>
          </thead>
          <tbody>
            {opts.map((o) => (
              <tr key={o.optionIndex} className="border-b border-gray-100">
                <td className="py-2 text-gray-800">{o.label}</td>
                <td className="py-2 text-gray-600">{o.count}</td>
                <td className="py-2 text-gray-600">{(o.ratio * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (question.type === 'SCALE') {
    const scale = s as AnalyticsScaleSummary
    const dist = scale?.distribution ?? []
    const barData = dist.map((d) => ({ name: String(d.value), count: d.count }))

    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-800">{question.title}</h3>
        <p className="text-sm text-gray-600">平均分：{(scale?.avg ?? 0).toFixed(2)}</p>
        {barData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="人数" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {dist.length > 0 && (
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">分值</th>
                <th className="text-left py-2 font-medium text-gray-600">人数</th>
              </tr>
            </thead>
            <tbody>
              {dist.map((d) => (
                <tr key={d.value} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{d.value}</td>
                  <td className="py-2 text-gray-600">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  const list = Array.isArray(s) ? (s as string[]) : []
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-gray-800">{question.title}</h3>
      <ul className="list-disc list-inside text-sm text-gray-600 max-h-48 overflow-auto">
        {list.slice(0, 50).map((t, i) => (
          <li key={i}>{t || '—'}</li>
        ))}
        {list.length > 50 && <li>… 共 {list.length} 条</li>}
      </ul>
    </div>
  )
}
