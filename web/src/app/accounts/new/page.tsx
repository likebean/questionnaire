'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { accountsApi } from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

export default function NewAccountPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [loginId, setLoginId] = useState('')
  const [authSource, setAuthSource] = useState<'local' | 'cas'>('local')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (authSource === 'local' && !password.trim()) {
      setError('本地账号需填写密码')
      return
    }
    setSubmitting(true)
    accountsApi
      .create({
        userId,
        loginId,
        authSource,
        password: authSource === 'local' ? password : undefined,
      })
      .then((res) => {
        if (res.code === 200) router.push('/accounts')
        else setError(res.message || '创建失败')
      })
      .catch(() => setError('请求失败'))
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">新增账号</h1>
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
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="请输入用户ID"
              />
            </div>
            <div>
              <label className={labelClass}>
                登录标识 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={inputClass}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="请输入登录标识"
              />
            </div>
            <div>
              <label className={labelClass}>
                认证来源 <span className="text-red-500">*</span>
              </label>
              <select
                className={inputClass}
                value={authSource}
                onChange={(e) => setAuthSource(e.target.value as 'local' | 'cas')}
              >
                <option value="local">本地认证</option>
                <option value="cas">CAS认证</option>
              </select>
            </div>
            {authSource === 'local' && (
              <div>
                <label className={labelClass}>
                  密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
            )}
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
              href="/accounts"
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
