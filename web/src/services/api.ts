import axios from 'axios'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface HealthVO {
  status: string
  service: string
  timestamp: string
}

export interface CurrentUserVO {
  id: string
  nickname: string | null
  email: string | null
  phone: string | null
  identityType: string | null
  departmentId: number | null
  roleCodes: string[]
}

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

apiClient.interceptors.response.use(
  (response) => response.data as ApiResponse<unknown>,
  (error) => Promise.reject(error)
)

export const healthApi = {
  getHealth: (): Promise<ApiResponse<HealthVO>> =>
    apiClient.get('/health') as Promise<ApiResponse<HealthVO>>,
}

export const authApi = {
  getCurrentUser: (): Promise<ApiResponse<CurrentUserVO>> =>
    apiClient.get('/auth/me') as Promise<ApiResponse<CurrentUserVO>>,

  login: (username: string, password: string): Promise<ApiResponse<unknown>> => {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)
    return apiClient.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }) as Promise<ApiResponse<unknown>>
  },

  logout: (): Promise<ApiResponse<unknown>> =>
    apiClient.post('/auth/logout') as Promise<ApiResponse<unknown>>,

  getCasLoginUrl: (): string => '/api/auth/cas/login',
}
