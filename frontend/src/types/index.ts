export interface User {
  id: string
  email: string
  display_name: string | null
  credits: number
  created_at: string
}

export interface Character {
  id: string
  name: string | null
  age: number
  body_type: string
  skin_tone: string
  breast_size: string
  personality_type: string
  has_face_image: boolean
  created_at: string
}

export interface Job {
  id: string
  job_type: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  scene_id: string | null
  custom_prompt: string | null
  output_path: string | null
  credits_charged: number
  created_at: string
  completed_at: string | null
  character_id?: string
}

export interface ChatSession {
  id: string
  character_id: string
  title: string
  message_count: number
  last_active: string
  created_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  is_nudge?: boolean
  nudge_scene_id?: string | null
}

export interface ChatResponse {
  session: ChatSession
  message: ChatMessage
}

export interface SceneItem {
  id: string
  label: string
  category: string
  credits: number
  description?: string
}

export interface MoodItem {
  id: string
  label: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  has_next: boolean
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface RegisterPayload {
  email: string
  password: string
  display_name?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface CreateCharacterPayload {
  name?: string
  age: number
  body_type: string
  skin_tone: string
  breast_size: string
  personality_type: string
}

export interface UpdateCharacterPayload extends Partial<CreateCharacterPayload> {}

export interface CreateJobPayload {
  character_id: string
  job_type: 'photo' | 'video'
  scene_id?: string
  mood_ids?: string[]
  custom_prompt?: string
}

export interface SendMessagePayload {
  content: string
}

export interface GalleryItem {
  id: string
  character_id: string
  job_id: string
  media_type: 'photo' | 'video'
  url: string
  thumbnail_url?: string
  created_at: string
}

export interface CreditPackage {
  id: string
  name: string
  credits: number
  price_inr: number
  popular?: boolean
}

export interface UsageRecord {
  id: string
  action: string
  credits_used: number
  created_at: string
}
