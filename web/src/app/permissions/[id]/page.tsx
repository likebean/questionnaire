'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { permissionsApi, type PermissionVO } from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

export default function EditPermissionPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const [permission, setPermission] = useState<PermissionVO | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    permissionsApi.getById(id).then((res) => {
      if (res.code === 200 && res.data) {
        setPermission(res.data)
        setName(res.data.name)
        setDescription(res.data.description ?? '')
      }
    })
  }, [id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    permissionsApi
      .update(id, { name: name.trim(), description: description.trim() || null })
      .then((res) => {
        if (res.code === 200) router.push('/permissions')
        else setError(res.message || '更新失败')
      })
      .catch(() => setError('请求失败'))
      .finally(() => setSubmitting(false))
  }

  if (!permission)
    return <div className="p-0 text-gray-500">加载中...</div>

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">编辑权限</h1>
      <div className="bg-white rounded-lg shadow-card p-8">
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className={labelClass}>权限ID</label>
              <input type="text" className={inputClass + ' bg-gray-50'} value={id} readOnly />
            </div>
            <div>
              <label className={labelClass}>资源类型</label>
              <input
                type="text"
                className={inputClass + ' bg-gray-50'}
                value={permission.resourceType ?? '-'}
                readOnly
              />
            </div>
            <div>
              <label className={labelClass}>操作</label>
              <input
                type="text"
                className={inputClass + ' bg-gray-50'}
                value={permission.action ?? '-'}
                readOnly
              />
            </div>
            <div>
              <label className={labelClass}>数据范围</label>
              <input
                type="text"
                className={inputClass + ' bg-gray-50'}
                value={permission.dataScope ?? '-'}
                readOnly
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>名称</label>
              <input
                type="text"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="权限名称"
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>描述</label>
              <input
                type="text"
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="可选"
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
              href="/permissions"
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
