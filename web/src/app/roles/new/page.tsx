'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { rolesApi } from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

export default function NewRolePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    rolesApi
      .create({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
      })
      .then((res) => {
        if (res.code === 200) router.push('/roles')
        else setError(res.message || '创建失败')
      })
      .catch(() => setError('请求失败'))
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">新增角色</h1>
      <div className="bg-white rounded-lg shadow-card p-8">
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className={labelClass}>
                角色编码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="如 SCHOOL_ADMIN"
              />
            </div>
            <div>
              <label className={labelClass}>
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如 校管"
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
              {submitting ? '提交中...' : '保存'}
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
    </div>
  )
}
