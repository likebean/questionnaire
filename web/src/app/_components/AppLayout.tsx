'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/app/_components/AuthContext'
import { UserMenu } from '@/app/_components/UserMenu'
import Menu from '@/app/_components/Menu'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  return (
    <>
      {/* 顶部导航栏：与 ai-plugin 一致 */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link
            href="/"
            className="text-xl font-bold text-blue-600 flex items-center"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">问</span>
            </div>
            <span>问卷系统</span>
          </Link>
        </div>
        <div className="flex items-center space-x-8">
          <UserMenu />
        </div>
      </nav>
      {/* 主体：左侧菜单 + 主内容区 */}
      <div className="flex h-[calc(100vh-64px)]">
        <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 h-full">
          <div className="pt-5 pb-5 px-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">主导航</h2>
            </div>
          </div>
          <Menu />
        </aside>
        <main className="flex-1 min-w-0 p-8 overflow-auto bg-gray-100">
          {children}
        </main>
      </div>
    </>
  )
}
