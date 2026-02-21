/**
 * 登录页：展示表单与 CAS 链接；提交时调用登录接口，成功跳转首页。
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import LoginPage from '../page'
import * as api from '@/services/api'

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}))

jest.mock('@/services/api', () => ({
  authApi: {
    login: jest.fn(),
    getCasLoginUrl: () => '/api/auth/cas/login',
  },
}))

const authApi = api.authApi as jest.Mocked<typeof api.authApi>

// 避免 submit 导致真实跳转
const mockLocation = { href: '', assign: jest.fn(), replace: jest.fn() }
Object.defineProperty(window, 'location', { value: mockLocation, writable: true })

beforeEach(() => {
  jest.clearAllMocks()
  mockLocation.href = ''
})

describe('登录页', () => {
  it('展示标题、用户名、密码、本地登录按钮和统一身份登录链接', () => {
    render(<LoginPage />)
    expect(screen.getByText('问卷系统')).toBeInTheDocument()
    expect(screen.getByLabelText(/用户名/)).toBeInTheDocument()
    expect(screen.getByLabelText(/密码/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '本地登录' })).toBeInTheDocument()
    const casLink = screen.getByRole('link', { name: /统一身份登录/ })
    expect(casLink).toBeInTheDocument()
    expect(casLink).toHaveAttribute('href', '/api/auth/cas/login')
  })

  it('提交表单时调用 authApi.login，成功则跳转首页', async () => {
    authApi.login.mockResolvedValue({ code: 200, message: 'ok', data: null })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/用户名/), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/密码/), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('button', { name: '本地登录' }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('admin', 'admin123')
    })
    await waitFor(() => {
      expect(window.location.href).toBe('/')
    })
  })

  it('登录接口返回非 200 时显示错误信息', async () => {
    authApi.login.mockResolvedValue({ code: 401, message: '用户名或密码错误', data: null })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/用户名/), { target: { value: 'wrong' } })
    fireEvent.change(screen.getByLabelText(/密码/), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: '本地登录' }))

    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument()
    })
    expect(window.location.href).not.toBe('/')
  })
})
