'use client'

import Link from 'next/link'
import { Video, BookOpen, LayoutGrid, Wand2, ArrowRight } from 'lucide-react'
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
    id: 'templates',
    icon: LayoutGrid,
    title: 'Predefined Templates',
    description: 'Proven presets with live previews — one tap to generate a video from your photo.',
    cta: 'Browse Templates',
    badge: '🔥 Must Try',
    featured: true,
    href: '/video/templates',
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
    id: 'scene',
    icon: Video,
    title: 'Create Scene',
    description: 'Pick the room, outfit, camera angle & action — we build the video scene prompt.',
    cta: 'Build Scene',
    href: '/video/scene',
  },
  {
    id: 'custom',
    icon: Wand2,
    title: 'Custom Prompt',
    description: 'Write your own script — AI enhances every detail and animates her from your photo.',
    cta: 'Write Prompt',
    badge: '🔥 Must Try',
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
          ? 'border-[#c9a96e]/30 bg-gradient-to-br from-[#c9a96e]/10 via-white/[0.02] to-transparent hover:border-[#c9a96e]/50'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-[#c9a96e]/30 hover:bg-white/[0.04]'
      )}>
        {feature.badge && (
          <span className={cn(
            'absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full border',
            feature.featured
              ? 'bg-[#c9a96e]/15 text-[#e8d5b5] border-[#c9a96e]/30'
              : 'bg-white/[0.06] text-[#8b8fa8] border-white/[0.08]'
          )}>
            {feature.badge}
          </span>
        )}

        <div className={cn(
          'h-11 w-11 rounded-xl flex items-center justify-center',
          feature.featured ? 'bg-[#c9a96e]/15' : 'bg-white/[0.04]'
        )}>
          <Icon className={cn('h-5 w-5', feature.featured ? 'text-[#c9a96e]' : 'text-[#8b8fa8]')} />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-sm text-white mb-1">{feature.title}</h3>
          <p className="text-xs text-[#8b8fa8] leading-relaxed">{feature.description}</p>
        </div>

        <div className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-[#e8d5b5] bg-[#c9a96e]/10 border border-[#c9a96e]/25 rounded-lg py-2 hover:bg-[#c9a96e]/20 transition-colors">
          {feature.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  )
}

export default function VideoPage() {
  return (
    <div className="min-h-screen bg-[#07070b]">
      <div className="sticky top-0 z-30 bg-[#07070b]/95 backdrop-blur-md border-b border-white/[0.08] px-4 py-3">
        <h1 className="text-lg font-bold text-white font-display">Video</h1>
        <p className="text-xs text-[#8b8fa8] mt-0.5">Upload any photo — no character required</p>
      </div>

      <div className="px-4 py-5 space-y-3 max-w-2xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b8fa8] px-1">
          What do you want to make?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VIDEO_FEATURES.map((f) => (
            <VideoFeatureCard key={f.id} feature={f} />
          ))}
        </div>
        <p className="text-center text-xs text-[#8b8fa8] pt-2">
          3 credits per custom video · 5 credits for templates
        </p>
      </div>
    </div>
  )
}
