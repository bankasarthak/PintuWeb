'use client'

import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { CharRequiredGate } from '@/components/shared/CharRequiredGate'
import { OptionGrid } from '@/components/generate/OptionGrid'
import { JobProgress } from '@/components/generate/JobProgress'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui'
import { useCharacters } from '@/hooks/useCharacters'
import { useCreateJob } from '@/hooks/useGenerate'
import {
  STILL_STEPS, STILL_SETTINGS, STILL_FRAMINGS, STILL_OUTFITS, STILL_ACTIONS, STILL_MOODS,
  buildStillPrompt, CREDIT_COSTS,
} from '@/lib/catalogs'
import { cn } from '@/lib/utils'

const STEP_META: Record<string, { title: string; options: typeof STILL_SETTINGS }> = {
  setting: { title: 'Setting', options: STILL_SETTINGS },
  framing: { title: 'Framing', options: STILL_FRAMINGS },
  outfit: { title: 'Outfit', options: STILL_OUTFITS },
  action: { title: 'Pose & action', options: STILL_ACTIONS },
  mood: { title: 'Mood', options: STILL_MOODS },
}

export default function PhotoScenePage() {
  const activeId = useUIStore((s) => s.activeCompanionId)
  const { data: characters } = useCharacters()
  const characterId = characters?.find((c) => c.id === activeId)?.id ?? characters?.[0]?.id

  const [stepIdx, setStepIdx] = useState(0)
  const [selection, setSelection] = useState<Record<string, string>>({})
  const [jobId, setJobId] = useState<string | null>(null)
  const { mutate: createJob, isPending } = useCreateJob()

  const step = STILL_STEPS[stepIdx]
  const isReview = step === 'review'
  const prompt = useMemo(() => buildStillPrompt(selection), [selection])
  const canNext = isReview || Boolean(selection[step])

  const handleGenerate = () => {
    if (!characterId) return
    createJob(
      {
        job_type: 'i2i_custom',
        character_id: characterId,
        custom_prompt: prompt,
        enhance_prompt: true,
      },
      { onSuccess: (job) => setJobId(job.id) }
    )
  }

  return (
    <CharRequiredGate title="Create Scene" backHref="/photos">
      <PageShell title="Create Scene" subtitle="Build a photoreal still with your character" backHref="/photos">
        <div className="mb-6 flex gap-1">
          {STILL_STEPS.map((s, i) => (
            <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors', i <= stepIdx ? 'bg-[#c9a96e]' : 'bg-white/[0.06]')} />
          ))}
        </div>

        {!isReview ? (
          <div className="space-y-4 animate-in">
            <h2 className="font-display text-xl font-semibold text-white">{STEP_META[step].title}</h2>
            <OptionGrid
              options={STEP_META[step].options}
              value={selection[step] ?? null}
              onChange={(id) => setSelection((prev) => ({ ...prev, [step]: id }))}
            />
          </div>
        ) : (
          <div className="space-y-4 animate-in">
            <h2 className="font-display text-xl font-semibold text-white">Review</h2>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-[#c4c0b8] leading-relaxed">
              {prompt}
            </div>
            <p className="text-xs text-[#8b8fa8]">{CREDIT_COSTS.photoCustom} credits · charged on success</p>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {stepIdx > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStepIdx((i) => i - 1)}>
              Back
            </Button>
          )}
          {!isReview ? (
            <Button className="flex-1" disabled={!canNext} onClick={() => setStepIdx((i) => i + 1)}>
              Continue
            </Button>
          ) : (
            <Button
              className="flex-1"
              loading={isPending}
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={handleGenerate}
            >
              Generate photo
            </Button>
          )}
        </div>

        <JobProgress jobId={jobId} onClose={() => setJobId(null)} />
      </PageShell>
    </CharRequiredGate>
  )
}
