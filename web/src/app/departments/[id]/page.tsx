'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { departmentsApi, type DepartmentVO } from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

export default function EditDepartmentPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const [department, setDepartment] = useState<DepartmentVO | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<number | ''>('')
  const [sort, setSort] = useState<number | ''>('')
  const [allDepts, setAllDepts] = useState<DepartmentVO[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    departmentsApi.getById(id).then((res) => {
      if (res.code === 200 && res.data) {
        setDepartment(res.data)
        setCode(res.data.code)
        setName(res.data.name)
        setParentId(res.data.parentId ?? '')
        setSort(res.data.sort ?? '')
      }
    })
    departmentsApi.getAll().then((res) => {
      if (res.code === 200 && res.data) setAllDepts(res.data.filter((d) => d.id !== id))
    })
  }, [id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    departmentsApi
      .update(id, {
        code: code.trim(),
        name: name.trim(),
        parentId: parentId === '' ? null : parentId,
        sort: sort === '' ? null : sort,
      })
      .then((res) => {
        if (res.code === 200) router.push('/departments')
        else setError(res.message || '更新失败')
      })
      .catch(() => setError('请求失败'))
      .finally(() => setSubmitting(false))
  }

  if (!department) return <div className="p-0 text-gray-500">加载中...</div>

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">编辑院系</h1>
      <div className="bg-white rounded-lg shadow-card p-8">
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className={labelClass}>院系编码</label>
              <input
                type="text"
                required
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>名称</label>
              <input
                type="text"
                required
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>上级院系</label>
              <select
                className={inputClass}
                value={parentId}
                onChange={(e) => setParentId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">无（根级）</option>
                {allDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}（{d.code}）
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>排序</label>
              <input
                type="number"
                className={inputClass}
                value={sort}
                onChange={(e) => setSort(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
            <Link
              href="/departments"
              className="px-5 py-2 rounded-lg font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              取消
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
