'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, setTokens, clearTokens } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/ui'
import { getApiErrorMessage } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { LoginPayload, RegisterPayload } from '@/types'

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      setLoading(true)
      try {
        const user = await authApi.me()
        setUser(user)
        return user
      } finally {
        setLoading(false)
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser)
  const { error: toastError } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const tokens = await authApi.login(payload)
      setTokens(tokens.access_token, tokens.refresh_token)
      const user = await authApi.me()
      return user
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(['me'], user)
      router.push('/dashboard')
    },
    onError: (err) => {
      toastError('Login failed', getApiErrorMessage(err))
    },
  })
}

export function useRegister() {
  const setUser = useAuthStore((s) => s.setUser)
  const { error: toastError } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const tokens = await authApi.register(payload)
      setTokens(tokens.access_token, tokens.refresh_token)
      const user = await authApi.me()
      return user
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(['me'], user)
      router.push('/dashboard')
    },
    onError: (err) => {
      toastError('Registration failed', getApiErrorMessage(err))
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
