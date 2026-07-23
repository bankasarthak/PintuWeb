'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Video, Users, MessageCircle, Images } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCharacters } from '@/hooks/useCharacters'

const navItems = [
  { href: '/video',      label: 'Video',       icon: Video },
  { href: '/characters', label: 'Characters',  icon: Users },
  { href: '/chat',       label: 'Chat',        icon: MessageCircle },
  { href: '/gallery',    label: 'Gallery',     icon: Images },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: characters } = useCharacters()
  const charCount = characters?.length ?? 0

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#07070b]/95 backdrop-blur-md border-t border-white/[0.08] flex md:hidden"
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
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a96e]/40',
              isActive ? 'text-white' : 'text-[#8b8fa8] hover:text-white'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#c9a96e] to-[#e8d5b5]" />
            )}

            <div className="relative">
              <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              {href === '/characters' && charCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-gradient-to-br from-[#c9a96e] to-[#e8d5b5] flex items-center justify-center text-[9px] font-bold text-[#07070b]">
                  {charCount}
                </span>
              )}
            </div>

            <span className={cn(isActive && 'bg-gradient-to-r from-[#e8d5b5] to-[#c9a96e] bg-clip-text text-transparent')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
