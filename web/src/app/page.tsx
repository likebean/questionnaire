'use client'

import { useEffect, useState } from 'react'
import { healthApi } from '@/services/api'
import type { HealthVO } from '@/services/api'

export default function Home() {
  const [health, setHealth] = useState<HealthVO | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    healthApi
      .getHealth()
      .then((res) => {
        if (res.code === 200 && res.data) setHealth(res.data)
        else setError(res.message || '请求失败')
      })
      .catch((e) => setError(e.message || '网络错误'))
  }, [])

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-danger mb-2">服务异常</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">请确认后端 API 已启动（默认 8080 端口）</p>
        </div>
      </main>
    )
  }

  if (!health) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">加载中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">问卷系统</h1>
        <p className="text-gray-600 mb-4">前后端已联通，健康检查正常。</p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">状态</dt>
            <dd className="font-medium text-primary">{health.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">服务</dt>
            <dd>{health.service}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">时间</dt>
            <dd>{health.timestamp}</dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
