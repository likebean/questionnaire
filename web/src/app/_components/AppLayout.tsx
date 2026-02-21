'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/app/_components/AuthContext'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname?.startsWith('/auth/login') ?? false

  useEffect(() => {
    if (loading) return
    if (!isLoginPage && !user) {
      router.replace('/auth/login')
    }
  }, [loading, user, isLoginPage, router])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-gray-800 hover:text-blue-600">
              问卷系统
            </Link>
            <Link href="/surveys" className="text-gray-600 hover:text-blue-600">
              我的问卷
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.nickname || user.id}</span>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              退出
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
