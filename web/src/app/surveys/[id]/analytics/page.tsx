'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
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
  const id = params.id as string
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
        a.download = `responses-${id}.xlsx`
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
          {exporting ? '导出中...' : '导出 Excel'}
        </button>
      </div>
      <div className="mb-4 flex gap-2 items-center text-sm text-gray-600">
        <Link href="/surveys" className="text-blue-600 hover:underline">
          我的问卷
        </Link>
        <span className="text-gray-400">/</span>
        <span>{(survey.title || '未命名问卷').replace(/\n[\s\S]*/, '').trim()}-统计</span>
      </div>
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : !data?.questions?.length ? (
        <div className="bg-white rounded-lg shadow-card p-8 text-center text-gray-500">
          暂无数据
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    const total = opts.reduce((sum, o) => sum + o.count, 0)
    const barOption: EChartsOption = {
      grid: { left: '15%', right: '15%', top: 10, bottom: 30, containLabel: false },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
      yAxis: { type: 'category', data: opts.map((o) => o.label), axisLabel: { fontSize: 11 } },
      series: [
        {
          type: 'bar',
          data: opts.map((o) => o.count),
          itemStyle: { color: CHART_COLORS[0], borderRadius: [0, 4, 4, 0] },
          barWidth: '60%',
        },
      ],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    }
    const pieOption: EChartsOption = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        textStyle: { fontSize: 11 },
        formatter: (name: string) => {
          const o = opts.find((x) => x.label === name)
          if (!o) return name
          const pct = total ? ((o.count / total) * 100).toFixed(1) : '0'
          return `${name} ${o.count} (${pct}%)`
        },
      },
      series: [
        {
          type: 'pie',
          radius: '55%',
          center: ['50%', '45%'],
          data: opts.map((o, i) => ({
            name: o.label,
            value: o.count,
            itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
          })),
          label: { show: false },
          labelLine: { show: false },
        },
      ],
    }

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
        <div className="h-80 w-full">
          {chartType === 'pie' ? (
            <ReactECharts option={pieOption} style={{ height: '100%', width: '100%' }} />
          ) : (
            <ReactECharts option={barOption} style={{ height: '100%', width: '100%' }} />
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
    const scaleOption: EChartsOption = {
      grid: { left: '10%', right: '10%', top: 10, bottom: 30 },
      xAxis: {
        type: 'category',
        data: barData.map((d) => d.name),
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f0f0f0' } },
      },
      series: [
        {
          type: 'bar',
          data: barData.map((d) => d.count),
          itemStyle: { color: CHART_COLORS[0], borderRadius: [4, 4, 0, 0] },
          barWidth: '60%',
        },
      ],
      tooltip: { trigger: 'axis' },
    }

    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-800">{question.title}</h3>
        <p className="text-sm text-gray-600">平均分：{(scale?.avg ?? 0).toFixed(2)}</p>
        {barData.length > 0 && (
          <div className="h-64 w-full">
            <ReactECharts option={scaleOption} style={{ height: '100%', width: '100%' }} />
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
