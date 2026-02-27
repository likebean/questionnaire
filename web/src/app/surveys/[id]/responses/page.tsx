'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  surveysApi,
  type SurveyDetailVO,
  type ResponseListResponse,
  type ApiResponse,
} from '@/services/api'

export default function ResponsesPage() {
  const params = useParams()
  const id = params.id as string
  const [survey, setSurvey] = useState<SurveyDetailVO | null>(null)
  const [data, setData] = useState<ResponseListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

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
      .listResponses(id, { page, pageSize })
      .then((res: ApiResponse<ResponseListResponse>) => {
        if (res?.data) setData(res.data)
      })
      .catch(() => setData({ list: [], total: 0 }))
      .finally(() => setLoading(false))
  }, [id, page])

  if (!survey) return <div className="p-0">加载中...</div>

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, data?.total ?? 0)

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">答卷列表</h1>
      <div className="mb-4 flex gap-2 items-center text-sm text-gray-600">
        <Link href="/surveys" className="text-blue-600 hover:underline">
          我的问卷
        </Link>
        <span className="text-gray-400">/</span>
        <span>{(survey.title || '未命名问卷').replace(/\n[\s\S]*/, '').trim()}-答卷</span>
      </div>
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : !data?.list?.length ? (
        <div className="bg-white rounded-lg shadow-card p-8 text-center text-gray-500">
          暂无答卷。发布问卷并分享链接后，答卷将显示在这里。
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">提交时间</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">用时</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">用户</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">摘要</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.list.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(r.submittedAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.durationSeconds != null ? `${r.durationSeconds}秒` : '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {(() => {
                      const uid = (r as { userId?: string | null; user_id?: string | null }).userId
                        ?? (r as { userId?: string | null; user_id?: string | null }).user_id
                      return (uid != null && String(uid).trim() !== '') ? uid : '匿名'
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {r.summary ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/fill/${id}?responseId=${r.id}&mode=view`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > pageSize && (
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
              <span className="text-sm text-gray-600">
                显示 {from} 至 {to} 条，共 {data.total} 条
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 border rounded-lg text-sm ${
                      page === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
