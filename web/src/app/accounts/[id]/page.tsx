'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { accountsApi, type AccountVO } from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

export default function EditAccountPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const [account, setAccount] = useState<AccountVO | null>(null)
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    accountsApi.getById(id).then((res) => {
      if (res.code === 200 && res.data) {
        setAccount(res.data)
        setLoginId(res.data.loginId)
      }
    })
  }, [id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const body: { loginId?: string; password?: string } = {}
    if (loginId.trim() !== (account?.loginId ?? '')) body.loginId = loginId.trim()
    if (password) body.password = password
    if (Object.keys(body).length === 0) {
      setError('请修改登录标识或填写新密码后再保存')
      setSubmitting(false)
      return
    }
    accountsApi
      .update(id, body)
      .then((res) => {
        if (res.code === 200) router.push('/accounts')
        else setError(res.message || '更新失败')
      })
      .catch(() => setError('请求失败'))
      .finally(() => setSubmitting(false))
  }

  if (!account)
    return <div className="p-0 text-gray-500">加载中...</div>

  const isLocal = account.authSource === 'local'

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">编辑账号</h1>
      <div className="bg-white rounded-lg shadow-card p-8">
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className={labelClass}>账号ID</label>
              <input type="text" className={inputClass + ' bg-gray-50'} value={id} readOnly />
            </div>
            <div>
              <label className={labelClass}>用户ID</label>
              <input
                type="text"
                className={inputClass + ' bg-gray-50'}
                value={account.userId}
                readOnly
              />
            </div>
            <div>
              <label className={labelClass}>认证来源</label>
              <input
                type="text"
                className={inputClass + ' bg-gray-50'}
                value={account.authSource === 'local' ? '本地认证' : account.authSource}
                readOnly
              />
            </div>
            <div>
              <label className={labelClass}>登录标识</label>
              <input
                type="text"
                className={inputClass}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="登录标识"
              />
            </div>
            {isLocal && (
              <div className="col-span-2">
                <label className={labelClass}>新密码（不修改请留空）</label>
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="留空表示不修改密码"
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
              {submitting ? '保存中...' : '保存'}
            </button>
            <Link
              href="/accounts"
              className="px-5 py-2 rounded-lg font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              取消
            </Link>
            <Link
              href={`/users/${account.userId}`}
              className="px-5 py-2 rounded-lg font-semibold text-blue-600 hover:text-blue-700"
            >
              该用户
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
