'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BookOpen, Video, Wand2, Coins, LogOut, ChevronLeft, Images } from 'lucide-react'
import { cn, formatCredits } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useLogout } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { href: '/video/templates', label: 'Templates',    icon: LayoutGrid },
  { href: '/video/story',     label: 'Story Mode',    icon: BookOpen },
  { href: '/video/scene',     label: 'Direct Scene',  icon: Video },
  { href: '/video/custom',    label: 'Custom Prompt', icon: Wand2 },
  { href: '/gallery',         label: 'Gallery',       icon: Images },
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
        'fixed left-0 top-0 h-full bg-[#07070b] border-r border-white/[0.08] flex flex-col z-40 transition-all duration-300',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/[0.08]">
        {sidebarOpen && (
          <Link href="/video/templates" className="flex items-center gap-2.5">
            <Image src="/logo-icon.png" alt="JerkBox" width={44} height={44} className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-bold text-white font-display">JerkBox</span>
          </Link>
        )}
        {!sidebarOpen && (
          <Link href="/video/templates" className="mx-auto">
            <Image src="/logo-icon.png" alt="JerkBox" width={40} height={40} className="h-9 w-9 rounded-xl" />
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'rounded-lg p-1.5 text-[#8b8fa8] hover:bg-white/[0.04] hover:text-white transition-colors',
            !sidebarOpen && 'hidden'
          )}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2f87]/40',
                isActive
                  ? 'bg-[#ff2f87]/10 text-[#ff8ac2] border border-[#ff2f87]/25'
                  : 'text-[#8b8fa8] hover:bg-white/[0.04] hover:text-white',
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

      <div className="p-3 border-t border-white/[0.08]">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 rounded-xl p-3 bg-white/[0.02] border border-white/[0.08]">
            <Avatar name={user?.display_name || user?.email} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.display_name || 'User'}
              </p>
              <Badge variant="gold" className="mt-0.5">
                <Coins className="h-2.5 w-2.5 mr-1" />
                {formatCredits(user?.credits ?? 0)} cr
              </Badge>
            </div>
            <button
              onClick={() => logout()}
              disabled={loggingOut}
              className="text-[#8b8fa8] hover:text-red-400 transition-colors"
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
            className="w-full flex justify-center p-2 text-[#8b8fa8] hover:text-red-400 transition-colors"
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
