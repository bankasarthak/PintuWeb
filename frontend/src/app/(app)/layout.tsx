'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMe, isUnauthorizedError } from '@/hooks/useAuth'
import { hasStoredSession } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const cachedUser = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const { isLoading, isError, error } = useMe()
  const [checkedSession, setCheckedSession] = useState(false)

  useEffect(() => {
    if (!isHydrated) return
    if (!hasStoredSession()) {
      router.push('/login')
      return
    }
    setCheckedSession(true)
  }, [isHydrated, router])

  useEffect(() => {
    if (isError && isUnauthorizedError(error)) {
      useAuthStore.getState().logout()
      router.push('/login')
    }
  }, [isError, error, router])

  const showSpinner =
    !checkedSession || (isLoading && !cachedUser)

  if (showSpinner) {
    return (
      <div className="min-h-screen bg-[#07070b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#c9a96e] to-[#e8d5b5] flex items-center justify-center">
            <Spinner size="sm" className="border-white border-t-transparent" />
          </div>
          <p className="text-[#94a3b8] text-sm">Loading Pintu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07070b]">
      {isError && !isUnauthorizedError(error) && (
        <div className="bg-amber-900/40 border-b border-amber-700/50 text-amber-100 text-xs text-center py-2 px-4">
          API unreachable — showing cached session. Start the API tunnel if login or generation fails.
        </div>
      )}

      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main
        className={cn(
          'transition-all duration-300 pb-16 md:pb-0',
          'hidden md:block',
          sidebarOpen ? 'md:ml-60' : 'md:ml-16'
        )}
      >
        <div className="hidden md:block min-h-screen">{children}</div>
      </main>

      <main className="block md:hidden min-h-screen pb-16">
        {children}
      </main>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
