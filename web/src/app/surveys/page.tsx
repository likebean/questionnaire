'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/_components/AuthContext'
import {
  surveysApi,
  type SurveyListItemVO,
  type SurveyListResponse,
  type ApiResponse,
} from '@/services/api'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  COLLECTING: '收集中',
  PAUSED: '已暂停',
  ENDED: '已结束',
}

export default function MySurveysPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<SurveyListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState('updatedAt')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    surveysApi
      .list({ status: status || undefined, keyword: keyword || undefined, page, pageSize, sort })
      .then((res: ApiResponse<SurveyListResponse>) => {
        if (res?.data) setData(res.data)
      })
      .catch(() => setData({ list: [], total: 0 }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [page, status, sort])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  const handleCreate = () => {
    setCreating(true)
    surveysApi
      .create({ title: '未命名问卷' })
      .then((res) => {
        if (res?.data?.id) router.push(`/surveys/${res.data.id}/edit`)
        else load()
      })
      .catch(() => load())
      .finally(() => setCreating(false))
  }

  const canShowResponses = (s: SurveyListItemVO) =>
    ['COLLECTING', 'PAUSED', 'ENDED'].includes(s.status)

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">我的问卷</h1>
      {user && (
        <p className="text-gray-600 mb-4">
          当前用户：{user.nickname || user.id}
          {user.roleCodes?.length ? `（${user.roleCodes.join('、')}）` : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="COLLECTING">收集中</option>
            <option value="PAUSED">已暂停</option>
            <option value="ENDED">已结束</option>
          </select>
          <input
            type="text"
            placeholder="搜索问卷标题"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="border rounded px-2 py-1 w-48"
          />
          <button type="submit" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">
            搜索
          </button>
        </form>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="updatedAt">最近更新</option>
          <option value="createdAt">最近创建</option>
        </select>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? '创建中...' : '创建问卷'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : !data?.list?.length ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          暂无问卷。点击「创建问卷」开始，填写通过分享链接参与。
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">问卷标题</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">状态</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">回收数</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">更新时间</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.list.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/surveys/${item.id}/edit`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {item.title || '未命名问卷'}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        'px-2 py-0.5 rounded text-sm ' +
                        (item.status === 'DRAFT'
                          ? 'bg-gray-200'
                          : item.status === 'COLLECTING'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'PAUSED'
                              ? 'bg-yellow-100'
                              : 'bg-gray-100')
                      }
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {canShowResponses(item) ? (item.responseCount ?? 0) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-sm">
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleString('zh-CN')
                      : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/surveys/${item.id}/edit`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        设计
                      </Link>
                      <Link
                        href={`/surveys/${item.id}/settings`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        设置
                      </Link>
                      {canShowResponses(item) && (
                        <>
                          <Link
                            href={`/surveys/${item.id}/responses`}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            答卷
                          </Link>
                          <Link
                            href={`/surveys/${item.id}/analytics`}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            统计
                          </Link>
                        </>
                      )}
                      {item.status === 'DRAFT' && (
                        <span className="text-gray-400 text-sm">发布后可发放/答卷/统计</span>
                      )}
                      <CopyFillLinkButton surveyId={item.id} />
                      <CopySurveyButton surveyId={item.id} router={router} onDone={load} />
                      <DeleteSurveyButton surveyId={item.id} onDone={load} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > pageSize && (
            <div className="px-4 py-2 border-t flex justify-between items-center">
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
      <p className="mt-4">
        <Link href="/" className="text-blue-600 hover:underline">
          返回首页
        </Link>
      </p>
    </div>
  )
}

function CopyFillLinkButton({ surveyId }: { surveyId: number }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    surveysApi.getFillUrl(surveyId).then((res) => {
      const path = res?.data?.fillUrl ?? `/fill/${surveyId}`
      const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-blue-600 hover:underline text-sm"
    >
      {copied ? '已复制' : '复制链接'}
    </button>
  )
}

function CopySurveyButton({
  surveyId,
  router,
  onDone,
}: {
  surveyId: number
  router: ReturnType<typeof useRouter>
  onDone: () => void
}) {
  const [loading, setLoading] = useState(false)
  const handleCopy = () => {
    setLoading(true)
    surveysApi
      .copy(surveyId)
      .then((res) => {
        if (res?.data?.id) router.push(`/surveys/${res.data.id}/edit`)
        else onDone()
      })
      .finally(() => setLoading(false))
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={loading}
      className="text-blue-600 hover:underline text-sm disabled:opacity-50"
    >
      {loading ? '复制中...' : '复制'}
    </button>
  )
}

function DeleteSurveyButton({ surveyId, onDone }: { surveyId: number; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const handleDelete = () => {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setLoading(true)
    surveysApi
      .delete(surveyId)
      .then(() => onDone())
      .finally(() => setLoading(false))
  }
  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:underline text-sm disabled:opacity-50"
    >
      {loading ? '删除中...' : confirm ? '确认删除？' : '删除'}
    </button>
  )
}
