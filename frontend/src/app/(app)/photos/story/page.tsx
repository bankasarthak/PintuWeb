'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { CharRequiredGate } from '@/components/shared/CharRequiredGate'
import { JobProgress } from '@/components/generate/JobProgress'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui'
import { useCharacters } from '@/hooks/useCharacters'
import { useCreateJob } from '@/hooks/useGenerate'
import { STORY_SUMMARIES, getStoryDetail, CREDIT_COSTS } from '@/lib/catalogs'
import { cn } from '@/lib/utils'

export default function PhotoStoryPage() {
  const activeId = useUIStore((s) => s.activeCompanionId)
  const { data: characters } = useCharacters()
  const characterId = characters?.find((c) => c.id === activeId)?.id ?? characters?.[0]?.id
  const [storyId, setStoryId] = useState<string | null>(null)
  const [beatIdx, setBeatIdx] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const { mutate: createJob, isPending } = useCreateJob()

  const story = storyId ? getStoryDetail(storyId) : null
  const beat = story?.beats[beatIdx]

  return (
    <CharRequiredGate title="Story Mode" backHref="/photos">
      <PageShell title="Story Mode" subtitle="Chapter-by-chapter stills with your character" backHref="/photos">
        {!story ? (
          <div className="grid gap-3">
            {STORY_SUMMARIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStoryId(s.id)}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left hover:border-[#c9a96e]/30 transition-all"
              >
                <p className="font-display text-base font-semibold text-white">{s.title}</p>
                <p className="text-xs text-[#8b8fa8] mt-1 leading-relaxed">{s.teaser}</p>
                <p className="text-[10px] text-[#c9a96e] mt-2 uppercase tracking-wider">{s.sceneCount} chapters</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-white">{story.title}</p>
                <p className="text-xs text-[#8b8fa8]">Chapter {beatIdx + 1} of {story.beats.length}</p>
              </div>
              <button className="text-xs text-[#8b8fa8] hover:text-white" onClick={() => { setStoryId(null); setBeatIdx(0) }}>
                Change story
              </button>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <p className="text-sm font-medium text-[#e8d5b5]">{beat?.label}</p>
              <p className="text-xs text-[#8b8fa8] mt-1">{beat?.sceneTitle}</p>
              <p className="text-sm text-[#c4c0b8] mt-3 leading-relaxed">{beat?.prompt}</p>
            </div>
            <p className="text-xs text-[#8b8fa8]">{CREDIT_COSTS.photoCustom} credits per chapter</p>
            <Button
              className="w-full"
              size="lg"
              loading={isPending}
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => {
                if (!characterId || !beat) return
                createJob(
                  {
                    job_type: 'i2i_custom',
                    character_id: characterId,
                    custom_prompt: `${story.title} — ${beat.label}: ${beat.prompt}`,
                    enhance_prompt: true,
                  },
                  {
                    onSuccess: (job) => {
                      setJobId(job.id)
                      if (beatIdx < story.beats.length - 1) setBeatIdx((i) => i + 1)
                    },
                  }
                )
              }}
            >
              Generate this chapter
            </Button>
          </div>
        )}
        <JobProgress jobId={jobId} onClose={() => setJobId(null)} />
      </PageShell>
    </CharRequiredGate>
  )
}
