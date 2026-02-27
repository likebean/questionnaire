'use client'

import { useEffect, type ReactNode } from 'react'

export default function ConfirmDialog({
  open,
  loading = false,
  title = '确认操作',
  description,
  confirmText = '确认',
  cancelText = '取消',
  onClose,
  onConfirm,
}: {
  open: boolean
  loading?: boolean
  title?: string
  description: ReactNode
  confirmText?: string
  cancelText?: string
  onClose: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, loading, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4"
      onClick={(e) => {
        if (loading) return
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-xl border border-gray-200 shadow-lg bg-white focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-6 top-6 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none !bg-transparent hover:!bg-transparent focus:!bg-transparent active:!bg-transparent"
          aria-label="关闭"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-gray-400"
          >
            <path d="M15 5 5 15" />
            <path d="m5 5 10 10" />
          </svg>
          <span className="sr-only">关闭</span>
        </button>

        <div className="p-6">
          <div className="flex justify-center text-red-500 mb-4">
            <i className="fas fa-exclamation-triangle text-4xl" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 text-center">{title}</h3>
          <div className="text-gray-600 mt-4 text-center text-sm">{description}</div>
          <div className="mt-6 flex justify-center space-x-4">
            <button
              type="button"
              className="px-5 py-2 rounded-lg font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onConfirm}
              disabled={loading}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

