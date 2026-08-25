'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Sparkles } from 'lucide-react'
import { Reveal } from './Reveal'
import { useTemplates } from '@/hooks/useGenerate'
import { templateExampleUrl } from '@/lib/api'
import type { TemplateItem } from '@/types'

/**
 * Curated templates that were generated from the exact same source photo.
 * Showing them fanned out from one shared source demonstrates "one photo,
 * many scenes" honestly (real assets, not staged copy). If the catalog ever
 * drops one of these ids, BranchTree falls back to any 3 templates with
 * real examples so the section never breaks.
 */
const HERO_BRANCH_IDS = [
  'doggy_frontview_standing_gradual',
  'sexmachine_anal_electro_gradual',
  'public_cum_walk_plain',
]

const HERO_BRANCH_LABELS: Record<string, string> = {
  doggy_frontview_standing_gradual: 'Front View Doggy',
  sexmachine_anal_electro_gradual: 'Anal Machine + Electro',
  public_cum_walk_plain: 'Public Cum Walk',
}

const HERO_BRANCH_CATEGORY: Record<string, string> = {
  doggy_frontview_standing_gradual: 'Doggy',
  sexmachine_anal_electro_gradual: 'BDSM',
  public_cum_walk_plain: 'Public',
}

function shortLabel(tags: string[] | undefined): string {
  if (!tags) return 'Scene'
  if (tags.includes('bdsm') || tags.includes('bondage')) return 'BDSM'
  if (tags.includes('missionary') || tags.includes('vaginal')) return 'Missionary'
  if (tags.includes('undress') || tags.includes('tease')) return 'Tease'
  if (tags.includes('oral') || tags.includes('blowjob')) return 'Blowjob'
  if (tags.includes('public')) return 'Public'
  return 'Scene'
}

type Branch = {
  template: TemplateItem
}

/** A single fanned-out output card (real generated preview clip). */
function BranchCard({
  branch,
  innerRef,
}: {
  branch: Branch | null
  innerRef: (el: HTMLDivElement | null) => void
}) {
  const previewUrl = branch ? templateExampleUrl(branch.template.id, 'preview.mp4', branch.template.example_v) : null

  return (
    <div
      ref={innerRef}
      className="relative z-10 flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-[#0f0f14]/95 p-2 pr-3 shadow-lg backdrop-blur sm:gap-4 sm:p-2.5 sm:pr-4"
    >
      <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-xl bg-[#1a1a24] sm:w-24 md:w-28">
        {previewUrl ? (
          <video
            src={previewUrl}
            className="absolute inset-0 h-full w-full object-cover object-top"
            muted
            autoPlay
            playsInline
            loop
            preload="metadata"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-[#8b8fa8]" />
          </div>
        )}
        <span className="absolute right-1 top-1 rounded-full border border-red-700/40 bg-red-900/60 px-1.5 py-0.5 text-[8px] font-bold text-red-300 sm:text-[9px]">
          18+
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-[#ff8ac2]/80 sm:text-xs">
          {branch ? HERO_BRANCH_CATEGORY[branch.template.id] ?? shortLabel(branch.template.tags) : ''}
        </p>
        <p className="truncate text-xs font-semibold text-white sm:text-base">
          {branch ? HERO_BRANCH_LABELS[branch.template.id] ?? branch.template.label : 'Generating…'}
        </p>
      </div>
    </div>
  )
}

/**
 * One source photo fanning out into three real generated outputs, connected
 * by animated SVG curves. Line positions are measured from the actual DOM
 * (via ResizeObserver) so the tree stays aligned at every viewport width.
 */
function BranchTree({ source, branches }: { source: TemplateItem | null; branches: (Branch | null)[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sourceRef = useRef<HTMLDivElement>(null)
  const targetRefs = useRef<(HTMLDivElement | null)[]>([])
  const [paths, setPaths] = useState<string[]>([])
  const [box, setBox] = useState({ width: 0, height: 0 })

  const sourceUrl = source ? templateExampleUrl(source.id, 'source.jpg', source.example_v) : null

  useLayoutEffect(() => {
    const container = containerRef.current
    const sourceEl = sourceRef.current
    if (!container || !sourceEl) return

    const recompute = () => {
      const containerRect = container.getBoundingClientRect()
      const sourceRect = sourceEl.getBoundingClientRect()
      const startX = sourceRect.right - containerRect.left
      const startY = sourceRect.top + sourceRect.height / 2 - containerRect.top

      const next = targetRefs.current.map((el) => {
        if (!el) return ''
        const r = el.getBoundingClientRect()
        const endX = r.left - containerRect.left
        const endY = r.top + r.height / 2 - containerRect.top
        const midX = startX + (endX - startX) * 0.55
        return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
      })

      setPaths(next)
      setBox({ width: containerRect.width, height: containerRect.height })
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(container)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [branches])

  return (
    <div ref={containerRef} className="relative w-full max-w-[20rem] sm:max-w-xl md:max-w-2xl">
      {box.width > 0 && (
        <svg
          className="pointer-events-none absolute inset-0"
          width={box.width}
          height={box.height}
          viewBox={`0 0 ${box.width} ${box.height}`}
        >
          <defs>
            <linearGradient id="branch-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff2f87" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ff8ac2" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {paths.map((d, i) =>
            d ? (
              <motion.path
                key={i}
                d={d}
                fill="none"
                stroke="url(#branch-line)"
                strokeWidth={1.5}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 + i * 0.15, ease: 'easeOut' }}
              />
            ) : null
          )}
        </svg>
      )}

      <div className="relative flex items-center gap-3 sm:gap-8 md:gap-10">
        <div ref={sourceRef} className="relative z-10 shrink-0">
          <div className="aspect-[4/5] w-20 overflow-hidden rounded-2xl border-2 border-white/[0.1] shadow-2xl sm:w-36 md:w-44">
            {sourceUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sourceUrl} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1a24] to-[#0f0f14]">
                <Sparkles className="h-6 w-6 text-[#8b8fa8]" />
              </div>
            )}
          </div>
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#ff2f87]/30 bg-[#0f0f14] px-2 py-0.5 text-[9px] font-medium text-white shadow-lg sm:px-3 sm:py-1.5 sm:text-xs">
            Your photo
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-5">
          {branches.map((branch, i) => (
            <BranchCard
              key={branch?.template.id ?? i}
              branch={branch}
              innerRef={(el) => {
                targetRefs.current[i] = el
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  const { data } = useTemplates()

  const { source, branches } = useMemo(() => {
    const templates = data?.templates ?? []
    const withExample = templates.filter((t) => t.has_example && t.id !== 'i2v_custom')
    if (withExample.length === 0) return { source: null, branches: [null, null, null] as (Branch | null)[] }

    const byId = new Map(withExample.map((t) => [t.id, t]))
    const curated = HERO_BRANCH_IDS.map((id) => byId.get(id)).filter((t): t is TemplateItem => Boolean(t))

    if (curated.length === HERO_BRANCH_IDS.length) {
      return { source: curated[0], branches: curated.map((t) => ({ template: t })) }
    }

    const topRatedIds = new Set(data?.top_rated_ids ?? [])
    const ranked = [...withExample].sort((a, b) => {
      const aTop = topRatedIds.has(a.id) || a.tags?.includes('top_rated') ? 0 : 1
      const bTop = topRatedIds.has(b.id) || b.tags?.includes('top_rated') ? 0 : 1
      return aTop - bTop
    })
    const fallback = ranked.slice(0, 3)
    return { source: fallback[0] ?? null, branches: fallback.map((t) => ({ template: t })) }
  }, [data])

  return (
    <section className="relative overflow-hidden pt-36 pb-24 px-4 sm:px-6">
      <div className="aurora-blob left-[-10%] top-[-10%] h-[520px] w-[520px] bg-[#ff2f87]/25 animate-[aurora-drift-1_22s_ease-in-out_infinite]" />
      <div className="aurora-blob right-[-10%] top-[20%] h-[420px] w-[420px] bg-[#8f1450]/20 animate-[aurora-drift-2_26s_ease-in-out_infinite]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div>
          <Reveal>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ff2f87]/30 bg-[#ff2f87]/10 px-3 py-1.5 text-xs font-medium text-[#ff8ac2]">
              <Shield className="h-3 w-3" />
              18+ Adult AI Platform
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="font-display text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
              Any photo becomes{' '}
              <span className="text-gradient">her next scene.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#8b8fa8]">
              Upload one photo. Pick a template, direct your own scene, or write the script yourself.
              JerkBox animates it into an explicit, cinematic video in under 3 minutes.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2] px-6 py-3.5 text-base font-semibold text-[#07070b] shadow-xl shadow-[#ff2f87]/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] hover:shadow-[#ff2f87]/35 active:scale-[0.98] cursor-pointer"
              >
                Start Generating
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#pillars"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-6 py-3.5 text-base font-medium text-[#8b8fa8] transition-all hover:bg-white/[0.04] hover:text-white cursor-pointer"
              >
                See how it works
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="flex w-full justify-center lg:justify-end">
          <div className="flex w-full max-w-[20rem] flex-col items-center gap-4 sm:max-w-xl md:max-w-2xl">
            <BranchTree source={source} branches={branches} />
            <div className="flex flex-wrap items-center justify-center gap-2 text-center text-[11px] text-[#8b8fa8] sm:text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                Generated in under 3 min
              </span>
              <span className="text-white/20">·</span>
              <span>5 credits used</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
