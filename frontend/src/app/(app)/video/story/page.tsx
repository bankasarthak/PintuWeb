'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { SourcePhotoUpload } from '@/components/generate/SourcePhotoUpload'
import { JobProgress } from '@/components/generate/JobProgress'
import { Button } from '@/components/ui/button'
import { useCreateJob } from '@/hooks/useGenerate'
import { STORY_SUMMARIES, getStoryDetail, CREDIT_COSTS } from '@/lib/catalogs'

export default function VideoStoryPage() {
  const [source, setSource] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null })
  const [storyId, setStoryId] = useState<string | null>(null)
  const [beatIdx, setBeatIdx] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const { mutate: createJob, isPending } = useCreateJob()

  const story = storyId ? getStoryDetail(storyId) : null
  const beat = story?.beats[beatIdx]

  return (
    <PageShell title="Story Mode" subtitle="Animate her fate, chapter by chapter" backHref="/video">
      <SourcePhotoUpload file={source.file} preview={source.preview} onChange={(f, p) => setSource({ file: f, preview: p })} />

      {!story ? (
        <div className="grid gap-3 mt-8">
          {STORY_SUMMARIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStoryId(s.id)}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left hover:border-[#c9a96e]/30 transition-all"
            >
              <p className="font-display text-base font-semibold text-white">{s.title}</p>
              <p className="text-xs text-[#8b8fa8] mt-1">{s.teaser}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="font-display text-lg text-white">{story.title} · Ch. {beatIdx + 1}</p>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-[#c4c0b8]">{beat?.prompt}</div>
          <p className="text-xs text-[#8b8fa8]">{CREDIT_COSTS.videoCustom} credits</p>
          <Button
            className="w-full"
            size="lg"
            disabled={!source.file}
            loading={isPending}
            leftIcon={<Sparkles className="h-4 w-4" />}
            onClick={() => {
              if (!source.file || !beat) return
              createJob(
                {
                  job_type: 'i2v_custom',
                  custom_prompt: `${story.title} — ${beat.label}: ${beat.prompt}`,
                  enhance_prompt: true,
                  source_image: source.file,
                },
                {
                  onSuccess: (j) => {
                    setJobId(j.id)
                    if (beatIdx < story.beats.length - 1) setBeatIdx((i) => i + 1)
                  },
                }
              )
            }}
          >
            Generate chapter
          </Button>
          <button className="text-xs text-[#8b8fa8]" onClick={() => { setStoryId(null); setBeatIdx(0) }}>Pick another story</button>
        </div>
      )}
      <JobProgress jobId={jobId} onClose={() => setJobId(null)} />
    </PageShell>
  )
}
