'use client'

import { useEffect, useState } from 'react'
import { galleryPlayUrl } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export function AuthenticatedMedia({
  jobId,
  alt,
  className,
  isVideo,
}: {
  jobId: string
  alt: string
  className?: string
  isVideo?: boolean
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    async function load() {
      const token = getToken()
      if (!token) {
        setFailed(true)
        return
      }
      try {
        // Presigned R2 URL — supports Range requests so video controls work (blob URLs do not).
        const playRes = await fetch(galleryPlayUrl(jobId), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (playRes.ok) {
          const { url } = (await playRes.json()) as { url: string }
          if (!cancelled && url) {
            setSrc(url)
            return
          }
        }

        // Fallback: blob (legacy / no R2)
        const mediaRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/gallery/${jobId}/media`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!mediaRes.ok) throw new Error('load failed')
        const raw = await mediaRes.blob()
        const blob =
          isVideo && !raw.type.startsWith('video/')
            ? new Blob([raw], { type: 'video/mp4' })
            : raw
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setSrc(objectUrl)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [jobId, isVideo])

  if (failed) {
    return (
      <div className={cn('flex items-center justify-center bg-[#13131a] text-xs text-[#8b8fa8]', className)}>
        Preview unavailable
      </div>
    )
  }

  if (!src) return <Skeleton className={className} />

  if (isVideo) {
    return (
      <video
        src={src}
        className={cn('w-full h-auto bg-black', className)}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
      />
    )
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />
}
