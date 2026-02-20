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

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response.data as ApiResponse<unknown>,
  (error) => Promise.reject(error)
)

export const healthApi = {
  getHealth: (): Promise<ApiResponse<HealthVO>> =>
    apiClient.get('/health') as Promise<ApiResponse<HealthVO>>,
}
