'use client'

import Link from 'next/link'
import { Coins } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useCharacters } from '@/hooks/useCharacters'
import { useUIStore } from '@/stores/ui'
import { characterApi } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { formatCredits, cn } from '@/lib/utils'

export function AppHeader({
  title,
  subtitle,
  maxWidth = '3xl',
  actions,
}: {
  title?: string
  subtitle?: string
  maxWidth?: '2xl' | '3xl' | '4xl' | '7xl'
  actions?: React.ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  const activeId = useUIStore((s) => s.activeCompanionId)
  const { data: characters } = useCharacters()
  const active = characters?.find((c) => c.id === activeId) ?? characters?.[0]
  const faceUrl = active?.has_face_image ? characterApi.getFace(active.id) : null
  const max = { '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', '4xl': 'max-w-4xl', '7xl': 'max-w-7xl' }[maxWidth]

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#07070b]/90 backdrop-blur-xl">
      <div className={cn('mx-auto flex items-center justify-between gap-3 px-4 py-3.5', max)}>
        <div className="min-w-0">
          {title ? (
            <>
              <h1 className="font-display text-lg font-semibold tracking-tight text-white truncate">{title}</h1>
              {subtitle && <p className="text-xs text-[#8b8fa8] truncate mt-0.5">{subtitle}</p>}
            </>
          ) : (
            <Link href="/video/templates" className="font-display text-lg font-semibold tracking-tight text-white">
              JerkBox
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          {active && (
            <Link
              href="/characters"
              className="hidden sm:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 hover:border-[#ff2f87]/30 transition-colors"
            >
              <Avatar src={faceUrl} name={active.name || 'Her'} size="xs" />
              <span className="text-xs font-medium text-white max-w-[72px] truncate">{active.name || 'Her'}</span>
            </Link>
          )}
          <Link
            href="/credits"
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              'border-[#ff2f87]/25 bg-[#ff2f87]/8 text-[#ff8ac2] hover:border-[#ff2f87]/45'
            )}
          >
            <Coins className="h-3.5 w-3.5" />
            {formatCredits(user?.credits ?? 0)}
          </Link>
        </div>
      </div>
    </header>
  )
}
