'use client'

import Link from 'next/link'
import { Coins } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useCharacters } from '@/hooks/useCharacters'
import { useUIStore } from '@/stores/ui'
import { characterApi } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { formatCredits, cn } from '@/lib/utils'

export function AppHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const user = useAuthStore((s) => s.user)
  const activeId = useUIStore((s) => s.activeCompanionId)
  const { data: characters } = useCharacters()
  const active = characters?.find((c) => c.id === activeId) ?? characters?.[0]
  const faceUrl = active?.has_face_image ? characterApi.getFace(active.id) : null

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#07070b]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          {title ? (
            <>
              <h1 className="font-display text-lg font-semibold tracking-tight text-white truncate">{title}</h1>
              {subtitle && <p className="text-xs text-[#8b8fa8] truncate mt-0.5">{subtitle}</p>}
            </>
          ) : (
            <Link href="/photos" className="font-display text-lg font-semibold tracking-tight text-white">
              Pintu
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {active && (
            <Link
              href="/characters"
              className="hidden sm:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 hover:border-[#c9a96e]/30 transition-colors"
            >
              <Avatar src={faceUrl} name={active.name || 'Her'} size="xs" />
              <span className="text-xs font-medium text-[#e8e4dc] max-w-[72px] truncate">{active.name || 'Her'}</span>
            </Link>
          )}
          <Link
            href="/credits"
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              'border-[#c9a96e]/25 bg-[#c9a96e]/8 text-[#e8d5b5] hover:border-[#c9a96e]/45'
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
