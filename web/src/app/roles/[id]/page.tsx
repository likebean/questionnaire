'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  rolesApi,
  permissionsApi,
  type RoleVO,
  type PermissionVO,
} from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

export default function EditRolePage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const [role, setRole] = useState<RoleVO | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [allPermissions, setAllPermissions] = useState<PermissionVO[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [permSubmitting, setPermSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    rolesApi.getById(id).then((res) => {
      if (res.code === 200 && res.data) {
        setRole(res.data)
        setCode(res.data.code)
        setName(res.data.name)
        setDescription(res.data.description ?? '')
      }
    })
    rolesApi.getPermissionIds(id).then((res) => {
      if (res.code === 200 && res.data) setSelectedIds(new Set(res.data))
    })
    permissionsApi.getAll().then((res) => {
      if (res.code === 200 && res.data) setAllPermissions(res.data)
    })
  }, [id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    rolesApi
      .update(id, {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
      })
      .then((res) => {
        if (res.code === 200) router.push('/roles')
        else setError(res.message || '更新失败')
      })
      .catch(() => setError('请求失败'))
      .finally(() => setSubmitting(false))
  }

  const togglePermission = (permId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
  }

  const handleSavePermissions = () => {
    setPermSubmitting(true)
    rolesApi
      .assignPermissions(id, Array.from(selectedIds))
      .then((res) => {
        if (res.code === 200) {
          setError('')
          alert('权限已保存')
        } else setError(res.message || '保存权限失败')
      })
      .catch(() => setError('请求失败'))
      .finally(() => setPermSubmitting(false))
  }

  if (!role)
    return (
      <div className="p-0 text-gray-500">加载中...</div>
    )

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">编辑角色</h1>
      <div className="bg-white rounded-lg shadow-card p-8 mb-6">
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className={labelClass}>角色编码</label>
              <input
                type="text"
                required
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>角色名称</label>
              <input
                type="text"
                required
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>描述</label>
              <input
                type="text"
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              href="/roles"
              className="px-5 py-2 rounded-lg font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              取消
            </Link>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-card p-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">分配权限</h2>
        <p className="text-sm text-gray-500 mb-4">勾选该角色拥有的权限，然后点击「保存权限」。</p>
        <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allPermissions.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => togglePermission(p.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">
                  {p.name}
                  {(p.resourceType || p.action) && (
                    <span className="text-gray-400 ml-1">
                      ({[p.resourceType, p.action].filter(Boolean).join(' / ')})
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {allPermissions.length === 0 && (
            <p className="text-sm text-gray-400">暂无权限数据</p>
          )}
        </div>
        <button
          type="button"
          disabled={permSubmitting}
          className="px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          onClick={handleSavePermissions}
        >
          {permSubmitting ? '保存中...' : '保存权限'}
        </button>
      </div>
    </div>
  )
}
