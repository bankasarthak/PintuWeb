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

export type JobStatus =
  | 'queued'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'

export type JobType = 'i2i' | 'i2v' | 'i2i_custom' | 'i2v_custom' | 'random_ai'

export interface Job {
  id: string
  job_type: JobType | string
  status: JobStatus
  scene_id: string | null
  custom_prompt: string | null
  output_path: string | null
  output_url?: string | null
  credits_charged: number
  created_at: string
  completed_at: string | null
  character_id?: string
  error_message?: string | null
}

export interface JobStatusResponse {
  id: string
  status: JobStatus
  output_url: string | null
  output_r2_key: string | null
  error_message: string | null
  progress: number | null
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
  lora?: string
  description?: string
}

export interface TemplateItem {
  id: string
  label: string
  emoji: string
  description: string
  has_example: boolean
  example_v?: number | null
  tags: string[]
  input_mode?: string
  paired_template_id?: string | null
  is_final?: boolean
}

export interface TemplatesResponse {
  templates: TemplateItem[]
  top_rated_ids: string[]
}

export interface MoodItem {
  id: string
  label: string
  lora?: string
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


export interface TelegramLoginPayload {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export interface GoogleLoginPayload {
  id_token: string
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
  job_type: JobType
  character_id?: string
  scene_id?: string
  template_id?: string
  mood_modifier?: string
  custom_prompt?: string
  enhance_prompt?: boolean
  source_image?: File
  idempotency_key?: string
}

export interface SendMessagePayload {
  content: string
}

export interface GalleryJob extends Job {
  character_id?: string
}

export interface CreditPackage {
  id: string
  name: string
  credits: number
  price_inr: number
  price_usd: number
  price_crypto: number
  crypto_currency: string
  queue?: string
  popular?: boolean
  razorpay_enabled?: boolean
  crypto_enabled?: boolean
}

export interface PaymentOrder {
  id: string
  provider: string
  plan_id: string
  credits: number
  price_amount: number
  price_currency: string
  status: string
  fulfilled_at: string | null
  created_at: string
}

export interface UsageRecord {
  id: string
  action: string
  credits_used: number
  created_at: string
}

export interface CatalogOption {
  id: string
  label: string
}

export interface StorySummary {
  id: string
  title: string
  emoji?: string
  teaser: string
  scene_count: number
  sceneCount?: number
}

export interface StoryBeatOption {
  id: string
  label: string
  template_id: string
}

export interface StoryScene {
  id: string
  title: string
  subtitle?: string
  description?: string
  beats: StoryBeatOption[]
}

export interface StoryDetail {
  id: string
  title: string
  emoji?: string
  intro?: string
  scene_count: number
  scenes: StoryScene[]
}

/** @deprecated Legacy flat beat shape — use StoryDetail.scenes[].beats */
export interface StoryBeat {
  id: string
  label: string
  sceneTitle: string
  prompt: string
}
