'use client'

import { cn } from '@/lib/utils'
import type { MoodItem } from '@/types'

interface MoodSelectorProps {
  moods: MoodItem[]
  selected: string[]
  onToggle: (id: string) => void
}

export function MoodSelector({ moods, selected, onToggle }: MoodSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Mood modifiers">
      {moods.map((mood) => {
        const isSelected = selected.includes(mood.id)
        return (
          <button
            key={mood.id}
            onClick={() => onToggle(mood.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
              isSelected
                ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                : 'border-[#1e1e2e] text-[#94a3b8] hover:border-purple-500/40 hover:text-white'
            )}
            aria-pressed={isSelected}
            aria-label={`Toggle ${mood.label} mood`}
          >
            {mood.label}
          </button>
        )
      })}
    </div>
  )
}
