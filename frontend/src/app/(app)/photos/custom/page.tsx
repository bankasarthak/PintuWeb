'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { CharRequiredGate } from '@/components/shared/CharRequiredGate'
import { JobProgress } from '@/components/generate/JobProgress'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUIStore } from '@/stores/ui'
import { useCharacters } from '@/hooks/useCharacters'
import { useCreateJob } from '@/hooks/useGenerate'
import { CREDIT_COSTS } from '@/lib/catalogs'

export default function PhotoCustomPage() {
  const activeId = useUIStore((s) => s.activeCompanionId)
  const { data: characters } = useCharacters()
  const characterId = characters?.find((c) => c.id === activeId)?.id ?? characters?.[0]?.id
  const [prompt, setPrompt] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const { mutate: createJob, isPending } = useCreateJob()

  return (
    <CharRequiredGate title="Custom Prompt" backHref="/photos">
      <PageShell title="Custom Prompt" subtitle="Describe the photo — AI maps it to your character" backHref="/photos">
        <Textarea
          label="Your prompt"
          placeholder="Describe setting, outfit, pose, lighting…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[160px]"
        />
        <p className="text-xs text-[#8b8fa8] mt-3">{CREDIT_COSTS.photoCustom} credits · enhanced automatically</p>
        <Button
          className="w-full mt-6"
          size="lg"
          disabled={!prompt.trim()}
          loading={isPending}
          leftIcon={<Sparkles className="h-4 w-4" />}
          onClick={() => {
            if (!characterId || !prompt.trim()) return
            createJob(
              { job_type: 'i2i_custom', character_id: characterId, custom_prompt: prompt.trim(), enhance_prompt: true },
              { onSuccess: (job) => setJobId(job.id) }
            )
          }}
        >
          Generate photo
        </Button>
        <JobProgress jobId={jobId} onClose={() => setJobId(null)} />
      </PageShell>
    </CharRequiredGate>
  )
}
