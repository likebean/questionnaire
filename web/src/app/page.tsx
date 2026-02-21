'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">欢迎使用问卷系统</h1>
        <p className="text-gray-600 mb-6">高校问卷管理与填写。您已登录，可进入「我的问卷」查看或创建问卷。</p>
        <Link
          href="/surveys"
          className="inline-block py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          我的问卷
        </Link>
      </div>
    </div>
  )
}
