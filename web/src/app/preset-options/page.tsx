'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  presetOptionsApi,
  type ApiResponse,
  type PaginatedResponse,
  type PresetOptionGroupVO,
  type PresetOptionGroupDetailVO,
  type PresetOptionItemVO,
} from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

type Editing = {
  open: boolean
  saving: boolean
  deleting: boolean
  isNew: boolean
  id?: number
  category: string
  name: string
  sort: number
  enabled: boolean
  items: PresetOptionItemVO[]
}

function newEditing(): Editing {
  return {
    open: false,
    saving: false,
    deleting: false,
    isNew: true,
    category: '常用',
    name: '',
    sort: 0,
    enabled: true,
    items: [{ sortOrder: 0, label: '选项1', allowFill: false }],
  }
}

export default function PresetOptionsPage() {
  const [data, setData] = useState<PaginatedResponse<PresetOptionGroupVO> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [editing, setEditing] = useState<Editing>(() => newEditing())
  const closeEditing = () => setEditing((e) => ({ ...e, open: false }))

  const effectiveTotal =
    data && typeof data.total === 'number' && data.total > 0
      ? data.total
      : (data?.items?.length ?? 0)
  const totalPages = Math.ceil(effectiveTotal / pageSize) || 0
  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)

  const categorySuggestions = useMemo(
    () => ['常用', '性别', '学历', '地区', '是非', '职业', '行业', '部门', '职称', '职务', '月份', '数字'],
    []
  )

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    presetOptionsApi
      .query({ keyword: keyword || undefined, category: category || undefined, page, pageSize })
      .then((res: ApiResponse<PaginatedResponse<PresetOptionGroupVO>>) => {
        if (res.code !== 200) {
          setData(null)
          setLoadError(res.message || '加载失败')
          return
        }
        setData(res.data)
      })
      .catch((err: { response?: { data?: { message?: string }; status?: number } }) => {
        setData(null)
        const msg = err?.response?.data?.message || (err?.response?.status === 403 ? '无权限访问' : '加载失败，请重试')
        setLoadError(msg)
      })
      .finally(() => setLoading(false))
  }, [keyword, category, page])

  useEffect(() => {
    if (!editing.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditing((ed) => ({ ...ed, open: false }))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editing.open])

  const openCreate = () => {
    setEditing({ ...newEditing(), open: true, isNew: true })
  }

  const openEdit = async (id: number) => {
    const res = await presetOptionsApi.getDetail(id).catch(() => null)
    const d = (res as ApiResponse<PresetOptionGroupDetailVO> | null)?.data
    if (!d) {
      alert('加载详情失败')
      return
    }
    setEditing({
      open: true,
      saving: false,
      deleting: false,
      isNew: false,
      id: d.id,
      category: d.category,
      name: d.name,
      sort: Number(d.sort ?? 0),
      enabled: d.enabled !== false,
      items: Array.isArray(d.items) && d.items.length ? d.items.map((x, i) => ({ ...x, sortOrder: x.sortOrder ?? i })) : [],
    })
  }

  const save = async () => {
    if (!editing.category.trim()) return alert('分类不能为空')
    if (!editing.name.trim()) return alert('名称不能为空')
    const items = (editing.items ?? [])
      .map((it, i) => ({ ...it, sortOrder: it.sortOrder ?? i, label: (it.label ?? '').trim() }))
      .filter((it) => it.label)
    if (!items.length) return alert('至少需要 1 个选项')

    setEditing((e) => ({ ...e, saving: true }))
    try {
      if (editing.isNew) {
        const res = await presetOptionsApi.create({
          category: editing.category.trim(),
          name: editing.name.trim(),
          sort: editing.sort,
          enabled: editing.enabled,
          items,
        })
        if (res.code !== 200) throw new Error(res.message || '保存失败')
      } else if (editing.id != null) {
        const res = await presetOptionsApi.update(editing.id, {
          category: editing.category.trim(),
          name: editing.name.trim(),
          sort: editing.sort,
          enabled: editing.enabled,
          items,
        })
        if (res.code !== 200) throw new Error(res.message || '保存失败')
      }
      setEditing((e) => ({ ...e, open: false, saving: false }))
      setPage(1)
      // 触发重新加载
      presetOptionsApi.query({ keyword: keyword || undefined, category: category || undefined, page: 1, pageSize }).then((res) => {
        if (res.code === 200) setData(res.data)
      }).catch(() => {})
    } catch (e) {
      alert((e as Error)?.message ?? '保存失败')
      setEditing((ed) => ({ ...ed, saving: false }))
    }
  }

  const remove = async () => {
    if (editing.isNew || editing.id == null) {
      setEditing((e) => ({ ...e, open: false }))
      return
    }
    if (!confirm('确认删除该预定义组选项？')) return
    setEditing((e) => ({ ...e, deleting: true }))
    try {
      const res = await presetOptionsApi.delete(editing.id)
      if (res.code !== 200) throw new Error(res.message || '删除失败')
      setEditing((e) => ({ ...e, open: false, deleting: false }))
      setPage(1)
      presetOptionsApi.query({ keyword: keyword || undefined, category: category || undefined, page: 1, pageSize }).then((r) => {
        if (r.code === 200) setData(r.data)
      }).catch(() => {})
    } catch (e) {
      alert((e as Error)?.message ?? '删除失败')
      setEditing((ed) => ({ ...ed, deleting: false }))
    }
  }

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">预定义选项库</h1>
        <button
          type="button"
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center shadow"
        >
          <i className="fas fa-plus mr-2" /> 新增预定义组
        </button>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>分类</label>
            <input
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1) }}
              className={inputClass}
              placeholder="如 常用/性别/学历..."
              list="preset-cat-suggest"
            />
            <datalist id="preset-cat-suggest">
              {categorySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>关键词</label>
            <input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
              className={inputClass}
              placeholder="名称或分类"
            />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-500">
              在问卷编辑页「批量添加选项」里会读取启用的预定义组。
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
          {loadError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">启用</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">排序</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">操作</th>
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
                data.items.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{g.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{g.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{g.enabled === false ? '否' : '是'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{g.sort ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        type="button"
                        onClick={() => openEdit(g.id)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        编辑
                      </button>
                      <Link href="#" onClick={(e) => { e.preventDefault(); openEdit(g.id) }} className="hidden" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {effectiveTotal > pageSize && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
            <span className="text-sm text-gray-600">
              显示 {(page - 1) * pageSize + 1} 至 {Math.min(page * pageSize, effectiveTotal)} 条，共 {effectiveTotal} 条
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
              {pageButtons.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 border rounded-lg text-sm ${
                    page === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 bg-white hover:bg-gray-50'
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

      {editing.open && (
        <div
          className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditing()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-4xl max-h-[90vh] rounded-xl border border-gray-200 shadow-lg flex flex-col overflow-hidden bg-white focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 left-0 w-full bg-white border-b border-gray-100 z-20 px-6 pt-6 pb-3 flex items-center min-h-[56px]">
              <div className="flex-1">
                <h2 className="text-lg font-semibold leading-none tracking-tight text-left text-gray-900">
                  {editing.isNew ? '新增预定义组' : '编辑预定义组'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditing}
                className="absolute right-6 top-6 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none !bg-transparent hover:!bg-transparent focus:!bg-transparent active:!bg-transparent"
                aria-label="关闭"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-gray-400"
                >
                  <path d="M15 5 5 15" />
                  <path d="m5 5 10 10" />
                </svg>
                <span className="sr-only">关闭</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className={labelClass}>分类</label>
                  <input
                    value={editing.category}
                    onChange={(e) => setEditing((ed) => ({ ...ed, category: e.target.value }))}
                    className={inputClass}
                    list="preset-cat-suggest"
                  />
                </div>
                <div>
                  <label className={labelClass}>名称（按钮文案）</label>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing((ed) => ({ ...ed, name: e.target.value }))}
                    className={inputClass}
                    placeholder="如 学历/性别/是非..."
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.enabled}
                      onChange={(e) => setEditing((ed) => ({ ...ed, enabled: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    启用
                  </label>
                  <div className="flex-1">
                    <label className={labelClass}>排序</label>
                    <input
                      type="number"
                      value={editing.sort}
                      onChange={(e) => setEditing((ed) => ({ ...ed, sort: parseInt(e.target.value, 10) || 0 }))}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">选项明细</div>
                <button
                  type="button"
                  onClick={() =>
                    setEditing((ed) => ({
                      ...ed,
                      items: [
                        ...(ed.items ?? []),
                        { sortOrder: (ed.items?.length ?? 0), label: `选项${(ed.items?.length ?? 0) + 1}` },
                      ],
                    }))
                  }
                  className="text-blue-600 hover:underline text-sm"
                >
                  添加选项
                </button>
              </div>

              <div className="space-y-2">
                {(editing.items ?? []).map((it, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-gray-100">
                    <input
                      value={it.label ?? ''}
                      onChange={(e) =>
                        setEditing((ed) => {
                          const next = (ed.items ?? []).slice()
                          next[idx] = { ...next[idx], label: e.target.value }
                          return { ...ed, items: next }
                        })
                      }
                      className={inputClass + ' flex-1 min-w-0'}
                      placeholder="选项文案"
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 text-sm shrink-0">
                      <input
                        type="checkbox"
                        checked={it.allowFill === true}
                        onChange={(e) =>
                          setEditing((ed) => {
                            const next = (ed.items ?? []).slice()
                            next[idx] = { ...next[idx], allowFill: e.target.checked }
                            return { ...ed, items: next }
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      允许填空
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditing((ed) => ({ ...ed, items: (ed.items ?? []).filter((_, i) => i !== idx) }))}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm shrink-0"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 left-0 w-full bg-white border-t border-gray-100 z-10 px-6 pb-4 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  {!editing.isNew && (
                    <button
                      type="button"
                      onClick={remove}
                      disabled={editing.deleting || editing.saving}
                      className="px-4 py-2 rounded-lg font-medium border border-red-200 bg-white text-red-700 hover:bg-red-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editing.deleting ? '删除中...' : '删除'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeEditing}
                    disabled={editing.saving || editing.deleting}
                    className="px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    关闭
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={editing.saving || editing.deleting}
                    className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editing.saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

