'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { permissionsApi, type PermissionVO, type PaginatedResponse } from '@/services/api'

export default function PermissionsPage() {
  const [data, setData] = useState<PaginatedResponse<PermissionVO> | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    permissionsApi
      .query({
        keyword: keyword || undefined,
        resourceType: resourceType || undefined,
        page,
        pageSize,
      })
      .then((res) => {
        if (res.code === 200 && res.data) setData(res.data)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [keyword, resourceType, page])

  const effectiveTotal =
    data && typeof data.total === 'number' && data.total > 0
      ? data.total
      : (data?.items?.length ?? 0)
  const totalPages = Math.ceil(effectiveTotal / pageSize) || 0
  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">权限管理</h1>

      <div className="mb-6 bg-white rounded-lg shadow-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-48 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm text-sm pl-3"
              placeholder="名称/资源类型/操作"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">资源类型</label>
            <input
              type="text"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-40 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm text-sm pl-3"
              placeholder="筛选"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  资源类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  操作
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  数据范围
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  描述
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.resourceType ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.action ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.dataScope ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.description ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/permissions/${p.id}`}
                        className="text-gray-600 hover:text-gray-900"
                        title="编辑"
                      >
                        <i className="fas fa-edit" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data !== null && (
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
    </div>
  )
}
