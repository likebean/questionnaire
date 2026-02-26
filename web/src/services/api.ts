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

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface UserVO {
  id: string
  nickname: string | null
  email: string | null
  phone: string | null
  identityType: string | null
  departmentId: number | null
  createdAt?: string
  updatedAt?: string
}

export interface AccountVO {
  id: number
  userId: string
  loginId: string
  authSource: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateAccountRequest {
  userId: string
  loginId: string
  authSource: string
  password?: string
}

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

apiClient.interceptors.response.use(
  (response) => response.data as unknown as typeof response,
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

export const usersApi = {
  query: (params?: { keyword?: string; departmentId?: number; page?: number; pageSize?: number }) =>
    apiClient.get('/users/query', { params }) as Promise<ApiResponse<PaginatedResponse<UserVO>>>,
  getById: (id: string) =>
    apiClient.get(`/users/${id}`) as Promise<ApiResponse<UserVO>>,
  create: (user: Partial<UserVO>) =>
    apiClient.post('/users', user) as Promise<ApiResponse<null>>,
  update: (id: string, user: Partial<UserVO>) =>
    apiClient.put(`/users/${id}`, user) as Promise<ApiResponse<null>>,
  delete: (id: string) =>
    apiClient.delete(`/users/${id}`) as Promise<ApiResponse<null>>,
  getRoleIds: (userId: string) =>
    apiClient.get(`/users/${userId}/roles`) as Promise<ApiResponse<number[]>>,
  setRoles: (userId: string, roleIds: number[]) =>
    apiClient.put(`/users/${userId}/roles`, roleIds) as Promise<ApiResponse<null>>,
}

export interface UpdateAccountRequest {
  loginId?: string
  password?: string
}

export const accountsApi = {
  query: (params?: { keyword?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/accounts/query', { params }) as Promise<ApiResponse<PaginatedResponse<AccountVO>>>,
  getById: (id: number) =>
    apiClient.get(`/accounts/${id}`) as Promise<ApiResponse<AccountVO>>,
  getByUserId: (userId: string) =>
    apiClient.get(`/accounts/user/${userId}`) as Promise<ApiResponse<AccountVO[]>>,
  create: (data: CreateAccountRequest) =>
    apiClient.post('/accounts', data) as Promise<ApiResponse<null>>,
  update: (id: number, data: UpdateAccountRequest) =>
    apiClient.put(`/accounts/${id}`, data) as Promise<ApiResponse<null>>,
  delete: (id: number) =>
    apiClient.delete(`/accounts/${id}`) as Promise<ApiResponse<null>>,
}

export interface RoleVO {
  id: number
  code: string
  name: string
  description: string | null
  sort: number | null
  createdAt?: string
  updatedAt?: string
}

export interface PermissionVO {
  id: number
  name: string
  resourceType: string | null
  action: string | null
  dataScope: string | null
  description: string | null
  createdAt?: string
  updatedAt?: string
}

export const rolesApi = {
  query: (params?: { keyword?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/roles/query', { params }) as Promise<ApiResponse<PaginatedResponse<RoleVO>>>,
  getById: (id: number) =>
    apiClient.get(`/roles/${id}`) as Promise<ApiResponse<RoleVO>>,
  create: (role: { name: string; code: string; description?: string | null; sort?: number | null }) =>
    apiClient.post('/roles', role) as Promise<ApiResponse<null>>,
  update: (id: number, role: { name?: string; code?: string; description?: string | null; sort?: number | null }) =>
    apiClient.put(`/roles/${id}`, role) as Promise<ApiResponse<null>>,
  delete: (id: number) =>
    apiClient.delete(`/roles/${id}`) as Promise<ApiResponse<null>>,
  getPermissionIds: (roleId: number) =>
    apiClient.get(`/roles/${roleId}/permissions`) as Promise<ApiResponse<number[]>>,
  assignPermissions: (roleId: number, permissionIds: number[]) =>
    apiClient.put(`/roles/${roleId}/permissions`, permissionIds) as Promise<ApiResponse<null>>,
}

export const permissionsApi = {
  query: (params?: { keyword?: string; resourceType?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/permissions/query', { params }) as Promise<ApiResponse<PaginatedResponse<PermissionVO>>>,
  getAll: () =>
    apiClient.get('/permissions/all') as Promise<ApiResponse<PermissionVO[]>>,
  getById: (id: number) =>
    apiClient.get(`/permissions/${id}`) as Promise<ApiResponse<PermissionVO>>,
  update: (id: number, data: { name?: string; description?: string | null }) =>
    apiClient.put(`/permissions/${id}`, data) as Promise<ApiResponse<null>>,
}

export interface DepartmentVO {
  id: number
  code: string
  name: string
  parentId: number | null
  level: number | null
  sort: number | null
  createdAt?: string
  updatedAt?: string
}

export const departmentsApi = {
  query: (params?: { keyword?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/departments/query', { params }) as Promise<ApiResponse<PaginatedResponse<DepartmentVO>>>,
  getAll: () =>
    apiClient.get('/departments/all') as Promise<ApiResponse<DepartmentVO[]>>,
  getById: (id: number) =>
    apiClient.get(`/departments/${id}`) as Promise<ApiResponse<DepartmentVO>>,
  create: (data: { code: string; name: string; parentId?: number | null; sort?: number | null }) =>
    apiClient.post('/departments', data) as Promise<ApiResponse<DepartmentVO | null>>,
  update: (id: number, data: { code?: string; name?: string; parentId?: number | null; sort?: number | null }) =>
    apiClient.put(`/departments/${id}`, data) as Promise<ApiResponse<null>>,
  delete: (id: number) =>
    apiClient.delete(`/departments/${id}`) as Promise<ApiResponse<null>>,
}

// ---------- 问卷 ----------
export interface SurveyListItemVO {
  id: string
  title: string
  status: string
  responseCount?: number
  updatedAt?: string
  createdAt?: string
}

export interface SurveyListResponse {
  list: SurveyListItemVO[]
  total: number
}

export interface SurveyQuestionVO {
  id?: number
  surveyId?: string
  sortOrder?: number
  type: string
  title: string
  description?: string | null
  required?: boolean
  config?: string | null
}

export interface SurveyDetailVO {
  id: string
  title: string
  description?: string | null
  status: string
  creatorId?: string
  limitOncePerUser?: boolean
  allowAnonymous?: boolean
  startTime?: string | null
  endTime?: string | null
  thankYouText?: string | null
  limitByIp?: number
  limitByDevice?: number
  createdAt?: string
  updatedAt?: string
  questions: SurveyQuestionVO[]
}

export interface FillSurveyVO {
  id: string
  title: string
  description?: string | null
  thankYouText?: string | null
  questions: SurveyQuestionVO[]
}

export interface SubmitItemDTO {
  questionId: number
  optionIndex?: number
  optionIndices?: number[]
  textValue?: string
  scaleValue?: number
}

export interface SubmitRequestDTO {
  items: SubmitItemDTO[]
  durationSeconds?: number
  deviceId?: string | null
}

export interface UpdateSettingsDTO {
  limitOncePerUser?: boolean
  allowAnonymous?: boolean
  startTime?: string | null
  endTime?: string | null
  thankYouText?: string | null
  limitByIp?: number | null
  limitByDevice?: number | null
}

export const surveysApi = {
  list: (params?: { onlyMine?: boolean; status?: string; keyword?: string; page?: number; pageSize?: number; sort?: string }) =>
    apiClient.get('/surveys', { params }) as Promise<ApiResponse<SurveyListResponse>>,
  create: (data: { title?: string; description?: string }) =>
    apiClient.post('/surveys', data) as Promise<ApiResponse<{ id: string }>>,
  getDetail: (id: string) =>
    apiClient.get(`/surveys/${id}`) as Promise<ApiResponse<SurveyDetailVO>>,
  updateBasic: (id: string, data: { title?: string; description?: string }) =>
    apiClient.put(`/surveys/${id}`, data) as Promise<ApiResponse<null>>,
  updateSettings: (id: string, data: UpdateSettingsDTO) =>
    apiClient.put(`/surveys/${id}/settings`, data) as Promise<ApiResponse<null>>,
  publish: (id: string) => apiClient.post(`/surveys/${id}/publish`) as Promise<ApiResponse<null>>,
  pause: (id: string) => apiClient.post(`/surveys/${id}/pause`) as Promise<ApiResponse<null>>,
  resume: (id: string) => apiClient.post(`/surveys/${id}/resume`) as Promise<ApiResponse<null>>,
  end: (id: string) => apiClient.post(`/surveys/${id}/end`) as Promise<ApiResponse<null>>,
  copy: (id: string) => apiClient.post(`/surveys/${id}/copy`) as Promise<ApiResponse<{ id: string }>>,
  delete: (id: string) => apiClient.delete(`/surveys/${id}`) as Promise<ApiResponse<null>>,
  getFillUrl: (id: string) =>
    apiClient.get(`/surveys/${id}/fill-url`) as Promise<ApiResponse<{ fillUrl: string }>>,
  listQuestions: (surveyId: string) =>
    apiClient.get(`/surveys/${surveyId}/questions`) as Promise<ApiResponse<SurveyQuestionVO[]>>,
  addQuestion: (surveyId: string, question: Partial<SurveyQuestionVO>) =>
    apiClient.post(`/surveys/${surveyId}/questions`, question) as Promise<ApiResponse<SurveyQuestionVO>>,
  updateQuestion: (surveyId: string, questionId: number, question: Partial<SurveyQuestionVO>) =>
    apiClient.put(`/surveys/${surveyId}/questions/${questionId}`, question) as Promise<ApiResponse<null>>,
  updateQuestionOrder: (surveyId: string, questionIds: number[]) =>
    apiClient.put(`/surveys/${surveyId}/questions/order`, questionIds) as Promise<ApiResponse<null>>,
  copyQuestion: (surveyId: string, questionId: number) =>
    apiClient.post(`/surveys/${surveyId}/questions/${questionId}/copy`) as Promise<ApiResponse<SurveyQuestionVO>>,
  deleteQuestion: (surveyId: string, questionId: number) =>
    apiClient.delete(`/surveys/${surveyId}/questions/${questionId}`) as Promise<ApiResponse<null>>,
  listResponses: (surveyId: string, params?: { page?: number; pageSize?: number }) =>
    apiClient.get(`/surveys/${surveyId}/responses`, { params }) as Promise<ApiResponse<ResponseListResponse>>,
  getResponseDetail: (surveyId: string, responseId: number) =>
    apiClient.get(`/surveys/${surveyId}/responses/${responseId}`) as Promise<ApiResponse<ResponseDetailVO>>,
  getAnalytics: (surveyId: string) =>
    apiClient.get(`/surveys/${surveyId}/analytics`) as Promise<ApiResponse<AnalyticsResponse>>,
  exportResponses: (surveyId: string) =>
    apiClient.get(`/surveys/${surveyId}/export`, { responseType: 'blob' }) as Promise<Blob>,
}

export interface ResponseListItemVO {
  id: number
  submittedAt: string
  durationSeconds?: number
  summary?: string
}

export interface ResponseListResponse {
  list: ResponseListItemVO[]
  total: number
}

export interface ResponseDetailItemVO {
  questionId: number
  questionTitle: string
  type: string
  answerText: string
}

export interface ResponseDetailVO {
  id: number
  submittedAt: string
  durationSeconds?: number
  items: ResponseDetailItemVO[]
}

export interface AnalyticsOptionSummary {
  optionIndex: number
  label: string
  count: number
  ratio: number
}

export interface AnalyticsScaleSummary {
  avg: number
  distribution: { value: number; count: number }[]
}

export interface AnalyticsQuestionVO {
  questionId: number
  type: string
  title: string
  summary: AnalyticsOptionSummary[] | AnalyticsScaleSummary | string[]
}

export interface AnalyticsResponse {
  questions: AnalyticsQuestionVO[]
}

export const fillApi = {
  getMetadata: (id: string, preview?: boolean) =>
    apiClient.get(`/fill/${id}`, { params: preview ? { preview: 'true' } : undefined }) as Promise<ApiResponse<FillSurveyVO>>,
  submit: (id: string, data: SubmitRequestDTO) =>
    apiClient.post(`/fill/${id}/submit`, data) as Promise<ApiResponse<null>>,
  getDraft: (id: string, deviceId?: string | null) =>
    apiClient.get(`/fill/${id}/draft`, { params: deviceId ? { deviceId } : undefined }) as Promise<ApiResponse<SubmitItemDTO[]>>,
  saveDraft: (id: string, data: { items: SubmitItemDTO[]; deviceId?: string | null }) =>
    apiClient.post(`/fill/${id}/draft`, data) as Promise<ApiResponse<null>>,
}
