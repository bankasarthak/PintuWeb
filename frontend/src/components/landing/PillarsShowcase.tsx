'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, Clapperboard, LayoutGrid, Wand2 } from 'lucide-react'
import { Reveal } from './Reveal'
import { cn } from '@/lib/utils'
import { useStories, useTemplates } from '@/hooks/useGenerate'
import { templateExampleUrl } from '@/lib/api'
import type { StorySummary, TemplateItem } from '@/types'

type Pillar = {
  id: string
  icon: typeof LayoutGrid
  badge: string
  title: string
  description: string
  bullets: string[]
  cta: string
  href: string
}

const PILLARS: Pillar[] = [
  {
    id: 'templates',
    icon: LayoutGrid,
    badge: '🔥 Most popular',
    title: 'Predefined Templates',
    description:
      '130+ ready-made scenes with live previews. Slap, bondage, missionary, blowjob, sex machine, public — every act is pre-built, pre-tested, and one tap away from your photo.',
    bullets: ['Live preview before you spend a credit', 'Curated by category: Tease, BDSM, Missionary, Public & more', '5 credits per video'],
    cta: 'Browse Templates',
    href: '/video/templates',
  },
  {
    id: 'story-mode',
    icon: BookOpen,
    badge: 'Chapter by chapter',
    title: 'Story Mode',
    description:
      'Corrupt her one chapter at a time. Auction, training, breaking — every branch is a choice only you make, and every chapter animates the last photo you unlocked.',
    bullets: ['Branching chapters — you pick what happens next', 'Progress saved automatically between visits', '3 credits per chapter'],
    cta: 'Start a Story',
    href: '/video/story',
  },
  {
    id: 'director',
    icon: Clapperboard,
    badge: 'Full control',
    title: 'Director',
    description:
      'You call the shots. Choose who\u2019s in the photo, what happens to her, where it happens, and what she\u2019s wearing — we assemble the exact prompt and LoRAs behind the scenes.',
    bullets: ['Who / what / where / outfit — 4 quick choices', 'Every combination is a unique generated scene', '5 credits per video'],
    cta: 'Open the Director',
    href: '/video/scene',
  },
  {
    id: 'custom',
    icon: Wand2,
    badge: '🔥 For the specific',
    title: 'Custom Prompt',
    description:
      'Already know exactly what you want? Write it yourself. Our enhancer expands your script into full cinematic direction before it ever reaches the model.',
    bullets: ['Full creative control — no menus, no limits', 'AI enhancer fixes pacing & camera direction for you', '3 credits per video'],
    cta: 'Write a Prompt',
    href: '/video/custom',
  },
]

function categoryLabel(tags: string[] | undefined): string {
  if (!tags) return 'Scene'
  if (tags.includes('couple')) return 'Couple'
  if (tags.includes('multi_women')) return 'Two Girls'
  if (tags.includes('gay')) return 'Gay'
  if (tags.includes('solo')) return 'Solo'
  return 'Scene'
}

function TemplateTickerCard({ template }: { template: TemplateItem }) {
  const sourceUrl = templateExampleUrl(template.id, 'source.jpg', template.example_v)

  return (
    <div className="group relative flex h-48 w-36 flex-shrink-0 cursor-pointer flex-col justify-end overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12121a] p-3 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff2f87]/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sourceUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/10" />
      <span className="absolute right-2 top-2 rounded-full border border-red-700/40 bg-red-900/40 px-1.5 py-0.5 text-[9px] font-bold text-red-300 backdrop-blur-sm">
        18+
      </span>
      <div className="relative z-10">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ff8ac2]/80">
          {categoryLabel(template.tags)}
        </p>
        <p className="text-sm font-semibold text-white leading-tight">{template.label}</p>
      </div>
    </div>
  )
}

function TemplateTicker() {
  const { data } = useTemplates()

  const scenes = useMemo(() => {
    const templates = data?.templates ?? []
    const topRatedIds = data?.top_rated_ids ?? []
    const rank: Record<string, number> = {}
    topRatedIds.forEach((id, idx) => (rank[id] = idx))

    return templates
      .filter((t) => t.has_example && t.id !== 'i2v_custom')
      .sort((a, b) => (rank[a.id] ?? 9999) - (rank[b.id] ?? 9999))
      .slice(0, 16)
  }, [data])

  if (scenes.length === 0) return null

  return (
    <div className="relative -mx-8 mt-8 overflow-hidden sm:-mx-10">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#0f0f14] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#0f0f14] to-transparent" />
      <div className="marquee-track gap-3 px-8 sm:px-10">
        {[...scenes, ...scenes].map((s, i) => (
          <TemplateTickerCard key={`${s.id}-${i}`} template={s} />
        ))}
      </div>
    </div>
  )
}

function StoryTickerCard({ story }: { story: StorySummary }) {
  return (
    <div className="flex h-44 w-56 flex-shrink-0 flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1a1a24] to-[#0f0f14] p-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff2f87]/40">
      <span className="text-3xl">{story.emoji ?? '📖'}</span>
      <div>
        <p className="text-sm font-semibold leading-tight text-white">{story.title}</p>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[#8b8fa8]">{story.teaser}</p>
      </div>
      <span className="self-start rounded-full border border-[#ff2f87]/30 bg-[#ff2f87]/10 px-2 py-0.5 text-[10px] font-medium text-[#ff8ac2]">
        {story.scene_count} chapters
      </span>
    </div>
  )
}

function StoryTicker() {
  const { data } = useStories()
  const stories = data ?? []

  if (stories.length === 0) return null

  return (
    <div className="relative -mx-8 mt-8 overflow-hidden sm:-mx-10">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#0f0f14] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#0f0f14] to-transparent" />
      <div className="marquee-track gap-3 px-8 sm:px-10">
        {[...stories, ...stories].map((s, i) => (
          <StoryTickerCard key={`${s.id}-${i}`} story={s} />
        ))}
      </div>
    </div>
  )
}

export function PillarsShowcase() {
  const [active, setActive] = useState(PILLARS[0].id)
  const current = PILLARS.find((p) => p.id === active) ?? PILLARS[0]
  const Icon = current.icon

  return (
    <section id="pillars" className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            However you like to <span className="text-gradient">create</span>
          </h2>
          <p className="mt-4 text-lg text-[#8b8fa8]">
            Every path starts with the same photo. Where it goes from there is up to you.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mb-10 flex max-w-2xl flex-wrap justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2">
            {PILLARS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                className={cn(
                  'flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 min-w-[45%] sm:min-w-0',
                  active === p.id
                    ? 'bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2] text-[#07070b] shadow-lg shadow-[#ff2f87]/25'
                    : 'text-[#8b8fa8] hover:bg-white/[0.04] hover:text-white'
                )}
              >
                {p.title}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="relative min-h-[280px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0f0f14] p-8 sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="grid gap-8 lg:grid-cols-[auto_1fr]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff2f87]/15">
                <Icon className="h-7 w-7 text-[#ff8ac2]" />
              </div>

              <div>
                <span className="rounded-full border border-[#ff2f87]/30 bg-[#ff2f87]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#ff8ac2]">
                  {current.badge}
                </span>
                <h3 className="mt-3 font-display text-2xl font-bold text-white">{current.title}</h3>
                <p className="mt-3 max-w-2xl leading-relaxed text-[#8b8fa8]">{current.description}</p>

                <ul className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
                  {current.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-[#8b8fa8]">
                      <span className="h-1 w-1 rounded-full bg-[#ff2f87]" />
                      {b}
                    </li>
                  ))}
                </ul>

                <Link
                  href={current.href}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2] px-5 py-2.5 text-sm font-semibold text-[#07070b] shadow-lg shadow-[#ff2f87]/25 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                >
                  {current.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {current.id === 'templates' && (
                <div className="lg:col-span-2">
                  <TemplateTicker />
                </div>
              )}
              {current.id === 'story-mode' && (
                <div className="lg:col-span-2">
                  <StoryTicker />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
