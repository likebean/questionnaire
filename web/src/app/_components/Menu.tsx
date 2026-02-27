'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'

export default function Menu() {
  const pathname = usePathname()
  const { user } = useAuth()

  const isSchoolAdmin = user?.roleCodes?.includes('SCHOOL_ADMIN')

  const mainItems = [
    { href: '/', icon: 'fas fa-home', label: '首页' },
    { href: '/surveys', icon: 'fas fa-list-alt', label: '我的问卷' },
  ]

  const adminItems = [
    { href: '/users', icon: 'fas fa-users', label: '用户管理' },
    { href: '/accounts', icon: 'fas fa-key', label: '账号管理' },
    { href: '/departments', icon: 'fas fa-sitemap', label: '院系管理' },
    { href: '/roles', icon: 'fas fa-user-tag', label: '角色管理' },
    { href: '/permissions', icon: 'fas fa-shield-alt', label: '权限管理' },
    { href: '/preset-options', icon: 'fas fa-list-check', label: '预定义选项' },
  ]

  const groups: { group: string; items: typeof mainItems }[] = [
    { group: '主导航', items: mainItems },
  ]
  if (isSchoolAdmin) {
    groups.push({ group: '系统管理', items: adminItems })
  }

  return (
    <nav className="mt-2">
      {groups.map((g) => (
        <div key={g.group}>
          <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {g.group}
          </div>
          {g.items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  'flex items-center px-6 py-3 border-l-4 transition ' +
                  (active
                    ? 'bg-blue-50 text-blue-600 border-blue-600 font-semibold shadow-sm'
                    : 'text-gray-700 border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600')
                }
              >
                <i className={`${item.icon} mr-3 w-4`} />
                <span className="text-left">{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
