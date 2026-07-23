'use client'

import { Avatar } from '@/components/ui/avatar'
import { useAuthenticatedFace } from '@/hooks/useAuthenticatedFace'
import { cn } from '@/lib/utils'

interface AuthenticatedAvatarProps {
  characterId: string
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  hasFaceImage?: boolean
}

/** Avatar that loads character face photos through the authenticated API. */
export function AuthenticatedAvatar({
  characterId,
  name,
  size = 'md',
  className,
  hasFaceImage = true,
}: AuthenticatedAvatarProps) {
  const { url } = useAuthenticatedFace(characterId, hasFaceImage)

  return (
    <Avatar
      src={hasFaceImage ? url : null}
      name={name}
      size={size}
      className={cn(className)}
      alt={name ? `${name} avatar` : 'Character avatar'}
    />
  )
}
