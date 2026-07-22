'use client'

import { Check, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SceneItem } from '@/types'

interface SceneCardProps {
  scene: SceneItem
  selected: boolean
  onSelect: () => void
}

export function SceneCard({ scene, selected, onSelect }: SceneCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative rounded-xl border p-4 text-left transition-all duration-200 flex flex-col gap-2 group',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
        selected
          ? 'border-purple-500 bg-purple-600/15 shadow-lg shadow-purple-900/20'
          : 'border-[#1e1e2e] bg-[#13131a] hover:border-purple-500/40 hover:bg-[#1a1a25]'
      )}
      aria-pressed={selected}
      aria-label={`Select scene: ${scene.label}`}
    >
      {/* Thumbnail placeholder */}
      <div className={cn(
        'h-24 rounded-lg flex items-center justify-center text-3xl transition-all duration-300',
        'bg-[#1e1e2e] group-hover:blur-none',
        !selected && 'blur-sm'
      )}>
        🌸
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div>
        <p className={cn('text-sm font-medium', selected ? 'text-purple-200' : 'text-white')}>
          {scene.label}
        </p>
        {scene.description && (
          <p className="text-xs text-[#94a3b8] mt-0.5 line-clamp-2">{scene.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 mt-auto">
        <Coins className="h-3 w-3 text-purple-400" />
        <span className="text-xs text-purple-400 font-medium">{scene.credits} cr</span>
        <span className="ml-auto text-[10px] text-[#94a3b8] capitalize">{scene.category}</span>
      </div>
    </button>
  )
}
