'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from './AuthContext'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const displayName = user.nickname || user.id

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-gray-700">{displayName}</p>
        </div>
        <i
          className={`fas fa-chevron-down text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-100">
          <button
            type="button"
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              setIsOpen(false)
              logout()
            }}
          >
            <i className="fas fa-sign-out-alt mr-2" />
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}
