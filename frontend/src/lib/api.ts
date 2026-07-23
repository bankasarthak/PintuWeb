import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type {
  User,
  Character,
  Job,
  ChatSession,
  ChatMessage,
  ChatResponse,
  SceneItem,
  MoodItem,
  TemplatesResponse,
  PaginatedResponse,
  TokenResponse,
  TelegramLoginPayload,
  CreateCharacterPayload,
  UpdateCharacterPayload,
  CreateJobPayload,
  SendMessagePayload,
  GalleryJob,
  JobStatusResponse,
} from '@/types'
import { catalogDictToArray } from '@/lib/utils'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  withCredentials: true,
})

// ─── Token helpers ────────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

/** True when the user has a persisted JWT session (access and/or refresh token). */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false
  return !!(getAccessToken() || getRefreshToken())
}

/** Restore access token from refresh token when only refresh is present (e.g. after reload). */
export async function ensureAccessToken(): Promise<boolean> {
  if (getAccessToken()) return true
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const { data } = await axios.post<TokenResponse>(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/refresh`,
      { refresh_token: refreshToken }
    )
    setTokens(data.access_token, data.refresh_token)
    return true
  } catch {
    clearTokens()
    return false
  }
}

// ─── Request interceptor ─────────────────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor ────────────────────────────────────────────────────

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (reason: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = getRefreshToken()

      if (!refreshToken) {
        clearTokens()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post<TokenResponse>(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/refresh`,
          { refresh_token: refreshToken }
        )
        setTokens(data.access_token, data.refresh_token)
        processQueue(null, data.access_token)
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearTokens()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  loginGoogle: (idToken: string) =>
    api
      .post<TokenResponse>('/auth/google', { id_token: idToken })
      .then((r) => r.data),

  loginTelegram: (payload: TelegramLoginPayload) =>
    api.post<TokenResponse>('/auth/telegram/login', payload).then((r) => r.data),

  logout: () => {
    const refreshToken = getRefreshToken()
    return api
      .post('/auth/logout', { refresh_token: refreshToken })
      .then((r) => r.data)
  },

  refresh: (refreshToken: string) =>
    api
      .post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken })
      .then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),
}

// ─── Character API ────────────────────────────────────────────────────────────

export const characterApi = {
  list: () => api.get<Character[]>('/characters').then((r) => r.data),

  get: (id: string) => api.get<Character>(`/characters/${id}`).then((r) => r.data),

  create: (payload: CreateCharacterPayload, faceImage?: File) => {
    const form = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v))
    })
    if (faceImage) form.append('face_image', faceImage)
    return api.post<Character>('/characters', form).then((r) => r.data)
  },

  update: (id: string, payload: UpdateCharacterPayload, faceImage?: File) => {
    const form = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v))
    })
    if (faceImage) form.append('face_image', faceImage)
    return api.patch<Character>(`/characters/${id}`, form).then((r) => r.data)
  },

  delete: (id: string) => api.delete(`/characters/${id}`).then((r) => r.data),

  getFace: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/characters/${id}/face`,
}

// ─── Generate API ─────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function templateExampleUrl(templateId: string, filename: string, version?: number | null) {
  const v = version ? `?v=${version}` : ''
  return `${API_BASE}/generate/templates/examples/${encodeURIComponent(templateId)}/${filename}${v}`
}

export const generateApi = {
  getTemplates: () =>
    api.get<TemplatesResponse>('/generate/templates').then((r) => r.data),

  getScenes: () =>
    api
      .get<Record<string, Omit<SceneItem, 'id'>>>('/generate/scenes')
      .then((r) => catalogDictToArray(r.data)),

  getMoods: () =>
    api
      .get<Record<string, Omit<MoodItem, 'id'>>>('/generate/moods')
      .then((r) => catalogDictToArray(r.data)),

  create: (payload: CreateJobPayload) => {
    const form = new FormData()
    form.append('job_type', payload.job_type)
    if (payload.character_id) form.append('character_id', payload.character_id)
    if (payload.scene_id) form.append('scene_id', payload.scene_id)
    if (payload.template_id) form.append('template_id', payload.template_id)
    if (payload.mood_modifier) form.append('mood_modifier', payload.mood_modifier)
    if (payload.custom_prompt) form.append('custom_prompt', payload.custom_prompt)
    if (payload.enhance_prompt) form.append('enhance_prompt', 'true')
    if (payload.idempotency_key) form.append('idempotency_key', payload.idempotency_key)
    if (payload.source_image) form.append('source_image', payload.source_image)
    return api.post<Job>('/generate', form).then((r) => r.data)
  },

  getJob: (id: string) =>
    api.get<JobStatusResponse>(`/generate/jobs/${id}`).then((r) => r.data),

  listJobs: (characterId?: string, page = 1, perPage = 20) =>
    api
      .get<PaginatedResponse<Job>>('/generate/jobs', {
        params: { character_id: characterId, page, per_page: perPage },
      })
      .then((r) => r.data),
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export const chatApi = {
  listSessions: (characterId: string) =>
    api.get<ChatSession[]>(`/chat/sessions`, { params: { character_id: characterId } }).then((r) => r.data),

  createSession: (characterId: string, title?: string) =>
    api
      .post<ChatSession>('/chat/sessions', { character_id: characterId, title })
      .then((r) => r.data),

  deleteSession: (id: string) => api.delete(`/chat/sessions/${id}`).then((r) => r.data),

  updateSession: (id: string, title: string) =>
    api.patch<ChatSession>(`/chat/sessions/${id}`, { title }).then((r) => r.data),

  listMessages: (sessionId: string, page = 1, perPage = 50) =>
    api
      .get<PaginatedResponse<ChatMessage>>(`/chat/sessions/${sessionId}/messages`, {
        params: { page, per_page: perPage },
      })
      .then((r) => r.data),

  sendMessage: (sessionId: string, payload: SendMessagePayload) =>
    api
      .post<ChatResponse>(`/chat/sessions/${sessionId}/messages`, payload)
      .then((r) => r.data),
}

// ─── Gallery API ──────────────────────────────────────────────────────────────

export const galleryApi = {
  list: (
    characterId?: string,
    jobType?: 'i2i' | 'i2v' | 'i2i_custom' | 'i2v_custom' | 'random_ai',
    page = 1,
    perPage = 20
  ) =>
    api
      .get<PaginatedResponse<GalleryJob>>('/gallery', {
        params: { character_id: characterId, job_type: jobType, page, per_page: perPage },
      })
      .then((r) => r.data),

  deleteItem: (id: string) => api.delete(`/gallery/${id}`).then((r) => r.data),
}

export default api
