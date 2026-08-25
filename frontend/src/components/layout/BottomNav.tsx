'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BookOpen, Video, Wand2, Images } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/video/templates', label: 'Templates',    icon: LayoutGrid },
  { href: '/video/story',     label: 'Story Mode',    icon: BookOpen },
  { href: '/video/scene',     label: 'Direct Scene',  icon: Video },
  { href: '/video/custom',    label: 'Custom Prompt', icon: Wand2 },
  { href: '/gallery',         label: 'Gallery',       icon: Images },
]

export function BottomNav() {
  const pathname = usePathname()

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
              'flex-1 flex flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-center text-[9px] leading-tight font-semibold transition-colors relative',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2f87]/40',
              isActive ? 'text-white' : 'text-[#8b8fa8] hover:text-white'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2]" />
            )}

            <div className="relative">
              <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
            </div>

            <span className={cn(isActive && 'bg-gradient-to-r from-[#ff8ac2] to-[#ff2f87] bg-clip-text text-transparent')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
