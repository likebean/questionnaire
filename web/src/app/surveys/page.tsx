'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [data, setData] = useState<SurveyListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState('updatedAt')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SurveyListItemVO | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await surveysApi.delete(deleteTarget.id)
      load()
      setDeleteTarget(null)
    } catch {
      alert('删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const canShowResponses = (s: SurveyListItemVO) =>
    ['COLLECTING', 'PAUSED', 'ENDED'].includes(s.status)

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0
  const pageButtons = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1)

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">我的问卷</h1>
        <Link
          href="#"
          onClick={(e) => {
            e.preventDefault()
            handleCreate()
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center shadow disabled:opacity-50"
          style={{ pointerEvents: creating ? 'none' : undefined }}
        >
          <i className="fas fa-plus mr-2" /> 创建问卷
        </Link>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow-card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-40 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="DRAFT">草稿</option>
              <option value="COLLECTING">收集中</option>
              <option value="PAUSED">已暂停</option>
              <option value="ENDED">已结束</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索问卷</label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64 pr-10 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm text-sm pl-3"
                placeholder="输入问卷标题"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
            <select
              className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-40 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="updatedAt">最近更新</option>
              <option value="createdAt">最近创建</option>
            </select>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  问卷标题
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  回收数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  更新时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : !data?.list?.length ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    暂无问卷。点击「创建问卷」开始，填写通过分享链接参与。
                  </td>
                </tr>
              ) : (
                data.list.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Link
                        href={`/surveys/${item.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {item.title || '未命名问卷'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={
                          'status-badge ' +
                          (item.status === 'DRAFT'
                            ? 'info'
                            : item.status === 'COLLECTING'
                              ? 'success'
                              : item.status === 'PAUSED'
                                ? 'warning'
                                : '')
                        }
                      >
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {canShowResponses(item) ? (item.responseCount ?? 0) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.updatedAt
                        ? new Date(item.updatedAt).toLocaleString('zh-CN')
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center space-x-3">
                        <Link
                          href={`/surveys/${item.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                          title="设计问卷"
                        >
                          <i className="fas fa-edit" />
                        </Link>
                        <Link
                          href={`/surveys/${item.id}/settings`}
                          className="text-gray-600 hover:text-gray-900"
                          title="设置"
                        >
                          <i className="fas fa-cog" />
                        </Link>
                        {canShowResponses(item) && (
                          <>
                            <Link
                              href={`/surveys/${item.id}/responses`}
                              className="text-gray-600 hover:text-gray-900"
                              title="查看答卷"
                            >
                              <i className="fas fa-list-alt" />
                            </Link>
                            <Link
                              href={`/surveys/${item.id}/analytics`}
                              className="text-gray-600 hover:text-gray-900"
                              title="统计分析"
                            >
                              <i className="fas fa-chart-bar" />
                            </Link>
                          </>
                        )}
                        <SurveyStatusActions item={item} onDone={load} />
                        <CopyFillLinkButton surveyId={item.id} />
                        <CopySurveyButton surveyId={item.id} router={router} onDone={load} />
                        <button
                          type="button"
                          className="text-gray-500 hover:text-red-600"
                          title="删除"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            显示 {(page - 1) * pageSize + 1} 至{' '}
            {Math.min(page * pageSize, data.total)} 条，共 {data.total} 条记录
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              {pageButtons.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`rounded-lg border px-3 py-1 text-sm ${
                    page === p
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600'
                  } transition`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md w-full mx-4">
            <div className="flex justify-center text-red-500 mb-4">
              <i className="fas fa-exclamation-triangle text-4xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center">确认删除</h3>
            <p className="text-gray-600 mt-4 text-center">
              确定要删除问卷「{deleteTarget.title || '未命名问卷'}」吗？此操作无法撤销。
            </p>
            <div className="mt-6 flex justify-center space-x-4">
              <button
                type="button"
                className="px-5 py-2 rounded-lg font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                onClick={() => !deleting && setDeleteTarget(null)}
                disabled={deleting}
              >
                取消
              </button>
              <button
                type="button"
                className="px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? '删除中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SurveyStatusActions({
  item,
  onDone,
}: {
  item: SurveyListItemVO
  onDone: () => void
}) {
  const [loading, setLoading] = useState(false)
  const onAction = (fn: () => Promise<unknown>) => {
    setLoading(true)
    fn()
      .then(onDone)
      .catch((e) => alert(e?.response?.data?.message ?? '操作失败'))
      .finally(() => setLoading(false))
  }
  if (item.status === 'COLLECTING') {
    return (
      <>
        <button
          type="button"
          title="暂停回收"
          disabled={loading}
          onClick={() => onAction(() => surveysApi.pause(item.id))}
          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <i className="fas fa-pause" />
        </button>
        <button
          type="button"
          title="结束问卷"
          disabled={loading}
          onClick={() => {
            if (!window.confirm('结束后将无法再接收新答卷，确定结束问卷吗？')) return
            onAction(() => surveysApi.end(item.id))
          }}
          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <i className="fas fa-stop" />
        </button>
      </>
    )
  }
  if (item.status === 'PAUSED') {
    return (
      <>
        <button
          type="button"
          title="重新开启"
          disabled={loading}
          onClick={() => onAction(() => surveysApi.resume(item.id))}
          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <i className="fas fa-play" />
        </button>
        <button
          type="button"
          title="结束问卷"
          disabled={loading}
          onClick={() => {
            if (!window.confirm('结束后将无法再接收新答卷，确定结束问卷吗？')) return
            onAction(() => surveysApi.end(item.id))
          }}
          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <i className="fas fa-stop" />
        </button>
      </>
    )
  }
  return null
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
      title="复制填写链接"
      className="text-gray-600 hover:text-gray-900"
    >
      <i className={copied ? 'fas fa-check text-green-600' : 'fas fa-link'} />
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
      title="复制问卷"
      className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
    >
      <i className="fas fa-copy" />
    </button>
  )
}
