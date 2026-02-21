/**
 * 访问受限资源时未登录应跳转到登录页；登录页不触发跳转。
 */
import { render, screen, waitFor } from '@testing-library/react'
import { usePathname, useRouter } from 'next/navigation'
import { AppLayout } from '../_components/AppLayout'
import * as api from '@/services/api'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}))

jest.mock('@/services/api', () => ({
  authApi: {
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
  },
}))

const mockReplace = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// AuthProvider 内部会调 getCurrentUser，需要把 AuthProvider 也包进来才能测到“未登录则 replace”
// 这里直接测 AppLayout：传入 useAuth 的返回值（通过 mock AuthContext 或 渲染带 Provider 的树）
// 最简单：mock 整个 AuthProvider 的 useAuth，让 AppLayout 拿到 user=null, loading=false, path 非登录页
jest.mock('@/app/_components/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const useAuth = require('@/app/_components/AuthContext').useAuth as jest.MockedFunction<
  () => { user: api.CurrentUserVO | null; loading: boolean; logout: () => Promise<void> }
>

beforeEach(() => {
  jest.clearAllMocks()
  mockUseRouter.mockReturnValue({ replace: mockReplace } as any)
})

describe('AppLayout - 访问受限与登录页', () => {
  it('未登录且不在登录页时，应跳转到 /auth/login', async () => {
    mockUsePathname.mockReturnValue('/')
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      logout: jest.fn(),
    })

    render(
      <AppLayout>
        <div>受限内容</div>
      </AppLayout>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/auth/login')
    })
  })

  it('未登录但在登录页时，不触发 replace，直接渲染子内容', () => {
    mockUsePathname.mockReturnValue('/auth/login')
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      logout: jest.fn(),
    })

    render(
      <AppLayout>
        <div>登录页内容</div>
      </AppLayout>
    )

    expect(mockReplace).not.toHaveBeenCalled()
    expect(screen.getByText('登录页内容')).toBeInTheDocument()
  })

  it('已登录时渲染子内容及顶栏', () => {
    mockUsePathname.mockReturnValue('/')
    useAuth.mockReturnValue({
      user: { id: 'u1', nickname: '测试用户', roleCodes: [], email: null, phone: null, identityType: null, departmentId: null },
      loading: false,
      logout: jest.fn(),
    })

    render(
      <AppLayout>
        <div>首页内容</div>
      </AppLayout>
    )

    expect(mockReplace).not.toHaveBeenCalled()
    expect(screen.getByText('首页内容')).toBeInTheDocument()
    expect(screen.getByText('测试用户')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '我的问卷' })).toBeInTheDocument()
    // 用户菜单（顶栏触发按钮，下拉内才有「退出登录」）
    expect(screen.getByRole('button', { name: /测试用户/ })).toBeInTheDocument()
  })
})
