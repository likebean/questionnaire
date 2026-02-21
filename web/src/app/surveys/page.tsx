'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/_components/AuthContext'

export default function MySurveysPage() {
  const { user } = useAuth()
  const [list, setList] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/surveys', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data && Array.isArray(data.data)) setList(data.data)
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">我的问卷</h1>
        {user && (
          <p className="text-gray-600 mb-6">
            当前用户：{user.nickname || user.id}
            {user.roleCodes?.length ? `（${user.roleCodes.join('、')}）` : ''}
          </p>
        )}
        {loading ? (
          <p className="text-gray-500">加载中...</p>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            暂无问卷。问卷 CRUD 将在步骤 3 实现。
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((item: unknown, i: number) => (
              <li key={i} className="bg-white rounded-lg shadow p-4">
                {JSON.stringify(item)}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6">
          <Link href="/" className="text-blue-600 hover:underline">
            返回首页
          </Link>
        </p>
    </div>
  )
}
