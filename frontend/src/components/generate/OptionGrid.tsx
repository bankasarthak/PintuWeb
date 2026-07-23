'use client'

import { cn } from '@/lib/utils'
import type { CatalogOption } from '@/types'

export function OptionGrid({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: CatalogOption[]
  value: string | null
  onChange: (id: string) => void
  columns?: 2 | 3
}) {
  return (
    <div className={cn('grid gap-2.5', columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2')}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'rounded-xl border px-3 py-3 text-left text-sm font-medium transition-all',
            value === opt.id
              ? 'border-[#c9a96e]/50 bg-[#c9a96e]/10 text-[#e8d5b5]'
              : 'border-white/[0.08] bg-white/[0.02] text-[#c4c0b8] hover:border-white/[0.15]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
