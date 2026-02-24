'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  surveysApi,
  type SurveyDetailVO,
  type ResponseListResponse,
  type ResponseDetailVO,
  type ApiResponse,
} from '@/services/api'

export default function ResponsesPage() {
  const params = useParams()
  const id = Number(params.id)
  const [survey, setSurvey] = useState<SurveyDetailVO | null>(null)
  const [data, setData] = useState<ResponseListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [detail, setDetail] = useState<ResponseDetailVO | null>(null)

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

  const showDetail = (responseId: number) => {
    surveysApi.getResponseDetail(id, responseId).then((res: ApiResponse<ResponseDetailVO>) => {
      if (res?.data) setDetail(res.data)
    })
  }

  if (!survey) return <div className="max-w-4xl">加载中...</div>

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <Link href="/surveys" className="text-blue-600 hover:underline">
          我的问卷
        </Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link href={`/surveys/${id}/edit`} className="text-blue-600 hover:underline">
          {survey.title}
        </Link>
        <span className="text-gray-400 mx-2">/</span>
        <span>查看答卷</span>
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">答卷列表</h1>
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : !data?.list?.length ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          暂无答卷。发布问卷并分享链接后，答卷将显示在这里。
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">提交时间</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">用时</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">摘要</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.list.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">
                    {new Date(r.submittedAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-2 text-sm">{r.durationSeconds != null ? `${r.durationSeconds}秒` : '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                    {r.summary ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => showDetail(r.id)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > pageSize && (
            <div className="px-4 py-2 border-t flex justify-between">
              <span className="text-sm text-gray-600">共 {data.total} 条</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  上一页
                </button>
                <button
                  type="button"
                  disabled={page * pageSize >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">答卷详情</h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                关闭
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              提交时间：{new Date(detail.submittedAt).toLocaleString('zh-CN')}
              {detail.durationSeconds != null && `，用时 ${detail.durationSeconds} 秒`}
            </p>
            <div className="space-y-3">
              {detail.items?.map((item) => (
                <div key={item.questionId} className="border-b pb-2">
                  <div className="font-medium text-gray-700">{item.questionTitle}</div>
                  <div className="text-gray-600">{item.answerText || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
