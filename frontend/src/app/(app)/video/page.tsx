'use client'

import Link from 'next/link'
import { Video, BookOpen, LayoutGrid, Wand2, ArrowRight } from 'lucide-react'
import { useCharacters } from '@/hooks/useCharacters'
import { useUIStore } from '@/stores/ui'
import { characterApi } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type VideoFeature = {
  id: string
  icon: React.ElementType
  title: string
  description: string
  cta: string
  badge?: string
  featured?: boolean
  href: string
}

const VIDEO_FEATURES: VideoFeature[] = [
  {
    id: 'scene',
    icon: Video,
    title: 'Create Scene',
    description: 'Pick the room, outfit, camera angle & action — we build the video scene prompt.',
    cta: 'Build Scene',
    badge: '🔥 Must Try',
    featured: true,
    href: '/video/scene',
  },
  {
    id: 'story',
    icon: BookOpen,
    title: 'Story Mode',
    description: 'Corrupt her chapter by chapter — auction, training, breaking. You choose every scene.',
    cta: 'Start Story',
    href: '/video/story',
  },
  {
    id: 'templates',
    icon: LayoutGrid,
    title: 'Templates',
    description: 'Proven presets with live previews — one tap to generate a video from your photo.',
    cta: 'Browse Templates',
    badge: 'Improved',
    href: '/video/templates',
  },
  {
    id: 'custom',
    icon: Wand2,
    title: 'Custom Prompt',
    description: 'Write your own script — AI enhances every detail and animates her from your photo.',
    cta: 'Write Prompt',
    href: '/video/custom',
  },
]

function VideoFeatureCard({ feature }: { feature: VideoFeature }) {
  const Icon = feature.icon
  return (
    <Link href={feature.href}>
      <div className={cn(
        'relative rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200 cursor-pointer active:scale-[0.98]',
        feature.featured
          ? 'border-amber-500/30 bg-gradient-to-br from-amber-900/20 via-[#13131a] to-[#13131a] hover:border-amber-500/50'
          : 'border-[#1e1e2e] bg-[#13131a] hover:border-purple-500/50 hover:bg-[#16162a]'
      )}>
        {feature.badge && (
          <span className={cn(
            'absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full border',
            feature.featured
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-purple-600/20 text-purple-300 border-purple-600/30'
          )}>
            {feature.badge}
          </span>
        )}

        <div className={cn(
          'h-11 w-11 rounded-xl flex items-center justify-center',
          feature.featured ? 'bg-amber-500/15' : 'bg-purple-600/15'
        )}>
          <Icon className={cn('h-5 w-5', feature.featured ? 'text-amber-400' : 'text-purple-400')} />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-sm text-white mb-1">{feature.title}</h3>
          <p className="text-xs text-[#94a3b8] leading-relaxed">{feature.description}</p>
        </div>

        <div className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-purple-600/20 border border-purple-600/30 rounded-lg py-2 hover:bg-purple-600/40 transition-colors">
          {feature.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  )
}

function ActiveCharBanner() {
  const activeId = useUIStore((s) => s.activeCompanionId)
  const { data: characters } = useCharacters()
  const active = characters?.find((c) => c.id === activeId) ?? characters?.[0]
  if (!active) return null
  const faceUrl = active.has_face_image ? characterApi.getFace(active.id) : null

  return (
    <div className="mx-4 mt-4 rounded-xl border border-purple-600/20 bg-purple-600/5 flex items-center gap-3 px-4 py-3">
      <Avatar src={faceUrl} name={active.name || 'Her'} size="sm" />
      <p className="text-sm text-[#c4b5fd] font-medium flex-1">
        Using <span className="text-white">{active.name || 'Her'}</span> automatically
      </p>
      <Link href="/characters" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
        Switch
      </Link>
    </div>
  )
}

export default function VideoPage() {
  const { data: characters } = useCharacters()
  const hasCharacter = (characters?.length ?? 0) > 0

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-[#1e1e2e] px-4 py-3">
        <h1 className="text-lg font-bold text-white">Video</h1>
      </div>

      {/* Active character banner */}
      {hasCharacter && <ActiveCharBanner />}

      <div className="px-4 py-5 space-y-3 max-w-2xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#4a4a6a] px-1">
          What do you want to make?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VIDEO_FEATURES.map((f) => (
            <VideoFeatureCard key={f.id} feature={f} />
          ))}
        </div>
        <p className="text-center text-xs text-[#4a4a6a] pt-2">
          5 credits per video · No character required
        </p>
      </div>
    </div>
  )
}
