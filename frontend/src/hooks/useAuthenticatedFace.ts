'use client'

import { useEffect, useState } from 'react'
import { characterApi } from '@/lib/api'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/** Fetch character face via authenticated API and return a blob object URL. */
export function useAuthenticatedFace(
  characterId: string | null | undefined,
  enabled = true
) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!characterId || !enabled) {
      setUrl(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false
    setLoading(true)

    async function load() {
      const token = getToken()
      if (!token) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const res = await fetch(characterApi.getFace(characterId!), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('face load failed')
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setUrl(objectUrl)
      } catch {
        if (!cancelled) setUrl(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [characterId, enabled])

  return { url, loading }
}
