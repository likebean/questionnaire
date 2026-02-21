'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usersApi } from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

export default function NewUserPage() {
  const router = useRouter()
  const [id, setId] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    usersApi
      .create({ id, nickname: nickname || null, email: email || null, phone: phone || null })
      .then((res) => {
        if (res.code === 200) router.push('/users')
        else setError(res.message || '创建失败')
      })
      .catch(() => setError('请求失败'))
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">新增用户</h1>
      <div className="bg-white rounded-lg shadow-card p-8">
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className={labelClass}>
                用户ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={inputClass}
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="请输入用户ID"
              />
            </div>
            <div>
              <label className={labelClass}>昵称</label>
              <input
                type="text"
                className={inputClass}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="请输入昵称"
              />
            </div>
            <div>
              <label className={labelClass}>邮箱</label>
              <input
                type="text"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <label className={labelClass}>手机</label>
              <input
                type="text"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
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
              href="/users"
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
