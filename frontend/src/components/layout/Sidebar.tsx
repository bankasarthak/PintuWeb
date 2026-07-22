'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Camera, Video, Users, MessageCircle, Coins, LogOut, ChevronLeft, Sparkles } from 'lucide-react'
import { cn, formatCredits } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useLogout } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { href: '/photos',     label: 'Photos',     icon: Camera },
  { href: '/video',      label: 'Video',       icon: Video },
  { href: '/characters', label: 'Characters',  icon: Users },
  { href: '/chat',       label: 'Chat',        icon: MessageCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const { mutate: logout, isPending: loggingOut } = useLogout()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-[#0d0d14] border-r border-[#1e1e2e] flex flex-col z-40 transition-all duration-300',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#1e1e2e]">
        {sidebarOpen && (
          <Link href="/photos" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Pintu</span>
          </Link>
        )}
        {!sidebarOpen && (
          <Link href="/photos" className="mx-auto">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'rounded-lg p-1.5 text-[#94a3b8] hover:bg-[#1e1e2e] hover:text-white transition-colors',
            !sidebarOpen && 'hidden'
          )}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
                isActive
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30'
                  : 'text-[#94a3b8] hover:bg-[#1e1e2e] hover:text-white',
                !sidebarOpen && 'justify-center px-0'
              )}
              aria-current={isActive ? 'page' : undefined}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && label}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="p-3 border-t border-[#1e1e2e]">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 rounded-xl p-3 bg-[#13131a] border border-[#1e1e2e]">
            <Avatar
              name={user?.display_name || user?.email}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.display_name || 'User'}
              </p>
              <Badge variant="purple" className="mt-0.5">
                <Coins className="h-2.5 w-2.5 mr-1" />
                {formatCredits(user?.credits ?? 0)} cr
              </Badge>
            </div>
            <button
              onClick={() => logout()}
              disabled={loggingOut}
              className="text-[#94a3b8] hover:text-red-400 transition-colors"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => logout()}
            disabled={loggingOut}
            className="w-full flex justify-center p-2 text-[#94a3b8] hover:text-red-400 transition-colors"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </aside>
  )
}
