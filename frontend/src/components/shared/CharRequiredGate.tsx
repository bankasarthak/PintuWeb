'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useCharacters } from '@/hooks/useCharacters'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/layout/PageShell'
import { Skeleton } from '@/components/ui/skeleton'

export function CharRequiredGate({
  title,
  backHref,
  children,
}: {
  title: string
  backHref: string
  children: React.ReactNode
}) {
  const { data: characters, isLoading } = useCharacters()
  const hasCharacter = (characters?.length ?? 0) > 0

  if (isLoading) {
    return (
      <PageShell title={title} backHref={backHref}>
        <Skeleton className="h-48 rounded-2xl" />
      </PageShell>
    )
  }

  if (!hasCharacter) {
    return (
      <PageShell title={title} backHref={backHref}>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
          <p className="font-display text-xl font-semibold text-white mb-2">Character required</p>
          <p className="text-sm text-[#8b8fa8] leading-relaxed mb-6 max-w-sm mx-auto">
            Create a character with a face photo to use this feature. It takes about 30 seconds.
          </p>
          <Link href="/characters">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Create character</Button>
          </Link>
        </div>
      </PageShell>
    )
  }

  return <>{children}</>
}
