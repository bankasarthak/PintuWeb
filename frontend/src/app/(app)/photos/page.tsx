'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  UserCheck, Star, Camera, BookOpen, Wand2,
  Lock, Plus, ArrowRight, Users,
} from 'lucide-react'
import { useCharacters } from '@/hooks/useCharacters'
import { useUIStore } from '@/stores/ui'
import { characterApi } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { CreateCompanionForm } from '@/components/companion/CreateCompanionForm'
import { useCreateCharacter } from '@/hooks/useCharacters'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

type FeatureCard = {
  id: string
  icon: React.ElementType
  title: string
  description: string
  cta: string
  badge?: string
  featured?: boolean
  locked: boolean
  href?: string
  action?: 'face-swap' | 'gallery' | 'scene' | 'story' | 'custom'
}

// ── Lock divider ───────────────────────────────────────────────────────────

function LockDivider() {
  return (
    <div className="flex items-center gap-3 px-4 my-2">
      <div className="flex-1 h-px bg-[#1e1e2e]" />
      <span className="flex items-center gap-1.5 text-xs font-semibold text-[#4a4a6a] whitespace-nowrap">
        <Lock className="h-3 w-3" />
        Needs a Character
      </span>
      <div className="flex-1 h-px bg-[#1e1e2e]" />
    </div>
  )
}

// ── Feature card ───────────────────────────────────────────────────────────

function PhotoFeatureCard({
  feature,
  hasCharacter,
  onLockedTap,
}: {
  feature: FeatureCard
  hasCharacter: boolean
  onLockedTap: (feature: FeatureCard) => void
}) {
  const isLocked = feature.locked && !hasCharacter
  const Icon = feature.icon

  const inner = (
    <div
      className={cn(
        'relative rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200 cursor-pointer',
        feature.featured && !isLocked
          ? 'border-amber-500/30 bg-gradient-to-br from-amber-900/20 via-[#13131a] to-[#13131a]'
          : 'border-[#1e1e2e] bg-[#13131a]',
        !isLocked && 'hover:border-purple-500/50 hover:bg-[#16162a] active:scale-[0.98]',
        isLocked && 'opacity-55'
      )}
      onClick={isLocked ? () => onLockedTap(feature) : undefined}
    >
      {/* Badge */}
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

      {/* Lock badge */}
      {isLocked && (
        <span className="absolute top-3 right-3">
          <Lock className="h-4 w-4 text-[#4a4a6a]" />
        </span>
      )}

      {/* Icon */}
      <div className={cn(
        'h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
        isLocked
          ? 'bg-[#1e1e2e]'
          : feature.featured
            ? 'bg-amber-500/15'
            : 'bg-purple-600/15 group-hover:bg-purple-600/25'
      )}>
        <Icon className={cn(
          'h-5 w-5',
          isLocked ? 'text-[#4a4a6a]' : feature.featured ? 'text-amber-400' : 'text-purple-400'
        )} />
      </div>

      {/* Text */}
      <div className="flex-1">
        <h3 className={cn('font-semibold text-sm mb-1', isLocked ? 'text-[#4a4a6a]' : 'text-white')}>
          {feature.title}
        </h3>
        <p className={cn('text-xs leading-relaxed', isLocked ? 'text-[#2e2e42]' : 'text-[#94a3b8]')}>
          {feature.description}
        </p>
      </div>

      {/* CTA */}
      {isLocked ? (
        <button className="w-full flex items-center justify-center gap-1.5 text-xs text-purple-400 border border-purple-600/30 rounded-lg py-2 hover:bg-purple-600/10 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          Add a character to unlock
        </button>
      ) : (
        <div className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-purple-600/20 border border-purple-600/30 rounded-lg py-2 hover:bg-purple-600/40 transition-colors">
          {feature.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  )

  if (!isLocked && feature.href) {
    return <Link href={feature.href}>{inner}</Link>
  }
  if (!isLocked && feature.action === 'face-swap') {
    return <Link href="/photos/face-swap">{inner}</Link>
  }
  if (!isLocked && feature.action === 'gallery') {
    return <Link href="/gallery">{inner}</Link>
  }
  return inner
}

// ── Character-required bottom sheet ───────────────────────────────────────

function CharRequiredSheet({
  feature,
  onCreateChar,
  onClose,
}: {
  feature: FeatureCard | null
  onCreateChar: () => void
  onClose: () => void
}) {
  if (!feature) return null
  const Icon = feature.icon
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#14142a] border border-[#2e2e4e] border-b-0 rounded-t-3xl px-6 pt-5 pb-10 text-center"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full bg-[#2e2e4e] mx-auto mb-5" />
        <div className="h-14 w-14 rounded-2xl bg-purple-600/15 flex items-center justify-center mx-auto mb-4">
          <Icon className="h-7 w-7 text-purple-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{feature.title} needs a Character</h3>
        <p className="text-sm text-[#94a3b8] leading-relaxed mb-6">
          Create a character with a face photo — takes 30 seconds. Then come right back here.
        </p>
        <Button className="w-full mb-3" onClick={onCreateChar} leftIcon={<Plus className="h-4 w-4" />}>
          Create Character
        </Button>
        <button
          className="w-full py-3 text-sm text-[#94a3b8] hover:text-white transition-colors"
          onClick={onClose}
        >
          Not now
        </button>
      </div>
    </div>
  )
}

// ── Active character pill ──────────────────────────────────────────────────

function ActiveCharPill({ hasCharacter }: { hasCharacter: boolean }) {
  const activeId = useUIStore((s) => s.activeCompanionId)
  const { data: characters } = useCharacters()
  const active = characters?.find((c) => c.id === activeId) ?? characters?.[0]

  if (!active) return null
  const faceUrl = active.has_face_image ? characterApi.getFace(active.id) : null

  return (
    <Link
      href="/characters"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2e2e4e] bg-[#13131a] hover:border-purple-500/40 transition-colors text-sm font-medium text-white"
    >
      <Avatar src={faceUrl} name={active.name || 'Her'} size="xs" />
      <span>{active.name || 'Her'}</span>
      <span className="text-[#94a3b8] text-xs">▾</span>
    </Link>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PhotosPage() {
  const { data: characters, isLoading } = useCharacters()
  const hasCharacter = (characters?.length ?? 0) > 0

  const [sheetFeature, setSheetFeature] = useState<FeatureCard | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const { mutate: createCharacter, isPending: creating } = useCreateCharacter({
    onSuccess: () => { setCreateOpen(false); setSheetFeature(null) },
  })

  const FEATURES: FeatureCard[] = [
    {
      id: 'face-swap',
      icon: UserCheck,
      title: 'Face Swap',
      description: 'Upload a source face and a target image — swap faces instantly.',
      cta: 'Swap Face',
      badge: '2 credits',
      locked: false,
      action: 'face-swap',
    },
    {
      id: 'gallery',
      icon: Star,
      title: 'Gallery',
      description: 'Top community generations and your own creations.',
      cta: 'Browse',
      locked: false,
      action: 'gallery',
    },
    {
      id: 'scene',
      icon: Camera,
      title: 'Create Scene',
      description: 'Pick her setting, outfit, pose and framing — we build the perfect photoreal still.',
      cta: 'Build Scene',
      badge: '🔥 Must Try',
      featured: true,
      locked: true,
      href: hasCharacter ? '/photos/scene' : undefined,
      action: 'scene',
    },
    {
      id: 'story',
      icon: BookOpen,
      title: 'Story Mode',
      description: 'Chapter by chapter stills — you write her fate, we generate each scene.',
      cta: 'Start Story',
      locked: true,
      href: hasCharacter ? '/photos/story' : undefined,
      action: 'story',
    },
    {
      id: 'custom',
      icon: Wand2,
      title: 'Custom Prompt',
      description: 'Describe exactly how you want her. AI maps your words to a photoreal still.',
      cta: 'Write Prompt',
      locked: true,
      href: hasCharacter ? '/photos/custom' : undefined,
      action: 'custom',
    },
  ]

  const unlockedFeatures = FEATURES.filter((f) => !f.locked)
  const lockedFeatures = FEATURES.filter((f) => f.locked)

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-[#1e1e2e] px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Photos</h1>
        {!isLoading && <ActiveCharPill hasCharacter={hasCharacter} />}
      </div>

      <div className="px-4 py-5 space-y-2 max-w-2xl mx-auto">

        {/* No-character CTA banner */}
        {!isLoading && !hasCharacter && (
          <div className="rounded-2xl border border-dashed border-purple-600/30 bg-purple-600/5 p-5 flex items-start gap-4 mb-4">
            <div className="h-10 w-10 rounded-xl bg-purple-600/15 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-1">Create a Character to unlock 3 more features</p>
              <p className="text-xs text-[#94a3b8] leading-relaxed">Upload a face photo and set her traits — 30 seconds and you get Create Scene, Story Mode &amp; Custom Prompt.</p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Create
            </Button>
          </div>
        )}

        {/* Always-available features */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#4a4a6a] px-1 pt-2">
          Always Available
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {unlockedFeatures.map((f) => (
            <PhotoFeatureCard key={f.id} feature={f} hasCharacter={hasCharacter} onLockedTap={setSheetFeature} />
          ))}
        </div>

        {/* Lock divider */}
        <LockDivider />

        {/* Character-locked features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lockedFeatures.map((f) => (
            <PhotoFeatureCard key={f.id} feature={f} hasCharacter={hasCharacter} onLockedTap={setSheetFeature} />
          ))}
        </div>

        {/* Pricing note */}
        <p className="text-center text-xs text-[#4a4a6a] pt-2">
          3 credits per photo · 2 credits per face swap
        </p>
      </div>

      {/* Character-required bottom sheet */}
      <CharRequiredSheet
        feature={sheetFeature}
        onCreateChar={() => { setSheetFeature(null); setCreateOpen(true) }}
        onClose={() => setSheetFeature(null)}
      />

      {/* Create character modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Character"
        description="Upload a face photo and set her traits"
        size="lg"
      >
        <CreateCompanionForm
          onSuccess={() => setCreateOpen(false)}
          onCreate={(payload, faceImage) => createCharacter({ payload, faceImage })}
          loading={creating}
        />
      </Modal>
    </div>
  )
}
