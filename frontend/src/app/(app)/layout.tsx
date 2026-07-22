'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMe } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/ui'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const { isLoading, isError } = useMe()

  useEffect(() => {
    if (isError) {
      router.push('/login')
    }
  }, [isError, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
            <Spinner size="sm" className="border-white border-t-transparent" />
          </div>
          <p className="text-[#94a3b8] text-sm">Loading Pintu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 pb-16 md:pb-0',
          'hidden md:block',
          sidebarOpen ? 'md:ml-60' : 'md:ml-16'
        )}
      >
        <div className="hidden md:block min-h-screen">{children}</div>
      </main>

      {/* Mobile Main Content */}
      <main className="block md:hidden min-h-screen pb-16">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
