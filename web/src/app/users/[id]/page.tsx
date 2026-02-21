'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { usersApi, rolesApi, type UserVO, type RoleVO } from '@/services/api'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3'
const labelClass = 'block text-sm text-gray-600 mb-1'

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [user, setUser] = useState<UserVO | null>(null)
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [allRoles, setAllRoles] = useState<RoleVO[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [rolesSubmitting, setRolesSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    usersApi.getById(id).then((res) => {
      if (res.code === 200 && res.data) {
        setUser(res.data)
        setNickname(res.data.nickname ?? '')
        setEmail(res.data.email ?? '')
        setPhone(res.data.phone ?? '')
      }
    })
    usersApi.getRoleIds(id).then((res) => {
      if (res.code === 200 && res.data) setSelectedRoleIds(new Set(res.data))
    })
    rolesApi.query({ page: 1, pageSize: 200 }).then((res) => {
      if (res.code === 200 && res.data) setAllRoles(res.data.items)
    })
  }, [id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    usersApi
      .update(id, { nickname: nickname || null, email: email || null, phone: phone || null })
      .then((res) => {
        if (res.code === 200) router.push('/users')
        else setError(res.message || '更新失败')
      })
      .catch(() => setError('请求失败'))
      .finally(() => setSubmitting(false))
  }

  if (!user)
    return (
      <div className="p-0 text-gray-500">加载中...</div>
    )

  return (
    <div className="p-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">编辑用户</h1>
      <div className="bg-white rounded-lg shadow-card p-8">
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className={labelClass}>用户ID</label>
              <input type="text" className={inputClass + ' bg-gray-50'} value={id} readOnly />
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
              {submitting ? '保存中...' : '保存'}
            </button>
            <Link
              href="/users"
              className="px-5 py-2 rounded-lg font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              取消
            </Link>
            <Link
              href={`/accounts?userId=${id}`}
              className="px-5 py-2 rounded-lg font-semibold text-blue-600 hover:text-blue-700"
            >
              该用户账号
            </Link>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-card p-8 mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">角色分配</h2>
        <p className="text-sm text-gray-500 mb-4">勾选该用户拥有的角色，然后点击「保存角色」。</p>
        <div className="flex flex-wrap gap-4 mb-4">
          {allRoles.map((r) => (
            <label
              key={r.id}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={selectedRoleIds.has(r.id)}
                onChange={() => {
                  setSelectedRoleIds((prev) => {
                    const next = new Set(prev)
                    if (next.has(r.id)) next.delete(r.id)
                    else next.add(r.id)
                    return next
                  })
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">
                {r.name} <span className="text-gray-400">({r.code})</span>
              </span>
            </label>
          ))}
        </div>
        {allRoles.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">暂无角色数据</p>
        )}
        <button
          type="button"
          disabled={rolesSubmitting}
          className="px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          onClick={async () => {
            setRolesSubmitting(true)
            setError('')
            try {
              const res = await usersApi.setRoles(id, Array.from(selectedRoleIds))
              if (res.code === 200) alert('角色已保存')
              else setError(res.message || '保存角色失败')
            } catch {
              setError('请求失败')
            } finally {
              setRolesSubmitting(false)
            }
          }}
        >
          {rolesSubmitting ? '保存中...' : '保存角色'}
        </button>
      </div>
    </div>
  )
}
