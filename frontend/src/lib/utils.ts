import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy h:mm a')
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function bytesToMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}

export function catalogDictToArray<T extends { label: string }>(
  dict: Record<string, T>
): Array<T & { id: string }> {
  return Object.entries(dict).map(([id, value]) => ({ id, ...value }))
}

export function isVideoJobType(jobType: string): boolean {
  return jobType === 'i2v' || jobType === 'i2v_custom'
}

export function galleryMediaUrl(jobId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  return `${base}/gallery/${jobId}/media`
}

export function galleryPlayUrl(jobId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  return `${base}/gallery/${jobId}/play-url`
}

export function getApiErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred'
  if (typeof error === 'string') return error

  const axiosError = error as {
    response?: { data?: { detail?: string | Array<{ msg: string }>; message?: string } }
    message?: string
  }

  const detail = axiosError?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ')

  const message = axiosError?.response?.data?.message
  if (message) return message

  if (axiosError?.message) return axiosError.message

  return 'An unexpected error occurred'
}
