'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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

/** 参考问卷星：表格、饼状图、圆环图、柱状图、条形图 */
type ChartType = 'table' | 'pie' | 'doughnut' | 'column' | 'bar'
type SortKey = 'label' | 'count' | null
type SortOrder = 'asc' | 'desc'

export default function AnalyticsPage() {
  const params = useParams()
  const id = params.id as string
  const [survey, setSurvey] = useState<SurveyDetailVO | null>(null)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [chartTypes, setChartTypes] = useState<Record<number, ChartType>>({})

  /** 每题独立：只更新当前题的图表类型，其他题不受影响 */
  const setChartType = useCallback((questionId: number, type: ChartType) => {
    setChartTypes((prev) => ({ ...prev, [questionId]: type }))
  }, [])

  const defaultChartType: ChartType = 'table'

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.questions.map((q, idx) => (
            <div key={q.questionId} className="bg-white rounded-lg shadow-card p-6">
              <SummaryBlock
                questionIndex={idx + 1}
                question={q}
                chartType={chartTypes[q.questionId] ?? defaultChartType}
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
  questionIndex,
  question,
  chartType,
  onChartTypeChange,
}: {
  questionIndex: number
  question: AnalyticsQuestionVO
  chartType: ChartType
  onChartTypeChange: (t: ChartType) => void
}) {
  const s = question.summary
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
    const opts = Array.isArray(s) ? (s as AnalyticsOptionSummary[]) : []
    const total = opts.reduce((sum, o) => sum + o.count, 0)
    const sortedOpts = useMemo(() => {
      if (!sortKey) return opts
      const arr = [...opts]
      arr.sort((a, b) => {
        if (sortKey === 'label') {
          const c = (a.label ?? '').localeCompare(b.label ?? '')
          return sortOrder === 'asc' ? c : -c
        }
        return sortOrder === 'asc' ? a.count - b.count : b.count - a.count
      })
      return arr
    }, [opts, sortKey, sortOrder])
    const toggleSort = (key: 'label' | 'count') => {
      if (sortKey === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
      else {
        setSortKey(key)
        setSortOrder(key === 'count' ? 'desc' : 'asc')
      }
    }

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
      tooltip: { trigger: 'axis', formatter: (params: unknown) => {
        const p = Array.isArray(params) ? params[0] : null
        const idx = p?.dataIndex
        if (idx == null || !opts[idx]) return ''
        const o = opts[idx]
        const pct = total ? ((o.count / total) * 100).toFixed(2) : '0'
        return `${o.label}: ${pct}%`
      } },
    }
    const columnOption: EChartsOption = {
      grid: { left: '10%', right: '10%', top: 10, bottom: 30 },
      xAxis: { type: 'category', data: opts.map((o) => o.label), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
      series: [
        {
          type: 'bar',
          data: opts.map((o) => o.count),
          itemStyle: { color: CHART_COLORS[0], borderRadius: [4, 4, 0, 0] },
          barWidth: '60%',
        },
      ],
      tooltip: { trigger: 'axis', formatter: (params: unknown) => {
        const p = Array.isArray(params) ? params[0] : null
        const idx = p?.dataIndex
        if (idx == null || !opts[idx]) return ''
        const o = opts[idx]
        const pct = total ? ((o.count / total) * 100).toFixed(2) : '0'
        return `${o.label}: ${o.count} (${pct}%)`
      } },
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
    const doughnutOption: EChartsOption = {
      ...pieOption,
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
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

    const chartTypes: { type: ChartType; label: string }[] = [
      { type: 'table', label: '表格' },
      { type: 'pie', label: '饼状图' },
      { type: 'doughnut', label: '圆环图' },
      { type: 'column', label: '柱状图' },
      { type: 'bar', label: '条形图' },
    ]

    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-800">
          第{questionIndex}题：{question.title}
          {(question.type === 'SINGLE_CHOICE' && ' [单选题]') ||
            (question.type === 'MULTIPLE_CHOICE' && ' [多选题]') ||
            ''}
        </h3>
        {/* 数据表格：选项、小计、比例（带进度条） */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  className="text-left py-2.5 px-3 font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => toggleSort('label')}
                >
                  选项 {sortKey === 'label' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left py-2.5 px-3 font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => toggleSort('count')}
                >
                  小计 {sortKey === 'count' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">比例</th>
              </tr>
            </thead>
            <tbody>
              {sortedOpts.map((o) => (
                <tr key={o.optionIndex} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-800">{o.label}</td>
                  <td className="py-2 px-3 text-gray-700">{o.count}</td>
                  <td className="py-2 px-3 w-48">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded"
                          style={{ width: `${(o.ratio * 100).toFixed(1)}%`, minWidth: o.ratio > 0 ? '4px' : 0 }}
                        />
                      </div>
                      <span className="text-gray-700 whitespace-nowrap">{(o.ratio * 100).toFixed(2)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium text-gray-700">
                <td colSpan={2} className="py-2 px-3">
                  本题有效填写人次
                </td>
                <td className="py-2 px-3">{total}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* 图表类型切换 */}
        <div className="flex flex-wrap gap-2 items-center">
          {chartTypes.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => onChartTypeChange(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                chartType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* 图表区域：表格视图不显示图表；key 保证每题图表独立、互不影响 */}
        {chartType !== 'table' && (
          <div className="h-80 w-full" key={`chart-${question.questionId}-${chartType}`}>
            {chartType === 'pie' && <ReactECharts option={pieOption} style={{ height: '100%', width: '100%' }} />}
            {chartType === 'doughnut' && <ReactECharts option={doughnutOption} style={{ height: '100%', width: '100%' }} />}
            {chartType === 'column' && <ReactECharts option={columnOption} style={{ height: '100%', width: '100%' }} />}
            {chartType === 'bar' && <ReactECharts option={barOption} style={{ height: '100%', width: '100%' }} />}
          </div>
        )}
      </div>
    )
  }

  if (question.type === 'SCALE') {
    const scale = s as AnalyticsScaleSummary
    const dist = scale?.distribution ?? []
    const barData = dist.map((d) => ({ name: String(d.value), count: d.count }))
    const scaleTotal = dist.reduce((sum, d) => sum + d.count, 0)
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
        <h3 className="font-medium text-gray-800">
          第{questionIndex}题：{question.title} [量表题]
        </h3>
        <p className="text-sm text-gray-600">平均分：{(scale?.avg ?? 0).toFixed(2)} · 本题有效填写人次：{scaleTotal}</p>
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
      <h3 className="font-medium text-gray-800">第{questionIndex}题：{question.title} [填空题]</h3>
      <ul className="list-disc list-inside text-sm text-gray-600 max-h-48 overflow-auto">
        {list.slice(0, 50).map((t, i) => (
          <li key={i}>{t || '—'}</li>
        ))}
        {list.length > 50 && <li>… 共 {list.length} 条</li>}
      </ul>
    </div>
  )
}
