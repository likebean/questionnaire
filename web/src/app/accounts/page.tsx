'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  accountsApi,
  type AccountVO,
  type PaginatedResponse,
} from '@/services/api'

const authSourceMap: Record<string, { label: string; class: string }> = {
  local: { label: '本地认证', class: 'bg-blue-100 text-blue-800' },
  cas: { label: 'CAS认证', class: 'bg-purple-100 text-purple-800' },
}

export default function AccountsPage() {
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get('userId')
  const [data, setData] = useState<
    | PaginatedResponse<AccountVO>
    | { items: AccountVO[]; total: number; page: number; pageSize: number }
    | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<AccountVO | null>(null)
  const [deleting, setDeleting] = useState(false)
  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    if (userIdParam) {
      accountsApi
        .getByUserId(userIdParam)
        .then((res) => {
          if (res.code === 200 && res.data)
            setData({
              items: res.data,
              total: res.data.length,
              page: 1,
              pageSize: res.data.length,
            })
        })
        .catch(() => setData(null))
        .finally(() => setLoading(false))
    } else {
      accountsApi
        .query({ keyword: keyword || undefined, page, pageSize })
        .then((res) => {
          if (res.code === 200 && res.data) setData(res.data)
        })
        .catch(() => setData(null))
        .finally(() => setLoading(false))
    }
  }, [userIdParam, keyword, page])

  const handleDeleteClick = (a: AccountVO) => setDeleteTarget(a)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await accountsApi.delete(deleteTarget.id)
      if (res.code === 200) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.filter((x) => x.id !== deleteTarget.id),
                total: prev.total - 1,
              }
            : null
        )
        setDeleteTarget(null)
      } else {
        alert(res.message || '删除失败')
      }
    } finally {
      setDeleting(false)
    }
  }

  const items = data?.items ?? []
  const effectiveTotal =
    !userIdParam && data && typeof data.total === 'number' && data.total > 0
      ? data.total
      : items.length
  const totalPages = !userIdParam && data ? Math.ceil(effectiveTotal / pageSize) || 0 : 0
  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">账号管理</h1>
        <Link
          href="/accounts/new"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center shadow"
        >
          <i className="fas fa-plus mr-2" /> 新增账号
        </Link>
      </div>

      {userIdParam && (
        <p className="mb-4 text-sm text-gray-600">
          仅显示用户 <strong>{userIdParam}</strong> 的账号
          <Link href="/accounts" className="ml-2 text-blue-600 hover:underline">
            查看全部
          </Link>
        </p>
      )}

      {!userIdParam && (
        <div className="mb-6 bg-white rounded-lg shadow-card p-4">
          <div className="flex flex-wrap items-center justify-between">
            <div className="w-full md:w-auto mt-4 md:mt-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                搜索账号
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64 pr-10 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm text-sm pl-3"
                  placeholder="输入登录标识或用户ID"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  账号ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  用户ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  登录标识
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  认证来源
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {a.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Link
                        href={`/users/${a.userId}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {a.userId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {a.loginId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          authSourceMap[a.authSource]?.class ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {authSourceMap[a.authSource]?.label ?? a.authSource}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/accounts/${a.id}`}
                          className="text-gray-600 hover:text-gray-900"
                          title="编辑"
                        >
                          <i className="fas fa-edit" />
                        </Link>
                        <button
                          type="button"
                          className="text-gray-500 hover:text-red-600"
                          title="删除"
                          onClick={() => handleDeleteClick(a)}
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

      {data !== null && !userIdParam && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            显示 {(page - 1) * pageSize + 1} 至{' '}
            {Math.min(page * pageSize, effectiveTotal)} 条，共 {effectiveTotal} 条记录
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </button>
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
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
              </button>
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
            <h3 className="text-xl font-semibold text-gray-900 text-center">
              确认删除
            </h3>
            <p className="text-gray-600 mt-4 text-center">
              确定要删除该账号吗？此操作无法撤销。
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
