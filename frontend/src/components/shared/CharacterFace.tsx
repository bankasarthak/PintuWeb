'use client'

import { useAuthenticatedFace } from '@/hooks/useAuthenticatedFace'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/** Full-bleed character face for cards — uses authenticated fetch. */
export function CharacterFace({
  characterId,
  name,
  hasFaceImage = true,
  className,
}: {
  characterId: string
  name?: string | null
  hasFaceImage?: boolean
  className?: string
}) {
  const { url, loading } = useAuthenticatedFace(characterId, hasFaceImage)

  if (!hasFaceImage || (!url && !loading)) {
    return (
      <div className={cn('w-full h-full flex items-center justify-center bg-[#0f0f14]', className)}>
        <Avatar name={name} size="xl" />
      </div>
    )
  }

  if (!url) {
    return <div className={cn('w-full h-full bg-[#0f0f14] animate-pulse', className)} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name || 'Character'} className={cn('w-full h-full object-cover', className)} />
  )
}
