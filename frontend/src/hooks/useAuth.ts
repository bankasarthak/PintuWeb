'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  authApi,
  setTokens,
  clearTokens,
  hasStoredSession,
  ensureAccessToken,
} from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/ui'
import { getApiErrorMessage } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { TelegramLoginPayload } from '@/types'

export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  return useQuery({
    queryKey: ['me'],
    enabled: typeof window !== 'undefined' && hasStoredSession(),
    queryFn: async () => {
      setLoading(true)
      try {
        const sessionOk = await ensureAccessToken()
        if (!sessionOk) {
          throw Object.assign(new Error('Session expired'), { status: 401 })
        }
        const user = await authApi.me()
        setUser(user)
        return user
      } finally {
        setLoading(false)
      }
    },
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false
      return failureCount < 2
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useGoogleLogin() {
  const setUser = useAuthStore((s) => s.setUser)
  const { error: toastError } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (idToken: string) => {
      const tokens = await authApi.loginGoogle(idToken)
      setTokens(tokens.access_token, tokens.refresh_token)
      const user = await authApi.me()
      return user
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(['me'], user)
      router.push('/video/templates')
    },
    onError: (err) => {
      toastError('Google sign-in failed', getApiErrorMessage(err))
    },
  })
}

export function useTelegramLogin() {
  const setUser = useAuthStore((s) => s.setUser)
  const { error: toastError } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: TelegramLoginPayload) => {
      const tokens = await authApi.loginTelegram(payload)
      setTokens(tokens.access_token, tokens.refresh_token)
      const user = await authApi.me()
      return user
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(['me'], user)
      router.push('/video/templates')
    },
    onError: (err) => {
      toastError('Telegram sign-in failed', getApiErrorMessage(err))
    },
  })
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const { error: toastError } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch {
        // ignore errors on logout
      }
      clearTokens()
    },
    onSuccess: () => {
      logout()
      queryClient.clear()
      router.push('/login')
    },
    onError: (err) => {
      toastError('Logout failed', getApiErrorMessage(err))
    },
  })
}
