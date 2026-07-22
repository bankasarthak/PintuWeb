import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { clearTokens } from '@/lib/api'

interface AuthStore {
  user: User | null
  isLoading: boolean
  isHydrated: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setHydrated: (hydrated: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      isHydrated: false,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setHydrated: (isHydrated) => set({ isHydrated }),
      logout: () => {
        clearTokens()
        set({ user: null })
      },
    }),
    {
      name: 'pintu-auth',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
