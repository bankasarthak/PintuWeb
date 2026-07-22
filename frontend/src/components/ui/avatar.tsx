import * as React from 'react'
import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  alt?: string
}

const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

const pixelSizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
}

export function Avatar({ src, name, size = 'md', className, alt }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const initials = name ? getInitials(name) : '?'
  const pixelSize = pixelSizeMap[size]

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0',
        'bg-gradient-to-br from-purple-600 to-purple-900 text-white font-semibold',
        sizeMap[size],
        className
      )}
      aria-label={alt || name || 'Avatar'}
    >
      {src && !imgError ? (
        <Image
          src={src}
          alt={alt || name || 'Avatar'}
          width={pixelSize}
          height={pixelSize}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
