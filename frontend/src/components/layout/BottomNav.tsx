'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Camera, Video, Users, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCharacters } from '@/hooks/useCharacters'

const navItems = [
  { href: '/photos',     label: 'Photos',     icon: Camera },
  { href: '/video',      label: 'Video',       icon: Video },
  { href: '/characters', label: 'Characters',  icon: Users },
  { href: '/chat',       label: 'Chat',        icon: MessageCircle },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: characters } = useCharacters()
  const charCount = characters?.length ?? 0

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d14]/95 backdrop-blur-md border-t border-[#1e1e2e] flex md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors relative',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
              isActive ? 'text-white' : 'text-[#94a3b8] hover:text-white'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* active indicator */}
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
            )}

            <div className="relative">
              <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              {/* character count badge */}
              {href === '/characters' && charCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[9px] font-bold text-white">
                  {charCount}
                </span>
              )}
            </div>

            <span className={cn(isActive && 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
