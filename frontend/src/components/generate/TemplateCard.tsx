'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { TEMPLATE_CARD_GRADIENTS } from '@/lib/templateFilters'
import type { TemplateItem } from '@/types'
import { templateExampleUrl } from '@/lib/api'

type TemplateCardProps = {
  template: TemplateItem
  index: number
  selected?: boolean
  onSelect: (id: string) => void
}

export function TemplateCard({ template, index, selected, onSelect }: TemplateCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const [videoVisible, setVideoVisible] = useState(false)
  const isCustom = template.id === 'i2v_custom'

  useEffect(() => {
    if (!template.has_example || isCustom) return
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setVideoVisible(entry.isIntersecting))
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [template.has_example, isCustom])

  const sourceUrl = template.has_example
    ? templateExampleUrl(template.id, 'source.jpg', template.example_v)
    : null
  const previewUrl = template.has_example
    ? templateExampleUrl(template.id, 'preview.mp4', template.example_v)
    : null

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onSelect(template.id)}
      className={cn(
        'group relative overflow-hidden rounded-xl border text-left transition-all aspect-[3/4]',
        selected
          ? 'border-[#c9a96e]/60 ring-2 ring-[#c9a96e]/30'
          : 'border-white/[0.08] hover:border-white/[0.18]'
      )}
    >
      {isCustom ? (
        <div
          className="absolute inset-0 flex items-center justify-center text-3xl"
          style={{ background: TEMPLATE_CARD_GRADIENTS[0] }}
        >
          ✏️
        </div>
      ) : template.has_example && sourceUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sourceUrl}
            alt=""
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
              videoVisible ? 'opacity-0' : 'opacity-100'
            )}
          />
          {videoVisible && previewUrl ? (
            <video
              src={previewUrl}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              autoPlay
              playsInline
              loop
              preload="metadata"
            />
          ) : null}
        </>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-3xl"
          style={{ background: TEMPLATE_CARD_GRADIENTS[index % TEMPLATE_CARD_GRADIENTS.length] }}
        >
          {template.emoji}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-[#e8d5b5] backdrop-blur-sm">
        {isCustom ? 'Custom' : '5 cr'}
      </span>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-sm font-semibold text-white leading-tight">{template.label}</p>
        {template.description ? (
          <p className="mt-1 text-[11px] text-white/70 line-clamp-2">{template.description}</p>
        ) : null}
      </div>
    </button>
  )
}
