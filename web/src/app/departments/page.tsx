'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { departmentsApi, type DepartmentVO, type PaginatedResponse } from '@/services/api'

export default function DepartmentsPage() {
  const [data, setData] = useState<PaginatedResponse<DepartmentVO> | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<DepartmentVO | null>(null)
  const [deleting, setDeleting] = useState(false)
  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    departmentsApi
      .query({ keyword: keyword || undefined, page, pageSize })
      .then((res) => {
        if (res.code === 200 && res.data) setData(res.data)
        else setData(null)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [keyword, page])

  const handleDeleteClick = (d: DepartmentVO) => setDeleteTarget(d)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await departmentsApi.delete(deleteTarget.id)
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

  const effectiveTotal =
    data && typeof data.total === 'number' && data.total > 0
      ? data.total
      : (data?.items?.length ?? 0)
  const totalPages = Math.ceil(effectiveTotal / pageSize) || 0
  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">院系管理</h1>
        <Link
          href="/departments/new"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center shadow"
        >
          <i className="fas fa-plus mr-2" /> 新增院系
        </Link>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow-card p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">搜索院系</label>
        <input
          type="text"
          className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm text-sm pl-3"
          placeholder="编码或名称"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                编码
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                父院系ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                层级
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">加载中...</td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">暂无数据</td>
              </tr>
            ) : (
              data.items.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {d.parentId ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.level ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/departments/${d.id}`}
                      className="text-gray-600 hover:text-gray-900 mr-3"
                      title="编辑"
                    >
                      <i className="fas fa-edit" />
                    </Link>
                    <button
                      type="button"
                      className="text-gray-500 hover:text-red-600"
                      title="删除"
                      onClick={() => handleDeleteClick(d)}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data !== null && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            显示 {(page - 1) * pageSize + 1} 至 {Math.min(page * pageSize, effectiveTotal)} 条，共 {effectiveTotal} 条记录
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
                    page === p ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600'
                  }`}
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
          <div className="absolute inset-0 bg-black/20" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md w-full mx-4">
            <div className="flex justify-center text-red-500 mb-4">
              <i className="fas fa-exclamation-triangle text-4xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center">确认删除</h3>
            <p className="text-gray-600 mt-4 text-center">
              确定要删除院系「{deleteTarget.name}」（{deleteTarget.code}）吗？存在子院系或关联用户时将无法删除。
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
