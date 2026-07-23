'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { SourcePhotoUpload } from '@/components/generate/SourcePhotoUpload'
import { JobProgress } from '@/components/generate/JobProgress'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCreateJob } from '@/hooks/useGenerate'
import { CREDIT_COSTS } from '@/lib/catalogs'

export default function VideoCustomPage() {
  const [source, setSource] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null })
  const [prompt, setPrompt] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const { mutate: createJob, isPending } = useCreateJob()

  return (
    <PageShell title="Custom Prompt" subtitle="Describe the motion — AI enhances every detail" backHref="/video">
      <SourcePhotoUpload file={source.file} preview={source.preview} onChange={(f, p) => setSource({ file: f, preview: p })} />
      <div className="mt-8">
        <Textarea
          label="Your prompt"
          placeholder="Describe the action, camera movement, mood…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[140px]"
        />
      </div>
      <p className="text-xs text-[#8b8fa8] mt-3">{CREDIT_COSTS.videoCustom} credits · AI-enhanced</p>
      <Button
        className="w-full mt-6"
        size="lg"
        disabled={!source.file || !prompt.trim()}
        loading={isPending}
        leftIcon={<Sparkles className="h-4 w-4" />}
        onClick={() => {
          if (!source.file || !prompt.trim()) return
          createJob(
            { job_type: 'i2v_custom', custom_prompt: prompt.trim(), enhance_prompt: true, source_image: source.file },
            { onSuccess: (j) => setJobId(j.id) }
          )
        }}
      >
        Generate video
      </Button>
      <JobProgress jobId={jobId} onClose={() => setJobId(null)} />
    </PageShell>
  )
}
